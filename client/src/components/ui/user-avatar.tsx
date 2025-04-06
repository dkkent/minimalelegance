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
  
  // If the user object is the current user but missing a profile picture, 
  // use the current user's profile picture from auth context
  const userWithPicture = React.useMemo(() => {
    if (user?.id === currentUser?.id && currentUser?.profilePicture && !user.profilePicture) {
      return {
        ...user,
        profilePicture: currentUser.profilePicture
      };
    }
    return user;
  }, [user, currentUser]);
  
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
  
  // Determine the image source
  const imgSrc = userWithPicture?.profilePicture ? formatProfilePicturePath(userWithPicture.profilePicture) : '';
  
  // Check image existence with fetch for debugging
  React.useEffect(() => {
    if (imgSrc) {
      // Add a timestamp to bypass browser cache
      const urlWithCache = `${imgSrc}?t=${Date.now()}`;
      
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
    }
  }, [imgSrc]);

  // Additional debug for journal page avatar issues
  React.useEffect(() => {
    // Extra debug logging to understand the user data structure
    if (userWithPicture?.id === currentUser?.id) {
      console.log(`UserAvatar - Current user found:`, userWithPicture);
      console.log(`Current user from auth:`, currentUser);
    }
  }, [userWithPicture, currentUser]);

  console.log(`UserAvatar - ${userWithPicture?.name || 'unknown'}: imgSrc=${imgSrc}, loaded=${imageLoaded}, error=${imageError}`);
  
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