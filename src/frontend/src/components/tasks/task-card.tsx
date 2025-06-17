import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import { CalendarIcon, MoreHorizontal, Trash2, Pencil, MessageSquare } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { TagBadge } from "@/components/tags/tag-badge";
import { TaskDetailModal } from "./task-detail-modal";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate?: string;
  tags?: Tag[];
  _count?: {
    comments?: number;
  };
}

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  disableDrag?: boolean;
  showActions?: boolean;
}

export function TaskCard({
  task,
  onEdit,
  onDelete,
  disableDrag,
  showActions = true,
}: TaskCardProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: disableDrag,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  const handleEdit = () => {
    onEdit(task);
  };

  const priorityColors = {
    LOW: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    MEDIUM:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    URGENT: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent opening detail modal when clicking on dropdown menu
    if ((e.target as HTMLElement).closest('.dropdown-trigger')) {
      return;
    }
    setIsDetailOpen(true);
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...(disableDrag ? {} : attributes)}
        {...(disableDrag ? {} : listeners)}
        className={`bg-card border border-border rounded-md p-3 mb-2 shadow-sm hover:shadow-md transition-shadow ${
          disableDrag ? "" : "cursor-pointer active:cursor-grabbing"
        }`}
        onClick={handleCardClick}
      >
        <div className="flex justify-between items-start">
          <h3 className="font-medium text-sm">{task.title}</h3>
          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 dropdown-trigger"
                  onClick={(e) => e.stopPropagation()} // Prevent card click event
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(task.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {task.description && (
          <p className="text-muted-foreground text-sm mt-2 line-clamp-2 overflow-hidden text-ellipsis">
            {task.description}
          </p>
        )}

        <div className="flex flex-wrap gap-2 mt-3">
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              priorityColors[task.priority]
            }`}
          >
            {task.priority}
          </span>

          {task.dueDate && (
            <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" />
              {format(new Date(task.dueDate), "MMM d")}
            </span>
          )}
          
          {/* Only show comment count if it's greater than 0 */}
          {(task._count?.comments ?? 0) > 0 && (
            <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground flex items-center gap-1 cursor-pointer">
              <MessageSquare className="h-3 w-3" />
              {task._count!.comments}
            </span>
          )}
        </div>

        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {task.tags.map((tag) => (
              <TagBadge key={tag.id} tag={tag} />
            ))}
          </div>
        )}
      </div>

      <TaskDetailModal
        open={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        initialTask={task}
        onEdit={onEdit}
        onDelete={onDelete}
        canEdit={showActions}
        canComment={showActions}
      />
    </>
  );
}
