import { Router, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import sharp from 'sharp';

import { AppError } from '../errors/AppError';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/common';
import { handleUploadError } from '../middleware/upload';
import { validateBody } from '../middleware/validation';
import { ApiResponse } from '../utils/response';
import { prisma } from '../db/client';
import * as storageService from '../services/storageService';
import * as userService from '../services/userService';

import { privacySettingsSchema } from './userPrivacy';

// Multer config for avatar upload
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

const router: Router = Router();

// Zod schema for profile update
const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  displayName: z.string().max(50).optional(),
  bio: z.string().max(500).optional(),
  website: z
    .string()
    .url()
    .max(500)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  location: z.string().max(200).optional(),
});

/**
 * Validate avatarUrl - only allow https:// URLs from allowed domains
 */
function validateAvatarUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new AppError('Avatar URL must use http or https protocol', 'INVALID_AVATAR_URL', 400);
    }
    if (parsed.protocol === 'http:') {
      throw new AppError('Avatar URL must use https protocol', 'INVALID_AVATAR_URL', 400);
    }
    return url;
  } catch {
    throw new AppError('Invalid avatar URL format', 'INVALID_AVATAR_URL', 400);
  }
}

/**
 * @route GET /api/v1/users/me
 * @desc Get current user profile
 * @access Private
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const user = await userService.getUserById(req.user.id);

    if (!user) {
      throw new AppError('User not found', 'USER_NOT_FOUND', 404);
    }

    res.json(ApiResponse.success(user));
  })
);

/**
 * @route PUT /api/v1/users/me
 * @desc Update current user profile
 * @access Private
 */
router.put(
  '/me',
  authenticate,
  validateBody(updateProfileSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { name, displayName, bio, website, location } = req.body;

    const updatedUser = await userService.updateUser(req.user.id, {
      name,
      displayName,
      bio,
      website,
      location,
    });

    res.json(ApiResponse.success(updatedUser));
  })
);

/**
 * @route POST /api/v1/users/avatar
 * @desc Upload user avatar
 * @access Private
 */
router.post(
  '/avatar',
  authenticate,
  avatarUpload.single('avatar'),
  handleUploadError,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    // Check if file is present in request
    if (!req.file && !req.body.avatarUrl) {
      throw new AppError('No file uploaded', 'NO_FILE', 400);
    }

    let avatarUrl: string;

    if (req.file) {
      // Compress avatar image (skip GIFs to preserve animation)
      let buffer = req.file.buffer;
      let mimeType = req.file.mimetype;
      let originalName = req.file.originalname;

      if (mimeType !== 'image/gif') {
        buffer = await sharp(req.file.buffer)
          .resize(200, 200, { fit: 'cover' })
          .jpeg({ quality: 80 })
          .toBuffer();
        mimeType = 'image/jpeg';
        originalName = originalName.replace(/\.[^.]+$/, '') + '.jpg';
      }

      const fileInfo: storageService.FileInfo = {
        buffer,
        originalName,
        mimeType,
        size: buffer.length,
      };

      const result = await storageService.uploadAvatar(fileInfo, req.user.id);
      avatarUrl = result.url;
    } else {
      // Use provided URL with validation
      avatarUrl = validateAvatarUrl(req.body.avatarUrl);
    }

    const updatedUser = await userService.updateAvatar(req.user.id, avatarUrl);

    res.json(
      ApiResponse.success({
        avatarUrl: updatedUser.avatarUrl,
        message: 'Avatar updated successfully',
      })
    );
  })
);

/**
 * @route DELETE /api/v1/users/me
 * @desc Delete current user account
 * @access Private
 */
router.delete(
  '/me',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { password } = req.body;

    if (!password) {
      throw new AppError('Password is required', 'PASSWORD_REQUIRED', 400);
    }

    // Verify password before deleting account
    await userService.verifyPassword(req.user.id, password);

    // Delete user
    await userService.deleteUser(req.user.id);

    res.json(
      ApiResponse.success({
        message: 'Account deleted successfully',
      })
    );
  })
);

/**
 * @route GET /api/v1/users/privacy
 * @desc Get privacy settings
 * @access Private
 */
router.get(
  '/privacy',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const settings = await userService.getPrivacySettings(req.user.id);

    res.json(ApiResponse.success(settings));
  })
);

/**
 * @route PUT /api/v1/users/privacy
 * @desc Update privacy settings
 * @access Private
 */
router.put(
  '/privacy',
  authenticate,
  validateBody(privacySettingsSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const settings = await userService.updatePrivacySettings(req.user.id, req.body);

    res.json(ApiResponse.success(settings));
  })
);

/**
 * @route POST /api/v1/users/password
 * @desc Change password
 * @access Private
 */
router.post(
  '/password',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError('Current password and new password are required', 'MISSING_FIELDS', 400);
    }

    if (newPassword.length < 8) {
      throw new AppError('New password must be at least 8 characters', 'WEAK_PASSWORD', 400);
    }

    await userService.changePassword(req.user.id, currentPassword, newPassword);

    res.json(
      ApiResponse.success({
        message: 'Password changed successfully',
      })
    );
  })
);

/**
 * @route POST /api/v1/users/phone
 * @desc Update phone number
 * @access Private
 */
