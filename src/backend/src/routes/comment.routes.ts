import { Router } from "express";
import {
  getComments,
  createComment,
  updateComment,
  deleteComment,
} from "../controllers/comment.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticate);

// Comments for a specific task - apply authentication to each route individually
router.get("/tasks/:taskId/comments", getComments);
router.post("/tasks/:taskId/comments", createComment);

// Individual comment operations
router.put("/comments/:id", updateComment);
router.delete("/comments/:id", deleteComment);

export default router;
