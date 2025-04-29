import { useState, useEffect } from "react";
import { projectDetailsAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Link2, Pencil, Trash2, ExternalLink } from "lucide-react";
import { ProjectDetailForm } from "./project-detail-form";
import { 
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

interface ProjectDetail {
  id: string;
  title: string;
  url: string;
  description?: string;
}

interface ProjectDetailListProps {
  projectId: string;
}

export function ProjectDetailList({ projectId }: ProjectDetailListProps) {
  const [details, setDetails] = useState<ProjectDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentDetail, setCurrentDetail] = useState<ProjectDetail | undefined>(undefined);

  useEffect(() => {
    if (projectId) {
      fetchDetails();
    }
  }, [projectId]);

  const fetchDetails = async () => {
    try {
      setIsLoading(true);
      const response = await projectDetailsAPI.getAll(projectId);
      setDetails(response.data);
    } catch (error) {
      console.error("Failed to fetch project details", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDetail = () => {
    setCurrentDetail(undefined);
    setIsFormOpen(true);
  };

  const handleEditDetail = (detail: ProjectDetail) => {
    setCurrentDetail(detail);
    setIsFormOpen(true);
  };

  const handleDeleteDetail = async (id: string) => {
    if (!confirm("Are you sure you want to delete this link?")) {
      return;
    }

    try {
      await projectDetailsAPI.delete(id);
      await fetchDetails();
    } catch (error) {
      console.error("Failed to delete detail", error);
    }
  };

  const handleOpenLink = (url: string) => {
    // Ensure the URL has a protocol
    const urlToOpen = url.startsWith('http') ? url : `https://${url}`;
    window.open(urlToOpen, '_blank', 'noopener,noreferrer');
  };

  const handleDetailSubmit = async (values: { title: string; url: string; description?: string }) => {
    try {
      if (currentDetail?.id) {
        await projectDetailsAPI.update(currentDetail.id, values);
      } else {
        await projectDetailsAPI.create(projectId, values);
      }
      setIsFormOpen(false);
      await fetchDetails();
    } catch (error) {
      console.error("Failed to save detail", error);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading project details...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Project Links</h2>
        <Button onClick={handleAddDetail}>
          <Plus className="mr-2 h-4 w-4" />
          Add Link
        </Button>
      </div>

      {details.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No links found. Click "Add Link" to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {details.map((detail) => (
            <Card key={detail.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{detail.title}</CardTitle>
                    <CardDescription className="truncate max-w-[200px]">
                      {detail.url}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM13.625 7.5C13.625 8.12132 13.1213 8.625 12.5 8.625C11.8787 8.625 11.375 8.12132 11.375 7.5C11.375 6.87868 11.8787 6.375 12.5 6.375C13.1213 6.375 13.625 6.87868 13.625 7.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                        </svg>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenLink(detail.url)}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open Link
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditDetail(detail)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleDeleteDetail(detail.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              {detail.description && (
                <CardContent className="pb-3">
                  <p className="text-sm text-muted-foreground">{detail.description}</p>
                </CardContent>
              )}
              <CardFooter>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => handleOpenLink(detail.url)}
                >
                  <Link2 className="mr-2 h-4 w-4" />
                  Visit
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <ProjectDetailForm
        detail={currentDetail}
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleDetailSubmit}
      />
    </div>
  );
}
