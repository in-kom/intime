import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { projectsAPI, tasksAPI } from "@/lib/api";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { TaskForm } from "@/components/tasks/task-form";

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

export default function KanbanPage() {
  const { projectId = "" } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<{
    name: string;
    description?: string;
    company?: {
      ownerId?: string;
      members?: { userId: string; role: string }[];
    };
  } | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const kanbanBoardRef = useRef<{ refreshTasks: () => void } | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await projectsAPI.getById(projectId);
        setProject(response.data);

        // Set current user role
        const member = response.data.company?.members?.find(
          (m: any) => m.userId === window.localStorage.getItem("userId")
        );
        setCurrentUserRole(
          member?.role ||
            (response.data.company?.ownerId ===
            window.localStorage.getItem("userId")
              ? "EDITOR"
              : null)
        );
      } catch (error) {
        console.error("Failed to fetch project", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  const handleAddTask = (data: TaskFormData) => {
    setCurrentTask({
      id: "",
      ...data,
    });
    setIsFormOpen(true);
  };

  const handleEditTask = (id: string, data: TaskFormData) => {
    setCurrentTask({ id, ...data });
    setIsFormOpen(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await tasksAPI.delete(taskId);
      // Refresh the board after deletion
      if (kanbanBoardRef.current) {
        kanbanBoardRef.current.refreshTasks();
      } else {
        setRefreshKey((prev) => prev + 1);
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

      // Refresh the board after create/update
      if (kanbanBoardRef.current) {
        kanbanBoardRef.current.refreshTasks();
      } else {
        setRefreshKey((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Failed to save task", error);
    }
  };

  const canEditTasks =
    project &&
    (project.company?.ownerId === window.localStorage.getItem("userId") ||
      currentUserRole === "EDITOR");

  const canAccessTaskActions =
    project &&
    (project.company?.ownerId === window.localStorage.getItem("userId") ||
      currentUserRole === "EDITOR" ||
      currentUserRole === "COMMENTER");

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">Loading...</div>
    );
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
        <KanbanBoard
          key={refreshKey}
          projectId={projectId}
          onAddTask={canEditTasks ? handleAddTask : () => {}}
          onEditTask={canEditTasks ? handleEditTask : () => {}}
          onDeleteTask={canEditTasks ? handleDeleteTask : () => {}}
          showTaskActions={!!canAccessTaskActions}
          ref={kanbanBoardRef}
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
