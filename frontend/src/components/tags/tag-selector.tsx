import { useState, useEffect } from "react";
import { CheckIcon, PlusCircleIcon } from "lucide-react";
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

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TagSelectorProps {
  companyId: string;
  selectedTags: Tag[];
  onChange: (tags: Tag[]) => void;
}

export function TagSelector({ companyId, selectedTags, onChange }: TagSelectorProps) {
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTags = async () => {
      if (!companyId) return;
      
      try {
        setIsLoading(true);
        const response = await tagsAPI.getAll(companyId);
        setTags(response.data);
      } catch (error) {
        console.error("Failed to fetch tags", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTags();
  }, [companyId]);

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
              <CommandEmpty>No tags found.</CommandEmpty>
              <CommandGroup>
                {isLoading ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    Loading tags...
                  </div>
                ) : (
                  tags.map(tag => (
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
                  ))
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
