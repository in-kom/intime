import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { Pencil, Trash2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { commentsAPI } from "@/lib/api";
import { CommentReactions } from "./comment-reactions";
import webSocketService from "@/services/websocket.service";

interface User {
  id: string;
  name: string;
  email: string;
  imageUrl?: string;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  user?: User;
  reactions?: any[];
}

interface CommentListProps {
  taskId: string;
  projectId: string;
  companyId?: string;
  canComment?: boolean;
  initialComments?: Comment[];
  useWebSocket?: boolean;
}

export function CommentList({
  taskId,
  projectId,
  companyId,
  canComment = true,
  initialComments = [],
  useWebSocket = false,
}: CommentListProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments || []);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // Track if initial comments have been loaded to avoid duplicate requests
  const commentsLoadedRef = useRef<boolean>(!!initialComments && initialComments.length > 0);
  const isSubscribedRef = useRef<boolean>(false);

  // Log for debugging
  console.log("CommentList initialized with:", {
    taskId,
    hasInitialComments: !!initialComments && initialComments.length > 0,
    commentCount: initialComments?.length || 0,
    useWebSocket
  });

  const bottomRef = useRef<HTMLDivElement>(null);

  // Initial load of comments when needed
  useEffect(() => {
    if (!taskId) return;

    // Update comments from initialComments when they change
    if (initialComments && initialComments.length > 0) {
      console.log("Setting comments from initialComments:", initialComments.length);
      setComments(initialComments);
      commentsLoadedRef.current = true;
    } 
    // Only fetch if not using WebSockets or if we have no initial comments
    else if (!commentsLoadedRef.current && (!useWebSocket || !isSubscribedRef.current)) {
      console.log("Fetching comments via API");
      fetchComments();
    }
  }, [taskId, initialComments]);

  // Setup WebSocket listeners for comments
  useEffect(() => {
    if (!taskId || !useWebSocket || isSubscribedRef.current) return;
    
    console.log("Setting up WebSocket listeners for comments on task:", taskId);
    isSubscribedRef.current = true;

    // Subscribe to task via WebSocket
    webSocketService.subscribe(taskId);
    
    const commentCreatedListener = webSocketService.addListener('COMMENT_CREATED', (newComment) => {
      console.log("WebSocket: Comment created", newComment);
      if (newComment.taskId === taskId) {
        setComments(prev => {
          // Check if we already have this comment
          if (prev.some(c => c.id === newComment.id)) return prev;
          return [...prev, newComment];
        });
      }
    });

    const commentUpdatedListener = webSocketService.addListener('COMMENT_UPDATED', (updatedComment) => {
      console.log("WebSocket: Comment updated", updatedComment);
      if (updatedComment.taskId === taskId) {
        setComments(prev => prev.map(c => c.id === updatedComment.id ? updatedComment : c));
      }
    });

    const commentDeletedListener = webSocketService.addListener('COMMENT_DELETED', (data) => {
      console.log("WebSocket: Comment deleted", data);
      if (data.taskId === taskId) {
        setComments(prev => prev.filter(c => c.id !== data.id));
      }
    });

    return () => {
      console.log("Cleaning up WebSocket listeners");
      commentCreatedListener();
      commentUpdatedListener();
      commentDeletedListener();
      webSocketService.unsubscribe(taskId);
      isSubscribedRef.current = false;
    };
  }, [taskId, useWebSocket]);

  useEffect(() => {
    // Scroll to the bottom when comments change
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments]);

  const fetchComments = async () => {
    if (!taskId || commentsLoadedRef.current) return;
    
    try {
      setIsLoading(true);
      console.log("Fetching comments for task:", taskId);
      const response = await commentsAPI.getAll(taskId);
      console.log("Comments fetched:", response.data.length);
      setComments(response.data);
      commentsLoadedRef.current = true;
    } catch (error) {
      console.error("Failed to fetch comments", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    try {
      setIsSubmitting(true);
      console.log("Submitting new comment for task:", taskId);
      const response = await commentsAPI.create(taskId, newComment);
      
      // If not using WebSockets, update local state immediately
      if (!useWebSocket) {
        setComments(prev => [...prev, response.data]);
      }
      
      setNewComment("");
    } catch (error) {
      console.error("Failed to post comment", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditContent(comment.content);
  };

  const handleUpdateComment = async () => {
    if (!editingCommentId || !editContent.trim()) return;

    try {
      setIsSubmitting(true);
      const response = await commentsAPI.update(editingCommentId, editContent);
      
      // If not using WebSockets, update local state immediately
      if (!useWebSocket) {
        setComments(prev => prev.map((c) => (c.id === editingCommentId ? response.data : c)));
      }
      
      setEditingCommentId(null);
      setEditContent("");
    } catch (error) {
      console.error("Failed to update comment", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
      await commentsAPI.delete(commentId);
      
      // If not using WebSockets, update local state immediately
      if (!useWebSocket) {
        setComments(prev => prev.filter((c) => c.id !== commentId));
      }
    } catch (error) {
      console.error("Failed to delete comment", error);
    }
  };

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  console.log("Rendering CommentList with comments:", comments.length);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Comments</h3>

      {isLoading ? (
        <div className="text-center py-4 text-sm text-muted-foreground">
          Loading comments...
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-4 text-sm text-muted-foreground">
          No comments yet.
        </div>
      ) : (
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="h-8 w-8">
                {comment.user?.imageUrl && (
                  <AvatarImage src={comment.user.imageUrl} />
                )}
                <AvatarFallback>
                  {comment.user
                    ? getUserInitials(comment.user.name)
                    : "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">
                    {comment.user?.name || "Unknown User"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(comment.createdAt), "MMM d, yyyy h:mm a")}
                  </div>
                </div>

                {editingCommentId === comment.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingCommentId(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleUpdateComment}
                        disabled={isSubmitting}
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-sm whitespace-pre-wrap">
                      {comment.content}
                    </div>
                    
                    <CommentReactions 
                      commentId={comment.id} 
                      taskId={taskId} // Make sure taskId is always passed
                      initialReactions={comment.reactions}
                      useWebSocket={useWebSocket}
                    />
                    
                    {comment.userId === localStorage.getItem("userId") && (
                      <div className="flex gap-2 mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleEditComment(comment)}
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {canComment && (
        <div className="pt-2 border-t mt-4">
          <div className="flex gap-2">
            <Textarea
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
          <div className="flex justify-end mt-2">
            <Button
              onClick={handleSubmitComment}
              disabled={isSubmitting || !newComment.trim()}
            >
              <Send className="h-4 w-4 mr-2" />
              Post Comment
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
