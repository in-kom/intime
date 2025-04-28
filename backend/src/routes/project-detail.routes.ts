import { Router } from 'express';
import {
  getProjectDetails,
  getProjectDetail,
  createProjectDetail,
  updateProjectDetail,
  deleteProjectDetail
} from '../controllers/project-detail.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

router.get('/project/:projectId', getProjectDetails);
router.post('/project/:projectId', createProjectDetail);

router.route('/:id')
  .get(getProjectDetail)
  .put(updateProjectDetail)
  .delete(deleteProjectDetail);

export { router as projectDetailRouter };
