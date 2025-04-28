import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  getCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deleteCompany,
  addMember,
  removeMember,
  uploadImage,
  updateImage,
  deleteImage
} from '../controllers/company.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Ensure upload directories exist
const uploadDir = 'uploads/companies';
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

router.route('/')
  .get(getCompanies)
  .post(createCompany);

router.route('/:id')
  .get(getCompany)
  .put(updateCompany)
  .delete(deleteCompany);

router.post('/:id/members', addMember);
router.delete('/:id/members/:userId', removeMember);

// Image routes
router.post('/:id/image', upload.single('image'), uploadImage);
router.put('/:id/image', upload.single('image'), updateImage);
router.delete('/:id/image', deleteImage);

export { router as companyRouter };
