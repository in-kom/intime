import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AppError } from "../middleware/error.middleware";
import { getWebSocketServer } from '../services/websocket.service';

const prisma = new PrismaClient();

// Helper to get user's role in a company
async function getUserCompanyRole(userId: string, companyId: string) {
  if (!userId || !companyId) return null;
  const member = await prisma.companyMember.findUnique({
    where: { userId_companyId: { userId, companyId } },
  });
  return member?.role || null;
}

// Helper to extract mentions from comment content
function extractMentions(content: string): string[] {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[2]); // Extract user ID
  }

  return mentions;
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
          company: true,
        },
      },
    },
  });

  if (!task) throw new AppError("Task not found", 404);

  const company = await prisma.company.findFirst({
    where: {
      id: task.project.companyId,
      OR: [
        { ownerId: req.user!.id },
        { members: { some: { userId: req.user!.id } } },
      ],
    },
  });

  if (!company) throw new AppError("Not authorized to access this task", 403);

  const comments = await prisma.taskComment.findMany({
    where: { taskId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          imageUrl: true,
        },
      },
      // Include reactions with each comment
      reactions: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              imageUrl: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Returning ${comments.length} comments for task ${taskId}`);
  res.status(200).json(comments);
};

// Create a comment (updated to handle mentions and WebSockets)
export const createComment = async (req: Request, res: Response) => {
  const { taskId } = req.params;
  const { content } = req.body;

  if (!content) throw new AppError("Comment content is required", 400);

  // Check if task exists and user has access (any role)
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: {
          company: true,
        },
      },
    },
  });

  if (!task) throw new AppError("Task not found", 404);

  // Check if user has access to task's company (at least COMMENTER role)
  const company = task.project.company;
  const isOwner = company.ownerId === req.user!.id;
  const role = await getUserCompanyRole(req.user!.id, company.id);

  if (!isOwner && role !== "EDITOR" && role !== "COMMENTER") {
    throw new AppError("Not authorized to add comments to this task", 403);
  }

  // Extract mentions from content
  const mentionedUserIds = extractMentions(content);

  // Create the comment with transactions to handle mentions
  const comment = await prisma.$transaction(async (tx) => {
    // Create the comment
    const newComment = await tx.taskComment.create({
      data: {
        content,
        task: { connect: { id: taskId } },
        user: { connect: { id: req.user!.id } },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
          },
        },
      },
    });

    // Create mentions if any
    if (mentionedUserIds.length > 0) {
      // Validate that mentioned users exist and have access to this project
      const validUsers = await tx.user.findMany({
        where: {
          id: { in: mentionedUserIds },
          OR: [
            { ownedCompanies: { some: { id: company.id } } },
            { companies: { some: { companyId: company.id } } },
          ],
        },
      });

      const validUserIds = validUsers.map((user) => user.id);

      // Create mention records
      await Promise.all(
        validUserIds.map((userId) =>
          tx.userMention.create({
            data: {
              user: { connect: { id: userId } },
              comment: { connect: { id: newComment.id } },
            },
          })
        )
      );

      // TODO: Send notifications to mentioned users
    }

    return newComment;
  });

  // Emit WebSocket event for new comment
  getWebSocketServer().broadcast(taskId, 'COMMENT_CREATED', comment);

  res.status(201).json(comment);
};

// Update a comment
export const updateComment = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content) throw new AppError("Comment content is required", 400);

  // Check if comment exists
  const comment = await prisma.taskComment.findUnique({
    where: { id },
    include: {
      task: {
        include: {
          project: {
            include: {
              company: true,
            },
          },
        },
      },
    },
  });

  if (!comment) throw new AppError("Comment not found", 404);

  // Only the comment author or company owner/editor can update a comment
  if (comment.userId !== req.user!.id) {
    const company = comment.task.project.company;
    const isOwner = company.ownerId === req.user!.id;
    const role = await getUserCompanyRole(req.user!.id, company.id);

    if (!isOwner && role !== "EDITOR") {
      throw new AppError("Not authorized to update this comment", 403);
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
          imageUrl: true,
        },
      },
    },
  });

  // Emit WebSocket event for updated comment
  getWebSocketServer().broadcast(comment.task.id, 'COMMENT_UPDATED', updatedComment);

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
              company: true,
            },
          },
        },
      },
    },
  });

  if (!comment) throw new AppError("Comment not found", 404);

  // Only the comment author or company owner/editor can delete a comment
  if (comment.userId !== req.user!.id) {
    const company = comment.task.project.company;
    const isOwner = company.ownerId === req.user!.id;
    const role = await getUserCompanyRole(req.user!.id, company.id);

    if (!isOwner && role !== "EDITOR") {
      throw new AppError("Not authorized to delete this comment", 403);
    }
  }

  await prisma.taskComment.delete({
    where: { id }
  });

  // Emit WebSocket event for deleted comment
  getWebSocketServer().broadcast(comment.task.id, 'COMMENT_DELETED', { id });

  res.status(204).send();
};

// Get reactions for a comment
export const getReactions = async (req: Request, res: Response) => {
  const { commentId } = req.params;

  console.log(`Getting reactions for comment ${commentId}`);

  // Ensure the comment exists
  const comment = await prisma.taskComment.findUnique({
    where: { id: commentId },
    include: { task: { include: { project: true } } }
  });

  if (!comment) {
    throw new AppError('Comment not found', 404);
  }

  // Check if user has access to the task's project
  const company = await prisma.company.findFirst({
    where: {
      id: comment.task.project.companyId,
      OR: [
        { ownerId: req.user!.id },
        { members: { some: { userId: req.user!.id } } }
      ]
    }
  });

  if (!company) {
    throw new AppError('Not authorized to access this comment', 403);
  }

  const reactions = await prisma.reaction.findMany({
    where: { commentId: commentId },  // Note: using taskCommentId instead of commentId
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

  console.log(`Found ${reactions.length} reactions for comment ${commentId}`);
  res.status(200).json(reactions);
};

// Add a reaction to a comment
export const addReaction = async (req: Request, res: Response) => {
  const { commentId } = req.params;
  const { emoji } = req.body;
  const userId = req.user!.id;

  console.log(`Adding reaction ${emoji} to comment ${commentId} by user ${userId}`);

  // Check if comment exists
  const comment = await prisma.taskComment.findUnique({
    where: { id: commentId },
    include: { task: { include: { project: true } } }
  });

  if (!comment) {
    throw new AppError('Comment not found', 404);
  }

  // Check if user has access to the project
  const project = comment.task.project;
  const company = await prisma.company.findFirst({
    where: {
      id: project.companyId,
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } }
      ]
    }
  });

  if (!company) {
    throw new AppError('Not authorized to react to this comment', 403);
  }

  // Check if user has already reacted with this emoji
  const existingReaction = await prisma.reaction.findFirst({
    where: {
      commentId: commentId,  // Note: using taskCommentId
      userId,
      emoji
    }
  });

  // If reaction already exists, return it without creating a duplicate
  if (existingReaction) {
    return res.status(200).json(existingReaction);
  }

  // Create the reaction
  const reaction = await prisma.reaction.create({
    data: {
      emoji,
      comment: { connect: { id: commentId } },  // Note: using taskComment
      user: { connect: { id: userId } }
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

  // Emit WebSocket event for new reaction - include all necessary identifiers
  getWebSocketServer().broadcast(comment.taskId, 'REACTION_ADDED', {
    ...reaction,
    commentId: commentId,  // Add explicit commentId
    taskId: comment.taskId // Add taskId for frontend reference
  });

  res.status(201).json(reaction);
};

// Remove a reaction
export const removeReaction = async (req: Request, res: Response) => {
  const { commentId, emoji } = req.params;
  const userId = req.user!.id;

  console.log(`Removing reaction ${emoji} from comment ${commentId} by user ${userId}`);

  // Check if comment exists
  const comment = await prisma.taskComment.findUnique({
    where: { id: commentId },
    include: { task: { include: { project: true } } }
  });

  if (!comment) {
    throw new AppError('Comment not found', 404);
  }

  // Find the reaction
  const reaction = await prisma.reaction.findFirst({
    where: {
      commentId: commentId,  // Note: using taskCommentId
      userId,
      emoji: decodeURIComponent(emoji)
    }
  });

  if (!reaction) {
    throw new AppError('Reaction not found', 404);
  }

  // Delete the reaction
  await prisma.reaction.delete({
    where: { id: reaction.id }
  });

  // Emit WebSocket event for removed reaction - include all necessary identifiers
  getWebSocketServer().broadcast(comment.taskId, 'REACTION_REMOVED', { 
    id: reaction.id, 
    commentId: commentId,
    userId: userId,
    emoji: decodeURIComponent(emoji),
    taskId: comment.taskId
  });

  res.status(204).send();
};
