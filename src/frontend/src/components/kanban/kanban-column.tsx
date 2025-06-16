import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { TaskCard } from "@/components/tasks/task-card";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate?: string;
}

interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  onAddTask: (status: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  showTaskActions?: boolean; // New prop to control task actions visibility
}

export function KanbanColumn({
  id,
  title,
  tasks,
  onAddTask,
  onEditTask,
  onDeleteTask,
  showTaskActions = true, // Default to true for backward compatibility
}: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id,
    data: {
      type: "droppable",
    },
  });

  const getColumnColor = () => {
    switch (id) {
      case "TODO":
        return "bg-blue-500";
      case "IN_PROGRESS":
        return "bg-orange-500";
      case "REVIEW":
        return "bg-purple-500";
      case "DONE":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[500px] bg-card border border-border rounded-md w-72 min-w-[288px]">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${getColumnColor()}`} />
          <h3 className="font-medium">{title}</h3>
          <span className="ml-1 text-muted-foreground text-sm">
            ({tasks.length})
          </span>
        </div>
        {showTaskActions && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onAddTask(id)}
            className="h-8 w-8"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div ref={setNodeRef} className="flex-1 p-2 overflow-y-auto">
        <SortableContext
          items={tasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              showActions={showTaskActions}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm italic p-4 text-center">
            No tasks yet. {showTaskActions ? "Click + to add a task." : ""}
          </div>
        )}
      </div>
    </div>
  );
}
