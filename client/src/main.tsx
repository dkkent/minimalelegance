import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add custom fonts
const link = document.createElement("link");
link.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Caveat:wght@400;600&family=Open+Sans:wght@300;400;500;600&display=swap";
link.rel = "stylesheet";
document.head.appendChild(link);

// Add title
const title = document.createElement("title");
title.textContent = "Loveslices - A Virtual Gardener for Your Relationship";
document.head.appendChild(title);

// Add favicon
const favicon = document.createElement("link");
favicon.rel = "icon";
favicon.href = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%237C9A92' stroke-width='1' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'%3E%3C/path%3E%3Cpath d='M12 8c1.5 2.5 2 5 .5 7.5'%3E%3C/path%3E%3Cpath d='M11.5 8C10 10.5 9.5 13 11 15.5'%3E%3C/path%3E%3C/svg%3E";
document.head.appendChild(favicon);

createRoot(document.getElementById("root")!).render(<App />);
