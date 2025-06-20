import { Router } from "express";
import {
  getComments,
  createComment,
  updateComment,
  deleteComment,
  getReactions,
  addReaction,
  removeReaction,
} from "../controllers/comment.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Comment routes
router.get("/tasks/:taskId/comments", authenticate, getComments);
router.post("/tasks/:taskId/comments", authenticate, createComment);
router.put("/comments/:id", authenticate, updateComment);
router.delete("/comments/:id", authenticate, deleteComment);

// Reaction routes
router.get("/comments/:commentId/reactions", authenticate, getReactions);
router.post("/comments/:commentId/reactions", authenticate, addReaction);
router.delete(
  "/comments/:commentId/reactions/:emoji",
  authenticate,
  removeReaction
);

export default router;
