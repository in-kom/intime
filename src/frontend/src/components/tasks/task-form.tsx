import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { TagSelector } from "@/components/tags/tag-selector";
import { useParams } from "react-router-dom";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

// Define Tag interface
interface Tag {
  id: string;
  name: string;
  color: string;
}

// Update task schema with zod
const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  dueDate: z.string().optional(),
  startDate: z.string().optional(),
  parentId: z.string().optional().nullable(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface TaskFormProps {
  task?: {
    id: string;
    title: string;
    description?: string;
    status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    dueDate?: string;
    startDate?: string;
    tags?: Tag[];
    dependencies?: { id: string; title: string }[];
    parent?: { id: string; title: string } | null;
    parentId?: string | null;
  };
  open: boolean;
  onClose: () => void;
  onSubmit: (values: TaskFormValues & { tagIds?: string[]; dependencyIds?: string[]; parentId?: string | null }) => void;
  availableTasks?: { id: string; title: string }[]; // Available tasks for dependencies or parent selection
}

export function TaskForm({ task, open, onClose, onSubmit, availableTasks = [] }: TaskFormProps) {
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [selectedDependencies, setSelectedDependencies] = useState<{ id: string; title: string }[]>([]);
  const [parentTask, setParentTask] = useState<{ id: string; title: string } | null>(null);
  const { projectId = "" } = useParams<{ projectId: string }>();
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [isDepPickerOpen, setIsDepPickerOpen] = useState(false);
  const [isParentPickerOpen, setIsParentPickerOpen] = useState(false);

  const { register, handleSubmit, reset, formState, setValue, watch } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title || "",
      description: task?.description || "",
      status: task?.status || "TODO",
      priority: task?.priority || "MEDIUM",
      dueDate: task?.dueDate || "",
      startDate: task?.startDate || "",
      parentId: task?.parentId || null,
    },
  });

  useEffect(() => {
    if (open) {
      let formattedDueDate = "";
      let formattedStartDate = "";
      if (task?.dueDate) {
        formattedDueDate = task.dueDate.split('T')[0];
        setDate(new Date(formattedDueDate));
      } else {
        setDate(undefined);
      }
      if (task?.startDate) {
        formattedStartDate = task.startDate.split('T')[0];
        setStartDate(new Date(formattedStartDate));
      } else {
        setStartDate(undefined);
      }
      
      reset({
        title: task?.title || "",
        description: task?.description || "",
        status: task?.status || "TODO",
        priority: task?.priority || "MEDIUM",
        dueDate: formattedDueDate,
        startDate: formattedStartDate,
        parentId: task?.parentId || null,
      });
      setSelectedTags(task?.tags || []);
      setSelectedDependencies(task?.dependencies || []);
      setParentTask(task?.parent || null);
    }
  }, [open, task, reset]);

  const processSubmit = (values: TaskFormValues) => {
    const tagIds = selectedTags.map(tag => tag.id);
    const dependencyIds = selectedDependencies.map(dep => dep.id);
    onSubmit({ 
      ...values, 
      tagIds,
      dependencyIds,
      parentId: values.parentId,
      startDate: values.startDate || format(new Date(), "yyyy-MM-dd")
    });
    onClose();
  };

  const onDateChange = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    if (selectedDate) {
      setValue("dueDate", format(selectedDate, "yyyy-MM-dd"));
    } else {
      setValue("dueDate", "");
    }
  };

  const onStartDateChange = (selectedDate: Date | undefined) => {
    setStartDate(selectedDate);
    if (selectedDate) {
      setValue("startDate", format(selectedDate, "yyyy-MM-dd"));
    } else {
      setValue("startDate", "");
    }
  };

  const dueDate = watch("dueDate");
  const startDateValue = watch("startDate");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {task?.id ? "Edit Task" : "Create Task"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(processSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              Title
            </label>
            <input
              id="title"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              {...register("title")}
            />
            {formState.errors.title && (
              <p className="text-sm text-destructive">
                {formState.errors.title.message}
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <textarea
              id="description"
              className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              {...register("description")}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="status" className="text-sm font-medium">
                Status
              </label>
              <select
                id="status"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                {...register("status")}
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="REVIEW">Review</option>
                <option value="DONE">Done</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="priority" className="text-sm font-medium">
                Priority
              </label>
              <select
                id="priority"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                {...register("priority")}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="dueDate" className="text-sm font-medium">
              Due Date
            </label>
            <div className="flex gap-2">
              <input
                id="dueDate"
                type="date"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                {...register("dueDate")}
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-10 p-0",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={onDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="startDate" className="text-sm font-medium">
              Start Date
            </label>
            <div className="flex gap-2">
              <input
                id="startDate"
                type="date"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                {...register("startDate")}
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-10 p-0",
                      !startDateValue && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={onStartDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Parent Task Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Parent Task
            </label>
            <Popover open={isParentPickerOpen} onOpenChange={setIsParentPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isParentPickerOpen}
                  className="w-full justify-between"
                >
                  {parentTask ? parentTask.title : "No parent task"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search tasks..." />
                  <CommandList>
                    <CommandEmpty>No tasks found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => {
                          setParentTask(null);
                          setValue("parentId", null);
                          setIsParentPickerOpen(false);
                        }}
                      >
                        No parent task
                      </CommandItem>
                      {availableTasks
                        .filter(t => t.id !== task?.id) // Can't be its own parent
                        .map(t => (
                          <CommandItem
                            key={t.id}
                            onSelect={() => {
                              setParentTask(t);
                              setValue("parentId", t.id);
                              setIsParentPickerOpen(false);
                            }}
                          >
                            {t.title}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Dependencies Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Dependencies
            </label>
            <div className="flex flex-wrap gap-1 mb-2">
              {selectedDependencies.map(dep => (
                <div key={dep.id} className="bg-secondary text-secondary-foreground px-2 py-1 text-xs rounded-md flex items-center gap-1">
                  {dep.title}
                  <button
                    type="button"
                    onClick={() => setSelectedDependencies(prev => prev.filter(d => d.id !== dep.id))}
                    className="text-secondary-foreground/50 hover:text-secondary-foreground"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <Popover open={isDepPickerOpen} onOpenChange={setIsDepPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  Add dependencies
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Search tasks..." />
                  <CommandList>
                    <CommandEmpty>No tasks found.</CommandEmpty>
                    <CommandGroup>
                      {availableTasks
                        .filter(t => 
                          t.id !== task?.id && // Can't depend on itself
                          !selectedDependencies.some(dep => dep.id === t.id) // Not already selected
                        )
                        .map(t => (
                          <CommandItem
                            key={t.id}
                            onSelect={() => {
                              setSelectedDependencies(prev => [...prev, t]);
                            }}
                          >
                            {t.title}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Tags
            </label>
            <TagSelector
              projectId={projectId}
              selectedTags={selectedTags}
              onChange={setSelectedTags}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {task?.id ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
