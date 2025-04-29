import { useState, useEffect } from "react";
import { tasksAPI } from "@/lib/api";
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  BarChart3, 
  Tag,
  Activity
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate?: string;
  tags?: { id: string; name: string; color: string }[];
}

interface ProjectInsightsProps {
  projectId: string;
}

export function ProjectInsights({ projectId }: ProjectInsightsProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

    if (projectId) {
      fetchTasks();
    }
  }, [projectId]);

  // Calculate KPIs
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === "DONE").length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const overdueTasks = tasks.filter(task => {
    if (!task.dueDate || task.status === "DONE") return false;
    return new Date(task.dueDate) < new Date();
  }).length;
  
  const tasksByStatus = {
    TODO: tasks.filter(task => task.status === "TODO").length,
    IN_PROGRESS: tasks.filter(task => task.status === "IN_PROGRESS").length,
    REVIEW: tasks.filter(task => task.status === "REVIEW").length,
    DONE: completedTasks,
  };
  
  const tasksByPriority = {
    LOW: tasks.filter(task => task.priority === "LOW").length,
    MEDIUM: tasks.filter(task => task.priority === "MEDIUM").length,
    HIGH: tasks.filter(task => task.priority === "HIGH").length,
    URGENT: tasks.filter(task => task.priority === "URGENT").length,
  };

  // Get most used tags
  const tagCounts: Record<string, { count: number; name: string; color: string }> = {};
  tasks.forEach(task => {
    if (task.tags) {
      task.tags.forEach(tag => {
        if (!tagCounts[tag.id]) {
          tagCounts[tag.id] = { count: 0, name: tag.name, color: tag.color };
        }
        tagCounts[tag.id].count++;
      });
    }
  });
  
  const topTags = Object.values(tagCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  if (isLoading) {
    return <div className="flex justify-center items-center py-8">Loading insights...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Project Insights</h2>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Completion Rate */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Completion Rate</p>
              <p className="text-2xl font-bold">{completionRate}%</p>
              <p className="text-sm text-muted-foreground mt-1">
                {completedTasks} of {totalTasks} tasks completed
              </p>
            </div>
            <div className="bg-primary/10 p-2 rounded-full">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
          </div>
        </div>
        
        {/* Overdue Tasks */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Overdue Tasks</p>
              <p className="text-2xl font-bold">{overdueTasks}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {overdueTasks > 0 ? 'Requires attention' : 'All on schedule'}
              </p>
            </div>
            <div className="bg-destructive/10 p-2 rounded-full">
              <Clock className="h-5 w-5 text-destructive" />
            </div>
          </div>
        </div>
        
        {/* High Priority Tasks */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">High Priority</p>
              <p className="text-2xl font-bold">{tasksByPriority.HIGH + tasksByPriority.URGENT}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {((tasksByPriority.HIGH + tasksByPriority.URGENT) / totalTasks * 100 || 0).toFixed(0)}% of total tasks
              </p>
            </div>
            <div className="bg-orange-500/10 p-2 rounded-full">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
            </div>
          </div>
        </div>
        
        {/* Tasks In Progress */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">In Progress</p>
              <p className="text-2xl font-bold">{tasksByStatus.IN_PROGRESS}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {tasksByStatus.REVIEW} in review
              </p>
            </div>
            <div className="bg-blue-500/10 p-2 rounded-full">
              <Activity className="h-5 w-5 text-blue-500" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4" />
            Task Status Distribution
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">To Do</span>
                <span className="text-sm text-muted-foreground">{tasksByStatus.TODO}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full" 
                  style={{ width: `${(tasksByStatus.TODO / totalTasks) * 100 || 0}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">In Progress</span>
                <span className="text-sm text-muted-foreground">{tasksByStatus.IN_PROGRESS}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-orange-500 h-2 rounded-full" 
                  style={{ width: `${(tasksByStatus.IN_PROGRESS / totalTasks) * 100 || 0}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Review</span>
                <span className="text-sm text-muted-foreground">{tasksByStatus.REVIEW}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full" 
                  style={{ width: `${(tasksByStatus.REVIEW / totalTasks) * 100 || 0}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Done</span>
                <span className="text-sm text-muted-foreground">{tasksByStatus.DONE}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${(tasksByStatus.DONE / totalTasks) * 100 || 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Priority & Tags */}
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium flex items-center gap-2 mb-4">
            <Tag className="h-4 w-4" />
            Popular Tags
          </h3>
          {topTags.length > 0 ? (
            <div className="space-y-3">
              {topTags.map(tag => (
                <div key={tag.name}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm flex items-center">
                      <span 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: tag.color }}
                      ></span>
                      {tag.name}
                    </span>
                    <span className="text-sm text-muted-foreground">{tag.count} tasks</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="h-2 rounded-full" 
                      style={{ 
                        width: `${(tag.count / totalTasks) * 100 || 0}%`,
                        backgroundColor: tag.color 
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No tags used in this project yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
