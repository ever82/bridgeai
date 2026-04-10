/**
 * Upload Routes
 * 上传路由
 *
 * 头像上传、图片处理 API
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import { logger } from '../utils/logger';
import { authenticate } from '../middleware/auth';
import * as storageService from '../services/storageService';
import * as userService from '../services/userService';

const router = Router();

// 配置 multer 内存存储
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: storageService.MAX_FILE_SIZE, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (storageService.isAllowedImageType(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件 (JPEG, PNG, GIF, WebP)'));
    }
  },
});

/**
 * POST /api/v1/users/avatar
 * 上传用户头像
 */
router.post(
  '/avatar',
  authenticate,
  upload.single('avatar'),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '未认证',
          },
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: '请选择要上传的文件',
          },
        });
      }

      const { buffer, mimetype, originalname } = req.file;

      // 生成存储路径
      const extension = storageService.getExtensionFromMimetype(mimetype);
      const storageKey = storageService.generateStoragePath(
        userId,
        `avatar.${extension}`
      );

      // 使用 sharp 处理图片
      let processedBuffer: Buffer;

      try {
        // 获取图片信息
        const metadata = await sharp(buffer).metadata();

        // 创建 sharp 处理管道
        let pipeline = sharp(buffer);

        // 转换为 JPEG 以获得更好的兼容性（除非原图是 PNG 或 WebP）
        if (mimetype === 'image/png') {
          pipeline = pipeline.png({ quality: 90 });
        } else if (mimetype === 'image/webp') {
          pipeline = pipeline.webp({ quality: 90 });
        } else {
          pipeline = pipeline.jpeg({ quality: 90, progressive: true });
        }

        // 如果图片尺寸过大，进行缩放
        const maxDimension = 1024;
        if (
          (metadata.width && metadata.width > maxDimension) ||
          (metadata.height && metadata.height > maxDimension)
        ) {
          pipeline = pipeline.resize(maxDimension, maxDimension, {
            fit: 'inside',
            withoutEnlargement: true,
          });
        }

        // 生成中等尺寸的头像 (128x128)
        const mediumSize = storageService.AVATAR_SIZES.medium;
        processedBuffer = await pipeline
          .resize(mediumSize.width, mediumSize.height, {
            fit: 'cover',
            position: 'center',
          })
          .toBuffer();
      } catch (error) {
        logger.error('Image processing failed', error as Error);
        return res.status(400).json({
          success: false,
          error: {
            code: 'IMAGE_PROCESSING_FAILED',
            message: '图片处理失败，请检查文件格式',
          },
        });
      }

      // 上传到云存储
      let avatarUrl: string;
      try {
        avatarUrl = await storageService.uploadToStorage(
          storageKey,
          processedBuffer,
          mimetype === 'image/png' ? 'image/png' : 'image/jpeg'
        );
      } catch (error) {
        logger.error('Upload avatar failed', error as Error);
        return res.status(500).json({
          success: false,
          error: {
            code: 'UPLOAD_FAILED',
            message: '头像上传失败，请稍后重试',
          },
        });
      }

      // 更新用户头像URL
      const updatedUser = await userService.updateUserAvatar(userId, avatarUrl);

      res.json({
        success: true,
        data: {
          avatarUrl: updatedUser.avatarUrl,
          user: updatedUser,
        },
        message: '头像上传成功',
      });
    } catch (error) {
      logger.error('Avatar upload endpoint failed', error as Error);

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '头像上传失败',
        },
      });
    }
  }
);

/**
 * DELETE /api/v1/users/avatar
 * 删除用户头像（恢复默认头像）
 */
router.delete('/avatar', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '未认证',
        },
      });
    }

    // 清空头像URL（使用null会触发数据库默认头像或前端显示默认头像）
    const updatedUser = await userService.updateUserAvatar(userId, '');

    res.json({
      success: true,
      data: {
        user: updatedUser,
      },
      message: '头像已删除',
    });
  } catch (error) {
    logger.error('Delete avatar failed', error as Error);

    if ((error as Error).message === '用户不存在') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: '用户不存在',
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '删除头像失败',
      },
    });
  }
});

// 错误处理中间件（处理 multer 错误）
router.use(
  (
    err: Error,
    req: Request,
    res: Response,
    next: (err?: Error) => void
  ) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: '文件大小超过限制（最大5MB）',
          },
        });
      }
      return res.status(400).json({
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: err.message,
        },
      });
    }

    if (err) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE',
          message: err.message,
        },
      });
    }

    next();
  }
);

export default router;
