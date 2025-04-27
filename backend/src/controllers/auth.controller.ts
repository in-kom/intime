import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

// Register a new user
export const register = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  // Check if user exists
  const userExists = await prisma.user.findUnique({
    where: { email }
  });

  if (userExists) {
    throw new AppError('User already exists', 400);
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create user
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword
    }
  });

  // Generate token
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });

  res.status(201).json({
    id: user.id,
    name: user.name,
    email: user.email,
    token
  });
};

// Login user
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  // Check password
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new AppError('Invalid credentials', 401);
  }

  // Generate token
  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });

  res.status(200).json({
    id: user.id,
    name: user.name,
    email: user.email,
    token
  });
};

// Get current user
export const getMe = async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user?.id },
    select: {
      id: true,
      name: true,
      email: true
    }
  });

  res.status(200).json(user);
};
