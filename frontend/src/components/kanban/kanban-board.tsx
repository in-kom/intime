import { useState, useEffect } from "react";
import { 
  DndContext, 
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverlay
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { KanbanColumn } from "./kanban-column";
import { TaskCard } from "../tasks/task-card";
import { tasksAPI } from "@/lib/api";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate?: string;
}

interface TaskFormData {
  title: string;
  description?: string;
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate?: string;
}

interface KanbanBoardProps {
  projectId: string;
  onAddTask: (data: TaskFormData) => void;
  onEditTask: (id: string, data: TaskFormData) => void;
  onDeleteTask: (id: string) => void;
}

export function KanbanBoard({ 
  projectId, 
  onAddTask, 
  onEditTask, 
  onDeleteTask 
}: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await tasksAPI.getAll(projectId);
        setTasks(response.data);
      } catch (error) {
        console.error("Failed to fetch tasks", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, [projectId]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeTaskId = active.id as string;
    const task = tasks.find(task => task.id === activeTaskId);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);

    const { active, over } = event;
    
    if (!over) return;
    
    const activeTaskId = active.id as string;
    const overTaskId = over.id as string;
    
    if (activeTaskId === overTaskId) return;
    
    // Only handle reordering here - column changes are handled in handleDragOver
    if (over.data.current?.type !== "droppable") {
      setTasks((tasks) => {
        const oldIndex = tasks.findIndex((task) => task.id === activeTaskId);
        const newIndex = tasks.findIndex((task) => task.id === overTaskId);
        
        return arrayMove(tasks, oldIndex, newIndex);
      });
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const activeTaskId = active.id as string;
    const overId = over.id as string;
    
    // Don't do anything if we're not over a droppable container or the same task
    if (activeTaskId === overId || !over.data.current) return;
    
    // Handle dropping a task into a column
    if (over.data.current?.type === "droppable") {
      const activeTask = tasks.find((task) => task.id === activeTaskId);
      if (!activeTask) return;
      
      const newStatus = overId as "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
      if (activeTask.status === newStatus) return;
      
      // Update the task status in the UI
      setTasks((tasks) =>
        tasks.map((task) =>
          task.id === activeTaskId ? { ...task, status: newStatus } : task
        )
      );
      
      // Update the task status in the backend
      tasksAPI.update(activeTaskId, { ...activeTask, status: newStatus })
        .catch((error) => {
          console.error("Failed to update task status", error);
          // Rollback UI change if the API call fails
          setTasks((tasks) => [...tasks]);
        });
    }
  };

  const handleAddTask = (status: string) => {
    const newTask: TaskFormData = {
      title: "New Task",
      status: status as "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE",
      priority: "MEDIUM",
    };
    
    onAddTask(newTask);
  };

  const handleEditTask = (task: Task) => {
    onEditTask(task.id, task);
  };

  const handleDeleteTask = (taskId: string) => {
    onDeleteTask(taskId);
  };

  // Group tasks by status
  const tasksByStatus = {
    TODO: tasks.filter((task) => task.status === "TODO"),
    IN_PROGRESS: tasks.filter((task) => task.status === "IN_PROGRESS"),
    REVIEW: tasks.filter((task) => task.status === "REVIEW"),
    DONE: tasks.filter((task) => task.status === "DONE"),
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-full">Loading...</div>;
  }

  return (
    <div className="h-full">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
      >
        <div className="flex gap-4 h-full overflow-x-auto pb-4">
          <KanbanColumn
            id="TODO"
            title="To Do"
            tasks={tasksByStatus.TODO}
            onAddTask={handleAddTask}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
          />
          <KanbanColumn
            id="IN_PROGRESS"
            title="In Progress"
            tasks={tasksByStatus.IN_PROGRESS}
            onAddTask={handleAddTask}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
          />
          <KanbanColumn
            id="REVIEW"
            title="Review"
            tasks={tasksByStatus.REVIEW}
            onAddTask={handleAddTask}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
          />
          <KanbanColumn
            id="DONE"
            title="Done"
            tasks={tasksByStatus.DONE}
            onAddTask={handleAddTask}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
          />
        </div>
        
        {/* Overlay for dragged task to ensure it appears on top */}
        <DragOverlay>
          {activeTask ? (
            <div className="w-[288px] pointer-events-none">
              <TaskCard 
                task={activeTask} 
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
