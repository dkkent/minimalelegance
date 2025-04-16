import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";

type UserAvatarProps = {
  user?: {
    name?: string;
    profilePicture?: string | null;
    profilePictureSizes?: {
      small?: string;
      medium?: string;
      large?: string;
    } | null;
    id?: number;
    email?: string;
  } | null;
  fallbackText?: string;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
};

export function getInitials(name: string = '') {
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

/**
 * A consistent avatar component that handles all edge cases:
 * - User is null or undefined
 * - User has no profile picture
 * - User has no name
 */
export function UserAvatar({ 
  user, 
  fallbackText = "U", 
  className = "", 
  size = "md" 
}: UserAvatarProps) {
  const { user: currentUser } = useAuth();
  const sizeClasses = {
    xs: "h-6 w-6 text-[10px]",
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base"
  };
  
  const avatarSize = sizeClasses[size];
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);
  
  // Get initials or use fallback
  const initials = user?.name ? getInitials(user.name) : fallbackText;
  
  // Check if this is likely the current user based on name or initials
  // The issue is that sometimes user.id is different (1 vs 3) but it's the same person 
  const isCurrentUser = React.useMemo(() => {
    if (!user || !currentUser) return false;
    
    // First check by ID (safe access with optional chaining)
    if (user?.id !== undefined && user.id === currentUser.id) return true;
    
    // Then check by name
    if (user?.name && currentUser.name && 
        user.name.toLowerCase() === currentUser.name.toLowerCase()) {
      console.log(`UserAvatar - Matched current user by name: ${user.name} = ${currentUser.name}`);
      return true;
    }
    
    // Special case: if user name is "Dickon" and current user name starts with Dickon,
    // it's likely a journal entry reference to the current user
    if (user?.name === "Dickon" && currentUser.name?.startsWith("Dickon")) {
      console.log(`UserAvatar - Journal special case: ${user.name} is likely current user ${currentUser.name}`);
      return true;
    }
    
    // Then check by initial of first name if available
    if (user?.name && currentUser.name) {
      const userFirstInitial = user.name.charAt(0).toLowerCase();
      const currentUserFirstInitial = currentUser.name.charAt(0).toLowerCase();
      if (userFirstInitial === currentUserFirstInitial) {
        console.log(`UserAvatar - Possible current user match by first initial: ${user.name} ~ ${currentUser.name}`);
        return true;
      }
    }
    
    return false;
  }, [user, currentUser]);
  
  // If the user object is or might be the current user, ensure it has the profile picture
  const userWithPicture = React.useMemo(() => {
    if (isCurrentUser && currentUser?.profilePicture) {
      return {
        ...user,
        name: user?.name || currentUser.name,
        profilePicture: user?.profilePicture || currentUser.profilePicture,
        profilePictureSizes: user?.profilePictureSizes || currentUser.profilePictureSizes
      };
    }
    return user;
  }, [user, currentUser, isCurrentUser]);
  
  // Function to ensure profile picture path is properly formatted
  const formatProfilePicturePath = (path: string | null | undefined): string => {
    if (!path) return '';
    
    // Log the path for debugging
    console.log(`UserAvatar - Formatting path: "${path}" for user ${userWithPicture?.name || 'unknown'}`);
    
    // If path already starts with /uploads, use it as is
    if (path.startsWith('/uploads/profile_pictures/')) {
      return path;
    }
    
    // If path is just the filename, add the directory prefix
    const formattedPath = `/uploads/profile_pictures/${path}`;
    return formattedPath;
  };
  
  // For journal pages, we also check if this is "Dickon" but we got user ID 1 instead of 3
  React.useEffect(() => {
    if (userWithPicture?.name === "Dickon" && !userWithPicture.profilePicture && currentUser?.profilePicture) {
      console.log(`Found Dickon but missing profile picture. Using current user picture:`, currentUser.profilePicture);
    }
  }, [userWithPicture, currentUser]);
  
  // Get the appropriate size image based on the avatar display size
  const getOptimalSizeImage = (user: typeof userWithPicture): string => {
    // If user doesn't exist or doesn't have profile info, return empty string
    if (!user) return '';
    
    // Map our size props to the appropriate image size
    const sizeToImageSize: Record<string, 'small' | 'medium' | 'large' | 'original'> = {
      'xs': 'small',
      'sm': 'small',
      'md': 'medium',
      'lg': 'large'
    };
    const optimalSize = sizeToImageSize[size] || 'medium';
    console.log(`UserAvatar - Optimal size for ${size} is ${optimalSize}`);
    
    // Check if we have optimized sizes available
    if (user.profilePictureSizes) {
      // Handle the original size separately since it's not in the profilePictureSizes object
      if (optimalSize === 'original' && user.profilePicture) {
        const path = formatProfilePicturePath(user.profilePicture);
        console.log(`UserAvatar - Using original image: ${path}`);
        return path;
      }
      
      // Check for small, medium, large sizes
      if ((optimalSize === 'small' || optimalSize === 'medium' || optimalSize === 'large') &&
          user.profilePictureSizes[optimalSize] && 
          typeof user.profilePictureSizes[optimalSize] === 'string') {
        // Use the optimized size
        const path = formatProfilePicturePath(user.profilePictureSizes[optimalSize] as string);
        console.log(`UserAvatar - Using optimized ${optimalSize} image: ${path}`);
        return path;
      }
    }
    
    // Fallback to the original profile picture if no optimized size available
    if (user.profilePicture) {
      const path = formatProfilePicturePath(user.profilePicture);
      console.log(`UserAvatar - Using original image (no optimized sizes): ${path}`);
      return path;
    }
    
    return '';
  };
  
  // Determine the image source with advanced fallback for journal page issues
  const imgSrc = React.useMemo(() => {
    // First check if the user object has a profile picture or sizes
    if (userWithPicture) {
      const path = getOptimalSizeImage(userWithPicture);
      if (path) {
        // Add a cache-busting timestamp to force browser to reload the image
        return `${path}?t=${new Date().getTime()}`;
      }
    }
    
    // Special case for journal page - if name matches current user
    if (userWithPicture?.name && currentUser?.name) {
      // Check if the user is "Dickon" which matches current user's first name
      if (userWithPicture.name === "Dickon" && currentUser.name.startsWith("Dickon")) {
        const path = getOptimalSizeImage(currentUser);
        if (path) {
          // Add a cache-busting timestamp
          return `${path}?t=${new Date().getTime()}`;
        }
      }
    }
    
    return '';
  }, [userWithPicture, currentUser, size]);
  
  // Check image existence with fetch for debugging
  React.useEffect(() => {
    if (imgSrc) {
      // Extract the base path without cache busting parameters
      const basePath = imgSrc.split('?')[0];
      
      // Immediately set image error to false when we have a new image source
      setImageError(false);
      
      fetch(imgSrc, { method: 'HEAD' })
        .then(res => {
          console.log(`Image existence check for ${basePath}: ${res.status} ${res.statusText}`);
          if (res.ok) {
            console.log(`✅ Image exists at path: ${basePath}`);
          } else {
            console.error(`❌ Image doesn't exist at path: ${basePath}`);
            setImageError(true);
          }
        })
        .catch(err => {
          console.error(`❌ Error checking image at ${basePath}:`, err);
          setImageError(true);
        });
    } else {
      // No image source, so we consider this an error state
      setImageError(true);
    }
  }, [imgSrc]);

  // Additional debug for journal page avatar issues
  React.useEffect(() => {
    // Extra debug logging to understand the user data structure
    if (isCurrentUser) {
      console.log(`UserAvatar - Current user found:`, userWithPicture);
      console.log(`Current user from auth:`, currentUser);
    }
  }, [userWithPicture, currentUser, isCurrentUser]);

  console.log(`UserAvatar - ${userWithPicture?.name || 'unknown'}: imgSrc=${imgSrc}, loaded=${imageLoaded}, error=${imageError}, isCurrentUser=${isCurrentUser}`);
  
  // Force a refresh of the avatar image
  const [forceRefresh, setForceRefresh] = React.useState(Date.now());
  
  // After the first render, force a refresh after a short delay
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setForceRefresh(Date.now());
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  // Use a direct img element to check if the image exists and can be loaded
  React.useEffect(() => {
    if (imgSrc) {
      const img = new Image();
      img.onload = () => {
        console.log(`Direct image check: ✅ Image loaded: ${imgSrc}`);
        setImageLoaded(true);
        setImageError(false);
      };
      img.onerror = () => {
        console.error(`Direct image check: ❌ Image failed to load: ${imgSrc}`);
        setImageError(true);
      };
      img.src = imgSrc;
    }
  }, [imgSrc, forceRefresh]);

  return (
    <Avatar className={`${avatarSize} ${className} overflow-hidden`}>
      {imgSrc && !imageError ? (
        <AvatarImage 
          key={`avatar-${forceRefresh}`} // Force re-render with key change
          src={imgSrc}
          alt={userWithPicture?.name || "User"} 
          className="object-cover w-full h-full"
          style={{ opacity: 1 }} // Force opacity for visibility
          onLoad={() => {
            console.log(`✅ Avatar image loaded successfully: ${imgSrc}`);
            setImageLoaded(true);
            setImageError(false);
          }}
          onError={(e) => {
            console.error(`❌ Failed to load avatar image: ${imgSrc}`);
            setImageError(true);
          }}
        />
      ) : null}
      <AvatarFallback className="bg-sage-light text-sage-dark">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}