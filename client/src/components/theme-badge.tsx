import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Type will now accept any string
export type Theme = string;

type ThemeBadgeProps = {
  theme: Theme;
  size?: "small" | "medium" | "large";
  className?: string;
};

// This interface should match the structure in the database
interface ThemeObject {
  id: number;
  name: string;
  color: string;
}

// Create a global cache to avoid multiple API calls
const themeCache: Record<string, string> = {
  All: "bg-gray-100 text-gray-700",
  Trust: "bg-sage-light text-sage-dark",
  Intimacy: "bg-lavender-light text-lavender-dark",
  Conflict: "bg-coral-light text-coral-dark",
  Dreams: "bg-peach-light text-peach-dark", // Changed to peach for Dreams
  Play: "bg-sage-light text-sage-dark",
  Money: "bg-amber-100 text-amber-800"
};

// Flag to track if themes were already fetched
let themesLoaded = false;

// Helper function to generate a default color based on the theme name
const getDefaultColorForTheme = (themeName: string): string => {
  // Fallback colors based on the first letter of the theme name
  const fallbackColors: Record<string, string> = {
    "A": "bg-amber-100 text-amber-800",
    "B": "bg-blue-100 text-blue-800",
    "C": "bg-coral-light text-coral-dark",
    "D": "bg-cyan-100 text-cyan-800",
    "E": "bg-emerald-100 text-emerald-800",
    "F": "bg-fuchsia-100 text-fuchsia-800",
    "G": "bg-green-100 text-green-800",
    "H": "bg-amber-100 text-amber-800",
    "I": "bg-indigo-100 text-indigo-800",
    "J": "bg-blue-100 text-blue-800",
    "K": "bg-sky-100 text-sky-800",
    "L": "bg-lavender-light text-lavender-dark",
    "M": "bg-amber-100 text-amber-800",
    "N": "bg-blue-100 text-blue-800",
    "O": "bg-orange-100 text-orange-800",
    "P": "bg-sage-light text-sage-dark",
    "Q": "bg-amber-100 text-amber-800",
    "R": "bg-rose-100 text-rose-800",
    "S": "bg-slate-100 text-slate-800",
    "T": "bg-sage-light text-sage-dark",
    "U": "bg-amber-100 text-amber-800",
    "V": "bg-violet-100 text-violet-800",
    "W": "bg-slate-100 text-slate-800",
    "X": "bg-amber-100 text-amber-800",
    "Y": "bg-yellow-100 text-yellow-800",
    "Z": "bg-blue-100 text-blue-800",
  };
  
  const firstLetter = themeName.charAt(0).toUpperCase();
  return fallbackColors[firstLetter] || "bg-gray-100 text-gray-700";
};

// Load themes once for all instances
const loadThemesFromServer = async () => {
  if (themesLoaded) return;
  
  try {
    const response = await fetch('/api/themes', {
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.themes && Array.isArray(data.themes)) {
        // Add each theme from the database to the global cache
        data.themes.forEach((theme: ThemeObject) => {
          // If a theme has a specific color format, use it
          // Otherwise fallback to a default color scheme based on the theme name
          themeCache[theme.name] = theme.color || getDefaultColorForTheme(theme.name);
        });
        
        // Mark themes as loaded
        themesLoaded = true;
      }
    }
  } catch (error) {
    console.error("Failed to fetch themes for ThemeBadge:", error);
  }
};

// Start loading themes immediately
loadThemesFromServer();

export const ThemeBadge: React.FC<ThemeBadgeProps> = ({ 
  theme, 
  size = "medium",
  className = "" 
}) => {
  // We'll use the forceUpdate pattern to refresh the component when theme data changes
  const [, setForceUpdate] = useState<{}>({});

  // Fetch themes from the API when the component mounts if not already loaded
  useEffect(() => {
    // Only attempt to load if not already loaded
    if (!themesLoaded) {
      const fetchThemes = async () => {
        await loadThemesFromServer();
        // Force a re-render after theme data is loaded
        setForceUpdate({});
      };
      
      fetchThemes();
    }
  }, []);

  const sizeClasses = {
    small: "text-xs py-1 px-2.5 rounded-full",
    medium: "text-xs py-1 px-3 rounded-full",
    large: "text-sm py-1 px-3 rounded-full"
  };

  // Get the color from the cache, or use a default if the theme doesn't exist
  const themeColor = themeCache[theme] || getDefaultColorForTheme(theme);

  return (
    <span className={cn(themeColor, sizeClasses[size], className)}>
      {theme}
    </span>
  );
};
