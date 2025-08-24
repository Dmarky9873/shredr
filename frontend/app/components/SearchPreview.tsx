interface SearchPreviewItem {
  id: string;
  title: string;
  subtitle?: string;
  onClick?: () => void;
}

interface SearchPreviewProps {
  items: SearchPreviewItem[];
  isVisible: boolean;
  className?: string;
  maxItems?: number;
  selectedIndex?: number;
}

export default function SearchPreview({
  items,
  isVisible,
  className = "",
  maxItems = 5,
  selectedIndex = -1,
}: SearchPreviewProps) {
  if (!isVisible || items.length === 0) {
    return null;
  }

  const displayItems = items.slice(0, maxItems);

  return (
    <div
      className={`
        absolute top-full left-0 right-0 z-50
        mt-1 bg-background
        border-2 border-foreground/20
        rounded-lg shadow-lg
        max-h-80 overflow-y-auto
        ${className}
      `}
    >
      {displayItems.map((item, index) => (
        <div
          key={item.id}
          onClick={item.onClick}
          className={`
            px-4 py-3 cursor-pointer
            transition-colors duration-150
            ${
              index !== displayItems.length - 1
                ? "border-b border-foreground/10"
                : ""
            }
            ${index === 0 ? "rounded-t-md" : ""}
            ${index === displayItems.length - 1 ? "rounded-b-md" : ""}
            ${
              index === selectedIndex
                ? "bg-foreground/10"
                : "hover:bg-foreground/5"
            }
          `}
        >
          <div className="flex items-center justify-between">
            <div className="font-medium text-foreground font-coustard text-left">
              {item.title}
            </div>
            {item.subtitle && (
              <div className="text-xs text-foreground/60 font-coustard ml-2 truncate text-right">
                {item.subtitle}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export type { SearchPreviewItem, SearchPreviewProps };
