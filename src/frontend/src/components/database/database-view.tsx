import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { format } from "date-fns";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, Edit, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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

interface DatabaseViewProps {
  projectId: string;
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
}

export const DatabaseView = forwardRef(function DatabaseView({
  projectId,
  onAddTask,
  onEditTask,
  onDeleteTask,
}: DatabaseViewProps, ref) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const columnHelper = createColumnHelper<Task>();

  // Expose the refreshTasks method via ref
  useImperativeHandle(ref, () => ({
    refreshTasks: () => {
      setRefreshKey(prev => prev + 1);
    }
  }));

  const columns = [
    columnHelper.accessor("title", {
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Title
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: info => info.getValue(),
    }),
    columnHelper.accessor("status", {
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: info => {
        const status = info.getValue();
        const getStatusColor = () => {
          switch (status) {
            case "TODO":
              return "bg-blue-500 text-white";
            case "IN_PROGRESS":
              return "bg-orange-500 text-white";
            case "REVIEW":
              return "bg-purple-500 text-white";
            case "DONE":
              return "bg-green-500 text-white";
            default:
              return "bg-gray-500 text-white";
          }
        };
        return (
          <span className={`px-2 py-1 rounded text-xs ${getStatusColor()}`}>
            {status}
          </span>
        );
      },
    }),
    columnHelper.accessor("priority", {
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Priority
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: info => {
        const priority = info.getValue();
        const getPriorityColor = () => {
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
        return (
          <span className={`px-2 py-1 rounded text-xs ${getPriorityColor()}`}>
            {priority}
          </span>
        );
      },
    }),
    columnHelper.accessor("dueDate", {
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Due Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: info => {
        const date = info.getValue();
        return date ? format(new Date(date), "MMM d, yyyy") : "-";
      },
    }),
    columnHelper.accessor("description", {
      header: "Description",
      cell: info => {
        const description = info.getValue();
        return description ? (
          <div className="max-w-md line-clamp-2 overflow-hidden text-ellipsis">
            {description}
          </div>
        ) : "-";
      },
    }),
    columnHelper.accessor("tags", {
      header: "Tags",
      cell: info => {
        const tags = info.getValue();
        return (
          <div className="flex flex-wrap gap-1">
            {tags && tags.length > 0 ? (
              tags.map(tag => (
                <TagBadge key={tag.id} tag={tag} />
              ))
            ) : (
              "-"
            )}
          </div>
        );
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex gap-2 justify-end">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => handleEditTask(row.original)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => handleDeleteTask(row.original.id)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    }),
  ];

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

  const handleEditTask = (task: Task) => {
    onEditTask(task);
  };

  const handleDeleteTask = (taskId: string) => {
    onDeleteTask(taskId);
    refreshTasks();
  };

  const table = useReactTable({
    data: tasks,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isLoading) {
    return <div className="flex justify-center items-center h-full">Loading...</div>;
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Tasks</h2>
        <Button onClick={onAddTask}>
          <Plus className="mr-2 h-4 w-4" />
          Add Task
        </Button>
      </div>
      
      <div className="rounded-md border flex-1 flex flex-col">
        <div className="w-full overflow-auto h-[calc(100vh-220px)]">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-background">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id} className="border-b bg-muted/50">
                  {headerGroup.headers.map(header => (
                    <th key={header.id} className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="border-b hover:bg-muted/50 data-[state=selected]:bg-muted">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="p-4 align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="h-24 text-center">
                    No tasks found. Click "Add Task" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});
