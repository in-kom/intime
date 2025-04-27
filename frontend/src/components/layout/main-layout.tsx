import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { companiesAPI, projectsAPI } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import {
  LogOut,
  Plus,
  User,
  Briefcase,
  FolderKanban,
  Database,
  Building2,
} from "lucide-react";
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Company = {
  id: string;
  name: string;
  projects?: Project[];
};

type Project = {
  id: string;
  name: string;
  companyId: string;
};

export function MainLayout() {
  const { user, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isProjectRoute =
    location.pathname.includes("/kanban/") ||
    location.pathname.includes("/database/");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isNavigationOpen, setIsNavigationOpen] = useState(true);
  const [companyName, setCompanyName] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isCompanyDialogOpen, setIsCompanyDialogOpen] = useState(false);
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCompanies();
    }
  }, [user]);

  useEffect(() => {
    if (activeCompany) {
      fetchProjects(activeCompany.id);
    }
  }, [activeCompany]);

  const fetchCompanies = async () => {
    try {
      const response = await companiesAPI.getAll();
      setCompanies(response.data);
      if (response.data.length > 0) {
        setActiveCompany(response.data[0]);
      }
    } catch (error) {
      console.error("Failed to fetch companies", error);
    }
  };

  const fetchProjects = async (companyId: string) => {
    try {
      const response = await projectsAPI.getAll(companyId);
      setProjects(response.data);
    } catch (error) {
      console.error("Failed to fetch projects", error);
    }
  };

  const handleCreateCompany = async () => {
    try {
      setCreateError(null);
      setIsCreating(true);
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
      setActiveCompany(newCompany);
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
      setIsCreating(false);
    }
  };

  const handleCreateProject = async () => {
    if (!activeCompany) return;

    try {
      setCreateError(null);
      setIsCreating(true);

      const response = await projectsAPI.create(activeCompany.id, {
        name: projectName,
        description: projectDescription,
      });

      const newProject = response.data;
      setProjects([...projects, newProject]);
      setIsProjectDialogOpen(false);
      setProjectName("");
      setProjectDescription("");

      // Optionally navigate to the new project
      // navigate(`/kanban/${newProject.id}`);
    } catch (error) {
      console.error("Failed to create project", error);
      setCreateError("Failed to create project. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const openProjectDialog = () => {
    setProjectName("");
    setProjectDescription("");
    setCreateError(null);
    setIsProjectDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">Loading...</div>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside
        className={`bg-card border-r border-border ${
          isNavigationOpen ? "w-64" : "w-16"
        } transition-all duration-300 flex flex-col`}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h1 className={`font-bold text-xl ${!isNavigationOpen && "hidden"}`}>
            TodoApp
          </h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsNavigationOpen(!isNavigationOpen)}
          >
            {isNavigationOpen ? "←" : "→"}
          </Button>
        </div>

        {/* Company Selector */}
        <div className="p-4 border-b border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <Briefcase className="mr-2 h-4 w-4" />
                {isNavigationOpen
                  ? activeCompany?.name || "Select Company"
                  : ""}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Companies</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {companies.map((company) => (
                <DropdownMenuItem
                  key={company.id}
                  onClick={() => setActiveCompany(company)}
                >
                  {company.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsCompanyDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Company
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Projects List */}
        <div className="flex-1 overflow-auto p-4">
          {isNavigationOpen && (
            <h2 className="font-semibold mb-2">Projects</h2>
          )}
          <div className="space-y-1">
            {projects.map((project) => (
              <div key={project.id} className="flex flex-col space-y-1">
                <div className={`font-medium ${!isNavigationOpen && "hidden"}`}>
                  {project.name}
                </div>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => navigate(`/kanban/${project.id}`)}
                  >
                    <FolderKanban className="h-4 w-4" />
                    {isNavigationOpen && <span className="ml-2">Kanban</span>}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => navigate(`/database/${project.id}`)}
                  >
                    <Database className="h-4 w-4" />
                    {isNavigationOpen && <span className="ml-2">Database</span>}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {isNavigationOpen && projects.length === 0 && (
            <div className="text-sm text-muted-foreground">
              No projects yet. Create one to get started.
            </div>
          )}

          {isNavigationOpen && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-4"
              onClick={openProjectDialog}
              disabled={!activeCompany}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Project
            </Button>
          )}
        </div>

        {/* User Menu */}
        <div className="p-4 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start">
                <User className="h-4 w-4" />
                {isNavigationOpen && <span className="ml-2">{user.name}</span>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <header className="h-14 border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center">
            {activeCompany && (
              <h2 className="font-semibold">{activeCompany.name}</h2>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {!activeCompany ? (
            <div className="h-full flex flex-col items-center justify-center max-w-lg mx-auto">
              <div className="w-full space-y-6 text-center">
                <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">No Company Selected</h2>
                  <p className="text-muted-foreground">
                    Please select an existing company or create a new one to
                    start working.
                  </p>
                </div>

                <Button
                  className="w-full"
                  onClick={() => setIsCompanyDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Company
                </Button>

                {companies.length > 0 && (
                  <div className="bg-card border border-border rounded-lg p-4 mt-6">
                    <h3 className="font-medium mb-3">Your Companies</h3>
                    <div className="space-y-2">
                      {companies.map((company) => (
                        <Button
                          key={company.id}
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => setActiveCompany(company)}
                        >
                          <Briefcase className="mr-2 h-4 w-4" />
                          {company.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : !isProjectRoute ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Projects</h1>
                <Button onClick={openProjectDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Project
                </Button>
              </div>

              {projects.length === 0 ? (
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
                    <Card key={project.id}>
                      <CardHeader>
                        <CardTitle>{project.name}</CardTitle>
                      </CardHeader>
                      <CardFooter className="flex justify-between">
                        <Button
                          variant="outline"
                          onClick={() => navigate(`/kanban/${project.id}`)}
                        >
                          <FolderKanban className="mr-2 h-4 w-4" />
                          Kanban
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => navigate(`/database/${project.id}`)}
                        >
                          <Database className="mr-2 h-4 w-4" />
                          Database
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </main>

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
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCompanyDialogOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCompany}
              disabled={!companyName.trim() || isCreating}
            >
              {isCreating ? "Creating..." : "Create"}
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
              Add a new project to {activeCompany?.name || "your company"}.
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
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={!projectName.trim() || isCreating}
            >
              {isCreating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
