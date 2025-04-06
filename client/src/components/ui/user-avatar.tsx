import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";

type UserAvatarProps = {
  user?: {
    name?: string;
    profilePicture?: string | null;
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
        profilePicture: user?.profilePicture || currentUser.profilePicture
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
  
  // Determine the image source with advanced fallback for journal page issues
  const imgSrc = React.useMemo(() => {
    // First check if the user object has a profile picture
    if (userWithPicture?.profilePicture) {
      return formatProfilePicturePath(userWithPicture.profilePicture);
    }
    
    // Special case for journal page - if name matches current user
    if (userWithPicture?.name && currentUser?.name) {
      // Check if the user is "Dickon" which matches current user's first name
      if (userWithPicture.name === "Dickon" && currentUser.name.startsWith("Dickon") && currentUser.profilePicture) {
        return formatProfilePicturePath(currentUser.profilePicture);
      }
    }
    
    return '';
  }, [userWithPicture, currentUser]);
  
  // Check image existence with fetch for debugging
  React.useEffect(() => {
    if (imgSrc) {
      // Add a timestamp to bypass browser cache
      const urlWithCache = `${imgSrc}?t=${Date.now()}`;
      
      // Immediately set image error to false when we have a new image source
      setImageError(false);
      
      fetch(urlWithCache, { method: 'HEAD' })
        .then(res => {
          console.log(`Image existence check for ${imgSrc}: ${res.status} ${res.statusText}`);
          if (res.ok) {
            console.log(`✅ Image exists at path: ${imgSrc}`);
          } else {
            console.error(`❌ Image doesn't exist at path: ${imgSrc}`);
            setImageError(true);
          }
        })
        .catch(err => {
          console.error(`❌ Error checking image at ${imgSrc}:`, err);
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
  
  return (
    <Avatar className={`${avatarSize} ${className}`}>
      {imgSrc && !imageError ? (
        <AvatarImage 
          src={`${imgSrc}?t=${Date.now()}`} // Add cache-busting parameter
          alt={userWithPicture?.name || "User"} 
          className="object-cover"
          onLoad={() => {
            console.log(`✅ Avatar image loaded successfully: ${imgSrc}`);
            setImageLoaded(true);
          }}
          onError={(e) => {
            console.error(`❌ Failed to load avatar image: ${imgSrc}`);
            setImageError(true);
            // Don't hide the element as the fallback should show
          }}
        />
      ) : null}
      <AvatarFallback className="bg-sage-light text-sage-dark">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}