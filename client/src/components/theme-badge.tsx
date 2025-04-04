import React from "react";
import { cn } from "@/lib/utils";

type Theme = "Trust" | "Intimacy" | "Conflict" | "Dreams" | "Play";

type ThemeBadgeProps = {
  theme: Theme;
  size?: "small" | "medium" | "large";
  className?: string;
};

export const ThemeBadge: React.FC<ThemeBadgeProps> = ({ 
  theme, 
  size = "medium",
  className = "" 
}) => {
  const themeColors = {
    Trust: "bg-sage-light text-sage-dark",
    Intimacy: "bg-lavender-light text-lavender-dark",
    Conflict: "bg-coral-light text-coral-dark",
    Dreams: "bg-coral-light text-coral-dark",
    Play: "bg-sage-light text-sage-dark"
  };

  const sizeClasses = {
    small: "text-xs py-1 px-2.5 rounded-full",
    medium: "text-xs py-1 px-3 rounded-full",
    large: "text-sm py-1 px-3 rounded-full"
  };

  return (
    <span className={cn(themeColors[theme], sizeClasses[size], className)}>
      {theme}
    </span>
  );
};
