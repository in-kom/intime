import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

// Get all companies for current user
export const getCompanies = async (req: Request, res: Response) => {
  const companies = await prisma.company.findMany({
    where: {
      OR: [
        { ownerId: req.user!.id },
        { members: { some: { id: req.user!.id } } }
      ]
    },
    include: {
      _count: {
        select: { projects: true }
      }
    }
  });

  res.status(200).json(companies);
};

// Get company by ID
export const getCompany = async (req: Request, res: Response) => {
  const { id } = req.params;

  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      owner: {
        select: { id: true, name: true, email: true }
      },
      members: {
        select: { id: true, name: true, email: true }
      },
      projects: true
    }
  });

  if (!company) {
    throw new AppError('Company not found', 404);
  }

  // Check if user is owner or member
  const isOwner = company.ownerId === req.user!.id;
  const isMember = company.members.some(member => member.id === req.user!.id);

  if (!isOwner && !isMember) {
    throw new AppError('Not authorized to access this company', 403);
  }

  res.status(200).json(company);
};

// Create company
export const createCompany = async (req: Request, res: Response) => {
  const { name, description } = req.body;

  const company = await prisma.company.create({
    data: {
      name,
      description,
      owner: {
        connect: { id: req.user!.id }
      },
      members: {
        connect: { id: req.user!.id }
      }
    }
  });

  res.status(201).json(company);
};

// Update company
export const updateCompany = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description } = req.body;

  // Check if company exists and user is owner
  const company = await prisma.company.findUnique({
    where: { id }
  });

  if (!company) {
    throw new AppError('Company not found', 404);
  }

  if (company.ownerId !== req.user!.id) {
    throw new AppError('Not authorized to update this company', 403);
  }

  const updatedCompany = await prisma.company.update({
    where: { id },
    data: {
      name,
      description
    }
  });

  res.status(200).json(updatedCompany);
};

// Delete company
export const deleteCompany = async (req: Request, res: Response) => {
  const { id } = req.params;

  // Check if company exists and user is owner
  const company = await prisma.company.findUnique({
    where: { id }
  });

  if (!company) {
    throw new AppError('Company not found', 404);
  }

  if (company.ownerId !== req.user!.id) {
    throw new AppError('Not authorized to delete this company', 403);
  }

  await prisma.company.delete({
    where: { id }
  });

  res.status(204).send();
};

// Add member to company
export const addMember = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { email } = req.body;

  // Check if company exists and user is owner
  const company = await prisma.company.findUnique({
    where: { id }
  });

  if (!company) {
    throw new AppError('Company not found', 404);
  }

  if (company.ownerId !== req.user!.id) {
    throw new AppError('Not authorized to add members to this company', 403);
  }

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Add user to company members
  const updatedCompany = await prisma.company.update({
    where: { id },
    data: {
      members: {
        connect: { id: user.id }
      }
    },
    include: {
      members: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  res.status(200).json(updatedCompany);
};

// Remove member from company
export const removeMember = async (req: Request, res: Response) => {
  const { id, userId } = req.params;

  // Check if company exists and user is owner
  const company = await prisma.company.findUnique({
    where: { id }
  });

  if (!company) {
    throw new AppError('Company not found', 404);
  }

  if (company.ownerId !== req.user!.id) {
    throw new AppError('Not authorized to remove members from this company', 403);
  }

  // Cannot remove the owner
  if (userId === company.ownerId) {
    throw new AppError('Cannot remove the company owner', 400);
  }

  // Remove user from company members
  const updatedCompany = await prisma.company.update({
    where: { id },
    data: {
      members: {
        disconnect: { id: userId }
      }
    },
    include: {
      members: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  res.status(200).json(updatedCompany);
};