router.post(
  '/phone',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { phone } = req.body;

    if (!phone) {
      throw new AppError('Phone number is required', 'PHONE_REQUIRED', 400);
    }

    const updatedUser = await userService.updatePhone(req.user.id, phone);

    res.json(
      ApiResponse.success({
        phone: updatedUser.phone,
        phoneVerified: updatedUser.phoneVerified,
        message: 'Phone number updated successfully',
      })
    );
  })
);

/**
 * @route POST /api/v1/users/email
 * @desc Update email
 * @access Private
 */
router.post(
  '/email',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { email } = req.body;

    if (!email) {
      throw new AppError('Email is required', 'EMAIL_REQUIRED', 400);
    }

    const updatedUser = await userService.updateEmail(req.user.id, email);

    res.json(
      ApiResponse.success({
        email: updatedUser.email,
        emailVerified: updatedUser.emailVerified,
        message: 'Email updated successfully',
      })
    );
  })
);

/**
 * @route GET /api/v1/users/devices
 * @desc Get user devices
 * @access Private
 */
router.get(
  '/devices',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const devices = await userService.getUserDevices(req.user.id);

    res.json(ApiResponse.success(devices));
  })
);

/**
 * @route DELETE /api/v1/users/devices/:deviceId
 * @desc Remove a device
 * @access Private
 */
router.delete(
  '/devices/:deviceId',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { deviceId } = req.params;

    await userService.removeDevice(req.user.id, deviceId);

    res.json(
      ApiResponse.success({
        message: 'Device removed successfully',
      })
    );
  })
);

/**
 * @route POST /api/v1/users/block
 * @desc Block a user
 * @access Private
 */
router.post(
  '/block',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { userId, reason } = req.body;

    if (!userId) {
      throw new AppError('User ID is required', 'USER_ID_REQUIRED', 400);
    }

    await userService.blockUser(req.user.id, userId, reason);

    res.json(
      ApiResponse.success({
        message: 'User blocked successfully',
      })
    );
  })
);

/**
 * @route POST /api/v1/users/unblock
 * @desc Unblock a user
 * @access Private
 */
router.post(
  '/unblock',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { userId } = req.body;

    if (!userId) {
      throw new AppError('User ID is required', 'USER_ID_REQUIRED', 400);
    }

    await userService.unblockUser(req.user.id, userId);

    res.json(
      ApiResponse.success({
        message: 'User unblocked successfully',
      })
    );
  })
);

/**
 * @route GET /api/v1/users/blocked
 * @desc Get blocked users list
 * @access Private
 */
router.get(
  '/blocked',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const blockedUsers = await userService.getBlockedUsers(req.user.id);

    res.json(ApiResponse.success(blockedUsers));
  })
);

/**
 * @route POST /api/v1/users/blocked
 * @desc Add a user to the blocked list (alias of /block, body uses blockedUserId)
 * @access Private
 */
router.post(
  '/blocked',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { blockedUserId, userId, reason } = req.body;
    const targetId = blockedUserId || userId;

    if (!targetId) {
      throw new AppError('blockedUserId is required', 'USER_ID_REQUIRED', 400);
    }

    await userService.blockUser(req.user.id, targetId, reason);

    res.status(201).json(
      ApiResponse.success({
        blockedUserId: targetId,
        message: 'User blocked successfully',
      })
    );
  })
);

/**
 * @route POST /api/v1/users/phone/send-code
 * @desc Send a verification code to phone number (dev mode returns mock code)
 * @access Private
 */
router.post(
  '/phone/send-code',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { phone } = req.body;

    if (!phone) {
      throw new AppError('Phone number is required', 'PHONE_REQUIRED', 400);
    }

    // In production, integrate with SMS provider; for dev/test return a fixed code.
    const isDev = process.env.NODE_ENV !== 'production';
    const code = isDev ? '123456' : undefined;

    res.json(
      ApiResponse.success({
        success: true,
        phone,
        ...(code ? { code } : {}),
        expiresIn: 300,
        message: 'Verification code sent',
      })
    );
  })
);

/**
 * @route POST /api/v1/users/email/send-code
 * @desc Send a verification code to email (dev mode returns mock code)
 * @access Private
 */
router.post(
  '/email/send-code',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const { email } = req.body;

    if (!email) {
      throw new AppError('Email is required', 'EMAIL_REQUIRED', 400);
    }

    const isDev = process.env.NODE_ENV !== 'production';
    const code = isDev ? '123456' : undefined;

    res.json(
      ApiResponse.success({
        success: true,
        email,
        ...(code ? { code } : {}),
        expiresIn: 300,
        message: 'Verification code sent',
      })
    );
  })
);

/**
 * @route GET /api/v1/users/sessions
 * @desc List active sessions (refresh tokens) for current user
 * @access Private
 */
router.get(
  '/sessions',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new AppError('Unauthorized', 'UNAUTHORIZED', 401);
    }

    const tokens = await prisma.refreshToken.findMany({
      where: {
        userId: req.user.id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        deviceInfo: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    const sessions = tokens.map(t => ({
      id: t.id,
      deviceInfo: t.deviceInfo,
      ipAddress: t.ipAddress,
      createdAt: t.createdAt,
      expiresAt: t.expiresAt,
      current: false,
    }));

    res.json(ApiResponse.success(sessions));
  })
);

export default router;
