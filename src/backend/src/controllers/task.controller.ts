import { Request, Response } from 'express';
import { PrismaClient, Status, Priority } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

// Helper to get user's role in a company
async function getUserCompanyRole(userId: string, companyId: string) {
  if (!userId || !companyId) return null;
  const member = await prisma.companyMember.findUnique({
    where: { userId_companyId: { userId, companyId } }
  });
  return member?.role || null;
}

// Get all tasks for a project
export const getTasks = async (req: Request, res: Response) => {
  const { projectId } = req.params;

  // Check if project exists and user has access (any role)
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { company: true }
  });

  if (!project) throw new AppError('Project not found', 404);

  const company = await prisma.company.findFirst({
    where: {
      id: project.companyId,
      OR: [
        { ownerId: req.user!.id },
        { members: { some: { userId: req.user!.id } } }
      ]
    }
  });

  if (!company) throw new AppError('Not authorized to access this project', 403);

  const tasks = await prisma.task.findMany({
    where: { projectId },
    include: {
      tags: true,
      dependencies: true,
      dependencyFor: true,
      parent: true,
      subtasks: true,
      _count: {
        select: { comments: true }
      }
    }
  });

  res.status(200).json(tasks);
};

// Get task by ID
export const getTask = async (req: Request, res: Response) => {
  const { id } = req.params;

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      project: {
        include: {
          company: true
        }
      },
      tags: true,
      dependencies: true,
      dependencyFor: true,
      parent: true,
      subtasks: true,
      comments: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              imageUrl: true
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  // Check if user has access to task's project's company (any role)
  const company = await prisma.company.findFirst({
    where: {
      id: task.project.companyId,
      OR: [
        { ownerId: req.user!.id },
        { members: { some: { userId: req.user!.id } } }
      ]
    }
  });

  if (!company) throw new AppError('Not authorized to access this task', 403);

  res.status(200).json(task);
};

// Create task
export const createTask = async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { 
    title, 
    description, 
    status, 
    priority, 
    dueDate, 
    tagIds, 
    parentId, 
    dependencyIds 
  } = req.body;

  // Check if project exists and user has access to project's company and is EDITOR or owner
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      company: true
    }
  });

  if (!project) {
    throw new AppError('Project not found', 404);
  }

  const company = project.company;
  const isOwner = company.ownerId === req.user!.id;
  const role = await getUserCompanyRole(req.user!.id, company.id);

  if (!isOwner && role !== 'EDITOR') {
    throw new AppError('Not authorized to create tasks in this project', 403);
  }

  // Set actual start date if task is created with IN_PROGRESS, REVIEW, or DONE status
  const actualStartDate = (status === 'IN_PROGRESS' || status === 'REVIEW' || status === 'DONE') 
    ? new Date() 
    : undefined;
    
  // Set actual end date if task is created with DONE status
  const actualEndDate = status === 'DONE' ? new Date() : undefined;

  const task = await prisma.task.create({
    data: {
      title,
      description,
      status: status as Status,
      priority: priority as Priority,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      project: {
        connect: { id: projectId }
      },
      tags: tagIds && tagIds.length > 0 ? {
        connect: tagIds.map((id: string) => ({ id }))
      } : undefined,
      actualStartDate,
      actualEndDate,
      // Add parent relation if parentId is provided
      ...(parentId && {
        parent: {
          connect: { id: parentId }
        }
      }),
      // Add dependencies if dependencyIds are provided
      ...(dependencyIds && dependencyIds.length > 0 && {
        dependencies: {
          connect: dependencyIds.map((id: string) => ({ id }))
        }
      })
    },
    include: {
      tags: true,
      dependencies: true,
      subtasks: true
    }
  });

  res.status(201).json(task);
};

// Update task
export const updateTask = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { 
    title, 
    description, 
    status, 
    priority, 
    dueDate, 
    tagIds, 
    startDate, 
    parentId, 
    dependencyIds 
  } = req.body;

  // Only EDITORs or owner can update
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      project: { include: { company: true } }
    }
  });

  if (!task) throw new AppError('Task not found', 404);

  const company = task.project.company;
  const isOwner = company.ownerId === req.user!.id;
  const role = await getUserCompanyRole(req.user!.id, company.id);

  if (!isOwner && role !== 'EDITOR') {
    throw new AppError('Not authorized to update this task', 403);
  }

  // Get current task tags for disconnect operation
  const currentTask = await prisma.task.findUnique({
    where: { id },
    include: { 
      tags: true,
      dependencies: true 
    }
  });

  // Determine if we need to update the actual start/end dates based on status changes
  let actualStartDate = undefined;
  let actualEndDate = undefined;

  // If status is changing to IN_PROGRESS and there's no actualStartDate yet, set it
  if (status === 'IN_PROGRESS' && task.status !== 'IN_PROGRESS' && task.status !== 'REVIEW' && task.status !== 'DONE') {
    actualStartDate = new Date();
  }

  // If status is changing to DONE, set the actualEndDate
  if (status === 'DONE' && task.status !== 'DONE') {
    actualEndDate = new Date();
    
    // If task doesn't have an actualStartDate yet (rare case), also set that
    if (!task.actualStartDate) {
      actualStartDate = new Date();
    }
  }

  const updatedTask = await prisma.task.update({
    where: { id },
    data: {
      title,
      description,
      status: status as Status,
      priority: priority as Priority,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      // Only include these fields in the update if they need to change
      ...(actualStartDate && { actualStartDate }),
      ...(actualEndDate && { actualEndDate }),
      tags: {
        disconnect: currentTask?.tags.map(tag => ({ id: tag.id })),
        connect: tagIds ? tagIds.map((id: string) => ({ id })) : []
      },
      // Update parent relation
      ...(parentId !== undefined && {
        parent: parentId ? { connect: { id: parentId } } : { disconnect: true }
      }),
      // Update dependencies
      dependencies: {
        disconnect: currentTask?.dependencies.map(dep => ({ id: dep.id })),
        connect: dependencyIds ? dependencyIds.map((id: string) => ({ id })) : []
      }
    },
    include: {
      tags: true,
      dependencies: true,
      dependencyFor: true,
      parent: true,
      subtasks: true
    }
  });

  res.status(200).json(updatedTask);
};

// Delete task
export const deleteTask = async (req: Request, res: Response) => {
  const { id } = req.params;

  // Only EDITORs or owner can delete
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      project: { include: { company: true } }
    }
  });

  if (!task) throw new AppError('Task not found', 404);

  const company = task.project.company;
  const isOwner = company.ownerId === req.user!.id;
  const role = await getUserCompanyRole(req.user!.id, company.id);

  if (!isOwner && role !== 'EDITOR') {
    throw new AppError('Not authorized to delete this task', 403);
  }

  await prisma.task.delete({
    where: { id }
  });

  res.status(204).send();
};
