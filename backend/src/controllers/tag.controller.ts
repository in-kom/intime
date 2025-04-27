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

  const { projectId } = req.params;
  const tags = await prisma.tag.findMany({
    where: { projectId }
  });

  res.status(200).json(tags);
};

// Create tag
export const createTag = async (req: Request, res: Response) => {
  const { companyId } = req.params;
  const { name, color } = req.body;
  const { projectId } = req.params;

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
      project: {
        connect: { id: projectId }
      }
    }
  });

  res.status(201).json(tag);
};

// Get all tags for a project
export const getTagsByProject = async (req: Request, res: Response) => {
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

  const tags = await prisma.tag.findMany({
    where: { projectId }
  });

  res.status(200).json(tags);
};

// Create tag for a project
export const createTagForProject = async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { name, color } = req.body;

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

  const tag = await prisma.tag.create({
    data: {
      name,
      color,
      project: {
        connect: { id: projectId }
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
      project: {
        include: {
          company: true
        }
      }
    }
  });

  if (!tag) {
    throw new AppError('Tag not found', 404);
  }

  // Check if user has access to tag's project's company
  const company = await prisma.company.findFirst({
    where: {
      id: tag.project.companyId,
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
      project: {
        include: {
          company: true
        }
      }
    }
  });

  if (!tag) {
    throw new AppError('Tag not found', 404);
  }

  // Check if user has access to tag's project's company
  const company = await prisma.company.findFirst({
    where: {
      id: tag.project.companyId,
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
