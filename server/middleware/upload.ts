import fileUpload from 'express-fileupload';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Express } from 'express';
import { processImage, ProcessedImage } from "../utils/imageProcessor";

// Define the UploadedFile interface here to avoid module errors
interface UploadedFile {
  name: string;
  mimetype: string;
  data: Buffer;
  size: number;
  encoding: string;
  tempFilePath: string;
  truncated: boolean;
  md5: string;
  mv(path: string): Promise<void>;
}

// Configure file upload middleware
export const setupFileUpload = (app: Express) => {
  app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: '/tmp/',
    createParentPath: true,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB max file size
    },
  }));
};

// Ensure upload directory exists
export const ensureUploadDirs = () => {
  const profilePicturesDir = path.join(process.cwd(), 'uploads', 'profile_pictures');
  if (!fs.existsSync(profilePicturesDir)) {
    fs.mkdirSync(profilePicturesDir, { recursive: true });
  }
};

export interface ProfilePictureResult {
  mainPath: string;
  sizes: {
    small?: string;
    medium?: string;
    large?: string;
    original: string;
  };
}

export const saveProfilePicture = async (file: UploadedFile): Promise<ProfilePictureResult> => {
  try {
    console.log('Starting profile picture processing');
    console.log('File info:', {
      name: file.name,
      size: file.size, 
      mimetype: file.mimetype,
      hasTempFile: !!file.tempFilePath,
      hasData: !!file.data
    });
    
    // Read the file into memory
    let fileBuffer: Buffer;
    
    // If the file is already in memory
    if (file.data && Buffer.isBuffer(file.data)) {
      console.log('Using file.data buffer, size:', file.data.length);
      fileBuffer = file.data;
    } 
    // If file is stored in a temp file
    else if (file.tempFilePath) {
      console.log('Reading from tempFilePath:', file.tempFilePath);
      
      // Check if temp file exists
      if (!fs.existsSync(file.tempFilePath)) {
        console.error('Temp file does not exist:', file.tempFilePath);
        throw new Error('Temporary file not found');
      }
      
      try {
        fileBuffer = fs.readFileSync(file.tempFilePath);
        console.log('Read buffer size:', fileBuffer.length);
        
        // Validate buffer is not empty
        if (fileBuffer.length === 0) {
          throw new Error('Empty file buffer read from temp file');
        }
      } catch (error) {
        const readError = error as Error;
        console.error('Error reading temp file:', readError);
        throw new Error(`Could not read temporary file: ${readError.message}`);
      }
    } 
    // Fallback - shouldn't happen with express-fileupload
    else {
      console.error('No file data or tempFilePath available');
      throw new Error('No file data available');
    }
    
    // Define the upload directory
    const uploadDir = path.join(process.cwd(), 'uploads', 'profile_pictures');
    console.log('Upload directory:', uploadDir);
    
    // Ensure the directory exists
    if (!fs.existsSync(uploadDir)) {
      console.log('Creating upload directory');
      try {
        fs.mkdirSync(uploadDir, { recursive: true });
      } catch (error) {
        const mkdirError = error as Error;
        console.error('Error creating upload directory:', mkdirError);
        throw new Error(`Failed to create upload directory: ${mkdirError.message}`);
      }
    }
    
    try {
      // Process the image into multiple sizes
      console.log('Starting image processing with Sharp');
      const processedImage = await processImage(
        fileBuffer, 
        uploadDir, 
        file.name,
        undefined, // Use default sizes
        { 
          quality: 80, 
          format: 'jpeg',
          crop: true // Force crop to ensure consistent aspect ratio
        }
      );
      
      console.log('Image processing successful. Result:', {
        mainPath: processedImage.originalPath,
        sizesAvailable: Object.keys(processedImage.sizes)
      });
      
      // Return the paths to the processed images
      return {
        mainPath: processedImage.originalPath, // The main path for backward compatibility
        sizes: {
          small: processedImage.sizes.small,
          medium: processedImage.sizes.medium,
          large: processedImage.sizes.large,
          original: processedImage.sizes.original
        }
      };
    } catch (processingError) {
      console.error('Error during image processing with Sharp:', processingError);
      
      // We'll try the fallback method if Sharp processing fails
      throw processingError; // Re-throw to be caught by the outer catch block
    }
  } catch (error: unknown) {
    console.error('Error processing profile picture:', error);
    
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
    
    // Check if uploads directory exists
    const uploadDir = path.join(process.cwd(), 'uploads', 'profile_pictures');
    console.log('Checking upload directory exists:', fs.existsSync(uploadDir));
    
    try {
      // Create directory if it doesn't exist (double-check)
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      // Fallback to original implementation if image processing fails
      console.log('Using fallback upload method');
      const filename = `fallback-${Date.now()}${path.extname(file.name).toLowerCase()}`;
      const uploadPath = path.join(process.cwd(), 'uploads', 'profile_pictures', filename);
      
      console.log('Attempting to move file to:', uploadPath);
      await file.mv(uploadPath);
      console.log('File moved successfully to:', uploadPath);
      console.log('File exists check:', fs.existsSync(uploadPath));
      
      if (!fs.existsSync(uploadPath)) {
        throw new Error('File was moved but does not exist at destination');
      }
      
      const fileStats = fs.statSync(uploadPath);
      console.log('Saved file size:', fileStats.size);
      
      const relativePath = `/uploads/profile_pictures/${filename}`;
      console.log('Relative path for client use:', relativePath);
      
      // Set sizes to include at least the original
      return {
        mainPath: relativePath,
        sizes: {
          original: relativePath,
          small: relativePath,   // We're using the same file for all sizes as fallback
          medium: relativePath,  // This ensures the DirectAvatar component works correctly
          large: relativePath    // Even when image processing failed
        }
      };
    } catch (error) {
      const fallbackError = error as Error;
      console.error('Fallback upload also failed:', fallbackError);
      throw new Error(`Failed to process and upload image: ${fallbackError.message}`);
    }
  }
};