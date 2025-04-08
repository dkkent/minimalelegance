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
      fileBuffer = fs.readFileSync(file.tempFilePath);
      console.log('Read buffer size:', fileBuffer.length);
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
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Process the image into multiple sizes
    console.log('Starting image processing with Sharp');
    const processedImage = await processImage(
      fileBuffer, 
      uploadDir, 
      file.name,
      undefined, // Use default sizes
      { 
        quality: 80, 
        format: 'jpeg' 
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
      // Fallback to original implementation if image processing fails
      console.log('Using fallback upload method');
      const filename = `fallback-${Date.now()}${path.extname(file.name).toLowerCase()}`;
      const uploadPath = path.join(process.cwd(), 'uploads', 'profile_pictures', filename);
      
      console.log('Attempting to move file to:', uploadPath);
      await file.mv(uploadPath);
      console.log('File moved successfully');
      
      const relativePath = `/uploads/profile_pictures/${filename}`;
      
      return {
        mainPath: relativePath,
        sizes: {
          original: relativePath
        }
      };
    } catch (fallbackError) {
      console.error('Fallback upload also failed:', fallbackError);
      throw new Error('Failed to process and upload image');
    }
  }
};