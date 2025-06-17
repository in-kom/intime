import {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useRef,
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
import LeaderLine from "leader-line-new";
import { TaskDetailModal } from "@/components/tasks/task-detail-modal";

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
  canEdit?: boolean; // <-- Add canEdit prop (optional)
}

export const GanttView = forwardRef(function GanttView(
  {
    projectId,
    onAddTask,
    onEditTask,
    onDeleteTask,
    canEdit = false,
  }: GanttViewProps,
  ref
) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [viewRange, setViewRange] = useState<{ start: Date; end: Date }>({
    start: new Date(),
    end: addDays(new Date(), 14),
  });
  const [minDayWidth] = useState(60); // Minimum width per day in pixels
  const [calculatedDayWidth, setCalculatedDayWidth] = useState(minDayWidth); // Dynamic day width
  const [showActual, setShowActual] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: viewRange.start,
    to: viewRange.end,
  });
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const taskElementsRef = useRef<Map<string, HTMLElement>>(new Map());
  const taskBarElementsRef = useRef<Map<string, HTMLElement>>(new Map());
  const leaderLinesRef = useRef<LeaderLine[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);

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
        updateDayWidth(); // Update day width after fetching tasks
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
      // Ensure start date is before end date, swap if needed
      const [startDate, endDate] = isAfter(dateRange.from, dateRange.to)
        ? [dateRange.to, dateRange.from]
        : [dateRange.from, dateRange.to];

      setViewRange({
        start: startDate,
        end: endDate,
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
    // Return empty array if no tasks
    if (!tasks || tasks.length === 0) return [];

    // Use a recursive approach to maintain proper hierarchy
    const result: Task[] = [];

    // Process a task and its descendants if expanded
    const processTask = (task: Task) => {
      result.push(task);

      // If task is expanded, add its subtasks immediately after
      if (expandedTasks.has(task.id)) {
        // Process all subtasks first (maintaining hierarchy)
        if (task.subtasks && task.subtasks.length > 0) {
          // Sort subtasks by start date before adding them
          const sortedSubtasks = [...task.subtasks].sort((a, b) => {
            const aDate = a.startDate ? new Date(a.startDate) : new Date();
            const bDate = b.startDate ? new Date(b.startDate) : new Date();
            return aDate.getTime() - bDate.getTime();
          });

          sortedSubtasks.forEach((subtask) => {
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

  // Calculate and update day width based on container size and number of days
  const updateDayWidth = () => {
    if (!timelineContainerRef.current) return;

    const containerWidth = timelineContainerRef.current.clientWidth;
    const days = getDaysArray();
    const numberOfDays = days.length;

    // Calculate optimal day width to fill available space
    // (but not less than minDayWidth)
    const availableWidth = containerWidth - 48; // Account for task list column (w-48)
    const optimalDayWidth = Math.max(
      minDayWidth,
      availableWidth / numberOfDays
    );

    setCalculatedDayWidth(optimalDayWidth);
  };

  // Update day width on resize and when day range changes
  useEffect(() => {
    updateDayWidth();
    const handleResize = () => {
      updateDayWidth();
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [viewRange]); // Recalculate when view range changes

  const getTaskBar = (task: Task) => {
    if (!task)
      return {
        visible: false,
        left: "0px",
        width: "0px",
        colorClass: "",
        status: "TODO",
      };

    const days = getDaysArray();
    const dayWidth = calculatedDayWidth;

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
    if (!tasks || tasks.length === 0) return null;

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

  const renderSequentialArrows = () => {
    // Clear existing lines to prevent duplicates
    leaderLinesRef.current.forEach((line) => line.remove());
    leaderLinesRef.current = [];

    // Don't proceed if there are no tasks
    if (!tasks || tasks.length === 0) return;

    // Get the scroll container for setting the proper parent container
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    // For each parent with multiple subtasks, connect them in sequence
    const visibleTasks = getVisibleTasks();
    const parentTasks = visibleTasks.filter(
      (task) => task.subtasks && task.subtasks.length > 1
    );

    parentTasks.forEach((parent) => {
      if (!expandedTasks.has(parent.id)) return;

      // Get visible subtasks and sort by start date
      const subtasks = parent
        .subtasks!.filter((subtask) => {
          // Check if both task element and bar element exist
          const barElement = taskBarElementsRef.current.get(subtask.id);
          return barElement != null;
        })
        .sort((a, b) => {
          const aDate = a.startDate ? new Date(a.startDate) : new Date();
          const bDate = b.startDate ? new Date(b.startDate) : new Date();
          return aDate.getTime() - bDate.getTime();
        });

      // Connect subtasks in sequence
      for (let i = 0; i < subtasks.length - 1; i++) {
        const currentTask = subtasks[i];
        const nextTask = subtasks[i + 1];

        // Use task bar elements instead of name elements
        const startElem = taskBarElementsRef.current.get(currentTask.id);
        const endElem = taskBarElementsRef.current.get(nextTask.id);

        if (startElem && endElem) {
          try {
            // Check if the task starts at the beginning of the timeline
            const taskBar = getTaskBar(nextTask);
            const startsAtBeginning = taskBar.left === "0px";

            // Configure the path based on task position
            const pathConfig = startsAtBeginning
              ? {
                  path: "grid" as const,
                  startSocket: "right" as const,
                  // go down after the right side of the task bar
                  endSocket: "top" as const,
                }
              : {
                  path: "grid" as const,
                  startSocket: "right" as const,
                  endSocket: "left" as const,
                };

            const leaderLine = new LeaderLine(
              LeaderLine.pointAnchor(startElem, { x: "100%", y: "50%" }),
              LeaderLine.pointAnchor(endElem, {
                x: startsAtBeginning ? "20%" : "0%",
                y: startsAtBeginning ? "0%" : "50%",
              }),
              {
                color: "rgba(65, 105, 225, 0.6)",
                size: 2,
                ...pathConfig,
                startSocket: "right",
                endSocket: "left",
                startPlug: "behind",
                endPlug: "arrow1",
                endPlugSize: 1.5,
                startPlugColor: "rgba(65, 105, 225, 0.6)",
                endPlugColor: "rgba(65, 105, 225, 0.6)",
                gradient: false,
                dropShadow: true,
                outlineColor: "white",
                outline: true,
                dash: { len: 10, gap: 3 },
              }
            );

            // Set z-index for the leader line elements
            const leaderLineElements =
              document.getElementsByClassName("leader-line");
            for (let i = 0; i < leaderLineElements.length; i++) {
              (leaderLineElements[i] as HTMLElement).style.zIndex = "-1";
            }

            leaderLinesRef.current.push(leaderLine);
          } catch (error) {
            console.error("Failed to create sequential arrow:", error);
          }
        }
      }
    });
  };

  // Handler for scrolling - updates leader lines positions with better accuracy
  const handleScroll = () => {
    if (leaderLinesRef.current.length > 0) {
      // Set a small timeout to ensure the DOM has updated
      requestAnimationFrame(() => {
        leaderLinesRef.current.forEach((line) => line.position());
      });
    }
  };

  // Debounce function to limit how often positions are recalculated during scrolling
  const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // Debounced scroll handler for better performance
  const debouncedHandleScroll = debounce(handleScroll, 1);

  // Add scroll event listener
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", debouncedHandleScroll);

      // Also handle window resize to reposition lines
      window.addEventListener("resize", debouncedHandleScroll);
    }

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener("scroll", debouncedHandleScroll);
      }
      window.removeEventListener("resize", debouncedHandleScroll);
    };
  }, [debouncedHandleScroll]);

  // Redraw lines when tasks or expanded state changes
  useEffect(() => {
    // Small delay to ensure DOM elements are properly rendered
    const timerId = setTimeout(() => {
      renderSequentialArrows();
    }, 10);

    return () => {
      clearTimeout(timerId);
      leaderLinesRef.current.forEach((line) => line.remove());
      leaderLinesRef.current = [];
    };
  }, [tasks, expandedTasks, viewRange]);

  // Update the task bar click handler to always open the detail modal
  const handleTaskBarClick = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Check if we're clicking on the dropdown trigger
    if ((e.target as HTMLElement).closest('.dropdown-trigger')) {
      return; // Let the dropdown handle its own click
    }
    
    // Always set the selected task to open the detail modal
    setSelectedTask(task);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">Loading...</div>
    );
  }

  const days = getDaysArray();
  const projectMetrics = calculateProjectMetrics();

  return (
    <div className="h-full flex flex-col" ref={timelineContainerRef}>
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
        <DialogContent className="max-w-[calc(min(50vw,800px))] w-auto overflow-hidden">
          <DialogHeader>
            <DialogTitle>Select Date Range</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col space-y-4 py-2 overflow-y-auto max-h-[70vh]">
            <CalendarComponent
              mode="range"
              selected={{
                from: dateRange.from,
                to: dateRange.to,
              }}
              onSelect={(range) => {
                if (range?.from) {
                  // Allow selecting just a start date first
                  setDateRange({
                    from: range.from,
                    to: range.to || dateRange.to,
                  });
                }
              }}
              className={cn("rounded-md border")}
              numberOfMonths={2}
              disabled={false}
              defaultMonth={dateRange.from} // Ensure calendar opens at the current start date
              fixedWeeks={true} // Ensures consistent height
            />
            <div className="text-sm text-muted-foreground">
              {dateRange.from && dateRange.to ? (
                <p className="break-words">
                  Selected: {format(dateRange.from, "MMM d, yyyy")} to{" "}
                  {format(dateRange.to, "MMM d, yyyy")} (
                  {differenceInDays(dateRange.to, dateRange.from) + 1} days)
                </p>
              ) : (
                <p>Select a date range to view</p>
              )}
            </div>
          </div>
          <DialogFooter className="flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => setIsDatePickerOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApplyDateRange}
              disabled={!dateRange.from || !dateRange.to}
            >
              Apply Range
            </Button>
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
        {canEdit && (
          <Button onClick={onAddTask}>
            <Plus className="mr-2 h-4 w-4" />
            Add Task
          </Button>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="flex-1 border border-border rounded-md flex items-center justify-center text-muted-foreground p-6">
          <div className="text-center">
            <p className="mb-4">No tasks found in this project.</p>
            {canEdit && (
              <Button onClick={onAddTask} variant="default">
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Task
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div
          className="flex-1 overflow-auto border border-border rounded-md relative"
          ref={scrollContainerRef}
          style={{
            isolation: "isolate",
            contain: "paint",
            position: "relative",
            zIndex: 0,
          }}
        >
          <div className="flex">
            <div className="w-48 shrink-0 border-r border-border bg-card sticky left-0 z-20">
              <div className="h-10 border-b border-border flex items-center px-4 font-medium">
                Task
              </div>
              {getVisibleTasks().map((task) => {
                const { isDelayed, isAheadOfSchedule, status } =
                  getTaskBar(task);
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
                    ref={(el) => {
                      if (el) {
                        taskElementsRef.current.set(task.id, el);
                      } else {
                        taskElementsRef.current.delete(task.id);
                      }
                    }}
                  >
                    <div
                      className="truncate flex items-center gap-1"
                      style={{ paddingLeft: `${indentPadding}px` }}
                    >
                      {hasSubtasks && (
                        <button
                          className="w-4 h-4 flex items-center justify-center hover:cursor-pointer"
                          onClick={() => toggleTaskExpansion(task.id)}
                        >
                          {isExpanded ? "−" : "+"}
                        </button>
                      )}
                      {!hasSubtasks && hasDependencies && (
                        <button
                          className="w-4 h-4 flex items-center justify-center hover:cursor-pointer"
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
                        <p className="line-clamp-2 text-ellipsis">
                          {task.title}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="relative" style={{ zIndex: 10 }}>
              <div
                className="h-10 border-b border-border flex sticky left-0 bg-background z-20"
                style={{ width: `${days.length * calculatedDayWidth}px` }}
              >
                {days.map((day, i) => (
                  <div
                    key={i}
                    className="text-center border-r border-border text-xs flex flex-col justify-center"
                    style={{
                      width: `${calculatedDayWidth}px`,
                      minWidth: `${calculatedDayWidth}px`,
                    }}
                  >
                    <div>{format(day, "MMM d")}</div>
                    <div className="text-muted-foreground">
                      {format(day, "EEE")}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ width: `${days.length * calculatedDayWidth}px` }}>
                {getVisibleTasks().map((task) => {
                  const { visible, left, width, colorClass, actual } = getTaskBar(task);

                  return (
                    <div
                      key={task.id}
                      className="h-16 border-b border-border relative"
                    >
                      {visible && (
                        <>
                          <div
                            className={`absolute h-8 top-4 rounded ${colorClass} opacity-30 shadow-sm flex items-center px-2 text-white text-xs cursor-pointer ${
                              canEdit ? "hover:opacity-40" : ""
                            }`}
                            style={{ left, width, zIndex: 15 }}
                            onClick={(e) => handleTaskBarClick(task, e)}
                            ref={(el) => {
                              if (el) {
                                taskBarElementsRef.current.set(task.id, el);
                              } else {
                                taskBarElementsRef.current.delete(task.id);
                              }
                            }}
                          >
                            <div className="truncate">
                              {showActual
                                ? `${task.title} - Actual`
                                : `${task.title} - Planned`}
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
                                pointerEvents: "none", // Prevent this from capturing hover events
                              }}
                            ></div>
                          )}

                          {showActual && actual && (
                            <TooltipProvider delayDuration={100}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className={`absolute h-6 top-5 rounded shadow-sm flex items-center px-2 text-white text-xs cursor-pointer hover:brightness-105 ${
                                      actual.startDelay > 0
                                        ? "bg-red-500"
                                        : actual.startDelay < 0
                                        ? "bg-green-500"
                                        : colorClass
                                    }`}
                                    style={{
                                      left: actual.left,
                                      width: actual.width,
                                      zIndex: 30,
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Check if we're clicking on the dropdown trigger
                                      if ((e.target as HTMLElement).closest('.dropdown-trigger')) {
                                        return; // Let the dropdown handle its own click
                                      }
                                      // Always open the task detail modal
                                      setSelectedTask(task);
                                    }}
                                    aria-haspopup="true"
                                    data-state="closed"
                                    tabIndex={0}
                                  >
                                    <div className="truncate flex justify-between w-full">
                                      <span>{task.title} - Actual</span>
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
                                <TooltipContent
                                  side="top"
                                  className="w-60 z-50"
                                >
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

                          {/* Hide the "..." menu if canEdit is false */}
                          {canEdit && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 absolute top-5 text-white hover:bg-white/20 z-10 dropdown-trigger"
                                  style={{
                                    left: `calc(${left} + ${width} - 28px)`,
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditTask(task);
                                  }}
                                >
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
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedTask && (
        <TaskDetailModal
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          initialTask={selectedTask}
          onEdit={onEditTask}
          onDelete={onDeleteTask}
          canEdit={canEdit}
          canComment={canEdit}
        />
      )}
    </div>
  );
});
