/**
 * One-time script to generate optimized image sizes for existing profile pictures
 * Run with: node scripts/generate-resized-images.js
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { db } from '../server/db.js';
// Use a direct import if the above fails
// - Note this is a fix for running as a script without proper module path resolution
import { users } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

// Image sizing configurations
const SIZES = {
  small: 48,  // Small size avatars (up to 48px display)
  medium: 96, // Medium size avatars (49-96px display)
  large: 192  // Large size avatars (97px+ display)
};

// Output quality for JPEG compression (0-100)
const QUALITY = 80;

// Output format
const FORMAT = 'jpeg';

/**
 * Resize an image to multiple dimensions
 * @param {string} inputPath - Path to the original image
 * @returns {Promise<Object>} - Object containing paths to resized images
 */
async function resizeImage(inputPath) {
  try {
    const parsedPath = path.parse(inputPath);
    const fileName = parsedPath.name;
    const directory = parsedPath.dir;
    
    // Final return object with all sizes
    const sizes = {};
    
    // Generate each size
    for (const [sizeName, dimension] of Object.entries(SIZES)) {
      const outputFileName = `${fileName}-${sizeName}.${FORMAT}`;
      const outputPath = path.join(directory, outputFileName);
      
      // Skip if file already exists
      if (fs.existsSync(outputPath)) {
        console.log(`Skipping existing file: ${outputPath}`);
        sizes[sizeName] = outputPath.replace(/^\./, ''); // Convert to relative URL by removing leading dot
        continue;
      }
      
      // Create resized version
      await sharp(inputPath)
        .resize(dimension, dimension, { fit: 'cover' })
        .jpeg({ quality: QUALITY })
        .toFile(outputPath);
      
      console.log(`Created: ${outputPath}`);
      
      // Add to result, convert to URL format (remove leading ./ if present)
      sizes[sizeName] = outputPath.replace(/^\./, ''); // Convert to relative URL
    }
    
    return sizes;
  } catch (error) {
    console.error(`Error resizing image ${inputPath}:`, error);
    return null;
  }
}

/**
 * Main function to process all user profile pictures
 */
async function main() {
  try {
    // Get all users with profile pictures
    const allUsers = await db.select().from(users).where(
      eq(users.profile_picture, null, '!=')  // Only users with profile pictures
    );
    
    console.log(`Found ${allUsers.length} users with profile pictures`);
    
    // Process each user
    for (const user of allUsers) {
      // Skip if already has sized versions
      if (user.profile_picture_sizes) {
        console.log(`User ${user.id} already has sized images, skipping`);
        continue;
      }
      
      const profilePicturePath = user.profile_picture;
      
      // Ensure the path is absolute
      let absolutePath = profilePicturePath;
      if (!absolutePath.startsWith('/')) {
        absolutePath = path.join('.', profilePicturePath);
      } else {
        // Remove leading slash for file system operations
        absolutePath = path.join('.', absolutePath);
      }
      
      // Check if image exists
      if (!fs.existsSync(absolutePath)) {
        console.log(`Image not found at ${absolutePath}, skipping`);
        continue;
      }
      
      console.log(`Processing ${absolutePath} for user ${user.id}`);
      
      // Generate resized versions
      const sizes = await resizeImage(absolutePath);
      
      if (!sizes) {
        console.log(`Failed to resize images for user ${user.id}, skipping`);
        continue;
      }
      
      // Update user with the new sizes
      await db.update(users)
        .set({ profile_picture_sizes: sizes })
        .where(eq(users.id, user.id));
      
      console.log(`Updated user ${user.id} with resized images`);
    }
    
    console.log('Image resizing complete');
  } catch (error) {
    console.error('Error in main function:', error);
  } finally {
    // Close database connection if needed
    process.exit(0);
  }
}

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Run the main function
main();