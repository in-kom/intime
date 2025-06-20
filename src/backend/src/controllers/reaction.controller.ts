import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';
import { getWebSocketServer } from '../services/websocket.service';

const prisma = new PrismaClient();

// Add a reaction to a comment
export const addReaction = async (req: Request, res: Response) => {
  const { commentId } = req.params;
  const { emoji } = req.body;

  if (!emoji) throw new AppError('Emoji is required', 400);

  // Check if comment exists
  const comment = await prisma.taskComment.findUnique({
    where: { id: commentId },
    include: {
      task: {
        include: {
          project: {
            include: { company: true }
          }
        }
      }
    }
  });

  if (!comment) throw new AppError('Comment not found', 404);

  // Check if user has access to the project
  const company = await prisma.company.findFirst({
    where: {
      id: comment.task.project.company.id,
      OR: [
        { ownerId: req.user!.id },
        { members: { some: { userId: req.user!.id } } }
      ]
    }
  });

  if (!company) throw new AppError('Not authorized to react to this comment', 403);

  // Add or update reaction
  const reaction = await prisma.reaction.upsert({
    where: {
      userId_commentId_emoji: {
        userId: req.user!.id,
        commentId,
        emoji
      }
    },
    update: {},  // No updates needed if it exists
    create: {
      emoji,
      user: { connect: { id: req.user!.id } },
      comment: { connect: { id: commentId } }
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          imageUrl: true
        }
      }
    }
  });

  // Emit WebSocket event for reaction update
  getWebSocketServer().broadcast(comment.taskId, 'REACTION_UPDATED', {
    commentId,
    reactions: await prisma.reaction.findMany({
      where: { commentId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            imageUrl: true
          }
        }
      }
    })
  });

  res.status(200).json(reaction);
};

// Remove a reaction from a comment
export const removeReaction = async (req: Request, res: Response) => {
  const { commentId, emoji } = req.params;

  // Check if reaction exists
  const reaction = await prisma.reaction.findUnique({
    where: {
      userId_commentId_emoji: {
        userId: req.user!.id,
        commentId,
        emoji
      }
    }
  });

  if (!reaction) throw new AppError('Reaction not found', 404);

  // Get the taskId before deleting the reaction
  const comment = await prisma.taskComment.findUnique({
    where: { id: commentId }
  });
  
  // Delete the reaction
  await prisma.reaction.delete({
    where: {
      userId_commentId_emoji: {
        userId: req.user!.id,
        commentId,
        emoji
      }
    }
  });

  if (comment) {
    // Emit WebSocket event for reaction update
    getWebSocketServer().broadcast(comment.taskId, 'REACTION_UPDATED', {
      commentId,
      reactions: await prisma.reaction.findMany({
        where: { commentId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              imageUrl: true
            }
          }
        }
      })
    });
  }

  res.status(204).send();
};

// Get all reactions for a comment
export const getReactions = async (req: Request, res: Response) => {
  const { commentId } = req.params;

  // Check if comment exists
  const comment = await prisma.taskComment.findUnique({
    where: { id: commentId }
  });

  if (!comment) throw new AppError('Comment not found', 404);

  const reactions = await prisma.reaction.findMany({
    where: { commentId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          imageUrl: true
        }
      }
    }
  });

  res.status(200).json(reactions);
};
