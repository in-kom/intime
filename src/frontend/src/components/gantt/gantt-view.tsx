import {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  format,
  parseISO,
  differenceInDays,
  addDays,
  isAfter,
  isBefore,
  addWeeks,
  addMonths,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  Plus,
  MoreHorizontal,
  CalendarCheck,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { tasksAPI } from "@/lib/api";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

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
  actualStartDate?: string;
  actualEndDate?: string;
  tags?: Tag[];
  dependencies?: Task[];
  dependencyFor?: Task[];
  parent?: Task | null;
  parentId?: string | null;
  subtasks?: Task[];
  _isDependencyOf?: string; // Added optional property
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
  const [showActual, setShowActual] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: viewRange.start,
    to: viewRange.end,
  });
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

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

  const handleCustomPeriod = (
    period: number,
    unit: "days" | "weeks" | "months"
  ) => {
    const today = new Date();
    let end;

    switch (unit) {
      case "weeks":
        end = addWeeks(today, period);
        break;
      case "months":
        end = addMonths(today, period);
        break;
      default:
        end = addDays(today, period);
    }

    setViewRange({
      start: today,
      end,
    });
  };

  const handleApplyDateRange = () => {
    if (dateRange.from && dateRange.to) {
      setViewRange({
        start: dateRange.from,
        end: dateRange.to,
      });
      setIsDatePickerOpen(false);
    }
  };

  const toggleActualTimeline = () => {
    setShowActual(!showActual);
  };

  const toggleSummary = () => {
    setShowSummary(!showSummary);
  };

  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const getDaysArray = () => {
    const days = [];
    const totalDays = differenceInDays(viewRange.end, viewRange.start);
    for (let i = 0; i <= totalDays; i++) {
      days.push(addDays(viewRange.start, i));
    }
    return days;
  };

  const getVisibleTasks = () => {
    // Use a recursive approach to maintain proper hierarchy
    const result: Task[] = [];

    // Process a task and its descendants if expanded
    const processTask = (task: Task) => {
      result.push(task);

      // If task is expanded, add its subtasks immediately after
      if (expandedTasks.has(task.id)) {
        // Process all subtasks first (maintaining hierarchy)
        if (task.subtasks && task.subtasks.length > 0) {
          task.subtasks.forEach((subtask) => {
            processTask(subtask);
          });
        }

        // Then add dependencies after all subtasks
        if (task.dependencies && task.dependencies.length > 0) {
          task.dependencies.forEach((dependency) => {
            // Add dependency with flag for styling
            result.push({
              ...dependency,
              _isDependencyOf: task.id,
            });
          });
        }
      }
    };

    // Start with top-level tasks
    const topLevelTasks = tasks.filter((task) => !task.parentId);
    topLevelTasks.forEach((task) => {
      processTask(task);
    });

    return result;
  };

  const getTaskIndent = (task: Task) => {
    // For normal parent-child hierarchy
    if (task.parentId) {
      let level = 0;
      let currentTask = task;

      while (currentTask.parentId) {
        level++;
        const parent = tasks.find((t) => t.id === currentTask.parentId);
        if (!parent) break;
        currentTask = parent;
      }

      return level * 16;
    }

    // For dependencies
    if ((task as any)._isDependencyOf) {
      return 16; // Single level indent for dependencies
    }

    return 0;
  };

  const getTaskBar = (task: Task) => {
    const days = getDaysArray();
    const totalDays = days.length;
    const dayWidth = timelineWidth / totalDays;

    const startDate = task.startDate
      ? parseISO(task.startDate)
      : viewRange.start;
    const endDate = task.dueDate
      ? parseISO(task.dueDate)
      : addDays(startDate, 1);

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    const actualStartDate = task.actualStartDate
      ? parseISO(task.actualStartDate)
      : null;

    const actualEndDate = task.actualEndDate
      ? parseISO(task.actualEndDate)
      : null;

    if (actualStartDate) actualStartDate.setHours(0, 0, 0, 0);
    if (actualEndDate) actualEndDate.setHours(0, 0, 0, 0);

    const isPlanVisible =
      startDate <= viewRange.end && endDate >= viewRange.start;

    const daysInView = days.map((d) => format(d, "yyyy-MM-dd"));

    const startDateStr = format(startDate, "yyyy-MM-dd");
    const endDateStr = format(endDate, "yyyy-MM-dd");

    const startIndex = Math.max(0, daysInView.indexOf(startDateStr));
    const planStartOffset = startIndex;

    const endIndex = daysInView.indexOf(endDateStr);
    const endPosition = endIndex === -1 ? daysInView.length - 1 : endIndex;

    const planVisibleDuration = endPosition - startIndex + 1;

    let actualData = null;
    let completionPercentage = 0;
    let isDelayed = false;
    let isAheadOfSchedule = false;

    if (actualStartDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const totalPlannedDays = differenceInDays(endDate, startDate) + 1;
      const daysElapsedSinceStart =
        differenceInDays(
          actualEndDate || (isAfter(today, startDate) ? today : startDate),
          startDate
        ) + 1;
      const plannedPercentage = Math.min(
        100,
        Math.max(
          0,
          Math.round((daysElapsedSinceStart / totalPlannedDays) * 100)
        )
      );

      if (actualEndDate) {
        completionPercentage = 100;
      } else if (task.status === "IN_PROGRESS" || task.status === "REVIEW") {
        completionPercentage = task.status === "REVIEW" ? 90 : 50;
      }

      isDelayed = !actualEndDate && isAfter(today, endDate);
      isAheadOfSchedule = actualEndDate
        ? isBefore(actualEndDate, endDate)
        : false;

      const isActualVisible =
        actualStartDate <= viewRange.end &&
        (actualEndDate ? actualEndDate >= viewRange.start : true);

      if (isActualVisible) {
        const actualEndDateToUse = actualEndDate || today;

        const actualStartDateStr = format(actualStartDate, "yyyy-MM-dd");
        const actualEndDateStr = format(actualEndDateToUse, "yyyy-MM-dd");

        const actualStartIndex = Math.max(
          0,
          daysInView.indexOf(actualStartDateStr)
        );
        const actualStartOffset = actualStartIndex;

        const actualEndIndex = daysInView.indexOf(actualEndDateStr);
        const actualEndPosition =
          actualEndIndex === -1 ? daysInView.length - 1 : actualEndIndex;

        const actualVisibleDuration = actualEndPosition - actualStartIndex + 1;

        const startDelay = differenceInDays(actualStartDate, startDate);
        const endDelay = actualEndDate
          ? differenceInDays(actualEndDate, endDate)
          : differenceInDays(today, endDate);

        const plannedDuration = differenceInDays(endDate, startDate) + 1;
        const actualCompleteDuration = actualEndDate
          ? differenceInDays(actualEndDate, actualStartDate) + 1
          : null;

        const efficiency = actualCompleteDuration
          ? Math.round((plannedDuration / actualCompleteDuration) * 100)
          : null;

        actualData = {
          left: `${actualStartOffset * dayWidth}px`,
          width: `${actualVisibleDuration * dayWidth}px`,
          startDelay,
          endDelay,
          isCompleted: !!actualEndDate,
          completionPercentage,
          isDelayed,
          isAheadOfSchedule,
          efficiency,
          plannedPercentage,
        };
      }
    }

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
      visible: isPlanVisible,
      left: `${planStartOffset * dayWidth}px`,
      width: `${planVisibleDuration * dayWidth}px`,
      colorClass: getStatusColor(),
      actual: actualData,
      isDelayed,
      isAheadOfSchedule,
      status: task.status,
    };
  };

  const calculateProjectMetrics = () => {
    if (tasks.length === 0) return null;

    const delayedTasks = tasks.filter((task) => {
      const { actual } = getTaskBar(task);
      return actual?.isDelayed;
    });

    const aheadOfScheduleTasks = tasks.filter((task) => {
      const { actual } = getTaskBar(task);
      return actual?.isAheadOfSchedule;
    });

    const completedTasks = tasks.filter((task) => task.status === "DONE");
    const inProgressTasks = tasks.filter(
      (task) => task.status === "IN_PROGRESS" || task.status === "REVIEW"
    );

    return {
      totalTasks: tasks.length,
      completedTasks: completedTasks.length,
      inProgressTasks: inProgressTasks.length,
      delayedTasks: delayedTasks.length,
      aheadOfScheduleTasks: aheadOfScheduleTasks.length,
      completionRate: Math.round((completedTasks.length / tasks.length) * 100),
    };
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">Loading...</div>
    );
  }

  const days = getDaysArray();
  const projectMetrics = calculateProjectMetrics();

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">
          {format(viewRange.start, "MMM d, yyyy")} -{" "}
          {format(viewRange.end, "MMM d, yyyy")}
        </h2>
        <div className="flex items-center space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showActual ? "default" : "outline"}
                  size="sm"
                  onClick={toggleActualTimeline}
                  className="mr-2"
                >
                  <CalendarCheck className="h-4 w-4 mr-1" />
                  Actual Timeline
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle actual vs planned timeline comparison</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showSummary ? "default" : "outline"}
                  size="sm"
                  onClick={toggleSummary}
                  className="mr-2"
                >
                  <Clock className="h-4 w-4 mr-1" />
                  Progress Summary
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Show/hide progress summary stats</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="mr-2">
                <Calendar className="h-4 w-4 mr-1" />
                <span>Period</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleCustomPeriod(7, "days")}>
                Next 7 days
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCustomPeriod(14, "days")}>
                Next 14 days
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCustomPeriod(30, "days")}>
                Next 30 days
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCustomPeriod(2, "weeks")}>
                Next 2 weeks
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCustomPeriod(1, "months")}>
                Next month
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCustomPeriod(3, "months")}>
                Next quarter
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsDatePickerOpen(true)}>
                Custom date range...
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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

      <Dialog open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Select Date Range</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col space-y-4 py-4">
            <CalendarComponent
              mode="range"
              selected={{
                from: dateRange.from,
                to: dateRange.to,
              }}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  setDateRange({ from: range.from, to: range.to });
                }
              }}
              className={cn("rounded-md border")}
              numberOfMonths={2}
            />
            <div className="text-sm text-muted-foreground">
              {dateRange.from && dateRange.to ? (
                <p>
                  Selected: {format(dateRange.from, "PPP")} to{" "}
                  {format(dateRange.to, "PPP")} (
                  {differenceInDays(dateRange.to, dateRange.from) + 1} days)
                </p>
              ) : (
                <p>Select a date range to view</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setIsDatePickerOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={handleApplyDateRange}>Apply Range</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showSummary && projectMetrics && (
        <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-2 p-3 bg-card border border-border rounded-md">
            <div className="p-2 rounded-full bg-primary/10">
              <CheckCircle className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Completion</div>
              <div className="font-semibold">
                {projectMetrics.completionRate}%
              </div>
              <div className="text-xs text-muted-foreground">
                {projectMetrics.completedTasks} of {projectMetrics.totalTasks}{" "}
                tasks
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-card border border-border rounded-md">
            <div className="p-2 rounded-full bg-orange-500/10">
              <Clock className="h-4 w-4 text-orange-500" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">In Progress</div>
              <div className="font-semibold">
                {projectMetrics.inProgressTasks}
              </div>
              <div className="text-xs text-muted-foreground">
                tasks being worked on
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-card border border-border rounded-md">
            <div className="p-2 rounded-full bg-red-500/10">
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Delayed</div>
              <div className="font-semibold">{projectMetrics.delayedTasks}</div>
              <div className="text-xs text-muted-foreground">
                tasks behind schedule
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-card border border-border rounded-md">
            <div className="p-2 rounded-full bg-green-500/10">
              <Clock className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Ahead</div>
              <div className="font-semibold">
                {projectMetrics.aheadOfScheduleTasks}
              </div>
              <div className="text-xs text-muted-foreground">
                tasks ahead of schedule
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4">
        <Button onClick={onAddTask}>
          <Plus className="mr-2 h-4 w-4" />
          Add Task
        </Button>
      </div>

      {showActual && (
        <div className="mb-2 flex items-center gap-4 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-gray-300 mr-1"></div>
            <span>Planned Timeline</span>
          </div>
          {showActual && (
            <>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-300 mr-1"></div>
                <span>Actual Timeline</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-300 mr-1"></div>
                <span>Delayed</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-300 mr-1"></div>
                <span>Ahead of schedule</span>
              </div>
              <div className="flex items-center">
                <div className="h-1 w-6 bg-white border border-dashed border-black mr-1"></div>
                <span>Progress</span>
              </div>
            </>
          )}
        </div>
      )}

      <div className="flex-1 overflow-auto border border-border rounded-md">
        <div className="flex">
          <div className="w-48 shrink-0 border-r border-border bg-card">
            <div className="h-10 border-b border-border flex items-center px-4 font-medium">
              Task
            </div>
            {getVisibleTasks().map((task) => {
              const { isDelayed, isAheadOfSchedule, status } = getTaskBar(task);
              const hasSubtasks = task.subtasks && task.subtasks.length > 0;
              const hasDependencies =
                task.dependencies && task.dependencies.length > 0;
              const isExpanded = expandedTasks.has(task.id);
              const indentPadding = getTaskIndent(task);
              const isDependency = !!(task as any)._isDependencyOf;

              return (
                <div
                  key={task.id}
                  className={`h-16 border-b border-border flex items-center px-4 text-sm ${
                    isDependency ? "bg-blue-50 dark:bg-blue-900/10" : ""
                  }`}
                >
                  <div
                    className="truncate flex items-center gap-1"
                    style={{ paddingLeft: `${indentPadding}px` }}
                  >
                    {hasSubtasks && (
                      <button
                        className="w-4 h-4 flex items-center justify-center"
                        onClick={() => toggleTaskExpansion(task.id)}
                      >
                        {isExpanded ? "−" : "+"}
                      </button>
                    )}
                    {!hasSubtasks && hasDependencies && (
                      <button
                        className="w-4 h-4 flex items-center justify-center"
                        onClick={() => toggleTaskExpansion(task.id)}
                      >
                        {isExpanded ? "−" : "+"}
                      </button>
                    )}
                    {task.parentId && (
                      <span className="w-2 h-2 rounded-full bg-gray-400 mr-1" />
                    )}
                    {(task as any)._isDependencyOf && (
                      <span
                        className="w-2 h-2 transform rotate-45 bg-blue-400 mr-1"
                        title="Dependency"
                      />
                    )}
                    {isDelayed && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertTriangle className="h-3 w-3 text-red-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Task is delayed</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {isAheadOfSchedule && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Completed ahead of schedule</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {status === "DONE" && !isAheadOfSchedule && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <CheckCircle className="h-3 w-3 text-blue-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Task completed</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <div className="w-full">
                      <p className="line-clamp-2 text-ellipsis">{task.title}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="relative" style={{ width: `${timelineWidth}px` }}>
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

            <div>
              {getVisibleTasks().map((task) => {
                const { visible, left, width, colorClass, actual } =
                  getTaskBar(task);

                return (
                  <div
                    key={task.id}
                    className="h-16 border-b border-border relative"
                  >
                    {visible && (
                      <>
                        <div
                          className={`absolute h-8 top-4 rounded ${colorClass} opacity-30 shadow-sm flex items-center px-2 text-white text-xs cursor-pointer`}
                          style={{ left, width }}
                          onClick={() => onEditTask(task)}
                        >
                          <div className="truncate">
                            {showActual ? "Planned" : task.title}
                          </div>
                        </div>

                        {showActual && actual && (
                          <div
                            className="absolute h-0.5 top-8 bg-white border border-dashed border-black"
                            style={{
                              left,
                              width: `${
                                (actual.plannedPercentage / 100) *
                                parseFloat(width)
                              }px`,
                            }}
                          ></div>
                        )}

                        {showActual && actual && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={`absolute h-6 top-5 rounded shadow-sm flex items-center px-2 text-white text-xs cursor-pointer ${
                                    actual.startDelay > 0
                                      ? "bg-red-500"
                                      : actual.startDelay < 0
                                      ? "bg-green-500"
                                      : colorClass
                                  }`}
                                  style={{
                                    left: actual.left,
                                    width: actual.width,
                                  }}
                                >
                                  <div className="truncate flex justify-between w-full">
                                    <span>Actual</span>
                                    {actual.isCompleted && (
                                      <span className="font-semibold">
                                        100%
                                      </span>
                                    )}
                                    {!actual.isCompleted &&
                                      task.status !== "TODO" && (
                                        <span className="font-semibold">
                                          {actual.completionPercentage}%
                                        </span>
                                      )}
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="w-60">
                                <div className="text-xs space-y-1">
                                  <div className="font-semibold border-b pb-1 mb-1">
                                    Task Timeline Analysis
                                  </div>

                                  <div className="grid grid-cols-2 gap-x-2">
                                    <p className="text-muted-foreground">
                                      Status:
                                    </p>
                                    <p className="font-medium">
                                      {task.status.replace("_", " ")}
                                    </p>

                                    <p className="text-muted-foreground">
                                      Planned start:
                                    </p>
                                    <p>
                                      {task.startDate
                                        ? format(
                                            parseISO(task.startDate),
                                            "MMM d, yyyy"
                                          )
                                        : "Not set"}
                                    </p>

                                    <p className="text-muted-foreground">
                                      Actual start:
                                    </p>
                                    <p>
                                      {task.actualStartDate
                                        ? format(
                                            parseISO(task.actualStartDate),
                                            "MMM d, yyyy"
                                          )
                                        : "Not started"}
                                    </p>

                                    <p className="text-muted-foreground">
                                      Planned end:
                                    </p>
                                    <p>
                                      {task.dueDate
                                        ? format(
                                            parseISO(task.dueDate),
                                            "MMM d, yyyy"
                                          )
                                        : "Not set"}
                                    </p>

                                    <p className="text-muted-foreground">
                                      Actual end:
                                    </p>
                                    <p>
                                      {task.actualEndDate
                                        ? format(
                                            parseISO(task.actualEndDate),
                                            "MMM d, yyyy"
                                          )
                                        : "Not completed"}
                                    </p>
                                  </div>

                                  <div className="border-t pt-1 mt-1">
                                    <p className="text-muted-foreground">
                                      Start Variance:
                                    </p>
                                    <p
                                      className={
                                        actual.startDelay > 0
                                          ? "text-red-500"
                                          : actual.startDelay < 0
                                          ? "text-green-500"
                                          : ""
                                      }
                                    >
                                      {actual.startDelay > 0
                                        ? `${actual.startDelay} days late`
                                        : actual.startDelay < 0
                                        ? `${Math.abs(
                                            actual.startDelay
                                          )} days early`
                                        : "On time"}
                                    </p>

                                    {actual.endDelay !== null && (
                                      <>
                                        <p className="text-muted-foreground">
                                          End Variance:
                                        </p>
                                        <p
                                          className={
                                            actual.endDelay > 0
                                              ? "text-red-500"
                                              : actual.endDelay < 0
                                              ? "text-green-500"
                                              : ""
                                          }
                                        >
                                          {actual.endDelay > 0
                                            ? `${actual.endDelay} days late`
                                            : actual.endDelay < 0
                                            ? `${Math.abs(
                                                actual.endDelay
                                              )} days early`
                                            : "On time"}
                                        </p>
                                      </>
                                    )}

                                    {actual.efficiency !== null && (
                                      <>
                                        <p className="text-muted-foreground">
                                          Efficiency:
                                        </p>
                                        <p
                                          className={
                                            actual.efficiency > 100
                                              ? "text-green-500"
                                              : actual.efficiency < 100
                                              ? "text-red-500"
                                              : ""
                                          }
                                        >
                                          {actual.efficiency}%
                                          {actual.efficiency > 100
                                            ? " (faster than planned)"
                                            : actual.efficiency < 100
                                            ? " (slower than planned)"
                                            : " (as planned)"}
                                        </p>
                                      </>
                                    )}

                                    {!actual.isCompleted && (
                                      <p className="font-semibold mt-1">
                                        {actual.isDelayed
                                          ? "Task is behind schedule"
                                          : "Task in progress"}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 absolute right-1 top-5 text-white hover:bg-white/20 z-10"
                            >
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEditTask(task)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                onAddTask();
                              }}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Add Subtask
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onDeleteTask(task.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
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
