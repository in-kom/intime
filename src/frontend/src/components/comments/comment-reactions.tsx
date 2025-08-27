import { useState, useEffect, useRef } from "react";
import { commentsAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SmilePlus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import webSocketService from "@/services/websocket.service";

interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  commentId?: string;
  taskCommentId?: string;
  user?: {
    id: string;
    name: string;
    imageUrl?: string;
  };
}

interface CommentReactionsProps {
  commentId: string;
  taskId: string;
  initialReactions?: Reaction[];
  useWebSocket?: boolean;
}

const commonEmojis = ["👍", "👎", "😄", "🎉", "😕", "❤️", "🚀", "👀"];

export function CommentReactions({ 
  commentId, 
  taskId,
  initialReactions = [],
  useWebSocket = false
}: CommentReactionsProps) {
  const [reactions, setReactions] = useState<Reaction[]>(initialReactions);
  const [, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const currentUserId = localStorage.getItem("userId");
  const currentUser = { id: currentUserId, name: localStorage.getItem("userName") || "You" };
  const reactionsLoadedRef = useRef<boolean>(initialReactions.length > 0);
  const isSubscribedRef = useRef<boolean>(false);

  // Debug logs
  console.log(`CommentReactions init - comment: ${commentId}, task: ${taskId}, useWS: ${useWebSocket}`);

  // Set up WebSocket listeners for reactions
  useEffect(() => {
    if (!useWebSocket || !taskId || isSubscribedRef.current) return;

    console.log(`[WS] Setting up reaction listeners for task: ${taskId}, comment: ${commentId}`);
    isSubscribedRef.current = true;

    // Subscribe to the task events if not already subscribed
    webSocketService.subscribe(taskId);
    
    const reactionAddedHandler = (newReaction: any) => {
      console.log(`[WS] Reaction added event received:`, newReaction);
      
      // Check if this reaction belongs to our comment
      const reactionCommentId = newReaction.commentId || newReaction.taskCommentId;
      if (reactionCommentId === commentId) {
        console.log(`[WS] Updating UI for added reaction to comment: ${commentId}`);
        setReactions(prev => {
          // Check if we already have this reaction
          if (prev.some(r => r.id === newReaction.id)) return prev;
          return [...prev, newReaction];
        });
      }
    };
    
    const reactionRemovedHandler = (data: any) => {
      console.log(`[WS] Reaction removed event received:`, data);
      
      // Check if this reaction removal belongs to our comment
      if (data.commentId === commentId || data.taskCommentId === commentId) {
        console.log(`[WS] Updating UI for removed reaction from comment: ${commentId}`);
        
        // If we have reaction ID, filter by that
        if (data.id) {
          setReactions(prev => prev.filter(r => r.id !== data.id));
        } 
        // Otherwise filter by userId + emoji combination
        else if (data.userId && data.emoji) {
          setReactions(prev => 
            prev.filter(r => !(r.userId === data.userId && r.emoji === data.emoji))
          );
        }
      }
    };

    // Add WebSocket event listeners
    const addedListener = webSocketService.addListener('REACTION_ADDED', reactionAddedHandler);
    const removedListener = webSocketService.addListener('REACTION_REMOVED', reactionRemovedHandler);

    // Cleanup function
    return () => {
      console.log(`[WS] Cleaning up reaction listeners for task: ${taskId}, comment: ${commentId}`);
      addedListener();
      removedListener();
      isSubscribedRef.current = false;
    };
  }, [commentId, taskId, useWebSocket]);

  // Load initial reactions if needed and not using WebSockets
  useEffect(() => {
    if (initialReactions && initialReactions.length > 0) {
      console.log(`Setting initial reactions for comment ${commentId}:`, initialReactions.length);
      setReactions(initialReactions);
      reactionsLoadedRef.current = true;
    } else if (!reactionsLoadedRef.current && !useWebSocket) {
      fetchReactions();
    }
  }, [commentId, initialReactions, useWebSocket]);

  const fetchReactions = async () => {
    if (!commentId || reactionsLoadedRef.current) return;
    
    try {
      console.log(`Fetching reactions for comment ${commentId}`);
      setIsLoading(true);
      const response = await commentsAPI.getReactions(commentId);
      console.log(`Received ${response.data.length} reactions for comment ${commentId}`);
      setReactions(response.data);
      reactionsLoadedRef.current = true;
    } catch (error) {
      console.error(`Failed to fetch reactions for comment ${commentId}:`, error);
      setReactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddReaction = async (emoji: string) => {
    if (!commentId) return;
    
    // Check if the user has already reacted with this emoji
    const existingReaction = reactions.find(
      (r) => r.emoji === emoji && r.userId === currentUserId
    );

    try {
      // Apply optimistic update first - don't wait for API or WebSocket
      if (existingReaction) {
        // Removing reaction optimistically
        setReactions(prev => prev.filter(r => !(r.emoji === emoji && r.userId === currentUserId)));
      } else {
        // Adding reaction optimistically
        const tempId = `temp-${Date.now()}`;
        const optimisticReaction: Reaction = {
          id: tempId,
          emoji: emoji,
          userId: currentUserId || '',
          commentId: commentId,
          user: currentUser as any
        };
        setReactions(prev => [...prev, optimisticReaction]);
      }
      
      // Close emoji picker
      setIsOpen(false);
      
      // Then make the API call
      if (existingReaction) {
        await commentsAPI.removeReaction(commentId, emoji);
      } else {
        await commentsAPI.addReaction(commentId, emoji);
      }
    } catch (error) {
      console.error(`Failed to toggle reaction ${emoji} for comment ${commentId}:`, error);
      
      // Revert optimistic update on error
      if (existingReaction) {
        // Put back the removed reaction
        setReactions(prev => [...prev, existingReaction]);
      } else {
        // Remove the temporarily added reaction
        setReactions(prev => prev.filter(r => !(r.emoji === emoji && r.userId === currentUserId)));
      }
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

  // Check if current user has reacted with a specific emoji
  const hasUserReacted = (emoji: string) => {
    return reactions.some(r => r.emoji === emoji && r.userId === currentUserId);
  };

  return (
    <div className="flex flex-wrap items-center gap-1 mt-2">
      {Object.entries(groupedReactions).map(([emoji, emojiReactions]) => (
        <TooltipProvider key={emoji}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`h-7 px-2 text-xs ${
                  hasUserReacted(emoji) ? "bg-secondary" : ""
                }`}
                onClick={() => handleAddReaction(emoji)}
              >
                <span className="mr-1">{emoji}</span>
                <span>{emojiReactions.length}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                {emojiReactions.map((r) => r.user?.name || "Unknown").join(", ")}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <SmilePlus className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2">
          <div className="flex flex-wrap gap-1 max-w-[200px]">
            {commonEmojis.map((emoji) => (
              <button
                key={emoji}
                className="text-lg p-1 hover:bg-secondary rounded cursor-pointer"
                onClick={() => handleAddReaction(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
