import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { projectsAPI, tasksAPI } from "@/lib/api";
import { DatabaseView } from "@/components/database/database-view";
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
  tags?: Tag[];
}

interface TaskFormData {
  title: string;
  description?: string;
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate?: string;
  tagIds?: string[];
}

export default function DatabasePage() {
  const { projectId = "" } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<{ name: string; description?: string } | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

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

    fetchProject();
  }, [projectId]);

  const handleAddTask = () => {
    setCurrentTask(undefined);
    setIsFormOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setCurrentTask(task);
    setIsFormOpen(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await tasksAPI.delete(taskId);
      // Refresh tasks after deletion (handled by the DatabaseView)
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
      // Refresh tasks after update/create (handled by the DatabaseView)
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

      <div className="flex-1 overflow-auto">
        <DatabaseView
          projectId={projectId}
          onAddTask={handleAddTask}
          onEditTask={handleEditTask}
          onDeleteTask={handleDeleteTask}
        />
      </div>

      <TaskForm
        task={currentTask}
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleTaskSubmit}
      />
    </div>
  );
}
