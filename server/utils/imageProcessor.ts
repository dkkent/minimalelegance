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
    console.log('Process image called with buffer size:', fileBuffer.length);
    console.log('Upload directory:', uploadDir);
    
    // Default options
    const {
      quality = 80,
      format = 'jpeg',
      crop = false
    } = options;
    
    console.log('Using options:', { quality, format, crop });

    // Verify buffer content (early detection of bad data)
    if (fileBuffer.length < 100) {
      console.error('Buffer appears to be too small for a valid image:', fileBuffer.length);
      throw new Error('Invalid image data: buffer too small');
    }

    // Generate a unique filename to avoid collisions
    const baseFilename = uuidv4();
    const extension = format === 'jpeg' ? '.jpg' : `.${format}`;
    console.log('Generated base filename:', baseFilename, 'with extension:', extension);
    
    // Create a sharp instance from the buffer with error handling
    let image;
    try {
      image = sharp(fileBuffer);
      // Force metadata read to verify image is valid before proceeding
      const metadata = await image.metadata();
      
      // Additional validation of image metadata
      if (!metadata.width || !metadata.height) {
        throw new Error('Invalid image: cannot determine dimensions');
      }
      
      console.log('Image metadata:', {
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        size: fileBuffer.length
      });
    } catch (error) {
      const sharpError = error as Error;
      console.error('Error initializing Sharp or reading image metadata:', sharpError);
      throw new Error(`Cannot process image: ${sharpError.message}`);
    }
    
    // Prepare result object
    const result: ProcessedImage = {
      filename: baseFilename,
      originalPath: '',
      sizes: {}
    };
    
    // Keep track of successful operations
    let successCount = 0;
    
    // Process each size
    console.log('Processing sizes:', Object.keys(sizes));
    
    // Process original size first to ensure we have at least one version
    try {
      const originalFilePath = path.join(uploadDir, `${baseFilename}-original${extension}`);
      console.log('Original size filepath:', originalFilePath);
      
      await image
        .clone()
        .jpeg({ quality })
        .toFile(originalFilePath);
      
      console.log('Original file saved successfully');
      
      // Set paths
      const relativePath = `/uploads/profile_pictures/${path.basename(originalFilePath)}`;
      result.sizes['original'] = relativePath;
      result.originalPath = relativePath; // Track the original as the main path
      
      console.log('Set original path:', relativePath);
      successCount++;
    } catch (error) {
      const originalError = error as Error;
      console.error('Error saving original size:', originalError);
      // If we can't save the original, this is critical - don't continue
      throw new Error(`Failed to save original image: ${originalError.message}`);
    }
    
    // Now process the resized versions
    for (const [sizeName, dimension] of Object.entries(sizes)) {
      // Skip original size since we've already processed it
      if (sizeName === 'original' || dimension === 0) {
        continue;
      }
      
      try {
        console.log(`Processing size: ${sizeName} (${dimension}px)`);
        
        // Create resized version
        const resizedFilePath = path.join(uploadDir, `${baseFilename}-${sizeName}${extension}`);
        console.log(`Writing ${sizeName} size to:`, resizedFilePath);
        
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
        
        console.log(`Successfully created ${sizeName} size`);
        
        // Store the relative path
        const relativePath = `/uploads/profile_pictures/${path.basename(resizedFilePath)}`;
        result.sizes[sizeName] = relativePath;
        console.log(`Added path for ${sizeName}:`, relativePath);
        successCount++;
      } catch (sizeError) {
        console.error(`Error processing size ${sizeName}:`, sizeError);
        // Continue with other sizes even if one fails
        // This allows partial results instead of total failure
      }
    }
    
    console.log(`Completed processing with ${successCount} successful operations`);
    
    // As long as we have the original, we can return a result
    if (result.originalPath) {
      console.log('Image processing complete, returning:', {
        originalPath: result.originalPath,
        sizeCount: Object.keys(result.sizes).length,
        sizes: Object.keys(result.sizes)
      });
      
      return result;
    } else {
      throw new Error('Failed to generate any image sizes, including original');
    }
  } catch (error) {
    console.error('Error processing image:', error);
    
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
    
    throw error;
  }
}