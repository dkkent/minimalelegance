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
    // Read the file into memory
    let fileBuffer: Buffer;
    
    // If the file is already in memory
    if (file.data && Buffer.isBuffer(file.data)) {
      fileBuffer = file.data;
    } 
    // If file is stored in a temp file
    else if (file.tempFilePath) {
      fileBuffer = fs.readFileSync(file.tempFilePath);
    } 
    // Fallback - shouldn't happen with express-fileupload
    else {
      throw new Error('No file data available');
    }
    
    // Define the upload directory
    const uploadDir = path.join(process.cwd(), 'uploads', 'profile_pictures');
    
    // Process the image into multiple sizes
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
    // Fallback to original implementation if image processing fails
    const filename = `fallback-${Date.now()}${path.extname(file.name).toLowerCase()}`;
    const uploadPath = path.join(process.cwd(), 'uploads', 'profile_pictures', filename);
    
    await file.mv(uploadPath);
    const relativePath = `/uploads/profile_pictures/${filename}`;
    
    return {
      mainPath: relativePath,
      sizes: {
        original: relativePath
      }
    };
  }
};