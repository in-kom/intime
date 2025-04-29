interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TagBadgeProps {
  tag: Tag;
  onRemove?: () => void;
}

// Helper function to determine text color based on background color
function getContrastColor(bgColor: string): string {
  // Remove the # if it exists
  const color = bgColor.charAt(0) === "#" ? bgColor.substring(1, 7) : bgColor;

  // Convert hex to RGB
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);

  // Calculate brightness
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  // Return white or black based on brightness
  return brightness > 128 ? "#000000" : "#ffffff";
}

export function TagBadge({ tag, onRemove }: TagBadgeProps) {
  const textColor = getContrastColor(tag.color);

  return (
    <span
      className="inline-flex items-center text-xs px-2 py-1 rounded-full"
      style={{ backgroundColor: tag.color, color: textColor }}
    >
      {tag.name}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 hover:opacity-80"
          aria-label={`Remove ${tag.name} tag`}
        >
          ×
        </button>
      )}
    </span>
  );
}
