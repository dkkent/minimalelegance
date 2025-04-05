// Type definitions for express-fileupload
import { Request, Response, NextFunction } from 'express';

export interface UploadedFile {
  name: string;
  encoding: string;
  mimetype: string;
  mv: (path: string) => Promise<void>;
  data: Buffer;
  truncated: boolean;
  size: number;
  md5: string;
  tempFilePath: string;
}

export interface FileUploadOptions {
  useTempFiles?: boolean;
  tempFileDir?: string;
  createParentPath?: boolean;
  limits?: {
    fileSize?: number;
  };
}

export interface FileArray {
  [fieldname: string]: UploadedFile[];
}

export interface Files {
  [fieldname: string]: UploadedFile | UploadedFile[];
}

export interface FileUploadRequest extends Request {
  files?: Files;
}

declare function fileUpload(options?: FileUploadOptions): (req: Request, res: Response, next: NextFunction) => void;

declare module 'express-fileupload' {
  export = fileUpload;
}