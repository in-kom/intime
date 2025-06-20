import { useState, useEffect } from "react";
import { commentsAPI, Reaction } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Smile } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Common emoji set
const COMMON_EMOJIS = ["👍", "❤️", "😄", "🎉", "🙌", "👀", "🚀", "👏"];

interface ReactionPickerProps {
  commentId: string;
  initialReactions?: Reaction[];
  taskId?: string; // Added for WebSocket context
  onReactionChange?: () => Promise<void>; // Add callback prop
}

export function ReactionPicker({
  commentId,
  initialReactions = [],
  onReactionChange,
  taskId,
}: ReactionPickerProps) {
  const [reactions, setReactions] = useState<Reaction[]>(initialReactions);
  const [_, setIsLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Update reactions when initialReactions changes (from parent or WebSocket)
    if (initialReactions.length > 0) {
      setReactions(initialReactions);
    } else if (commentId && !taskId) {
      // Only fetch if we don't have initial reactions and not using WebSockets
      fetchReactions();
    }
  }, [commentId, initialReactions]);

  const fetchReactions = async () => {
    try {
      setIsLoading(true);
      const response = await commentsAPI.getReactions(commentId);
      setReactions(response.data);
    } catch (error) {
      console.error("Failed to fetch reactions", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddReaction = async (emoji: string) => {
    try {
      setIsLoading(true);

      // Check if user already reacted with this emoji
      const existingReaction = reactions.find(
        (r) => r.emoji === emoji && r.userId === user?.id
      );

      if (existingReaction) {
        // Remove reaction
        await commentsAPI.removeReaction(commentId, emoji);
        // If using WebSockets, state will be updated via websocket event
        if (!taskId) {
          setReactions(
            reactions.filter(
              (r) => !(r.emoji === emoji && r.userId === user?.id)
            )
          );
        }
        onReactionChange?.();
      } else {
        // Add reaction
        const response = await commentsAPI.addReaction(commentId, emoji);
        // If using WebSockets, state will be updated via websocket event
        if (!taskId) {
          setReactions([
            ...reactions.filter(
              (r) => !(r.emoji === emoji && r.userId === user?.id)
            ),
            response.data,
          ]);
        }
        onReactionChange?.();
      }
    } catch (error) {
      console.error("Failed to update reaction", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {} as Record<string, Reaction[]>);

  return (
    <div className="flex items-center gap-2 mt-2">
      {/* Display existing reaction groups */}
      {Object.entries(groupedReactions).map(([emoji, emojiReactions]) => {
        const hasUserReacted = emojiReactions.some(
          (r) => r.userId === user?.id
        );

        return (
          <TooltipProvider key={emoji} delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={hasUserReacted ? "secondary" : "outline"}
                  size="sm"
                  className="h-8 px-2 gap-1"
                  onClick={() => handleAddReaction(emoji)}
                >
                  <span>{emoji}</span>
                  <span className="text-xs">{emojiReactions.length}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm py-1">
                  {emojiReactions.map((r) => r.user?.name).join(", ")}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}

      {/* Add reaction button */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full">
            <Smile className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="grid grid-cols-4 gap-2">
            {COMMON_EMOJIS.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => {
                  handleAddReaction(emoji);
                }}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
