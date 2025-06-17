import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { projectsAPI, projectDetailsAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Plus, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { ProjectDetailForm } from "@/components/project-details/project-detail-form";
import { ProjectInsights } from "@/components/project-details/project-insights";

interface ProjectDetail {
  id: string;
  title: string;
  url: string;
  description?: string;
}

export default function ProjectDetailsPage() {
  const { projectId = "" } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<{ 
    name: string; 
    description?: string;
    company?: {
      ownerId?: string;
      members?: { userId: string; role: string }[];
    };
  } | null>(null);
  const [details, setDetails] = useState<ProjectDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentDetail, setCurrentDetail] = useState<ProjectDetail | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [projectRes, detailsRes] = await Promise.all([
          projectsAPI.getById(projectId),
          projectDetailsAPI.getAll(projectId)
        ]);
        
        setProject(projectRes.data);
        setDetails(detailsRes.data);
        
        // Set current user role
        const member = projectRes.data.company?.members?.find(
          (m: any) => m.userId === window.localStorage.getItem("userId")
        );
        setCurrentUserRole(
          member?.role ||
            (projectRes.data.company?.ownerId ===
            window.localStorage.getItem("userId")
              ? "EDITOR"
              : null)
        );
      } catch (error) {
        console.error("Failed to fetch project data", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (projectId) {
      fetchData();
    }
  }, [projectId, refreshKey]);

  const handleAddDetail = () => {
    setCurrentDetail(undefined);
    setIsFormOpen(true);
  };

  const handleEditDetail = (detail: ProjectDetail) => {
    setCurrentDetail(detail);
    setIsFormOpen(true);
  };

  const handleDeleteDetail = async (detailId: string) => {
    try {
      await projectDetailsAPI.delete(detailId);
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error("Failed to delete detail", error);
    }
  };

  const handleDetailSubmit = async (values: { title: string; url: string; description?: string }) => {
    try {
      if (currentDetail?.id) {
        await projectDetailsAPI.update(currentDetail.id, values);
      } else {
        await projectDetailsAPI.create(projectId, values);
      }
      
      setIsFormOpen(false);
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error("Failed to save detail", error);
    }
  };

  // Check user permissions
  const canEditProject =
    project &&
    (project.company?.ownerId === window.localStorage.getItem("userId") ||
      currentUserRole === "EDITOR");

  if (isLoading) {
    return <div className="flex justify-center items-center h-full">Loading...</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{project?.name || "Project"}</h1>
        {project?.description && (
          <p className="text-muted-foreground mt-1">{project.description}</p>
        )}
      </div>

      {/* New Project Insights section */}
      <div className="mb-8">
        <ProjectInsights projectId={projectId} />
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Project Links</h2>
          {canEditProject && (
            <Button onClick={handleAddDetail}>
              <Plus className="mr-2 h-4 w-4" />
              Add Link
            </Button>
          )}
        </div>

        {details.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-6 text-center">
            <p className="text-muted-foreground">
              No links added yet. {canEditProject ? "Add important links and resources for your project." : ""}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {details.map((detail) => (
              <div key={detail.id} className="bg-card border border-border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <h3 className="font-medium">{detail.title}</h3>
                  {canEditProject && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditDetail(detail)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteDetail(detail.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                {detail.description && (
                  <p className="text-sm text-muted-foreground mt-1 mb-3">
                    {detail.description}
                  </p>
                )}
                <a
                  href={detail.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center mt-2"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  {detail.url}
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      <ProjectDetailForm
        detail={currentDetail}
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleDetailSubmit}
      />
    </div>
  );
}
