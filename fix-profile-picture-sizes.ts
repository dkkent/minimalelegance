import { db } from './server/db';
import { users } from './shared/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// Image sizing configurations
const AVATAR_SIZES = {
  small: 48,    // For comments, small UI elements 
  medium: 96,   // For most UI locations
  large: 192,   // For profile views and larger display
  original: 0   // Original size (kept for high-res displays)
};

// Output quality for JPEG compression (0-100)
const QUALITY = 80;

// Output format
const FORMAT = 'jpeg';

interface ProcessingResult {
  originalPath: string;
  sizes: Record<string, string>;
}

/**
 * Process a single image into multiple sizes
 */
async function processImage(
  inputPath: string
): Promise<ProcessingResult | null> {
  try {
    console.log(`Processing image: ${inputPath}`);
    
    // Check if file exists
    if (!fs.existsSync(inputPath)) {
      console.error(`Image not found at path: ${inputPath}`);
      return null;
    }
    
    // Make sure uploads directory exists
    const uploadDir = path.join(process.cwd(), 'uploads', 'profile_pictures');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Create a unique base filename
    const baseFilename = randomUUID();
    const extension = FORMAT === 'jpeg' ? '.jpg' : `.${FORMAT}`;
    
    // Read and process the source file
    const fileBuffer = fs.readFileSync(inputPath);
    const image = sharp(fileBuffer);
    
    // Get metadata to validate it's a real image
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height) {
      console.error('Invalid image file - cannot determine dimensions');
      return null;
    }
    
    console.log(`Image info: ${metadata.width}x${metadata.height} ${metadata.format}, ${fileBuffer.length} bytes`);
    
    // Process each size
    const result: ProcessingResult = {
      originalPath: '',
      sizes: {}
    };
    
    let successCount = 0;
    
    // First process original to ensure we have at least one version
    try {
      const originalFilePath = path.join(uploadDir, `${baseFilename}-original${extension}`);
      await image
        .clone()
        .jpeg({ quality: QUALITY })
        .toFile(originalFilePath);
        
      const relativePath = `/uploads/profile_pictures/${path.basename(originalFilePath)}`;
      result.sizes['original'] = relativePath;
      result.originalPath = relativePath;
      successCount++;
    } catch (error) {
      console.error('Error saving original size:', error);
      return null;
    }
    
    // Process resized versions
    for (const [sizeName, dimension] of Object.entries(AVATAR_SIZES)) {
      // Skip original since we already processed it 
      if (sizeName === 'original' || dimension === 0) {
        continue;
      }
      
      try {
        const resizedFilePath = path.join(uploadDir, `${baseFilename}-${sizeName}${extension}`);
        
        await image
          .clone()
          .resize(dimension, dimension, { fit: 'cover', position: 'centre' })
          .jpeg({ quality: QUALITY })
          .toFile(resizedFilePath);
          
        const relativePath = `/uploads/profile_pictures/${path.basename(resizedFilePath)}`;
        result.sizes[sizeName] = relativePath;
        successCount++;
      } catch (error) {
        console.error(`Error processing ${sizeName} size:`, error);
        // Continue with other sizes
      }
    }
    
    console.log(`Successfully created ${successCount} sizes for image`);
    return result;
  } catch (error) {
    console.error('Error processing image:', error);
    return null;
  }
}

/**
 * Main function to process all profile pictures
 */
async function main() {
  try {
    // Get all users with profile pictures
    const allUsers = await db.execute(`
      SELECT * FROM "users" 
      WHERE "profilePicture" IS NOT NULL
    `);
    
    console.log(`Found ${allUsers.rows.length} users with profile pictures`);
    
    // Process each user
    for (const user of allUsers.rows) {
      // Skip if already has sized versions
      if (user.profilePictureSizes && 
          typeof user.profilePictureSizes === 'object' && 
          Object.keys(user.profilePictureSizes || {}).length > 0) {
        console.log(`User ${user.id} already has sized images, skipping`);
        continue;
      }
      
      if (!user.profilePicture) {
        console.log(`User ${user.id} has no profile picture, skipping`);
        continue;
      }
      
      console.log(`Processing profile picture for user ${user.id}: ${user.profilePicture}`);
      
      // Ensure the path is absolute
      let absolutePath: string;
      if (user.profilePicture.startsWith('/')) {
        // Remove leading slash for file system operations
        absolutePath = path.join('.', user.profilePicture);
      } else {
        absolutePath = path.join('.', user.profilePicture);
      }
      
      console.log(`Absolute path: ${absolutePath}`);
      
      // Process the image
      const result = await processImage(absolutePath);
      
      if (!result) {
        console.log(`Failed to process image for user ${user.id}, skipping`);
        continue;
      }
      
      // Update user with the new sizes
      // Convert to JSON string since PostgreSQL expects a JSON object not a JS object
      const pictureSizes = JSON.stringify({
        small: result.sizes.small,
        medium: result.sizes.medium,
        large: result.sizes.large
      });
      
      console.log(`Updating user ${user.id} with sizes:`, pictureSizes);
      
      // Use raw SQL for better compatibility
      await db.execute(
        `UPDATE "users" SET "profilePictureSizes" = $1 WHERE "id" = $2`,
        [pictureSizes, user.id]
      );
      
      console.log(`Updated user ${user.id} with resized images`);
    }
    
    console.log('Image resizing complete');
  } catch (error) {
    console.error('Error in main function:', error);
  }
}

// Run the script
main().then(() => {
  console.log('Script completed');
  process.exit(0);
}).catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});