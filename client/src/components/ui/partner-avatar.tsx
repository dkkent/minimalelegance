import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from '@shared/schema';

interface PartnerAvatarProps {
  partner: User;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Super simplified Partner Avatar component with direct image tag approach
 */
export const PartnerAvatar: React.FC<PartnerAvatarProps> = ({ 
  partner, 
  className = '',
  size = 'md'
}) => {
  // Get first letter of partner name for fallback
  const firstLetter = partner?.name ? partner.name.charAt(0).toUpperCase() : 'P';
  
  // Size classes for different avatar sizes
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  };
  
  const avatarSizeClass = sizeClasses[size] || sizeClasses.md;
  
  // Extract just filename if it's a full path
  const getProfileImageUrl = (profilePicture: string | null | undefined): string | undefined => {
    if (!profilePicture) return undefined;
    
    // Already has the correct path with uploads
    if (profilePicture.startsWith('/uploads/profile_pictures/')) {
      return profilePicture;
    }
    
    // Get just the filename if it's a path
    const filename = profilePicture.includes('/') 
      ? profilePicture.split('/').pop() 
      : profilePicture;
      
    return `/uploads/profile_pictures/${filename}`;
  };
  
  // Log everything we know about the partner
  console.log("PartnerAvatar - Complete partner data:", partner);
  
  if (partner?.profilePicture) {
    const imageUrl = getProfileImageUrl(partner.profilePicture);
    console.log("PartnerAvatar - Using image URL:", imageUrl);
  }
  
  return (
    <div 
      className={`relative rounded-full overflow-hidden ${avatarSizeClass} ${className}`}
      title={partner?.name}
    >
      {partner?.profilePicture ? (
        <img 
          src={getProfileImageUrl(partner.profilePicture)} 
          alt={partner?.name || "Partner"}
          className="w-full h-full object-cover"
          onError={(e) => {
            console.error("Direct image load failed");
            // Hide the broken image and show the fallback
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-sage-light text-sage-dark">
          <span>{firstLetter}</span>
        </div>
      )}
    </div>
  );
};