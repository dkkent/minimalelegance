import fileUpload from 'express-fileupload';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Express } from 'express';
import { UploadedFile } from "../types/express-fileupload";

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

export const saveProfilePicture = async (file: UploadedFile): Promise<string> => {
  // Generate a unique filename with UUID to prevent collisions
  const filename = `${uuidv4()}${path.extname(file.name).toLowerCase()}`;
  const uploadPath = path.join(process.cwd(), 'uploads', 'profile_pictures', filename);
  
  await file.mv(uploadPath);
  
  // Return the relative path to access the file
  return `/uploads/profile_pictures/${filename}`;
};