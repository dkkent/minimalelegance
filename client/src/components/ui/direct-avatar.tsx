import * as React from "react";

// Create a global cache for image URLs across component instances
type ImageCache = {
  [key: string]: {
    url: string;
    timestamp: number;
    loaded: boolean;
  }
};

// Global cache that persists between renders
const globalImageCache: ImageCache = {};

// Cache management helper
const AvatarCacheManager = {
  // Maximum cache size (number of entries)
  MAX_CACHE_SIZE: 50,
  
  // Maximum age for a cache entry (8 hours in ms for better persistence)
  MAX_CACHE_AGE: 8 * 60 * 60 * 1000,
  
  // Get a cached URL or create a new one
  getCachedUrl(path: string): string {
    if (!path) return '';
    
    // Generate a stable cache key that removes any query parameters
    const stablePath = path.split('?')[0];
    
    // Check if we already have this in cache (even if not loaded)
    if (globalImageCache[stablePath]) {
      return globalImageCache[stablePath].url;
    }
    
    // Clean up cache if needed
    this.cleanCache();
    
    // Use a stable timestamp based on the path to ensure consistency across page loads
    // This prevents new timestamps from being generated on every render
    let timestamp: number;
    try {
      // Try to get from session storage first - most stable option
      const storedTimestamp = sessionStorage.getItem(`avatar-timestamp-${stablePath}`);
      if (storedTimestamp) {
        timestamp = parseInt(storedTimestamp, 10);
      } else {
        // Generate a hash-like value from the path string to create a stable timestamp
        timestamp = stablePath.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) * 1000;
        // Store for future use
        sessionStorage.setItem(`avatar-timestamp-${stablePath}`, timestamp.toString());
      }
    } catch (e) {
      // Fallback if session storage fails
      timestamp = Date.now();
    }
    
    // Create stable URL with fixed timestamp to improve caching
    const url = `${stablePath}?t=${timestamp}`;
    
    globalImageCache[stablePath] = {
      url,
      timestamp,
      loaded: false
    };
    
    return url;
  },
  
  // Mark an image as loaded in the cache
  setLoaded(path: string, loaded: boolean = true): void {
    if (!path) return;
    
    // Always use stable path as key
    const stablePath = this.getStablePath(path);
    
    if (globalImageCache[stablePath]) {
      globalImageCache[stablePath].loaded = loaded;
    }
  },
  
  // Get stable path key (removing any query parameters)
  getStablePath(path: string): string {
    if (!path) return '';
    return path.split('?')[0];
  },
  
  // Check if an image is already loaded in cache
  isLoaded(path: string): boolean {
    if (!path) return false;
    
    // Always use stable path as key
    const stablePath = this.getStablePath(path);
    
    // Session storage check (persists between page loads)
    try {
      const sessionData = sessionStorage.getItem(`avatar-loaded-${stablePath}`);
      if (sessionData === 'true') {
        // If we have session data saying this was loaded before, update our cache
        if (globalImageCache[stablePath]) {
          globalImageCache[stablePath].loaded = true;
        }
        return true;
      }
    } catch (e) {
      // Ignore any session storage errors
    }
    
    // Fall back to memory cache
    return !!globalImageCache[stablePath]?.loaded;
  },
  
  // Persist loaded state to session storage
  persistLoadedState(path: string, loaded: boolean): void {
    if (!path) return;
    
    // Always use stable path as key
    const stablePath = this.getStablePath(path);
    
    try {
      if (loaded) {
        // Store both by stable path and full URL for compatibility
        sessionStorage.setItem(`avatar-loaded-${stablePath}`, 'true');
      } else {
        // Clean up both entries
        sessionStorage.removeItem(`avatar-loaded-${stablePath}`);
      }
    } catch (e) {
      // Ignore any session storage errors
    }
  },
  
  // Clean up old or excess cache entries
  cleanCache(): void {
    const now = Date.now();
    const entries = Object.entries(globalImageCache);
    
    // If cache is under the limit, only remove old entries
    if (entries.length <= this.MAX_CACHE_SIZE) {
      // Remove entries older than MAX_CACHE_AGE
      entries.forEach(([key, entry]) => {
        if (now - entry.timestamp > this.MAX_CACHE_AGE) {
          delete globalImageCache[key];
        }
      });
      return;
    }
    
    // If cache is over the limit, sort by age and keep only the newest MAX_CACHE_SIZE entries
    const sortedEntries = entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
    const entriesToKeep = sortedEntries.slice(0, this.MAX_CACHE_SIZE);
    
    // Clear the cache and add back only the entries to keep
    Object.keys(globalImageCache).forEach(key => delete globalImageCache[key]);
    
    entriesToKeep.forEach(([key, entry]) => {
      globalImageCache[key] = entry;
    });
  }
};

interface DirectAvatarProps {
  // Direct src and size props
  src?: string;
  alt: string;
  size?: number;
  className?: string;
  borderColor?: string;
  fallbackText?: string;
  
  // OR use a user object (which can contain profilePictureSizes)
  user?: {
    name?: string;
    profilePicture?: string | null;
    profilePictureSizes?: {
      small?: string;
      medium?: string;
      large?: string;
    } | null;
  } | null;
}

/**
 * A very simple avatar component with minimal wrappers to ensure the image renders correctly
 * Can accept either a direct src or a user object with profilePictureSizes
 */
