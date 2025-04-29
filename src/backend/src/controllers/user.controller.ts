import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

// Update user profile
export const updateProfile = async (req: Request, res: Response) => {
  const { name } = req.body;
  
  // Validate input
  if (!name || name.trim() === '') {
    throw new AppError('Name is required', 400);
  }

  const updatedUser = await prisma.user.update({
    where: { id: req.user!.id },
    data: { name },
    select: {
      id: true,
      name: true,
      email: true,
      imageUrl: true
    }
  });

  res.status(200).json(updatedUser);
};

// Upload user profile image
export const uploadProfileImage = async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError('No image file provided', 400);
  }
  
  const imageUrl = `/uploads/users/${req.file.filename}`;
  
  // Update user with image URL
  const updatedUser = await prisma.user.update({
    where: { id: req.user!.id },
    data: { imageUrl },
    select: {
      id: true,
      name: true,
      email: true,
      imageUrl: true
    }
  });
  
  res.status(200).json(updatedUser);
};

// Update user profile image
export const updateProfileImage = async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError('No image file provided', 400);
  }
  
  const imageUrl = `/uploads/users/${req.file.filename}`;
  
  // Get current user to check if they have an existing image
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id }
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }
  
  // If user already has an image, you might want to delete the old file here
  // (implementation would depend on your file storage system)
  
  // Update user with new image URL
  const updatedUser = await prisma.user.update({
    where: { id: req.user!.id },
    data: { imageUrl },
    select: {
      id: true,
      name: true,
      email: true,
      imageUrl: true
    }
  });
  
  res.status(200).json(updatedUser);
};

// Delete user profile image
export const deleteProfileImage = async (req: Request, res: Response) => {
  // Get current user to check if they have an existing image
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id }
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }
  
  // Check if user has an image
  if (!user.imageUrl) {
    throw new AppError('User does not have a profile image', 400);
  }
  
  // Delete the file if needed
  // (implementation would depend on your file storage system)
  
  // Update user to remove image URL
  const updatedUser = await prisma.user.update({
    where: { id: req.user!.id },
    data: { imageUrl: null },
    select: {
      id: true,
      name: true,
      email: true,
      imageUrl: true
    }
  });
  
  res.status(200).json(updatedUser);
};
