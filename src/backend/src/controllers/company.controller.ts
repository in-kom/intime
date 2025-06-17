import { Request, Response } from 'express';
import { PrismaClient, CompanyRole } from '@prisma/client';
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

// Get all companies for current user
export const getCompanies = async (req: Request, res: Response) => {
  const companies = await prisma.company.findMany({
    where: {
      OR: [
        { ownerId: req.user!.id },
        { members: { some: { userId: req.user!.id } } }
      ]
    },
    include: {
      _count: { select: { projects: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true } } }
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
      owner: { select: { id: true, name: true, email: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true } } }
      },
      projects: true
    }
  });

  if (!company) throw new AppError('Company not found', 404);

  // Check if user is owner or member
  const isOwner = company.ownerId === req.user!.id;
  const isMember = company.members.some(member => member.userId === req.user!.id);

  if (!isOwner && !isMember) throw new AppError('Not authorized to access this company', 403);

  res.status(200).json(company);
};

// Create company
export const createCompany = async (req: Request, res: Response) => {
  const { name, description } = req.body;

  const company = await prisma.company.create({
    data: {
      name,
      description,
      owner: { connect: { id: req.user!.id } },
      members: {
        create: {
          userId: req.user!.id,
          role: CompanyRole.EDITOR
        }
      }
    },
    include: {
      members: true
    }
  });

  res.status(201).json(company);
};

// Update company
export const updateCompany = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description } = req.body;

  // Only EDITORs or owner can update
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) throw new AppError('Company not found', 404);

  const isOwner = company.ownerId === req.user!.id;
  const role = await getUserCompanyRole(req.user!.id, id);

  if (!isOwner && role !== 'EDITOR') throw new AppError('Not authorized to update this company', 403);

  const updatedCompany = await prisma.company.update({
    where: { id },
    data: { name, description }
  });

  res.status(200).json(updatedCompany);
};

// Delete company
export const deleteCompany = async (req: Request, res: Response) => {
  const { id } = req.params;

  // Only owner can delete
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) throw new AppError('Company not found', 404);

  if (company.ownerId !== req.user!.id) throw new AppError('Not authorized to delete this company', 403);

  await prisma.company.delete({ where: { id } });

  res.status(204).send();
};

// Add member to company (default role: READER, can be set in body)
export const addMember = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { email, role = CompanyRole.READER } = req.body;

  // Only EDITORs or owner can add members
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) throw new AppError('Company not found', 404);

  const isOwner = company.ownerId === req.user!.id;
  const userRole = await getUserCompanyRole(req.user!.id, id);

  if (!isOwner && userRole !== 'EDITOR') throw new AppError('Not authorized to add members', 403);

  // Find user by email
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError('User not found', 404);

  // Add user to company members
  await prisma.companyMember.upsert({
    where: { userId_companyId: { userId: user.id, companyId: id } },
    update: { role },
    create: { userId: user.id, companyId: id, role }
  });

  const updatedCompany = await prisma.company.findUnique({
    where: { id },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } }
    }
  });

  res.status(200).json(updatedCompany);
};

// Remove member from company
export const removeMember = async (req: Request, res: Response) => {
  const { id, userId } = req.params;

  // Only EDITORs or owner can remove members
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) throw new AppError('Company not found', 404);

  const isOwner = company.ownerId === req.user!.id;
  const userRole = await getUserCompanyRole(req.user!.id, id);

  if (!isOwner && userRole !== 'EDITOR') throw new AppError('Not authorized to remove members', 403);

  // Cannot remove the owner
  if (userId === company.ownerId) throw new AppError('Cannot remove the company owner', 400);

  await prisma.companyMember.delete({
    where: { userId_companyId: { userId, companyId: id } }
  });

  const updatedCompany = await prisma.company.findUnique({
    where: { id },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } }
    }
  });

  res.status(200).json(updatedCompany);
};

// Upload company image
export const uploadImage = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  // Check if user has access to company
  const company = await prisma.company.findFirst({
    where: {
      id,
      OR: [
        { ownerId: req.user!.id },
        { members: { some: { id: req.user!.id } } }
      ]
    }
  });

  if (!company) {
    throw new AppError('Company not found or you do not have access', 404);
  }
  
  // Handle file upload (using file upload middleware)
  if (!req.file) {
    throw new AppError('No image file provided', 400);
  }
  
  // Store the file path with full URL
  const imageUrl = `/uploads/companies/${req.file.filename}`;
  
  // Update company with image URL
  const updatedCompany = await prisma.company.update({
    where: { id },
    data: { imageUrl }
  });
  
  res.status(200).json(updatedCompany);
};

// Update company image
export const updateImage = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  // Check if user has access to company
  const company = await prisma.company.findFirst({
    where: {
      id,
      OR: [
        { ownerId: req.user!.id },
        { members: { some: { id: req.user!.id } } }
      ]
    }
  });

  if (!company) {
    throw new AppError('Company not found or you do not have access', 404);
  }
  
  // Handle file upload
  if (!req.file) {
    throw new AppError('No image file provided', 400);
  }
  
  // If company already has an image, you might want to delete the old file here
  // (implementation would depend on your file storage system)
  
  // Store the new file path with full URL
  const imageUrl = `/uploads/companies/${req.file.filename}`;
  
  // Update company with new image URL
  const updatedCompany = await prisma.company.update({
    where: { id },
    data: { imageUrl }
  });
  
  res.status(200).json(updatedCompany);
};

// Delete company image
export const deleteImage = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  // Check if user has access to company
  const company = await prisma.company.findFirst({
    where: {
      id,
      OR: [
        { ownerId: req.user!.id },
        { members: { some: { id: req.user!.id } } }
      ]
    }
  });

  if (!company) {
    throw new AppError('Company not found or you do not have access', 404);
  }
  
  // Check if company has an image
  if (!company.imageUrl) {
    throw new AppError('Company does not have an image', 400);
  }
  
  // Delete the file if needed
  // (implementation would depend on your file storage system)
  
  // Update company to remove image URL
  const updatedCompany = await prisma.company.update({
    where: { id },
    data: { imageUrl: null }
  });
  
  res.status(204).send();
};

// Update member role
export const updateMemberRole = async (req: Request, res: Response) => {
  const { id, userId } = req.params;
  const { role } = req.body;

  // Only owner or EDITOR can change roles
  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) throw new AppError('Company not found', 404);

  const isOwner = company.ownerId === req.user!.id;
  const userRole = await getUserCompanyRole(req.user!.id, id);

  if (!isOwner && userRole !== 'EDITOR') throw new AppError('Not authorized to update member roles', 403);

  // Cannot change role of owner
  if (userId === company.ownerId) throw new AppError('Cannot change role of the company owner', 400);

  const updatedMember = await prisma.companyMember.update({
    where: { userId_companyId: { userId, companyId: id } },
    data: { role }
  });

  res.status(200).json(updatedMember);
};
