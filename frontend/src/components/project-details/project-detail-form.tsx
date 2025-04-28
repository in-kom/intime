import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link2 } from "lucide-react";
import { z } from "zod";

interface ProjectDetail {
  id: string;
  title: string;
  url: string;
  description?: string;
}

interface ProjectDetailFormProps {
  detail?: ProjectDetail;
  open: boolean;
  onClose: () => void;
  onSubmit: (values: { title: string; url: string; description?: string }) => void;
}

// Schema for validation
const detailSchema = z.object({
  title: z.string().min(1, "Title is required"),
  url: z.string().url("Please enter a valid URL"),
  description: z.string().optional(),
});

export function ProjectDetailForm({ detail, open, onClose, onSubmit }: ProjectDetailFormProps) {
  const [title, setTitle] = useState(detail?.title || "");
  const [url, setUrl] = useState(detail?.url || "");
  const [description, setDescription] = useState(detail?.description || "");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate the form data
      detailSchema.parse({ title, url, description });
      
      // Submit the data
      onSubmit({ title, url, description });
      
      // Reset form
      setTitle("");
      setUrl("");
      setDescription("");
      setError(null);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      } else {
        setError("An error occurred. Please try again.");
      }
    }
  };

  const handleClose = () => {
    setTitle("");
    setUrl("");
    setDescription("");
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {detail?.id ? "Edit Link" : "Add Link"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter link title"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <div className="flex space-x-2">
              <div className="flex items-center bg-muted px-3 rounded-l-md border border-r-0 border-input">
                <Link2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="rounded-l-none"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter a description"
              rows={3}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit">
              {detail?.id ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
