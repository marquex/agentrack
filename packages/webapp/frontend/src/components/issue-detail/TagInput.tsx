import { useState, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  className?: string;
}

export function TagInput({ tags, onTagsChange, className }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const tag = inputValue.trim().toLowerCase();
      if (tag && !tags.includes(tag)) {
        onTagsChange([...tags, tag]);
      }
      setInputValue("");
    } else if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
      onTagsChange(tags.slice(0, -1));
    }
  }

  function removeTag(tagToRemove: string) {
    onTagsChange(tags.filter((t) => t !== tagToRemove));
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5",
        className
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
        >
          {tag}
          <button
            onClick={(e) => {
              e.stopPropagation();
              removeTag(tag);
            }}
            className="ml-0.5 text-slate-400 hover:text-red-500"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? "Type a tag and press Enter..." : ""}
        className="min-w-[80px] flex-1 border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
      />
    </div>
  );
}
