import React from "react";
import { cn } from "@/lib/utils";

type HandDrawnUnderlineProps = {
  children: React.ReactNode;
  className?: string;
};

export const HandDrawnUnderline: React.FC<HandDrawnUnderlineProps> = ({ 
  children, 
  className = "" 
}) => {
  return (
    <span className={cn("hand-drawn relative", className)}>
      {children}
    </span>
  );
};

// Add this to your global CSS by extending index.css
// .hand-drawn {
//   position: relative;
// }
// .hand-drawn::after {
//   content: "";
//   position: absolute;
//   bottom: -3px;
//   left: 0;
//   width: 100%;
//   height: 1px;
//   background-image: url("data:image/svg+xml,%3Csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3E%3Cline x1='0' y1='0' x2='100%25' y2='0' stroke='%237C9A92' stroke-width='2' stroke-dasharray='1, 10' stroke-dashoffset='0' stroke-linecap='round'/%3E%3C/svg%3E");
//   opacity: 0.7;
// }
