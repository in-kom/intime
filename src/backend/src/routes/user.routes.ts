import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  updateProfile,
  uploadProfileImage,
  updateProfileImage,
  deleteProfileImage
} from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Ensure upload directories exist
const uploadDir = 'uploads/users';
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    cb(null, `${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only images are allowed"));
  }
});

// Apply authentication middleware to all routes
router.use(authenticate);

// Profile routes
router.put('/profile', updateProfile);

// Image routes
router.post('/image', upload.single('image'), uploadProfileImage);
router.put('/image', upload.single('image'), updateProfileImage);
router.delete('/image', deleteProfileImage);

export { router as userRouter };