export function DirectAvatar({
  src,
  alt,
  size = 40,
  className = "",
  borderColor = "white",
  fallbackText = "U",
  user
}: DirectAvatarProps) {
  const [imageError, setImageError] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  
  // Function to ensure profile picture path is properly formatted
  const formatProfilePicturePath = (path: string | null | undefined): string => {
    if (!path) return '';
    
    // If path already starts with /uploads, use it as is
    if (path.startsWith('/uploads/profile_pictures/')) {
      return path;
    }
    
    // If path is just the filename, add the directory prefix
    const formattedPath = `/uploads/profile_pictures/${path}`;
    return formattedPath;
  };
  
  // Determine the optimal image source based on size
  const getOptimalImageSrc = React.useMemo(() => {
    // If a direct src is provided, use it
    if (src) {
      return formatProfilePicturePath(src);
    }
    
    // If a user object is provided, check for sized images
    if (user) {
      // Select the appropriate size based on the avatar display size
      let optimalSize: 'small' | 'medium' | 'large' = 'small';
      
      if (size <= 48) {
        optimalSize = 'small';  // Small size: up to 48px
      } else if (size <= 96) {
        optimalSize = 'medium'; // Medium size: 49-96px
      } else {
        optimalSize = 'large';  // Large size: 97px+
      }
      
      // Check if we have optimized sizes available
      if (user.profilePictureSizes && 
          user.profilePictureSizes[optimalSize] && 
          typeof user.profilePictureSizes[optimalSize] === 'string') {
        // Use the optimized size
        return formatProfilePicturePath(user.profilePictureSizes[optimalSize] as string);
      }
      
      // Fallback to regular profile picture
      if (user.profilePicture) {
        return formatProfilePicturePath(user.profilePicture);
      }
    }
    
    return '';
  }, [src, user, size]);
  
  // Create a cache key from the optimal image source
  const cacheKey = getOptimalImageSrc || '';
  
  // Get cached URL or create new one with cache management
  const imageUrl = React.useMemo(() => {
    if (!cacheKey) return '';
    return AvatarCacheManager.getCachedUrl(cacheKey);
  }, [cacheKey]);
  
  // Set initial state based on cache
  React.useEffect(() => {
    if (cacheKey) {
      // Set initial loaded state based on cache
      setImageLoaded(AvatarCacheManager.isLoaded(cacheKey));
    }
  }, [cacheKey]);
  
  // Preload image (only if not already loaded in cache)
  React.useEffect(() => {
    // Skip if no URL
    if (!imageUrl || !cacheKey) {
      setImageError(true);
      return;
    }
    
    // If image is already loaded in cache, skip loading
    if (AvatarCacheManager.isLoaded(cacheKey)) {
      setImageLoaded(true);
      setImageError(false);
      return;
    }
    
    // Reset state when src changes to a non-cached image
    setImageError(false);
    setImageLoaded(false);
    
    // Verify image actually loads
    const img = new Image();
    img.onload = () => {
      // Update global cache and persist to session storage
      AvatarCacheManager.setLoaded(cacheKey, true);
      AvatarCacheManager.persistLoadedState(cacheKey, true);
      setImageLoaded(true);
    };
    img.onerror = () => {
      setImageError(true);
      // Clear from session storage to avoid persisting error state
      AvatarCacheManager.persistLoadedState(cacheKey, false);
    };
    img.src = imageUrl;
    
    // Clean up on unmount or src change
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [imageUrl, cacheKey]);
  
  // Use a stable key for the component
  const imageKey = React.useMemo(() => {
    return `avatar-${cacheKey}`;
  }, [cacheKey]);
  
  return (
    <div 
      className={`direct-avatar ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        overflow: 'hidden',
        position: 'relative',
        border: `2px solid ${borderColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: imageError ? '#f0f0f0' : 'transparent'
      }}
    >
      {!imageError && (
        <img
          key={imageKey} // Use stable key based on the source path
          src={imageUrl}
          alt={alt}
          width={size}
          height={size}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            opacity: imageLoaded ? 1 : 0.1, // Start transparent until loaded
            transition: 'opacity 0.3s ease'
          }}
          onLoad={() => {
            // Only log on initial load, not on every render
            if (!AvatarCacheManager.isLoaded(cacheKey)) {
              // Reduce console noise in production
              if (process.env.NODE_ENV === 'development') {
                console.log(`DirectAvatar loaded in DOM: ${imageUrl}`);
              }
            }
            
            // Update component state
            setImageLoaded(true);
            
            // Update global cache and persist to session storage
            AvatarCacheManager.setLoaded(cacheKey, true);
            AvatarCacheManager.persistLoadedState(cacheKey, true);
          }}
          onError={(e) => {
            // Only log errors in development
            if (process.env.NODE_ENV === 'development') {
              console.error(`DirectAvatar error loading: ${imageUrl}`);
            }
            setImageError(true);
            // Clear from session storage to avoid persisting error state
            AvatarCacheManager.persistLoadedState(cacheKey, false);
          }}
        />
      )}
      {imageError && (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#e0e0e0',
          color: '#666',
          fontSize: `${size / 2}px`,
          fontWeight: 'bold'
        }}>
          {fallbackText}
        </div>
      )}
    </div>
  );
}