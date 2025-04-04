import React from "react";
import { cn } from "@/lib/utils";

type HandDrawnBorderProps = {
  children: React.ReactNode;
  className?: string;
};

export const HandDrawnBorder: React.FC<HandDrawnBorderProps> = ({ 
  children, 
  className = "" 
}) => {
  return (
    <div className={cn("hand-drawn-border relative", className)}>
      {children}
    </div>
  );
};

// Add this to your global CSS by extending index.css
// .hand-drawn-border {
//   position: relative;
//   border: none;
// }
// .hand-drawn-border::before {
//   content: "";
//   position: absolute;
//   top: 0;
//   left: 0;
//   right: 0;
//   bottom: 0;
//   border: 1px solid;
//   border-color: #7C9A92;
//   border-radius: 0.5rem;
//   opacity: 0.7;
//   pointer-events: none;
//   transform: translate(2px, 2px);
// }
