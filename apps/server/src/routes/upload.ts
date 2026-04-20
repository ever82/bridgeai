import { Router, Response } from 'express';
import multer from 'multer';

import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/common';
import { handleUploadError } from '../middleware/upload';
import { ApiResponse } from '../utils/response';
import * as storageService from '../services/storageService';
import * as userService from '../services/userService';
import { AppError } from '../errors/AppError';

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
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    if (!req.file) {
      throw new AppError('No file uploaded', 'NO_FILE', 400);
    }

    const fileInfo: storageService.FileInfo = {
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
    };

    // Upload to storage
    const result = await storageService.uploadAvatar(fileInfo, req.user.id);

    // Update user avatar URL
    await userService.updateAvatar(req.user.id, result.url);

    res.json(ApiResponse.success({
      avatarUrl: result.url,
      thumbnailUrl: result.thumbnailUrl,
      size: result.size,
      message: 'Avatar uploaded successfully',
    }));
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
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    if (!req.file) {
      throw new AppError('No file uploaded', 'NO_FILE', 400);
    }

    const fileInfo: storageService.FileInfo = {
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
    };

    const result = await storageService.uploadFile(fileInfo, {}, 'images/');

    res.json(ApiResponse.success({
      url: result.url,
      thumbnailUrl: result.thumbnailUrl,
      size: result.size,
      width: result.width,
      height: result.height,
      message: 'Image uploaded successfully',
    }));
  })
);

export default router;
