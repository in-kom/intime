import { Router } from "express";
import {
  getTags,
  createTag,
  updateTag,
  deleteTag,
  getTagsByProject,
  createTagForProject
} from "../controllers/tag.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

router.route("/company/:companyId").get(getTags).post(createTag);

router
  .route("/project/:projectId")
  .get(getTagsByProject)
  .post(createTagForProject);

router.route("/:id").put(updateTag).delete(deleteTag);

export { router as tagRouter };
