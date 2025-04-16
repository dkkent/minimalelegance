declare module 'express-fileupload' {
  import { Express } from 'express';

  export interface UploadedFile {
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

  interface FileUploadOptions {
    useTempFiles?: boolean;
    tempFileDir?: string;
    createParentPath?: boolean;
    abortOnLimit?: boolean;
    responseOnLimit?: string;
    limitHandler?: (req: any, res: any, next: any) => void;
    limits?: {
      fileSize?: number;
    };
    safeFileNames?: boolean;
    preserveExtension?: boolean | number;
    uploadTimeout?: number;
    parseNested?: boolean;
    debug?: boolean;
  }

  function fileUpload(options?: FileUploadOptions): any;

  export default fileUpload;
}