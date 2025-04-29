import { useState, useEffect } from "react";
import { CheckIcon, PlusCircleIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TagBadge } from "./tag-badge";
import { tagsAPI } from "@/lib/api";
import { Input } from "@/components/ui/input";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TagSelectorProps {
  projectId: string; // Changed from companyId to projectId
  selectedTags: Tag[];
  onChange: (tags: Tag[]) => void;
}

export function TagSelector({ projectId, selectedTags, onChange }: TagSelectorProps) {
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3b82f6");
  const [isCreatingTag, setIsCreatingTag] = useState(false);

  useEffect(() => {
    const fetchTags = async () => {
      if (!projectId) return;
      
      try {
        setIsLoading(true);
        // Updated to use the new getAll method that now expects a projectId
        const response = await tagsAPI.getAll(projectId);
        setTags(response.data);
      } catch (error) {
        console.error("Failed to fetch tags", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTags();
  }, [projectId]);

  const handleSelect = (tag: Tag) => {
    const isSelected = selectedTags.some(t => t.id === tag.id);
    
    if (isSelected) {
      onChange(selectedTags.filter(t => t.id !== tag.id));
    } else {
      onChange([...selectedTags, tag]);
    }
  };

  const handleRemove = (tagId: string) => {
    onChange(selectedTags.filter(tag => tag.id !== tagId));
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim() || isCreatingTag) return;
    
    try {
      setIsCreatingTag(true);
      // Use the updated create method that expects a projectId
      const response = await tagsAPI.create(projectId, {
        name: newTagName.trim(),
        color: newTagColor
      });
      
      const newTag = response.data;
      // Add the tag to the list of available tags
      setTags(prevTags => [...prevTags, newTag]);
      // Also add the tag to selected tags
      onChange([...selectedTags, newTag]);
      // Reset the form
      setNewTagName("");
      setNewTagColor("#3b82f6");
      // Close the popover after creating the tag
      setOpen(false);
    } catch (error) {
      console.error("Failed to create tag", error);
    } finally {
      setIsCreatingTag(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1 min-h-9">
        {selectedTags.map(tag => (
          <TagBadge 
            key={tag.id} 
            tag={tag} 
            onRemove={() => handleRemove(tag.id)} 
          />
        ))}
      </div>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 border-dashed"
          >
            <PlusCircleIcon className="mr-2 h-4 w-4" />
            Add tags
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search tags..." />
            <CommandList>
              <CommandEmpty>
                <p className="py-2 px-4 text-sm text-muted-foreground">No tags found.</p>
                <div className="p-2 border-t">
                  <div className="text-sm font-medium px-2 mb-2">Create a new tag</div>
                  <div className="space-y-2 px-2">
                    <Input
                      placeholder="Tag name"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      className="h-8"
                    />
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={newTagColor}
                        onChange={(e) => setNewTagColor(e.target.value)}
                        className="w-8 h-8"
                      />
                      <Button 
                        size="sm" 
                        className="flex-1 h-8"
                        disabled={!newTagName.trim() || isCreatingTag}
                        onClick={handleCreateTag}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {isCreatingTag ? "Creating..." : "Create Tag"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CommandEmpty>
              <CommandGroup>
                {isLoading ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    Loading tags...
                  </div>
                ) : (
                  <>
                    {tags.map(tag => (
                      <CommandItem
                        key={tag.id}
                        onSelect={() => handleSelect(tag)}
                        className="flex items-center gap-2"
                      >
                        <div className="flex-1 flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: tag.color }}
                          ></div>
                          <span>{tag.name}</span>
                        </div>
                        {selectedTags.some(t => t.id === tag.id) && (
                          <CheckIcon className="h-4 w-4" />
                        )}
                      </CommandItem>
                    ))}
                  </>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
