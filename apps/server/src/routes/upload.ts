import { Router, Response } from 'express';
import multer from 'multer';

import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/common';
import { handleUploadError, validateImageContent } from '../middleware/upload';
import { ApiResponse } from '../utils/response';
import * as storageService from '../services/storageService';
import * as userService from '../services/userService';
import * as uploadAuditService from '../services/uploadAudit';
import { AppError } from '../errors/AppError';
import { stripExif } from '../utils/imageProcessing';

const router: Router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Accept only images
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  },
});

/**
 * @route POST /api/v1/upload/avatar
 * @desc Upload user avatar
 * @access Private
 */
router.post(
  '/avatar',
  authenticate,
  upload.single('avatar'),
  handleUploadError,
  validateImageContent,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    // Check if user is restricted
    if (uploadAuditService.isUserRestricted(req.user.id)) {
      uploadAuditService.recordViolation(req.user.id, 'Upload attempt while restricted');
      uploadAuditService.logUpload({
        userId: req.user.id,
        fileName: req.file?.originalname || 'unknown',
        fileSize: req.file?.size || 0,
        mimeType: req.file?.mimetype || 'unknown',
        status: 'rejected',
        reason: 'User is restricted from uploading',
        ip: req.ip,
      });
      throw new AppError(
        'Upload denied: your account has restricted upload access',
        'UPLOAD_RESTRICTED',
        403
      );
    }

    if (!req.file) {
      throw new AppError('No file uploaded', 'NO_FILE', 400);
    }

    // Strip EXIF data for privacy protection before storage
    const cleanedBuffer = await stripExif(req.file.buffer);

    const fileInfo: storageService.FileInfo = {
      buffer: cleanedBuffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: cleanedBuffer.length,
    };

    // Upload to storage
    const result = await storageService.uploadAvatar(fileInfo, req.user.id);

    // Update user avatar URL
    await userService.updateAvatar(req.user.id, result.url);

    // Log successful upload
    uploadAuditService.logUpload({
      userId: req.user.id,
      fileId: result.url,
      fileName: req.file.originalname,
      fileSize: result.size,
      mimeType: req.file.mimetype,
      status: 'success',
      ip: req.ip,
    });

    res.json(
      ApiResponse.success({
        avatarUrl: result.url,
        thumbnailUrl: result.thumbnailUrl,
        size: result.size,
        message: 'Avatar uploaded successfully',
      })
    );
  })
);

/**
 * @route POST /api/v1/upload/image
 * @desc Upload generic image
 * @access Private
 */
router.post(
  '/image',
  authenticate,
  upload.single('image'),
  handleUploadError,
  validateImageContent,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    // Check if user is restricted
    if (uploadAuditService.isUserRestricted(req.user.id)) {
      uploadAuditService.recordViolation(req.user.id, 'Upload attempt while restricted');
      uploadAuditService.logUpload({
        userId: req.user.id,
        fileName: req.file?.originalname || 'unknown',
        fileSize: req.file?.size || 0,
        mimeType: req.file?.mimetype || 'unknown',
        status: 'rejected',
        reason: 'User is restricted from uploading',
        ip: req.ip,
      });
      throw new AppError(
        'Upload denied: your account has restricted upload access',
        'UPLOAD_RESTRICTED',
        403
      );
    }

    if (!req.file) {
      throw new AppError('No file uploaded', 'NO_FILE', 400);
    }

    // Strip EXIF data for privacy protection before storage
    const cleanedBuffer = await stripExif(req.file.buffer);

    const fileInfo: storageService.FileInfo = {
      buffer: cleanedBuffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: cleanedBuffer.length,
    };

    const result = await storageService.uploadFile(fileInfo, {}, 'images/');

    // Log successful upload
    uploadAuditService.logUpload({
      userId: req.user.id,
      fileId: result.url,
      fileName: req.file.originalname,
      fileSize: result.size,
      mimeType: req.file.mimetype,
      status: 'success',
      ip: req.ip,
    });

    res.json(
      ApiResponse.success({
        url: result.url,
        thumbnailUrl: result.thumbnailUrl,
        size: result.size,
        width: result.width,
        height: result.height,
        message: 'Image uploaded successfully',
      })
    );
  })
);

export default router;
