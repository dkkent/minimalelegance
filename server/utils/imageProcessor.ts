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

    // Generate a unique filename to avoid collisions
    const baseFilename = uuidv4();
    const extension = format === 'jpeg' ? '.jpg' : `.${format}`;
    console.log('Generated base filename:', baseFilename, 'with extension:', extension);
    
    // Create a sharp instance from the buffer
    const image = sharp(fileBuffer);
    
    // Get image metadata to determine original dimensions
    const metadata = await image.metadata();
    console.log('Image metadata:', {
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      size: fileBuffer.length
    });
    
    // Prepare result object
    const result: ProcessedImage = {
      filename: baseFilename,
      originalPath: '',
      sizes: {}
    };
    
    // Process each size
    console.log('Processing sizes:', Object.keys(sizes));
    
    for (const [sizeName, dimension] of Object.entries(sizes)) {
      try {
        console.log(`Processing size: ${sizeName} (${dimension}px)`);
        
        // Skip if dimension is 0 (indicates original size)
        if (dimension === 0) {
          // For "original" we still optimize and convert format, but keep dimensions
          const originalFilePath = path.join(uploadDir, `${baseFilename}-original${extension}`);
          console.log('Original size filepath:', originalFilePath);
          
          await image
            .clone()
            .jpeg({ quality })
            .toFile(originalFilePath);
          
          console.log('Original file saved successfully');
          
          // Set paths
          const relativePath = `/uploads/profile_pictures/${path.basename(originalFilePath)}`;
          result.sizes[sizeName] = relativePath;
          result.originalPath = relativePath; // Track the original as the main path
          
          console.log('Set original path:', relativePath);
          continue;
        }
        
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
      } catch (sizeError) {
        console.error(`Error processing size ${sizeName}:`, sizeError);
        // Continue with other sizes even if one fails
        // This allows partial results instead of total failure
      }
    }
    
    // Make sure we have at least an original path set
    if (!result.originalPath && Object.keys(result.sizes).length > 0) {
      // Use the first available size as fallback for original path
      const firstSize = Object.keys(result.sizes)[0];
      result.originalPath = result.sizes[firstSize];
      console.log('Using fallback for originalPath:', result.originalPath);
    }
    
    // Check if we have any paths generated
    if (Object.keys(result.sizes).length === 0) {
      throw new Error('Failed to generate any image sizes');
    }
    
    console.log('Image processing complete, returning:', {
      originalPath: result.originalPath,
      sizeCount: Object.keys(result.sizes).length,
      sizes: Object.keys(result.sizes)
    });
    
    return result;
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