import { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { commentsAPI } from "@/lib/api";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { API_URL } from "@/lib/api";

interface MentionUser {
  id: string;
  name: string;
  imageUrl?: string;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  companyId: string;
  placeholder?: string;
  className?: string;
}

export function MentionInput({
  value,
  onChange,
  companyId,
  placeholder = "Add a comment...",
  className = ""
}: MentionInputProps) {
  const [users, setUsers] = useState<MentionUser[]>([]);
  const [_, setIsLoading] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [suggestionPosition, setSuggestionPosition] = useState({ top: 0, left: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (companyId) {
      fetchUsers();
    }
  }, [companyId]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await commentsAPI.getUsersForMentions(companyId);
      setUsers(response.data);
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    const cursorPos = e.target.selectionStart;
    setCursorPosition(cursorPos);
    
    // Check if we're in a mention context
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const atSignIndex = textBeforeCursor.lastIndexOf('@');
    
    if (atSignIndex !== -1 && !textBeforeCursor.substring(atSignIndex).includes(' ')) {
      const query = textBeforeCursor.substring(atSignIndex + 1);
      setMentionQuery(query);
      setShowMentions(true);
      
      // Position the suggestion box
      if (textareaRef.current) {
        const { offsetLeft, offsetTop, scrollTop } = textareaRef.current;
        // Get computed line height
        const computedStyle = window.getComputedStyle(textareaRef.current);
        const lineHeightStr = computedStyle.lineHeight;
        let lineHeight = 20;
        if (lineHeightStr && lineHeightStr !== "normal") {
          lineHeight = parseInt(lineHeightStr, 10) || 20;
        }
        
        // Calculate number of newlines before cursor to adjust vertical position
        const linesBeforeCursor = textBeforeCursor.split('\n').length - 1;
        
        setSuggestionPosition({
          top: offsetTop + (linesBeforeCursor * lineHeight) - scrollTop + 30,
          left: offsetLeft + 10
        });
      }
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (user: MentionUser) => {
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);
    const atSignIndex = textBeforeCursor.lastIndexOf('@');
    
    // Replace the @query with the formatted mention
    const newText = 
      textBeforeCursor.substring(0, atSignIndex) + 
      `@[${user.name}](${user.id})` + 
      textAfterCursor;
    
    onChange(newText);
    setShowMentions(false);
    
    // Focus back on textarea
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Filter users based on query
  const filteredUsers = mentionQuery 
    ? users.filter(user => 
        user.name.toLowerCase().includes(mentionQuery.toLowerCase())
      )
    : users;

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleTextareaChange}
        placeholder={placeholder}
        className={`min-h-[80px] ${className}`}
      />
      
      {showMentions && filteredUsers.length > 0 && (
        <div 
          className="absolute z-10 mt-1 bg-background border border-border rounded-md shadow-md max-h-[200px] overflow-y-auto w-64"
          style={{ 
            top: suggestionPosition.top,
            left: suggestionPosition.left
          }}
        >
          {filteredUsers.map(user => (
            <div 
              key={user.id}
              className="p-2 hover:bg-accent flex items-center gap-2 cursor-pointer"
              onClick={() => insertMention(user)}
            >
              <Avatar className="h-6 w-6">
                <AvatarImage
                  src={user.imageUrl ? `${API_URL}${user.imageUrl}` : undefined}
                  alt={user.name}
                />
                <AvatarFallback>
                  {user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{user.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
