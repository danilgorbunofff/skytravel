// Type definitions for multer 2.x
// Multer 2.x does not bundle TypeScript declarations.
// This provides types for the subset of the API used in this project.

declare module "multer" {
  import type { Request, RequestHandler } from "express";

  interface FileFilterCallback {
    (error: Error): void;
    (error: null, accept: boolean): void;
  }

  interface Options {
    storage?: StorageEngine;
    limits?: {
      fieldNameSize?: number;
      fieldSize?: number;
      fields?: number;
      fileSize?: number;
      files?: number;
      parts?: number;
      headerPairs?: number;
    };
    preservePath?: boolean;
    defParamCharset?: string;
    fileFilter?(
      req: Request,
      file: File,
      callback: FileFilterCallback,
    ): void;
  }

  interface StorageEngine {
    _handleFile(
      req: Request,
      file: File,
      callback: (error: Error | null, info?: Partial<File>) => void,
    ): void;
    _removeFile(
      req: Request,
      file: File,
      callback: (error: Error | null) => void,
    ): void;
  }

  interface DiskStorageOptions {
    destination?:
      | string
      | ((
          req: Request,
          file: File,
          callback: (error: Error | null, destination: string) => void,
        ) => void);
    filename?(
      req: Request,
      file: File,
      callback: (error: Error | null, filename: string) => void,
    ): void;
  }

  interface Multer {
    single(fieldname: string): RequestHandler;
    array(fieldname: string, maxCount?: number): RequestHandler;
    fields(fields: { name: string; maxCount?: number }[]): RequestHandler;
    none(): RequestHandler;
    any(): RequestHandler;
  }

  interface File {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    destination: string;
    filename: string;
    path: string;
    buffer: Buffer;
  }

  function diskStorage(options: DiskStorageOptions): StorageEngine;
  function memoryStorage(): StorageEngine;

  const multer: {
    (options?: Options): Multer;
    diskStorage: typeof diskStorage;
    memoryStorage: typeof memoryStorage;
  };

  export default multer;
  export { diskStorage, memoryStorage, Multer, Options, File };
}

// Global augmentation: extend Express.Request and Express.Multer
namespace Express {
  namespace Multer {
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    type File = import("multer").File;
  }

  interface Request {
    file?: Express.Multer.File;
    files?:
      | Express.Multer.File[]
      | { [fieldname: string]: Express.Multer.File[] };
  }
}
