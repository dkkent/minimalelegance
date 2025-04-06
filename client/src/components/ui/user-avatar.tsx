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
  const formatProfilePicturePath = (path: string | null | undefined): string => {
    if (!path) return '';
    
    // Log the path for debugging
    console.log(`Formatting profile picture path: "${path}"`);
    
    // If path already starts with /uploads, use it as is
    if (path.startsWith('/uploads/profile_pictures/')) {
      console.log(`Using path as is: "${path}"`);
      return path;
    }
    
    // If path is just the filename, add the directory prefix
    const formattedPath = `/uploads/profile_pictures/${path}`;
    console.log(`Formatted path: "${formattedPath}"`);
    return formattedPath;
  };
  
  // Determine the image source
  const imgSrc = user?.profilePicture ? formatProfilePicturePath(user.profilePicture) : '';
  
  console.log("UserAvatar for:", user?.name, "with picture:", imgSrc);
  
  return (
    <Avatar className={`${avatarSize} ${className}`}>
      {imgSrc ? (
        <AvatarImage 
          src={imgSrc} 
          alt={user?.name || "User"} 
          className="object-cover"
          onError={(e) => {
            console.error("Failed to load avatar image:", imgSrc);
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : null}
      <AvatarFallback className="bg-sage-light text-sage-dark">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}