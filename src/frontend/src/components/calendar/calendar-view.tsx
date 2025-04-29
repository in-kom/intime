import { useState, useEffect } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
  parseISO,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { tasksAPI } from "@/lib/api";
import { TagBadge } from "@/components/tags/tag-badge";

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

interface CalendarViewProps {
  projectId: string;
  onAddTask: (date: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
}

export function CalendarView({
  projectId,
  onAddTask,
  onEditTask,
  onDeleteTask,
}: CalendarViewProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
  }, [projectId, refreshTrigger]);

  const refreshTasks = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleAddTask = (date: Date) => {
    onAddTask(format(date, "yyyy-MM-dd"));
  };

  const handleEditTask = (task: Task) => {
    onEditTask(task);
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await onDeleteTask(taskId);
      refreshTasks();
    } catch (error) {
      console.error("Failed to delete task", error);
    }
  };

  // Get days in current month view (including days from previous/next months to fill the grid)
  const getDaysInMonth = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    // Get all days in the month
    const daysInMonth = eachDayOfInterval({ start, end });

    // Get the day of the week for the first day (0 = Sunday, 1 = Monday, etc.)
    const startDay = start.getDay();

    // Add days from previous month to fill the start of the calendar
    const previousMonthDays = [];
    if (startDay > 0) {
      for (let i = startDay - 1; i >= 0; i--) {
        const day = new Date(start);
        day.setDate(day.getDate() - (i + 1));
        previousMonthDays.push(day);
      }
    }

    // Get the day of the week for the last day
    const endDay = end.getDay();

    // Add days from next month to fill the end of the calendar
    const nextMonthDays = [];
    if (endDay < 6) {
      for (let i = 1; i <= 6 - endDay; i++) {
        const day = new Date(end);
        day.setDate(day.getDate() + i);
        nextMonthDays.push(day);
      }
    }

    return [...previousMonthDays, ...daysInMonth, ...nextMonthDays];
  };

  // Get tasks for a specific day
  const getTasksForDay = (day: Date) => {
    return tasks.filter(
      (task) => task.dueDate && isSameDay(parseISO(task.dueDate), day)
    );
  };

  // Get priority color class
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

  // Get status color class
  const getStatusColor = (status: string) => {
    switch (status) {
      case "TODO":
        return "border-l-blue-500";
      case "IN_PROGRESS":
        return "border-l-orange-500";
      case "REVIEW":
        return "border-l-purple-500";
      case "DONE":
        return "border-l-green-500";
      default:
        return "border-l-gray-500";
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">Loading...</div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <div className="flex space-x-2">
          <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentMonth(new Date())}
            className="text-sm"
          >
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-7 gap-px bg-border rounded-md">
          {/* Weekday Headers */}
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="bg-card p-2 text-center text-sm font-medium"
            >
              {day}
            </div>
          ))}

          {/* Calendar Days */}
          {getDaysInMonth().map((day, i) => {
            const tasksForDay = getTasksForDay(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const dayClass = `bg-card min-h-[120px] p-2 ${
              !isCurrentMonth ? "text-muted-foreground" : ""
            } ${isToday(day) ? "border-2 border-primary" : ""}`;

            return (
              <div key={i} className={dayClass}>
                <div className="flex justify-between items-start">
                  <span
                    className={`text-sm ${isToday(day) ? "font-bold" : ""}`}
                  >
                    {format(day, "d")}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleAddTask(day)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>

                <div className="mt-1 space-y-1 max-h-[100px] overflow-y-auto">
                  {tasksForDay.map((task) => (
                    <div
                      key={task.id}
                      className={`text-xs p-1 mb-1 rounded border-l-2 bg-background relative group ${getStatusColor(
                        task.status
                      )}`}
                    >
                      <div className="flex justify-between items-start">
                        <div
                          className="font-medium truncate cursor-pointer pr-6"
                          onClick={() => handleEditTask(task)}
                        >
                          {task.title}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 absolute right-1 top-1 opacity-0 group-hover:opacity-100"
                            >
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEditTask(task)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
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
                      <div className="flex items-center gap-1 mt-1">
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] ${getPriorityColor(
                            task.priority
                          )}`}
                        >
                          {task.priority}
                        </span>
                        {task.tags && task.tags.length > 0 && (
                          <div className="flex gap-1">
                            {task.tags.slice(0, 1).map((tag) => (
                              <TagBadge key={tag.id} tag={tag} />
                            ))}
                            {task.tags.length > 1 && (
                              <TagBadge
                                tag={{
                                  name: `+${task.tags.length - 1}`,
                                  color: "#888888",
                                  id: `${task.tags.length - 1}`,
                                }}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
