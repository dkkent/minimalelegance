import React from "react";
import { cn } from "@/lib/utils";

// Type will now accept any string
export type Theme = string;

type ThemeBadgeProps = {
  theme: Theme;
  size?: "small" | "medium" | "large";
  className?: string;
};

// Define fixed theme colors for consistency
const getThemeColor = (theme: string): string => {
  // Normalize the theme name by trimming and converting to lowercase
  const normalizedTheme = theme.trim().toLowerCase();
  
  switch (normalizedTheme) {
    case 'trust':
      return "bg-sage-light text-sage-dark";
    case 'intimacy':
      return "bg-lavender-light text-lavender-dark";
    case 'conflict':
      return "bg-coral-light text-coral-dark";
    case 'dreams':
      return "bg-peach-light text-peach-dark";
    case 'play':
      return "bg-sage-light text-sage-dark";
    case 'money':
      return "bg-amber-100 text-amber-800";
    case 'all':
      return "bg-gray-100 text-gray-700";
    default:
      // Default color for any other theme
      console.log(`Using default color for theme: "${theme}"`);
      return "bg-gray-100 text-gray-700";
  }
};

export const ThemeBadge: React.FC<ThemeBadgeProps> = ({ 
  theme, 
  size = "medium",
  className = "" 
}) => {
  const sizeClasses = {
    small: "text-xs py-1 px-2.5 rounded-full",
    medium: "text-xs py-1 px-3 rounded-full",
    large: "text-sm py-1 px-3 rounded-full"
  };

  // Get the theme color
  const themeColor = getThemeColor(theme);

  return (
    <span className={cn(themeColor, sizeClasses[size], "inline-block font-medium", className)}>
      {theme}
    </span>
  );
};
