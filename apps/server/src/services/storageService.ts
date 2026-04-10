/**
 * Storage Service
 * 存储服务
 *
 * 处理文件上传到云存储(OSS/S3)
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { logger } from '../utils/logger';

// 存储配置
const storageConfig = {
  provider: process.env.STORAGE_PROVIDER || 's3', // 's3' | 'oss' | 'local'
  region: process.env.STORAGE_REGION || 'us-east-1',
  endpoint: process.env.STORAGE_ENDPOINT,
  bucket: process.env.STORAGE_BUCKET || 'visionshare-uploads',
  accessKeyId: process.env.STORAGE_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY || '',
  baseUrl: process.env.STORAGE_BASE_URL || '',
};

// 初始化 S3 客户端
let s3Client: S3Client | null = null;

if (storageConfig.provider === 's3' || storageConfig.provider === 'oss') {
  s3Client = new S3Client({
    region: storageConfig.region,
    endpoint: storageConfig.endpoint,
    credentials: {
      accessKeyId: storageConfig.accessKeyId,
      secretAccessKey: storageConfig.secretAccessKey,
    },
  });
}

// 支持的图片类型
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

// 最大文件大小 (5MB)
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

// 头像尺寸配置
export const AVATAR_SIZES = {
  small: { width: 64, height: 64 },
  medium: { width: 128, height: 128 },
  large: { width: 256, height: 256 },
};

/**
 * 生成存储路径
 * @param userId 用户ID
 * @param filename 文件名
 * @returns 存储路径
 */
export function generateStoragePath(userId: string, filename: string): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const randomString = Math.random().toString(36).substring(2, 10);
  const extension = filename.split('.').pop() || 'jpg';
  return `avatars/${userId}/${year}/${month}/${randomString}.${extension}`;
}

/**
 * 上传文件到 S3/OSS
 * @param key 存储键
 * @param buffer 文件内容
 * @param contentType 内容类型
 * @returns 文件访问URL
 */
export async function uploadToStorage(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  if (!s3Client) {
    throw new Error('存储客户端未初始化');
  }

  try {
    const command = new PutObjectCommand({
      Bucket: storageConfig.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read',
    });

    await s3Client.send(command);

    // 构建访问URL
    if (storageConfig.baseUrl) {
      return `${storageConfig.baseUrl}/${key}`;
    }

    if (storageConfig.endpoint) {
      return `${storageConfig.endpoint}/${storageConfig.bucket}/${key}`;
    }

    return `https://${storageConfig.bucket}.s3.${storageConfig.region}.amazonaws.com/${key}`;
  } catch (error) {
    logger.error('Upload to storage failed', error as Error, { key });
    throw new Error('文件上传失败');
  }
}

/**
 * 从存储删除文件
 * @param key 存储键
 */
export async function deleteFromStorage(key: string): Promise<void> {
  if (!s3Client) {
    throw new Error('存储客户端未初始化');
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: storageConfig.bucket,
      Key: key,
    });

    await s3Client.send(command);
    logger.info('File deleted from storage', { key });
  } catch (error) {
    logger.error('Delete from storage failed', error as Error, { key });
    throw new Error('文件删除失败');
  }
}

/**
 * 验证文件类型
 * @param mimetype MIME类型
 * @returns 是否允许
 */
export function isAllowedImageType(mimetype: string): boolean {
  return ALLOWED_IMAGE_TYPES.includes(mimetype);
}

/**
 * 获取文件扩展名
 * @param mimetype MIME类型
 * @returns 扩展名
 */
export function getExtensionFromMimetype(mimetype: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
  };
  return map[mimetype] || 'jpg';
}
