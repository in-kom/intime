import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { TagManagement } from '@/components/tags/tag-management';
import { projectsAPI } from '@/lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface Project {
  id: string;
  name: string;
}

export default function TagsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectId || '');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        // We'll need to get the company ID first, or get all projects the user has access to
        // This is simplified for now
        const response = await projectsAPI.getAll("current-company-id");
        setProjects(response.data);
        
        if (!selectedProjectId && response.data.length > 0) {
          setSelectedProjectId(response.data[0].id);
        }
      } catch (error) {
        console.error("Failed to fetch projects", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, []);

  if (isLoading) {
    return <div className="p-6">Loading projects...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Label htmlFor="project-select">Select Project</Label>
        <Select 
          value={selectedProjectId} 
          onValueChange={setSelectedProjectId}
        >
          <SelectTrigger id="project-select" className="w-[300px]">
            <SelectValue placeholder="Select a project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {selectedProjectId ? (
        <TagManagement key={selectedProjectId} />
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          Please select a project to manage tags
        </div>
      )}
    </div>
  );
}
