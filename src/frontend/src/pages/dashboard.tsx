import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { API_URL, companiesAPI, projectsAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Plus,
  FolderKanban,
  Database,
  Calendar,
  GanttChart,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useProjects } from "@/contexts/projects-context";

type Company = {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  ownerId: string;
};

export default function DashboardPage() {
  const {
    projects,
    activeCompanyId,
    setActiveCompanyId,
    isLoading: projectsLoading,
    addProject,
  } = useProjects();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompanyDialogOpen, setIsCompanyDialogOpen] = useState(false);
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  // Add a state for current user role
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  // Initial data fetch - load companies and set first company as active
  useEffect(() => {
    const fetchData = async () => {
      try {
        const companiesRes = await companiesAPI.getAll();
        setCompanies(companiesRes.data);

        if (companiesRes.data.length > 0) {
          // If no company is active yet
          if (!activeCompanyId) {
            const companyId = companiesRes.data[0].id;
            setActiveCompanyId(companyId);
          } else {
            // Validate that the stored companyId still exists
            const companyExists = companiesRes.data.some(
              (company: Company) => company.id === activeCompanyId
            );
            if (!companyExists) {
              // If stored company doesn't exist anymore, use the first one
              const companyId = companiesRes.data[0].id;
              setActiveCompanyId(companyId);
            }
          }
        }

        // Set current user role for active company
        const active = companiesRes.data.find(
          (c: any) => c.id === activeCompanyId
        );
        if (active) {
          const member = active.members?.find(
            (m: any) => m.userId === window.localStorage.getItem("userId")
          );
          setCurrentUserRole(
            member?.role ||
              (active.ownerId === window.localStorage.getItem("userId")
                ? "EDITOR"
                : null)
          );
        }
      } catch (error) {
        console.error("Failed to fetch data", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCreateCompany = async () => {
    try {
      setCreateError(null);
      setIsLoading(true);
      console.log("Creating company:", {
        name: companyName,
        description: companyDescription,
      });

      const response = await companiesAPI.create({
        name: companyName,
        description: companyDescription,
      });

      console.log("Company created successfully:", response.data);
      const newCompany = response.data;
      setCompanies([...companies, newCompany]);

      // Set as active company
      setActiveCompanyId(newCompany.id);

      setIsCompanyDialogOpen(false);
      setCompanyName("");
      setCompanyDescription("");
    } catch (error: any) {
      console.error("Failed to create company", error);
      setCreateError(
        error.response?.data?.message ||
          "Failed to create company. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!activeCompanyId) return;

    try {
      setCreateError(null);
      const response = await projectsAPI.create(activeCompanyId, {
        name: projectName,
        description: projectDescription,
      });

      // Use context to add the project
      addProject(response.data);
      setIsProjectDialogOpen(false);
      setProjectName("");
      setProjectDescription("");
    } catch (error) {
      console.error("Failed to create project", error);
      setCreateError("Failed to create project. Please try again.");
    }
  };

  const openProjectDialog = () => {
    setProjectName("");
    setProjectDescription("");
    setCreateError(null);
    setIsProjectDialogOpen(true);
  };

  // Use the activeCompanyId to find the activeCompany
  const activeCompany = companies.find(
    (company) => company.id === activeCompanyId
  );

  // Only allow project creation for owner or EDITOR
  const canCreateProject =
    activeCompany &&
    (activeCompany.ownerId === window.localStorage.getItem("userId") ||
      currentUserRole === "EDITOR");

  if (isLoading || projectsLoading) {
    return (
      <div className="flex justify-center items-center h-full">Loading...</div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          {activeCompany && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">|</span>
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={`${API_URL}${activeCompany.imageUrl}`}
                  alt={activeCompany.name}
                />
                <AvatarFallback>{activeCompany.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="font-medium">{activeCompany.name}</span>
            </div>
          )}
        </div>
        {companies.length > 0 && canCreateProject && (
          <Button onClick={openProjectDialog}>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        )}
      </div>

      {companies.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">Welcome to TodoApp!</h2>
          <p className="text-muted-foreground mb-4">
            Get started by creating your first company.
          </p>
          <Button onClick={() => setIsCompanyDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Company
          </Button>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">No Projects Yet</h2>
          <p className="text-muted-foreground mb-4">
            Create your first project to start organizing tasks.
          </p>
          <Button onClick={openProjectDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Create Project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-card border border-border rounded-lg overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  {activeCompany && (
                    <Avatar className="h-6 w-6">
                      <AvatarImage
                        src={`${API_URL}${activeCompany.imageUrl}`}
                        alt={activeCompany.name}
                      />
                      <AvatarFallback>
                        {activeCompany.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <h3 className="text-lg font-semibold">{project.name}</h3>
                </div>
                {project.description && (
                  <p className="text-muted-foreground text-sm mt-1">
                    {project.description}
                  </p>
                )}
                <div className="mt-2 text-sm text-muted-foreground">
                  {project._count?.tasks || 0} tasks
                </div>
              </div>
              <div className="border-t border-border p-4 flex justify-between">
                <Link to={`/kanban/${project.id}`}>
                  <Button variant="outline" size="sm">
                    <FolderKanban className="mr-2 h-4 w-4" />
                    Kanban
                  </Button>
                </Link>
                <Link to={`/calendar/${project.id}`}>
                  <Button variant="outline" size="sm">
                    <Calendar className="mr-2 h-4 w-4" />
                    Calendar
                  </Button>
                </Link>
                <Link to={`/database/${project.id}`}>
                  <Button variant="outline" size="sm">
                    <Database className="mr-2 h-4 w-4" />
                    Database
                  </Button>
                </Link>
                <Link to={`/gantt/${project.id}`}>
                  <Button variant="outline" size="sm">
                    <GanttChart className="mr-2 h-4 w-4" />
                    Gantt
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Company Creation Dialog */}
      <Dialog open={isCompanyDialogOpen} onOpenChange={setIsCompanyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Company</DialogTitle>
            <DialogDescription>
              Add a new company to organize your projects and tasks.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {createError && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                {createError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Company Name</Label>
              <Input
                id="name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter company name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                value={companyDescription}
                onChange={(e) => setCompanyDescription(e.target.value)}
                placeholder="Enter company description"
              />
            </div>

            <p className="text-sm text-muted-foreground">
              You can add a company logo in the company settings after creation.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCompanyDialogOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCompany}
              disabled={!companyName.trim() || isLoading}
            >
              {isLoading ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Creation Dialog */}
      <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
            <DialogDescription>
              Add a new project to{" "}
              {activeCompany ? (
                <span className="flex items-center gap-2 inline-flex">
                  <Avatar className="h-5 w-5 inline">
                    <AvatarImage
                      src={`${API_URL}${activeCompany.imageUrl}`}
                      alt={activeCompany.name}
                    />
                    <AvatarFallback>
                      {activeCompany.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {activeCompany.name}
                </span>
              ) : (
                "your company"
              )}
              .
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {createError && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                {createError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name</Label>
              <Input
                id="projectName"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter project name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectDescription">Description (Optional)</Label>
              <Input
                id="projectDescription"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Enter project description"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsProjectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={!projectName.trim()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
