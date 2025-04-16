/**
 * Cache control middleware to optimize static asset caching
 * This enhances performance without modifying the core Vite configuration
 */

import { Express, Request, Response, NextFunction } from "express";
import path from "path";

/**
 * Set up cache control middleware to optimize static asset caching
 * This enhances performance without modifying the core Vite configuration
 */
export function setupCacheControlMiddleware(app: Express) {
  // Apply cache control headers to static assets (JS, CSS, fonts, etc)
  app.use((req: Request, res: Response, next: NextFunction) => {
    const url = req.url;
    const ext = path.extname(url).toLowerCase();

    // Skip API routes and non-static assets
    if (url.startsWith("/api") || url.startsWith("/uploads")) {
      return next();
    }

    // Apply different caching strategies based on asset type
    if ([".js", ".css", ".woff", ".woff2", ".ttf", ".otf"].includes(ext)) {
      // Assets with hash in filename (e.g. main.a1b2c3d4.js)
      // These can be cached for longer periods as they have built-in cache busting
      if (url.match(/\.[a-f0-9]{8,}\.(?:js|css)$/i)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable"); // 1 year
      } else {
        // Regular assets without hash in filename
        res.setHeader("Cache-Control", "public, max-age=86400"); // 1 day
      }
    } else if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".svg"].includes(ext)) {
      // Static images that aren't in the uploads directory
      if (!url.includes("?") && !url.includes("t=")) {
        res.setHeader("Cache-Control", "public, max-age=604800"); // 1 week
      }
    } else if (ext === ".json" && !url.endsWith("manifest.json")) {
      // JSON files except manifest.json which might change
      res.setHeader("Cache-Control", "public, max-age=3600"); // 1 hour
    } else if (url === "/" || url === "" || !ext) {
      // HTML and root path - use no-cache to ensure fresh content
      res.setHeader("Cache-Control", "no-cache");
    }

    // Add vary header to properly handle different cache conditions
    if (res.getHeader("Cache-Control")) {
      res.setHeader("Vary", "Accept-Encoding");
    }

    next();
  });

  console.log("[Server] Cache control middleware configured");
}