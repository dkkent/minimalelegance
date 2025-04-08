// Load dotenv first so environment variables are available
import * as dotenv from 'dotenv';
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupSecurityMiddleware } from "./middleware/security";
import { setupFileUpload, ensureUploadDirs } from "./middleware/upload";
import path from "path";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add CORS headers for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Set up security middleware (rate limiting, helmet, etc.)
setupSecurityMiddleware(app);

// Set up file upload middleware
setupFileUpload(app);
ensureUploadDirs();

// Serve the uploads directory statically
// Make sure uploads are accessible - this is critical for profile pictures
const uploadsPath = path.join(process.cwd(), "uploads");
app.use("/uploads", (req, res, next) => {
  // Check if request contains a t parameter (timestamp) for cache busting
  const hasTimestamp = req.query.t !== undefined;
  
  // Check if this is a profile picture
  const isProfilePicture = req.path.startsWith('/profile_pictures/');
  
  // Check if this is an optimized image (contains -small, -medium, -large in name)
  const isOptimizedImage = 
    req.path.includes('-small.') || 
    req.path.includes('-medium.') ||
    req.path.includes('-large.');
  
  if (hasTimestamp) {
    // If a timestamp is provided, use long-term caching
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year in seconds
    res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString()); // 1 year in ms
  } else if (isProfilePicture && isOptimizedImage) {
    // For optimized profile pictures, use aggressive caching even without timestamp
    // These images are immutable once created (new versions get new filenames)
    res.setHeader('Cache-Control', 'public, max-age=28800, immutable'); // 8 hours
    res.setHeader('Expires', new Date(Date.now() + 28800000).toUTCString()); // 8 hours in ms
  } else if (isProfilePicture) {
    // For non-optimized profile pictures, use shorter caching
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour
    res.setHeader('Expires', new Date(Date.now() + 3600000).toUTCString()); // 1 hour in ms
  } else {
    // For other files without timestamps, use standard caching rules
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
}, express.static(uploadsPath, {
  // Use conditional maxAge based on whether the request has a timestamp
  maxAge: '1d', // Default to 1 day
  
  // Set proper content type and cache headers
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    
    // Set Content-Type based on file extension
    if (['.jpg', '.jpeg'].includes(ext)) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (ext === '.png') {
      res.setHeader('Content-Type', 'image/png');
    } else if (ext === '.gif') {
      res.setHeader('Content-Type', 'image/gif');
    } else if (ext === '.webp') {
      res.setHeader('Content-Type', 'image/webp');
    }
    
    // Add vary header to properly handle different cache conditions
    res.setHeader('Vary', 'Accept-Encoding');
  }
}));
console.log(`[Server] Enhanced serving of uploads directory from: ${uploadsPath}`);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
