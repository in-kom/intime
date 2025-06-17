import { useState, useEffect } from "react";
import { format } from "date-fns";
import { commentsAPI, TaskComment } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { API_URL } from "@/lib/api";
import { Pencil, Trash2, MessageSquare, Send } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface CommentListProps {
  taskId: string;
  canComment?: boolean;
  initialComments?: TaskComment[];
}

export function CommentList({
  taskId,
  canComment = false,
  initialComments = [],
}: CommentListProps) {
  const [comments, setComments] = useState<TaskComment[]>(initialComments);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    if (initialComments.length === 0) {
      fetchComments();
    }
  }, [taskId]);

  const fetchComments = async () => {
    try {
      setIsLoading(true);
      const response = await commentsAPI.getAll(taskId);
      setComments(response.data);
    } catch (error) {
      console.error("Failed to fetch comments", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      setIsLoading(true);
      const response = await commentsAPI.create(taskId, newComment);
      setComments([...comments, response.data]);
      setNewComment("");
    } catch (error) {
      console.error("Failed to add comment", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditComment = (comment: TaskComment) => {
    setEditingComment(comment.id);
    setEditContent(comment.content);
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      setIsLoading(true);
      const response = await commentsAPI.update(commentId, editContent);
      setComments(
        comments.map((c) => (c.id === commentId ? response.data : c))
      );
      setEditingComment(null);
    } catch (error) {
      console.error("Failed to update comment", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      setIsLoading(true);
      await commentsAPI.delete(commentId);
      setComments(comments.filter((c) => c.id !== commentId));
    } catch (error) {
      console.error("Failed to delete comment", error);
    } finally {
      setIsLoading(false);
    }
  };

  const canEditComment = (comment: TaskComment) => {
    return comment.userId === user?.id;
  };

  if (isLoading && comments.length === 0) {
    return <div className="text-center py-4">Loading comments...</div>;
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center gap-2 mb-2">
        <MessageSquare className="h-5 w-5" />
        <h3 className="font-medium">Comments ({comments.length})</h3>
      </div>

      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
        {comments.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            No comments yet.
          </p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="bg-card border border-border rounded-lg p-3"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={comment.user?.imageUrl ? `${API_URL}${comment.user.imageUrl}` : undefined}
                      alt={comment.user?.name || "User"}
                    />
                    <AvatarFallback>
                      {(comment.user?.name || "U").charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {comment.user?.name || "Unknown User"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(comment.createdAt), "MMM d, yyyy h:mm a")}
                      </span>
                    </div>
                    
                    {editingComment === comment.id ? (
                      <div className="mt-1">
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="min-h-[80px] mb-2"
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingComment(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSaveEdit(comment.id)}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap mt-1">
                        {comment.content}
                      </p>
                    )}
                  </div>
                </div>
                
                {canEditComment(comment) && !editingComment && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <span className="sr-only">Open menu</span>
                        <svg
                          width="15"
                          height="3"
                          viewBox="0 0 15 3"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                        >
                          <path
                            d="M1.5 1.5C1.5 1.89782 1.65804 2.27936 1.93934 2.56066C2.22064 2.84196 2.60218 3 3 3C3.39782 3 3.77936 2.84196 4.06066 2.56066C4.34196 2.27936 4.5 1.89782 4.5 1.5C4.5 1.10218 4.34196 0.720644 4.06066 0.43934C3.77936 0.158035 3.39782 0 3 0C2.60218 0 2.22064 0.158035 1.93934 0.43934C1.65804 0.720644 1.5 1.10218 1.5 1.5ZM7.5 1.5C7.5 1.89782 7.65804 2.27936 7.93934 2.56066C8.22064 2.84196 8.60218 3 9 3C9.39782 3 9.77936 2.84196 10.0607 2.56066C10.342 2.27936 10.5 1.89782 10.5 1.5C10.5 1.10218 10.342 0.720644 10.0607 0.43934C9.77936 0.158035 9.39782 0 9 0C8.60218 0 8.22064 0.158035 7.93934 0.43934C7.65804 0.720644 7.5 1.10218 7.5 1.5ZM13.5 1.5C13.5 1.89782 13.658 2.27936 13.9393 2.56066C14.2206 2.84196 14.6022 3 15 3C15.3978 3 15.7794 2.84196 16.0607 2.56066C16.342 2.27936 16.5 1.89782 16.5 1.5C16.5 1.10218 16.342 0.720644 16.0607 0.43934C15.7794 0.158035 15.3978 0 15 0C14.6022 0 14.2206 0.158035 13.9393 0.43934C13.658 0.720644 13.5 1.10218 13.5 1.5Z"
                            fill="currentColor"
                          />
                        </svg>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditComment(comment)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {canComment && (
        <div className="pt-2">
          <div className="flex gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={user?.imageUrl ? `${API_URL}${user.imageUrl}` : undefined}
                alt={user?.name || "User"}
              />
              <AvatarFallback>
                {(user?.name || "U").charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 flex gap-2">
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[80px] flex-1"
              />
              <Button
                onClick={handleAddComment}
                disabled={!newComment.trim() || isLoading}
                className="self-end"
              >
                <Send className="h-4 w-4 mr-2" />
                Post
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
