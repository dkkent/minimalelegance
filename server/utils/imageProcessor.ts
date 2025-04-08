import sharp from 'sharp';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Interface for processed image results
 */
export interface ProcessedImage {
  filename: string;
  originalPath: string;
  sizes: {
    [key: string]: string;  // size name -> path
  };
}

/**
 * Sizes configuration for avatars
 */
export const AVATAR_SIZES = {
  small: 48,    // For comments, small UI elements
  medium: 96,   // For most UI locations
  large: 192,   // For profile views and larger display
  original: 0   // Original size (kept for high-res displays)
};

/**
 * Image processing options
 */
export interface ImageProcessingOptions {
  quality?: number;  // JPEG quality (1-100)
  format?: 'jpeg' | 'png' | 'webp';
  crop?: boolean;    // Whether to crop to exact dimensions vs. resize preserving aspect ratio
}

/**
 * Process an image file and create multiple resized versions
 * @param file The uploaded file buffer
 * @param uploadDir The directory to save the files to
 * @param sizes The sizes to generate
 * @param options Additional processing options
 * @returns Object with paths to all generated images
 */
export async function processImage(
  fileBuffer: Buffer,
  uploadDir: string,
  originalFilename: string,
  sizes: { [key: string]: number } = AVATAR_SIZES,
  options: ImageProcessingOptions = {}
): Promise<ProcessedImage> {
  try {
    // Default options
    const {
      quality = 80,
      format = 'jpeg',
      crop = false
    } = options;

    // Generate a unique filename to avoid collisions
    const baseFilename = uuidv4();
    const extension = format === 'jpeg' ? '.jpg' : `.${format}`;
    
    // Create a sharp instance from the buffer
    const image = sharp(fileBuffer);
    
    // Get image metadata to determine original dimensions
    const metadata = await image.metadata();
    
    // Prepare result object
    const result: ProcessedImage = {
      filename: baseFilename,
      originalPath: '',
      sizes: {}
    };
    
    // Process each size
    for (const [sizeName, dimension] of Object.entries(sizes)) {
      // Skip if dimension is 0 (indicates original size)
      if (dimension === 0) {
        // For "original" we still optimize and convert format, but keep dimensions
        const originalFilePath = path.join(uploadDir, `${baseFilename}-original${extension}`);
        
        await image
          .clone()
          .jpeg({ quality })
          .toFile(originalFilePath);
        
        // Set paths
        const relativePath = `/uploads/profile_pictures/${path.basename(originalFilePath)}`;
        result.sizes[sizeName] = relativePath;
        result.originalPath = relativePath; // Track the original as the main path
        
        continue;
      }
      
      // Create resized version
      const resizedFilePath = path.join(uploadDir, `${baseFilename}-${sizeName}${extension}`);
      
      // Resize with different method based on crop option
      if (crop) {
        await image
          .clone()
          .resize(dimension, dimension, { fit: 'cover', position: 'centre' })
          .jpeg({ quality })
          .toFile(resizedFilePath);
      } else {
        await image
          .clone()
          .resize(dimension, dimension, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality })
          .toFile(resizedFilePath);
      }
      
      // Store the relative path
      const relativePath = `/uploads/profile_pictures/${path.basename(resizedFilePath)}`;
      result.sizes[sizeName] = relativePath;
    }
    
    return result;
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
}