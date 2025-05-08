import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { projectsAPI, tasksAPI } from "@/lib/api";
import { GanttView } from "@/components/gantt/gantt-view";
import { TaskForm } from "@/components/tasks/task-form";

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
  startDate?: string;
  tags?: Tag[];
  parentId?: string | null;
}

interface TaskFormData {
  title: string;
  description?: string;
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate?: string;
  startDate?: string;
  tags?: Tag[];
}

export default function GanttPage() {
  const { projectId = "" } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<{ name: string; description?: string } | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [availableTasks, setAvailableTasks] = useState<{ id: string; title: string }[]>([]);
  const ganttViewRef = useRef<{ refreshTasks: () => void } | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await projectsAPI.getById(projectId);
        setProject(response.data);
      } catch (error) {
        console.error("Failed to fetch project", error);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchTasks = async () => {
      try {
        const response = await tasksAPI.getAll(projectId);
        setAvailableTasks(response.data.map(task => ({ id: task.id, title: task.title })));
      } catch (error) {
        console.error("Failed to fetch tasks", error);
      }
    };

    fetchProject();
    fetchTasks();
  }, [projectId, refreshKey]);

  const handleAddTask = (parentId?: string) => {
    setCurrentTask({
      id: "",
      title: "",
      description: "",
      status: "TODO",
      priority: "MEDIUM",
      parentId: parentId,
    });
    setIsFormOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setCurrentTask(task);
    setIsFormOpen(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await tasksAPI.delete(taskId);
      // Refresh the gantt after deletion
      if (ganttViewRef.current) {
        ganttViewRef.current.refreshTasks();
      } else {
        setRefreshKey(prev => prev + 1);
      }
    } catch (error) {
      console.error("Failed to delete task", error);
    }
  };

  const handleTaskSubmit = async (data: TaskFormData) => {
    try {
      if (currentTask?.id) {
        await tasksAPI.update(currentTask.id, data);
      } else {
        await tasksAPI.create(projectId, data);
      }
      setIsFormOpen(false);
      
      // Refresh the gantt after create/update
      if (ganttViewRef.current) {
        ganttViewRef.current.refreshTasks();
      } else {
        setRefreshKey(prev => prev + 1);
      }
    } catch (error) {
      console.error("Failed to save task", error);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-full">Loading...</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{project?.name || "Project"}</h1>
        {project?.description && (
          <p className="text-muted-foreground mt-1">{project.description}</p>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        <GanttView
          key={refreshKey}
          projectId={projectId}
          onAddTask={handleAddTask}
          onEditTask={handleEditTask}
          onDeleteTask={handleDeleteTask}
          ref={ganttViewRef}
        />
      </div>

      <TaskForm
        task={currentTask}
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleTaskSubmit}
        availableTasks={availableTasks}
      />
    </div>
  );
}
