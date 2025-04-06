import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from '@shared/schema';

interface PartnerAvatarProps {
  partner: User;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const PartnerAvatar: React.FC<PartnerAvatarProps> = ({ 
  partner, 
  className = '',
  size = 'md'
}) => {
  // Get first letter of partner name for fallback
  const firstLetter = partner?.name ? partner.name.charAt(0) : 'P';
  
  // Normalize the profile picture path - ensure it's absolute
  let profilePicturePath = partner?.profilePicture || '';
  
  // Debug the path
  console.log("PartnerAvatar - Original path:", profilePicturePath);
  
  // Ensure the path is absolute (starts with /)
  if (profilePicturePath && !profilePicturePath.startsWith('/')) {
    profilePicturePath = `/${profilePicturePath}`;
  }
  
  console.log("PartnerAvatar - Normalized path:", profilePicturePath);
  
  // Size classes
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  };
  
  const avatarSizeClass = sizeClasses[size] || sizeClasses.md;
  
  return (
    <Avatar className={`${avatarSizeClass} ${className}`} title={partner?.name}>
      <AvatarImage 
        src={profilePicturePath} 
        alt={partner?.name || 'Partner'} 
        className="object-cover"
      />
      <AvatarFallback className="bg-sage-light text-sage-dark">
        {firstLetter}
      </AvatarFallback>
    </Avatar>
  );
};