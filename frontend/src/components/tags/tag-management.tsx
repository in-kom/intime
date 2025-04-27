import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit, Trash2 } from "lucide-react";
import { tagsAPI } from "@/lib/api";
import { TagBadge } from "./tag-badge";

interface Tag {
  id: string;
  name: string;
  color: string;
}

export function TagManagement() {
  const { projectId } = useParams<{ projectId: string }>();
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentTag, setCurrentTag] = useState<Partial<Tag> | null>(null);

  useEffect(() => {
    if (projectId) {
      fetchTags();
    }
  }, [projectId]);

  const fetchTags = async () => {
    if (!projectId) return;

    try {
      setIsLoading(true);
      const response = await tagsAPI.getAll(projectId);
      setTags(response.data);
    } catch (error) {
      console.error("Failed to fetch tags", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTag = () => {
    setCurrentTag({ name: "", color: "#3b82f6" });
    setIsFormOpen(true);
  };

  const handleEditTag = (tag: Tag) => {
    setCurrentTag(tag);
    setIsFormOpen(true);
  };

  const handleDeleteTag = async (tagId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this tag? It will be removed from all tasks."
      )
    ) {
      return;
    }

    try {
      await tagsAPI.delete(tagId);
      await fetchTags();
    } catch (error) {
      console.error("Failed to delete tag", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentTag?.name || !projectId) return;

    try {
      if (currentTag.id) {
        await tagsAPI.update(currentTag.id, {
          name: currentTag.name,
          color: currentTag.color,
        });
      } else {
        await tagsAPI.create(projectId, {
          name: currentTag.name,
          color: currentTag.color,
        });
      }

      setIsFormOpen(false);
      await fetchTags();
    } catch (error) {
      console.error("Failed to save tag", error);
    }
  };

  if (!projectId) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Please select a project to manage tags
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Tags</h2>
        <Button onClick={handleAddTag}>
          <Plus className="mr-2 h-4 w-4" />
          Add Tag
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading tags...</div>
      ) : tags.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No tags found. Click "Add Tag" to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="p-4 border rounded-md flex items-center justify-between"
            >
              <TagBadge tag={tag} />
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEditTag(tag)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteTag(tag.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentTag?.id ? "Edit Tag" : "Create Tag"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="name"
                value={currentTag?.name || ""}
                onChange={(e) =>
                  setCurrentTag({ ...currentTag, name: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="color" className="text-sm font-medium">
                Color
              </label>
              <div className="flex gap-2 items-center">
                <Input
                  id="color"
                  type="color"
                  value={currentTag?.color || "#3b82f6"}
                  onChange={(e) =>
                    setCurrentTag({ ...currentTag, color: e.target.value })
                  }
                  className="w-12 h-9 p-1"
                />
                <div className="flex-1">
                  <Input
                    value={currentTag?.color || "#3b82f6"}
                    onChange={(e) =>
                      setCurrentTag({ ...currentTag, color: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="mt-2">
                <label className="text-sm font-medium">Preview:</label>
                <div className="mt-1">
                  {currentTag && (
                    <TagBadge
                      tag={{
                        id: "preview",
                        name: currentTag.name || "Tag",
                        color: currentTag.color || "#3b82f6",
                      }}
                    />
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {currentTag?.id ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
