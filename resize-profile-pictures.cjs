/**
 * Simple script to resize existing profile pictures on the filesystem.
 * Run with: node resize-profile-pictures.js
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { randomUUID } = require('crypto');

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

/**
 * Process a single image into multiple sizes
 */
async function processImage(inputPath) {
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
    const result = {
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
    // Find profile pictures in the uploads folder
    const uploadsDir = path.join(process.cwd(), 'uploads', 'profile_pictures');
    
    if (!fs.existsSync(uploadsDir)) {
      console.log(`Upload directory doesn't exist: ${uploadsDir}`);
      fs.mkdirSync(uploadsDir, { recursive: true });
      return;
    }
    
    const filesInUploads = fs.readdirSync(uploadsDir);
    
    // Filter to only include files that don't have sizes in the filename already
    const originalFiles = filesInUploads.filter(file => {
      return !file.includes('-small') && !file.includes('-medium') && 
             !file.includes('-large') && !file.includes('-original');
    });
    
    console.log(`Found ${originalFiles.length} original profile pictures to process`);
    
    // Process each file
    for (const file of originalFiles) {
      const filePath = path.join(uploadsDir, file);
      
      // Skip directories
      if (fs.statSync(filePath).isDirectory()) {
        continue;
      }
      
      console.log(`Processing file: ${file}`);
      
      // Process the image
      const result = await processImage(filePath);
      
      if (!result) {
        console.log(`Failed to process image ${file}, skipping`);
        continue;
      }
      
      console.log(`Successfully processed ${file} to multiple sizes:`);
      console.log(JSON.stringify(result.sizes, null, 2));
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