import React from "react";
import logoImage from "../assets/loveslices-logo-horiz.png";

type LogoProps = {
  size?: "small" | "medium" | "large";
  withText?: boolean;
  className?: string;
};

export const Logo: React.FC<LogoProps> = ({ 
  size = "medium", 
  withText = true,
  className = ""
}) => {
  const sizeClasses = {
    small: "h-6",
    medium: "h-8",
    large: "h-12"
  };

  const taglineClasses = {
    small: "text-xs mt-0",
    medium: "text-sm mt-1",
    large: "text-base mt-2"
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <img 
        src={logoImage} 
        alt="Loveslices Logo" 
        className={`${sizeClasses[size]} w-auto`} 
      />
      
      {size === "large" && (
        <div className="text-center">
          <p className={`font-handwritten ${taglineClasses[size]} text-sage-dark`}>
            A virtual gardener for your relationship
          </p>
        </div>
      )}
    </div>
  );
};