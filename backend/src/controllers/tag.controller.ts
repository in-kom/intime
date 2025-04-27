import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

// Get all tags for a company
export const getTags = async (req: Request, res: Response) => {
  const { companyId } = req.params;

  // Check if user has access to company
  const company = await prisma.company.findFirst({
    where: {
      id: companyId,
      OR: [
        { ownerId: req.user!.id },
        { members: { some: { id: req.user!.id } } }
      ]
    }
  });

  if (!company) {
    throw new AppError('Company not found or you do not have access', 404);
  }

  const tags = await prisma.tag.findMany({
    where: { companyId }
  });

  res.status(200).json(tags);
};

// Create tag
export const createTag = async (req: Request, res: Response) => {
  const { companyId } = req.params;
  const { name, color } = req.body;

  // Check if user has access to company
  const company = await prisma.company.findFirst({
    where: {
      id: companyId,
      OR: [
        { ownerId: req.user!.id },
        { members: { some: { id: req.user!.id } } }
      ]
    }
  });

  if (!company) {
    throw new AppError('Company not found or you do not have access', 404);
  }

  const tag = await prisma.tag.create({
    data: {
      name,
      color,
      company: {
        connect: { id: companyId }
      }
    }
  });

  res.status(201).json(tag);
};

// Update tag
export const updateTag = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, color } = req.body;

  const tag = await prisma.tag.findUnique({
    where: { id },
    include: {
      company: true
    }
  });

  if (!tag) {
    throw new AppError('Tag not found', 404);
  }

  // Check if user has access to tag's company
  const company = await prisma.company.findFirst({
    where: {
      id: tag.companyId,
      OR: [
        { ownerId: req.user!.id },
        { members: { some: { id: req.user!.id } } }
      ]
    }
  });

  if (!company) {
    throw new AppError('Not authorized to update this tag', 403);
  }

  const updatedTag = await prisma.tag.update({
    where: { id },
    data: {
      name,
      color
    }
  });

  res.status(200).json(updatedTag);
};

// Delete tag
export const deleteTag = async (req: Request, res: Response) => {
  const { id } = req.params;

  const tag = await prisma.tag.findUnique({
    where: { id },
    include: {
      company: true
    }
  });

  if (!tag) {
    throw new AppError('Tag not found', 404);
  }

  // Check if user has access to tag's company
  const company = await prisma.company.findFirst({
    where: {
      id: tag.companyId,
      OR: [
        { ownerId: req.user!.id },
        { members: { some: { id: req.user!.id } } }
      ]
    }
  });

  if (!company) {
    throw new AppError('Not authorized to delete this tag', 403);
  }

  await prisma.tag.delete({
    where: { id }
  });

  res.status(204).send();
};
