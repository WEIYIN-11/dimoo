"use client";

import { LucideIcon, ExternalLink } from "lucide-react";
import { useState } from "react";

interface LinkCardProps {
  title: string;
  url: string;
  description?: string;
  icon: LucideIcon;
}

export default function LinkCard({ title, url, description, icon: Icon }: LinkCardProps) {
  const [pressed, setPressed] = useState(false);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      className={[
        // Base layout
        "group relative w-full flex items-center gap-4 px-5 py-4 rounded-2xl",
        // Glassmorphism
        "bg-white/10 backdrop-blur-md border border-white/20",
        // Shadow
        "shadow-lg shadow-black/20",
        // Typography
        "text-white no-underline",
        // Transitions
        "transition-all duration-200 ease-out",
        // Hover
        "hover:bg-white/20 hover:border-white/40 hover:shadow-xl hover:shadow-black/30 hover:-translate-y-0.5 hover:scale-[1.01]",
        // Press
        pressed ? "scale-[0.98] translate-y-0.5 shadow-md" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Left icon */}
      <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 group-hover:bg-white/20 transition-colors duration-200 shrink-0">
        <Icon size={18} strokeWidth={1.75} />
      </span>

      {/* Text */}
      <div className="flex flex-col min-w-0">
        <span className="font-semibold text-sm leading-tight truncate">{title}</span>
        {description && (
          <span className="text-white/50 text-xs leading-tight mt-0.5 truncate">
            {description}
          </span>
        )}
      </div>

      {/* Right arrow — visible on hover */}
      <ExternalLink
        size={15}
        className="ml-auto shrink-0 opacity-0 -translate-x-1 group-hover:opacity-50 group-hover:translate-x-0 transition-all duration-200"
      />
    </a>
  );
}
