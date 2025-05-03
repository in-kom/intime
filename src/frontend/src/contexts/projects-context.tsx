import { createContext, useState, useContext, useEffect, ReactNode } from "react";
import { projectsAPI } from "@/lib/api";

// Define types
type Project = {
  id: string;
  name: string;
  description?: string;
  companyId: string;
  _count?: {
    tasks: number;
  };
};

interface ProjectsContextType {
  projects: Project[];
  activeCompanyId: string | null;
  setActiveCompanyId: (id: string | null) => void;
  isLoading: boolean;
  refreshProjects: () => Promise<void>;
  addProject: (project: Project) => void;
}

// Create the context with default values
const ProjectsContext = createContext<ProjectsContextType>({
  projects: [],
  activeCompanyId: null,
  setActiveCompanyId: () => {},
  isLoading: false,
  refreshProjects: async () => {},
  addProject: () => {},
});

// Storage key for active company
const ACTIVE_COMPANY_KEY = "todoapp-active-company";

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(
    localStorage.getItem(ACTIVE_COMPANY_KEY)
  );
  const [isLoading, setIsLoading] = useState(false);

  // Update localStorage when activeCompanyId changes
  useEffect(() => {
    if (activeCompanyId) {
      localStorage.setItem(ACTIVE_COMPANY_KEY, activeCompanyId);
      fetchProjects();
    } else {
      localStorage.removeItem(ACTIVE_COMPANY_KEY);
      setProjects([]);
    }
  }, [activeCompanyId]);

  // Fetch projects for the active company
  const fetchProjects = async () => {
    if (!activeCompanyId) return;
    
    try {
      setIsLoading(true);
      const response = await projectsAPI.getAll(activeCompanyId);
      setProjects(response.data);
    } catch (error) {
      console.error("Failed to fetch projects", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to refresh projects
  const refreshProjects = async () => {
    await fetchProjects();
  };

  // Function to add a new project to the list
  const addProject = (project: Project) => {
    setProjects(prevProjects => [...prevProjects, project]);
  };

  return (
    <ProjectsContext.Provider
      value={{
        projects,
        activeCompanyId,
        setActiveCompanyId,
        isLoading,
        refreshProjects,
        addProject,
      }}
    >
      {children}
    </ProjectsContext.Provider>
  );
}

// Custom hook to use the projects context
export function useProjects() {
  return useContext(ProjectsContext);
}
