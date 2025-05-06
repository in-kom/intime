import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { format, parseISO, differenceInDays, addDays } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  Plus,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { tasksAPI } from "@/lib/api";

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
}

interface GanttViewProps {
  projectId: string;
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
}

export const GanttView = forwardRef(function GanttView(
  { projectId, onAddTask, onEditTask, onDeleteTask }: GanttViewProps,
  ref
) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [viewRange, setViewRange] = useState<{ start: Date; end: Date }>({
    start: new Date(),
    end: addDays(new Date(), 14),
  });
  const [timelineWidth] = useState(1000);

  // Expose the refreshTasks method via ref
  useImperativeHandle(ref, () => ({
    refreshTasks: () => {
      setRefreshKey((prev) => prev + 1);
    },
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

  const handlePreviousPeriod = () => {
    const days = differenceInDays(viewRange.end, viewRange.start);
    setViewRange({
      start: addDays(viewRange.start, -days),
      end: viewRange.start,
    });
  };

  const handleNextPeriod = () => {
    const days = differenceInDays(viewRange.end, viewRange.start);
    setViewRange({
      start: viewRange.end,
      end: addDays(viewRange.end, days),
    });
  };

  const handleTodayPeriod = () => {
    const days = differenceInDays(viewRange.end, viewRange.start);
    setViewRange({
      start: new Date(),
      end: addDays(new Date(), days),
    });
  };

  const handleEditTask = (task: Task) => {
    onEditTask(task);
  };

  const handleDeleteTask = (taskId: string) => {
    onDeleteTask(taskId);
  };

  const getDaysArray = () => {
    const days = [];
    const totalDays = differenceInDays(viewRange.end, viewRange.start);
    for (let i = 0; i <= totalDays; i++) {
      days.push(addDays(viewRange.start, i));
    }
    return days;
  };

  const getTaskBar = (task: Task) => {
    const days = getDaysArray();
    const totalDays = days.length;
    const dayWidth = timelineWidth / totalDays;

    // Determine start and end dates for the task
    const startDate = task.startDate
      ? parseISO(task.startDate)
      : viewRange.start;
    const endDate = task.dueDate
      ? parseISO(task.dueDate)
      : addDays(startDate, 1);

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    // Check if task dates overlap with the visible timeframe
    const isVisible = startDate <= viewRange.end && endDate >= viewRange.start;

    if (!isVisible) {
      return { visible: false, left: "0px", width: "0px", colorClass: "" };
    }

    // Calculate positions
    const startOffset = Math.max(
      0,
      differenceInDays(startDate, viewRange.start)
    );

    // Add 1 to include the end date in the duration calculation
    const duration = Math.max(1, differenceInDays(endDate, startDate) + 1);

    // Ensure the bar doesn't extend beyond the visible range
    const visibleDuration = Math.min(duration, totalDays - startOffset);

    // Get status color
    const getStatusColor = () => {
      switch (task.status) {
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

    return {
      visible: true,
      left: `${startOffset * dayWidth}px`,
      width: `${visibleDuration * dayWidth}px`,
      colorClass: getStatusColor(),
    };
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">Loading...</div>
    );
  }

  const days = getDaysArray();

  return (
    <div className="h-full flex flex-col">
      {/* Gantt Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">
          {format(viewRange.start, "MMM d, yyyy")} -{" "}
          {format(viewRange.end, "MMM d, yyyy")}
        </h2>
        <div className="flex space-x-2">
          <Button variant="outline" size="icon" onClick={handlePreviousPeriod}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={handleTodayPeriod}
            className="text-sm"
          >
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextPeriod}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Add Task Button */}
      <div className="mb-4">
        <Button onClick={onAddTask}>
          <Plus className="mr-2 h-4 w-4" />
          Add Task
        </Button>
      </div>

      {/* Gantt Chart */}
      <div className="flex-1 overflow-auto border border-border rounded-md">
        <div className="flex">
          {/* Task Names Column */}
          <div className="w-64 shrink-0 border-r border-border bg-card">
            <div className="h-10 border-b border-border flex items-center px-4 font-medium">
              Task
            </div>
            {tasks.map((task) => (
              <div
                key={task.id}
                className="h-16 border-b border-border flex items-center px-4 text-sm"
              >
                <div className="truncate">{task.title}</div>
              </div>
            ))}
          </div>

          {/* Timeline */}
          <div className="relative" style={{ width: `${timelineWidth}px` }}>
            {/* Timeline Header */}
            <div className="h-10 border-b border-border flex">
              {days.map((day, i) => (
                <div
                  key={i}
                  className="flex-1 text-center border-r border-border text-xs flex flex-col justify-center"
                  style={{ minWidth: `${timelineWidth / days.length}px` }}
                >
                  <div>{format(day, "MMM d")}</div>
                  <div className="text-muted-foreground">
                    {format(day, "EEE")}
                  </div>
                </div>
              ))}
            </div>

            {/* Task Bars */}
            <div>
              {tasks.map((task) => {
                const { visible, left, width, colorClass } = getTaskBar(task);

                return (
                  <div
                    key={task.id}
                    className="h-16 border-b border-border relative"
                  >
                    {visible && (
                      <div
                        className={`absolute h-8 top-4 rounded ${colorClass} shadow-sm flex items-center px-2 text-white text-xs cursor-pointer`}
                        style={{ left, width }}
                        onClick={() => handleEditTask(task)}
                      >
                        <div className="truncate">{task.title}</div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 ml-auto text-white hover:bg-white/20"
                            >
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEditTask(task)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteTask(task.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {tasks.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          No tasks found. Click "Add Task" to create one.
        </div>
      )}
    </div>
  );
});
