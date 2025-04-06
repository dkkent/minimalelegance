import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type UserAvatarProps = {
  user?: {
    name?: string;
    profilePicture?: string | null;
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
  const sizeClasses = {
    xs: "h-6 w-6 text-[10px]",
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base"
  };
  
  const avatarSize = sizeClasses[size];
  
  // Get initials or use fallback
  const initials = user?.name ? getInitials(user.name) : fallbackText;
  
  // Function to ensure profile picture path is properly formatted
  const formatProfilePicturePath = (path: string): string => {
    console.log("Original profile picture path:", path);
    // If path already starts with a slash, assume it's correctly formatted
    const formattedPath = path.startsWith('/') 
      ? path 
      : `/uploads/profile_pictures/${path}`;
    console.log("Formatted profile picture path:", formattedPath);
    return formattedPath;
  };
  
  // Log the entire user object to see what we're working with
  console.log("User in UserAvatar:", user);
  
  return (
    <Avatar className={`${avatarSize} ${className}`}>
      {user?.profilePicture ? (
        <AvatarImage 
          src={formatProfilePicturePath(user.profilePicture)} 
          alt={user.name || "User"} 
          className="object-cover"
        />
      ) : (
        <AvatarFallback className="bg-sage-light text-sage-dark">
          {initials}
        </AvatarFallback>
      )}
    </Avatar>
  );
}