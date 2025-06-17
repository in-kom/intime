import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
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

// Get all comments for a task
export const getComments = async (req: Request, res: Response) => {
  const { taskId } = req.params;

  // Check if task exists and user has access (any role)
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { 
      project: {
        include: {
          company: true
        }
      }
    }
  });

  if (!task) throw new AppError('Task not found', 404);

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

  const comments = await prisma.taskComment.findMany({
    where: { taskId },
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
  });

  res.status(200).json(comments);
};

// Create a comment
export const createComment = async (req: Request, res: Response) => {
  const { taskId } = req.params;
  const { content } = req.body;

  if (!content) throw new AppError('Comment content is required', 400);

  // Check if task exists and user has access (any role)
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { 
      project: {
        include: {
          company: true
        }
      }
    }
  });

  if (!task) throw new AppError('Task not found', 404);

  // Check if user has access to task's company (at least COMMENTER role)
  const company = task.project.company;
  const isOwner = company.ownerId === req.user!.id;
  const role = await getUserCompanyRole(req.user!.id, company.id);

  if (!isOwner && role !== 'EDITOR' && role !== 'COMMENTER') {
    throw new AppError('Not authorized to add comments to this task', 403);
  }

  const comment = await prisma.taskComment.create({
    data: {
      content,
      task: { connect: { id: taskId } },
      user: { connect: { id: req.user!.id } }
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          imageUrl: true
        }
      }
    }
  });

  res.status(201).json(comment);
};

// Update a comment
export const updateComment = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content) throw new AppError('Comment content is required', 400);

  // Check if comment exists
  const comment = await prisma.taskComment.findUnique({
    where: { id },
    include: {
      task: {
        include: {
          project: {
            include: {
              company: true
            }
          }
        }
      }
    }
  });

  if (!comment) throw new AppError('Comment not found', 404);

  // Only the comment author or company owner/editor can update a comment
  if (comment.userId !== req.user!.id) {
    const company = comment.task.project.company;
    const isOwner = company.ownerId === req.user!.id;
    const role = await getUserCompanyRole(req.user!.id, company.id);

    if (!isOwner && role !== 'EDITOR') {
      throw new AppError('Not authorized to update this comment', 403);
    }
  }

  const updatedComment = await prisma.taskComment.update({
    where: { id },
    data: { content },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          imageUrl: true
        }
      }
    }
  });

  res.status(200).json(updatedComment);
};

// Delete a comment
export const deleteComment = async (req: Request, res: Response) => {
  const { id } = req.params;

  // Check if comment exists
  const comment = await prisma.taskComment.findUnique({
    where: { id },
    include: {
      task: {
        include: {
          project: {
            include: {
              company: true
            }
          }
        }
      }
    }
  });

  if (!comment) throw new AppError('Comment not found', 404);

  // Only the comment author or company owner/editor can delete a comment
  if (comment.userId !== req.user!.id) {
    const company = comment.task.project.company;
    const isOwner = company.ownerId === req.user!.id;
    const role = await getUserCompanyRole(req.user!.id, company.id);

    if (!isOwner && role !== 'EDITOR') {
      throw new AppError('Not authorized to delete this comment', 403);
    }
  }

  await prisma.taskComment.delete({
    where: { id }
  });

  res.status(204).send();
};
