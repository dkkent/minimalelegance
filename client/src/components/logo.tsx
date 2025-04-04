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
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          <path d="M12 8c1.5 2.5 2 5 .5 7.5"></path>
          <path d="M11.5 8C10 10.5 9.5 13 11 15.5"></path>
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
