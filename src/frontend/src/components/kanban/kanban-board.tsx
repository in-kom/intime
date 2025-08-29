import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from "react";
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
import { useAuth } from "@/contexts/auth-context";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate?: string;
  tags?: Tag[];
}

interface Tag {
  id: string;
  name: string;
  color: string;
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
  showTaskActions?: boolean; // New prop to control task actions visibility
}

export const KanbanBoard = forwardRef(function KanbanBoard({ 
  projectId, 
  onAddTask, 
  onEditTask, 
  onDeleteTask,
  showTaskActions = true 
}: KanbanBoardProps, ref) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const wsReadyRef = useRef(false);
  const wsQueueRef = useRef<any[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Setup WebSocket connection
  useEffect(() => {
    const token = window.localStorage.getItem("token");
    if (!token) return;

    const ws = new WebSocket(`${import.meta.env.VITE_WS_URL || "ws://localhost:4000"}?token=${token}`);
    wsRef.current = ws;
    wsReadyRef.current = false;

    ws.onopen = () => {
      wsReadyRef.current = true;
      ws.send(JSON.stringify({ type: "SUBSCRIBE_PROJECT", projectId }));
      // Flush any queued messages
      wsQueueRef.current.forEach(msg => ws.send(msg));
      wsQueueRef.current = [];
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "KANBAN_CARD_MOVED" && msg.payload?.projectId === projectId) {
          setTasks(msg.payload.tasks);
        }
      } catch {}
    };

    ws.onclose = () => {
      wsRef.current = null;
      wsReadyRef.current = false;
      wsQueueRef.current = [];
    };

    return () => {
      // Only send unsubscribe if socket is open
      const unsubscribeMsg = JSON.stringify({ type: "UNSUBSCRIBE_PROJECT", projectId });
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(unsubscribeMsg);
      } else if (ws.readyState === WebSocket.CONNECTING) {
        wsQueueRef.current.push(unsubscribeMsg);
      }
      ws.close();
    };
  }, [projectId]);

  useImperativeHandle(ref, () => ({
    refreshTasks: () => {
      setRefreshKey(prev => prev + 1);
    }
  }));

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setIsLoading(true);
        const response = await tasksAPI.getAll(projectId);
        setTasks(response.data);
      } catch (error) {
        console.error("Failed to fetch tasks", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, [projectId, refreshKey]);

  const refreshTasks = () => {
    setRefreshKey(prev => prev + 1);
  };

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
    
    if (activeTaskId === overId || !over.data.current) return;
    
    if (over.data.current?.type === "droppable") {
      const activeTask = tasks.find((task) => task.id === activeTaskId);
      if (!activeTask) return;
      
      const newStatus = overId as "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
      if (activeTask.status === newStatus) return;
      
      setTasks((tasks) =>
        tasks.map((task) =>
          task.id === activeTaskId ? { ...task, status: newStatus } : task
        )
      );
      tasksAPI.update(activeTaskId, { ...activeTask, status: newStatus })
        .then(async () => {
          const updatedTasks = await tasksAPI.getAll(projectId);
          const msg = JSON.stringify({
            type: "KANBAN_CARD_MOVED",
            payload: { projectId, tasks: updatedTasks.data }
          });
          // Only send if socket is open, otherwise queue
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(msg);
          } else if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
            wsQueueRef.current.push(msg);
          }
        })
        .catch((error) => {
          console.error("Failed to update task status", error);
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
    refreshTasks();
  };

  const handleDeleteTask = (taskId: string) => {
    onDeleteTask(taskId);
  };

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
            showTaskActions={showTaskActions}
          />
          <KanbanColumn
            id="IN_PROGRESS"
            title="In Progress"
            tasks={tasksByStatus.IN_PROGRESS}
            onAddTask={handleAddTask}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            showTaskActions={showTaskActions}
          />
          <KanbanColumn
            id="REVIEW"
            title="Review"
            tasks={tasksByStatus.REVIEW}
            onAddTask={handleAddTask}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            showTaskActions={showTaskActions}
          />
          <KanbanColumn
            id="DONE"
            title="Done"
            tasks={tasksByStatus.DONE}
            onAddTask={handleAddTask}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            showTaskActions={showTaskActions}
          />
        </div>
        
        <DragOverlay>
          {activeTask ? (
            <div className="w-[288px] pointer-events-none">
              <TaskCard 
                task={activeTask} 
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
                showActions={showTaskActions}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
});
