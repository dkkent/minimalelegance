import React, { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from '@shared/schema';
import { useProfileImage } from '@/hooks/use-profile-images';

interface PartnerAvatarProps {
  partner: User;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Function to format a profile picture path
 * Similar to what's used in the UserAvatar component
 */
function formatProfilePicture(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  
  // If path already has a valid format, return it as is
  if (path.startsWith('/uploads/')) {
    return path;
  }
  
  // If path starts with a slash but doesn't include uploads, add it
  if (path.startsWith('/') && !path.includes('/uploads/')) {
    return `/uploads/profile_pictures${path}`;
  }
  
  // For all other cases, assume it's just a filename
  return `/uploads/profile_pictures/${path}`;
}

export const PartnerAvatar: React.FC<PartnerAvatarProps> = ({ 
  partner, 
  className = '',
  size = 'md'
}) => {
  // Ref to keep track of load attempts
  const loadAttemptCount = useRef(0);
  const [directLoadFailed, setDirectLoadFailed] = useState(false);
  const [manualUrl, setManualUrl] = useState<string | undefined>(undefined);
  
  // Get first letter of partner name for fallback
  const firstLetter = partner?.name ? partner.name.charAt(0).toUpperCase() : 'P';
  
  // Use our specialized hook to get a verified image URL
  const { verifiedUrl, isLoading, error } = useProfileImage(partner?.profilePicture);
  
  // Try backup URL formats if the profile picture exists but isn't loading correctly
  useEffect(() => {
    // If we already have a verified URL or no partner, do nothing
    if (verifiedUrl || !partner?.profilePicture || loadAttemptCount.current > 3) return;
    
    // Get the filename from the path
    const pathParts = partner.profilePicture.split('/');
    const filename = pathParts[pathParts.length - 1];
    
    // If it's a UUID format with extension, try direct URL
    if (filename.match(/[a-f0-9-]+\.(jpg|jpeg|png|gif)$/i) && directLoadFailed) {
      // Try a direct format that bypasses the hook's verification
      const directUrl = `/uploads/profile_pictures/${filename}`;
      console.log(`PartnerAvatar - Trying direct URL format: ${directUrl}`);
      setManualUrl(directUrl);
      loadAttemptCount.current += 1;
    }
  }, [partner?.profilePicture, verifiedUrl, directLoadFailed]);
  
  // Enhanced debugging information
  console.log("PartnerAvatar render for:", partner?.name);
  console.log("PartnerAvatar - Original path:", partner?.profilePicture);
  console.log("PartnerAvatar - Formatted path:", formatProfilePicture(partner?.profilePicture));
  console.log("PartnerAvatar - Verified path:", verifiedUrl);
  console.log("PartnerAvatar - Manual URL:", manualUrl);
  console.log("PartnerAvatar - Loading state:", isLoading);
  console.log("PartnerAvatar - Error state:", error);
  
  // Size classes for different avatar sizes
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  };
  
  const avatarSizeClass = sizeClasses[size] || sizeClasses.md;
  
  // Try different sources in order of preference
  const imageSource = verifiedUrl || manualUrl || formatProfilePicture(partner?.profilePicture);
  
  return (
    <Avatar className={`${avatarSizeClass} ${className}`} title={partner?.name}>
      {/* Use the image source if available */}
      {imageSource && (
        <AvatarImage 
          src={imageSource}
          alt={partner?.name || 'Partner'} 
          className="object-cover"
          onError={(e) => {
            console.error("PartnerAvatar - Image load error:", e);
            // Mark direct loading as failed so we can try alternative formats
            setDirectLoadFailed(true);
          }}
        />
      )}
      
      {/* Fallback when image is not available */}
      <AvatarFallback className="bg-sage-light text-sage-dark">
        {isLoading ? '...' : firstLetter}
      </AvatarFallback>
    </Avatar>
  );
};