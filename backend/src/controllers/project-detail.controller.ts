import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

// Get all details for a project
export const getProjectDetails = async (req: Request, res: Response) => {
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

  const details = await prisma.projectDetail.findMany({
    where: { projectId }
  });

  res.status(200).json(details);
};

// Get a specific detail
export const getProjectDetail = async (req: Request, res: Response) => {
  const { id } = req.params;

  const detail = await prisma.projectDetail.findUnique({
    where: { id },
    include: {
      project: {
        include: {
          company: true
        }
      }
    }
  });

  if (!detail) {
    throw new AppError('Detail not found', 404);
  }

  // Check if user has access to detail's project's company
  const company = await prisma.company.findFirst({
    where: {
      id: detail.project.companyId,
      OR: [
        { ownerId: req.user!.id },
        { members: { some: { id: req.user!.id } } }
      ]
    }
  });

  if (!company) {
    throw new AppError('Not authorized to access this detail', 403);
  }

  res.status(200).json(detail);
};

// Create a detail for a project
export const createProjectDetail = async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { title, url, description } = req.body;

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
    throw new AppError('Not authorized to create details for this project', 403);
  }

  const detail = await prisma.projectDetail.create({
    data: {
      title,
      url,
      description,
      project: {
        connect: { id: projectId }
      }
    }
  });

  res.status(201).json(detail);
};

// Update a detail
export const updateProjectDetail = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, url, description } = req.body;

  const detail = await prisma.projectDetail.findUnique({
    where: { id },
    include: {
      project: {
        include: {
          company: true
        }
      }
    }
  });

  if (!detail) {
    throw new AppError('Detail not found', 404);
  }

  // Check if user has access to detail's project's company
  const company = await prisma.company.findFirst({
    where: {
      id: detail.project.companyId,
      OR: [
        { ownerId: req.user!.id },
        { members: { some: { id: req.user!.id } } }
      ]
    }
  });

  if (!company) {
    throw new AppError('Not authorized to update this detail', 403);
  }

  const updatedDetail = await prisma.projectDetail.update({
    where: { id },
    data: {
      title,
      url,
      description
    }
  });

  res.status(200).json(updatedDetail);
};

// Delete a detail
export const deleteProjectDetail = async (req: Request, res: Response) => {
  const { id } = req.params;

  const detail = await prisma.projectDetail.findUnique({
    where: { id },
    include: {
      project: {
        include: {
          company: true
        }
      }
    }
  });

  if (!detail) {
    throw new AppError('Detail not found', 404);
  }

  // Check if user has access to detail's project's company
  const company = await prisma.company.findFirst({
    where: {
      id: detail.project.companyId,
      OR: [
        { ownerId: req.user!.id },
        { members: { some: { id: req.user!.id } } }
      ]
    }
  });

  if (!company) {
    throw new AppError('Not authorized to delete this detail', 403);
  }

  await prisma.projectDetail.delete({
    where: { id }
  });

  res.status(204).send();
};
