import * as React from "react";

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
  
  // Add cache-busting parameter to prevent stale cache
  const imageUrl = React.useMemo(() => {
    if (!getOptimalImageSrc) return '';
    return `${getOptimalImageSrc}?t=${Date.now()}`;
  }, [getOptimalImageSrc]);
  
  // Preload image
  React.useEffect(() => {
    // Skip if no URL
    if (!imageUrl) {
      setImageError(true);
      return;
    }
    
    // Reset state when src changes
    setImageError(false);
    setImageLoaded(false);
    
    // Verify image actually loads
    const img = new Image();
    img.onload = () => {
      console.log(`DirectAvatar preload success: ${imageUrl}`);
      setImageLoaded(true);
    };
    img.onerror = () => {
      console.error(`DirectAvatar preload error: ${imageUrl}`);
      setImageError(true);
    };
    img.src = imageUrl;
    
    // Clean up on unmount or src change
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [imageUrl]);
  
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
          key={`avatar-${Date.now()}`} // Key forces re-render
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
            console.log(`DirectAvatar loaded in DOM: ${imageUrl}`);
            setImageLoaded(true);
          }}
          onError={(e) => {
            console.error(`DirectAvatar error loading in DOM: ${imageUrl}`, e);
            setImageError(true);
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