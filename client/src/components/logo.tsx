import React from "react";

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
    small: "w-6 h-6",
    medium: "w-8 h-8",
    large: "w-16 h-16"
  };

  const textClasses = {
    small: "text-lg",
    medium: "text-2xl md:text-3xl",
    large: "text-4xl"
  };

  const handwrittenClasses = {
    small: "text-sm",
    medium: "text-xl",
    large: "text-2xl"
  };

  return (
    <div className={`flex items-center ${className}`}>
      <div className="text-sage mr-2">
        <svg
          className={sizeClasses[size]}
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: size === 'small' ? '24px' : size === 'medium' ? '32px' : '64px', height: 'auto' }}
        >
          {/* Garden circle base */}
          <circle cx="50" cy="50" r="45" fill="#f5f5f0" stroke="#7C9A92" strokeWidth="2" />
          
          {/* Heart shaped paths that form plant stems */}
          <path d="M35,75 C20,55 30,30 50,45 C70,30 80,55 65,75 Q50,90 35,75" 
                fill="none" stroke="#7C9A92" strokeWidth="2.5" strokeLinecap="round" />
          
          {/* Leaf elements */}
          <path d="M30,60 Q40,55 38,65" fill="none" stroke="#7C9A92" strokeWidth="2" strokeLinecap="round" />
          <path d="M70,60 Q60,55 62,65" fill="none" stroke="#7C9A92" strokeWidth="2" strokeLinecap="round" />
          <path d="M42,40 Q48,35 52,42" fill="none" stroke="#7C9A92" strokeWidth="2" strokeLinecap="round" />
          <path d="M58,40 Q52,35 48,42" fill="none" stroke="#7C9A92" strokeWidth="2" strokeLinecap="round" />
          
          {/* Small flourish dots */}
          <circle cx="35" cy="48" r="2" fill="#7C9A92" />
          <circle cx="65" cy="48" r="2" fill="#7C9A92" />
          <circle cx="50" cy="75" r="2" fill="#7C9A92" />
        </svg>
      </div>
      {withText && (
        <div>
          <h1 className={`font-serif ${textClasses[size]} tracking-wide`}>Loveslices</h1>
          {size === "large" && (
            <p className={`font-handwritten ${handwrittenClasses[size]} text-sage-dark`}>
              A virtual gardener for your relationship
            </p>
          )}
        </div>
      )}
    </div>
  );
};
