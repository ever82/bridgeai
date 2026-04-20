/**
 * Tests for upload middleware
 */
import { Request, Response } from 'express';

import {
  uploadSingle,
  uploadMultiple,
  uploadImage,
  uploadImages,
  uploadDocument,
  uploadVideo,
  uploadAudio,
  handleUploadError,
  validateImageBuffer,
} from '../upload';

// Mock multer
jest.mock('multer', () => {
  return jest.fn(() => ({
    single: jest.fn(() => (req: Request, res: Response, next: () => void) => next()),
    array: jest.fn(() => (req: Request, res: Response, next: () => void) => next()),
    fields: jest.fn(() => (req: Request, res: Response, next: () => void) => next()),
  }));
});

describe('Upload Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {
      file: undefined,
      files: undefined,
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('uploadSingle', () => {
    it('should create single file upload middleware', () => {
      const middleware = uploadSingle({ fieldName: 'file' });
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should accept categories option', () => {
      const middleware = uploadSingle({
        fieldName: 'image',
        categories: ['image'],
      });
      expect(middleware).toBeDefined();
    });

    it('should accept mimeTypes option', () => {
      const middleware = uploadSingle({
        fieldName: 'file',
        mimeTypes: ['image/jpeg', 'image/png'],
      });
      expect(middleware).toBeDefined();
    });

    it('should accept maxSize option', () => {
      const middleware = uploadSingle({
        fieldName: 'file',
        maxSize: 5 * 1024 * 1024, // 5MB
      });
      expect(middleware).toBeDefined();
    });
  });

  describe('uploadMultiple', () => {
    it('should create multiple files upload middleware', () => {
      const middleware = uploadMultiple({ fieldName: 'files' });
      expect(middleware).toBeDefined();
    });

    it('should accept maxCount option', () => {
      const middleware = uploadMultiple({
        fieldName: 'files',
        maxCount: 10,
      });
      expect(middleware).toBeDefined();
    });
  });

  describe('pre-configured upload middlewares', () => {
    it('should create image upload middleware', () => {
      const middleware = uploadImage('avatar');
      expect(middleware).toBeDefined();
    });

    it('should create images upload middleware', () => {
      const middleware = uploadImages('photos', 20);
      expect(middleware).toBeDefined();
    });

    it('should create document upload middleware', () => {
      const middleware = uploadDocument('resume');
      expect(middleware).toBeDefined();
    });

    it('should create video upload middleware', () => {
      const middleware = uploadVideo('video');
      expect(middleware).toBeDefined();
    });

    it('should create audio upload middleware', () => {
      const middleware = uploadAudio('audio');
      expect(middleware).toBeDefined();
    });
  });

  describe('handleUploadError', () => {
    it('should handle file size limit error', () => {
      const error = new Error('File too large');
      (error as Error & { code: string }).code = 'LIMIT_FILE_SIZE';

      handleUploadError(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'FILE_TOO_LARGE',
          }),
        })
      );
    });

    it('should handle file count limit error', () => {
      const error = new Error('Too many files');
      (error as Error & { code: string }).code = 'LIMIT_FILE_COUNT';

      handleUploadError(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'TOO_MANY_FILES',
          }),
        })
      );
    });

    it('should handle unexpected field error', () => {
      const error = new Error('Unexpected field');
      (error as Error & { code: string; field: string }).code = 'LIMIT_UNEXPECTED_FILE';
      (error as Error & { field: string }).field = 'wrongField';

      handleUploadError(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'UNEXPECTED_FIELD',
          }),
        })
      );
    });

    it('should handle invalid file type error', () => {
      const error = new Error('File type not allowed: .exe');

      handleUploadError(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INVALID_FILE_TYPE',
          }),
        })
      );
    });

    it('should pass through unknown errors', () => {
      const error = new Error('Unknown error');

      handleUploadError(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('validateImageBuffer', () => {
    it('should validate JPEG image', () => {
      const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const result = validateImageBuffer(buffer);
      expect(result.valid).toBe(true);
      expect(result.format).toBe('jpeg');
    });

    it('should validate PNG image', () => {
      const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
      const result = validateImageBuffer(buffer);
      expect(result.valid).toBe(true);
      expect(result.format).toBe('png');
    });

    it('should validate GIF image', () => {
      const buffer = Buffer.from([0x47, 0x49, 0x46, 0x38]);
      const result = validateImageBuffer(buffer);
      expect(result.valid).toBe(true);
      expect(result.format).toBe('gif');
    });

    it('should validate WebP image', () => {
      const buffer = Buffer.from([
        0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
        0x57, 0x45, 0x42, 0x50,
      ]);
      const result = validateImageBuffer(buffer);
      expect(result.valid).toBe(true);
      expect(result.format).toBe('webp');
    });

    it('should validate SVG image', () => {
      const buffer = Buffer.from('<?xml version="1.0"?><svg></svg>');
      const result = validateImageBuffer(buffer);
      expect(result.valid).toBe(true);
      expect(result.format).toBe('svg');
    });

    it('should reject invalid image', () => {
      const buffer = Buffer.from('not an image');
      const result = validateImageBuffer(buffer);
      expect(result.valid).toBe(false);
    });

    it('should reject buffer too short', () => {
      const buffer = Buffer.from([0x00]);
      const result = validateImageBuffer(buffer);
      expect(result.valid).toBe(false);
    });
  });
});
