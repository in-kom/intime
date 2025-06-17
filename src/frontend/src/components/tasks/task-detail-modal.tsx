import { useState, useEffect } from "react";
import { format } from "date-fns";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Tag as TagIcon,
  ChevronUp, 
  ChevronDown,
  Edit,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { TagBadge } from "@/components/tags/tag-badge";
import { CommentList } from "@/components/comments/comment-list";
import { tasksAPI } from "@/lib/api";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TaskDetailModalProps {
  taskId?: string;
  open: boolean;
  onClose: () => void;
  onEdit?: (task: any) => void;
  onDelete?: (taskId: string) => void;
  canEdit?: boolean;
  canComment?: boolean;
  initialTask?: any;
}

export function TaskDetailModal({
  taskId,
  open,
  onClose,
  onEdit,
  onDelete,
  canEdit = false,
  canComment = false,
  initialTask
}: TaskDetailModalProps) {
  const [task, setTask] = useState<any>(initialTask);
  const [isLoading, setIsLoading] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

  useEffect(() => {
    // If initialTask is provided, use it
    if (initialTask) {
      setTask(initialTask);
      return;
    }
    
    // Otherwise fetch task data if taskId is provided and modal is open
    if (taskId && open) {
      const fetchTask = async () => {
        try {
          setIsLoading(true);
          const response = await tasksAPI.getById(taskId);
          setTask(response.data);
        } catch (error) {
          console.error("Failed to fetch task details", error);
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchTask();
    }
  }, [taskId, open, initialTask]);

  const handleEdit = () => {
    if (onEdit && task) {
      onEdit(task);
      onClose();
    }
  };

  const handleDelete = () => {
    if (onDelete && task) {
      onDelete(task.id);
      onClose();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "TODO":
        return "bg-blue-500 text-white";
      case "IN_PROGRESS":
        return "bg-orange-500 text-white";
      case "REVIEW":
        return "bg-purple-500 text-white";
      case "DONE":
        return "bg-green-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "LOW":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "MEDIUM":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "HIGH":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      case "URGENT":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <div className="flex justify-center items-center py-8">Loading task details...</div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!task) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="text-xl truncate pr-6">{task.title}</span>
            {canEdit && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleEdit}
                  className="h-8"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleDelete} 
                  className="h-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Priority */}
          <div className="flex flex-wrap gap-2">
            <Badge className={getStatusColor(task.status)}>
              {task.status.replace("_", " ")}
            </Badge>
            <Badge className={getPriorityColor(task.priority)}>
              {task.priority} Priority
            </Badge>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {task.startDate && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Start Date</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(task.startDate), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
            )}
            
            {task.dueDate && (
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Due Date</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(task.dueDate), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Description</p>
              <div className="bg-muted/50 rounded-md p-3">
                <p className={`text-sm whitespace-pre-wrap ${!showFullDescription && task.description.length > 300 ? 'line-clamp-4' : ''}`}>
                  {task.description}
                </p>
                {task.description.length > 300 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowFullDescription(!showFullDescription)}
                    className="mt-1 h-6 text-xs"
                  >
                    {showFullDescription ? (
                      <>
                        <ChevronUp className="h-3 w-3 mr-1" />
                        Show less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3 mr-1" />
                        Show more
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-sm font-medium">
                <TagIcon className="h-4 w-4 text-muted-foreground" />
                <span>Tags</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {task.tags.map((tag: Tag) => (
                  <TagBadge key={tag.id} tag={tag} />
                ))}
              </div>
            </div>
          )}
          
          {/* Parent & Dependencies */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {task.parent && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Parent Task</p>
                <p className="text-sm bg-muted/50 rounded-md p-2">{task.parent.title}</p>
              </div>
            )}
            
            {task.dependencies && task.dependencies.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Dependencies</p>
                <div className="space-y-1">
                  {task.dependencies.map((dep: any) => (
                    <p key={dep.id} className="text-sm bg-muted/50 rounded-md p-2">{dep.title}</p>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="pt-2 border-t">
            <CommentList 
              taskId={task.id} 
              canComment={canComment}
              initialComments={task.comments}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
