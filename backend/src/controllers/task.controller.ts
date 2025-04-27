import { Request, Response } from 'express';
import { PrismaClient, Status, Priority } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

// Get all tasks for a project
export const getTasks = async (req: Request, res: Response) => {
  const { projectId } = req.params;

  // Check if project exists and user has access
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      company: true
    }
  });

  if (!project) {
    throw new AppError('Project not found', 404);
  }

  // Check if user has access to project's company
  const company = await prisma.company.findFirst({
    where: {
      id: project.companyId,
      OR: [
        { ownerId: req.user!.id },
        { members: { some: { id: req.user!.id } } }
      ]
    }
  });

  if (!company) {
    throw new AppError('Not authorized to access this project', 403);
  }

  const tasks = await prisma.task.findMany({
    where: { projectId },
    include: {
      tags: true
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
      tags: true
    }
  });

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  // Check if user has access to task's project's company
  const company = await prisma.company.findFirst({
    where: {
      id: task.project.companyId,
      OR: [
        { ownerId: req.user!.id },
        { members: { some: { id: req.user!.id } } }
      ]
    }
  });

  if (!company) {
    throw new AppError('Not authorized to access this task', 403);
  }

  res.status(200).json(task);
};

// Create task
export const createTask = async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { title, description, status, priority, dueDate, tagIds } = req.body;

  // Check if project exists and user has access
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      company: true
    }
  });

  if (!project) {
    throw new AppError('Project not found', 404);
  }

  // Check if user has access to project's company
  const company = await prisma.company.findFirst({
    where: {
      id: project.companyId,
      OR: [
        { ownerId: req.user!.id },
        { members: { some: { id: req.user!.id } } }
      ]
    }
  });

  if (!company) {
    throw new AppError('Not authorized to create tasks in this project', 403);
  }

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
      } : undefined
    },
    include: {
      tags: true
    }
  });

  res.status(201).json(task);
};

// Update task
export const updateTask = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, description, status, priority, dueDate, tagIds } = req.body;

  // Check if task exists and user has access
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      project: {
        include: {
          company: true
        }
      }
    }
  });

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  // Check if user has access to task's project's company
  const company = await prisma.company.findFirst({
    where: {
      id: task.project.companyId,
      OR: [
        { ownerId: req.user!.id },
        { members: { some: { id: req.user!.id } } }
      ]
    }
  });

  if (!company) {
    throw new AppError('Not authorized to update this task', 403);
  }

  // Get current task tags for disconnect operation
  const currentTask = await prisma.task.findUnique({
    where: { id },
    include: { tags: true }
  });

  const updatedTask = await prisma.task.update({
    where: { id },
    data: {
      title,
      description,
      status: status as Status,
      priority: priority as Priority,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      tags: {
        disconnect: currentTask?.tags.map(tag => ({ id: tag.id })),
        connect: tagIds ? tagIds.map((id: string) => ({ id })) : []
      }
    },
    include: {
      tags: true
    }
  });

  res.status(200).json(updatedTask);
};

// Delete task
export const deleteTask = async (req: Request, res: Response) => {
  const { id } = req.params;

  // Check if task exists and user has access
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      project: {
        include: {
          company: true
        }
      }
    }
  });

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  // Check if user has access to task's project's company
  const company = await prisma.company.findFirst({
    where: {
      id: task.project.companyId,
      OR: [
        { ownerId: req.user!.id },
        { members: { some: { id: req.user!.id } } }
      ]
    }
  });

  if (!company) {
    throw new AppError('Not authorized to delete this task', 403);
  }

  await prisma.task.delete({
    where: { id }
  });

  res.status(204).send();
};
