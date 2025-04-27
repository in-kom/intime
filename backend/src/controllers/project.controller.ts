import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

// Get all projects for a company
export const getProjects = async (req: Request, res: Response) => {
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

  const projects = await prisma.project.findMany({
    where: { companyId },
    include: {
      _count: {
        select: { tasks: true }
      }
    }
  });

  res.status(200).json(projects);
};

// Get project by ID
export const getProject = async (req: Request, res: Response) => {
  const { id } = req.params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      company: {
        include: {
          owner: {
            select: { id: true, name: true, email: true }
          },
          members: {
            select: { id: true, name: true, email: true }
          }
        }
      },
      tasks: true
    }
  });

  if (!project) {
    throw new AppError('Project not found', 404);
  }

  // Check if user has access to project's company
  const isOwner = project.company.ownerId === req.user!.id;
  const isMember = project.company.members.some(member => member.id === req.user!.id);

  if (!isOwner && !isMember) {
    throw new AppError('Not authorized to access this project', 403);
  }

  res.status(200).json(project);
};

// Create project
export const createProject = async (req: Request, res: Response) => {
  const { companyId } = req.params;
  const { name, description } = req.body;

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

  const project = await prisma.project.create({
    data: {
      name,
      description,
      company: {
        connect: { id: companyId }
      }
    }
  });

  res.status(201).json(project);
};

// Update project
export const updateProject = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description } = req.body;

  // Check if project exists and user has access
  const project = await prisma.project.findUnique({
    where: { id },
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
    throw new AppError('Not authorized to update this project', 403);
  }

  const updatedProject = await prisma.project.update({
    where: { id },
    data: {
      name,
      description
    }
  });

  res.status(200).json(updatedProject);
};

// Delete project
export const deleteProject = async (req: Request, res: Response) => {
  const { id } = req.params;

  // Check if project exists and user has access
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      company: true
    }
  });

  if (!project) {
    throw new AppError('Project not found', 404);
  }

  // Check if user is company owner (only owner can delete projects)
  const company = await prisma.company.findFirst({
    where: {
      id: project.companyId,
      ownerId: req.user!.id
    }
  });

  if (!company) {
    throw new AppError('Not authorized to delete this project', 403);
  }

  await prisma.project.delete({
    where: { id }
  });

  res.status(204).send();
};
