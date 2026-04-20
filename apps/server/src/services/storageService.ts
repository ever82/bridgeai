import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

import { AppError } from '../errors/AppError';

export interface UploadOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  compress?: boolean;
  generateThumbnail?: boolean;
}

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
}

export interface FileInfo {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
}

const DEFAULT_OPTIONS: UploadOptions = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  compress: true,
  generateThumbnail: true,
};

// Upload directory for local development
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const BASE_URL = process.env.UPLOAD_BASE_URL || '/uploads';

/**
 * Validate file
 */
function validateFile(file: FileInfo, options: UploadOptions = {}): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Check file size
  if (file.size > opts.maxSize!) {
    throw new AppError(
      `File size exceeds limit of ${opts.maxSize! / 1024 / 1024}MB`,
      'FILE_TOO_LARGE',
      400
    );
  }

  // Check mime type
  if (!opts.allowedTypes!.includes(file.mimeType)) {
    throw new AppError(
      `File type ${file.mimeType} not allowed. Allowed types: ${opts.allowedTypes!.join(', ')}`,
      'INVALID_FILE_TYPE',
      400
    );
  }
}

/**
 * Generate unique file key
 */
function generateFileKey(originalName: string, prefix: string = ''): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const ext = path.extname(originalName).toLowerCase();
  const name = path.basename(originalName, ext).replace(/[^a-zA-Z0-9]/g, '_');

  return `${prefix}${name}_${timestamp}_${random}${ext}`;
}

/**
 * Ensure upload directory exists
 */
async function ensureUploadDir(subDir: string = ''): Promise<string> {
  const dir = path.join(UPLOAD_DIR, subDir);
  if (!existsSync(dir)) {
    await fs.mkdir(dir, { recursive: true });
  }
  return dir;
}

/**
 * Get image dimensions
 * Note: In a real implementation, you would use sharp or similar library
 */
async function getImageDimensions(buffer: Buffer): Promise<{ width: number; height: number } | undefined> {
  // Placeholder - would use sharp library in production
  // const sharp = require('sharp');
  // const metadata = await sharp(buffer).metadata();
  // return { width: metadata.width!, height: metadata.height! };
  return undefined;
}

/**
 * Compress image
 * Note: In a real implementation, you would use sharp or similar library
 */
async function compressImage(buffer: Buffer, quality: number = 80): Promise<Buffer> {
  // Placeholder - would use sharp library in production
  // const sharp = require('sharp');
  // return await sharp(buffer)
  //   .jpeg({ quality, progressive: true })
  //   .toBuffer();
  return buffer;
}

/**
 * Generate thumbnail
 * Note: In a real implementation, you would use sharp or similar library
 */
async function generateThumbnail(buffer: Buffer, width: number = 200, height: number = 200): Promise<Buffer> {
  // Placeholder - would use sharp library in production
  // const sharp = require('sharp');
  // return await sharp(buffer)
  //   .resize(width, height, { fit: 'cover' })
  //   .jpeg({ quality: 70 })
  //   .toBuffer();
  return buffer;
}

/**
 * Upload file to local storage
 */
async function uploadToLocal(
  file: FileInfo,
  key: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const subDir = key.split('/')[0] || 'default';
  const dir = await ensureUploadDir(subDir);
  const filePath = path.join(dir, path.basename(key));

  let buffer = file.buffer;
  let thumbnailUrl: string | undefined;

  // Compress image if option enabled
  if (options.compress && file.mimeType.startsWith('image/')) {
    buffer = await compressImage(buffer);
  }

  // Generate thumbnail if option enabled
  if (options.generateThumbnail && file.mimeType.startsWith('image/')) {
    const thumbnailKey = key.replace(/\.(\w+)$/, '-thumb.$1');
    const thumbnailPath = path.join(dir, path.basename(thumbnailKey));
    const thumbnailBuffer = await generateThumbnail(buffer);
    await fs.writeFile(thumbnailPath, thumbnailBuffer);
    thumbnailUrl = `${BASE_URL}/${thumbnailKey}`;
  }

  // Save file
  await fs.writeFile(filePath, buffer);

  // Get dimensions
  const dimensions = await getImageDimensions(buffer);

  return {
    url: `${BASE_URL}/${key}`,
    key,
    size: buffer.length,
    mimeType: file.mimeType,
    width: dimensions?.width,
    height: dimensions?.height,
    thumbnailUrl,
  };
}

/**
 * Upload file to cloud storage (S3/OSS)
 * Note: This is a placeholder - implement with actual cloud SDK
 */
async function uploadToCloud(
  _file: FileInfo,
  _key: string,
  _options: UploadOptions = {}
): Promise<UploadResult> {
  // Placeholder - implement with aws-sdk or ali-oss
  // const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
  // or
  // const OSS = require('ali-oss');

  throw new AppError('Cloud storage not configured', 'CLOUD_STORAGE_NOT_CONFIGURED', 500);
}

/**
 * Upload file
 */
export async function uploadFile(
  file: FileInfo,
  options: UploadOptions = {},
  prefix: string = ''
): Promise<UploadResult> {
  // Validate file
  validateFile(file, options);

  // Generate key
  const key = generateFileKey(file.originalName, prefix);

  // Upload to appropriate storage
  const storageType = process.env.STORAGE_TYPE || 'local';

  if (storageType === 'cloud') {
    return uploadToCloud(file, key, options);
  }

  return uploadToLocal(file, key, options);
}

/**
 * Upload avatar
 */
export async function uploadAvatar(
  file: FileInfo,
  userId: string
): Promise<UploadResult> {
  const options: UploadOptions = {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    compress: true,
    generateThumbnail: true,
  };

  return uploadFile(file, options, `avatars/${userId}/`);
}

/**
 * Delete file
 */
export async function deleteFile(key: string): Promise<void> {
  const storageType = process.env.STORAGE_TYPE || 'local';

  if (storageType === 'cloud') {
    // Placeholder - implement with cloud SDK
    // await deleteFromCloud(key);
    return;
  }

  // Delete from local storage
  const subDir = key.split('/')[0] || 'default';
  const filePath = path.join(UPLOAD_DIR, subDir, path.basename(key));

  try {
    await fs.unlink(filePath);
  } catch (error) {
    // File may not exist, ignore error
  }

  // Delete thumbnail if exists
  const thumbnailKey = key.replace(/\.(\w+)$/, '-thumb.$1');
  const thumbnailPath = path.join(UPLOAD_DIR, subDir, path.basename(thumbnailKey));
  try {
    await fs.unlink(thumbnailPath);
  } catch (error) {
    // Thumbnail may not exist, ignore error
  }
}

/**
 * Get file URL
 */
export function getFileUrl(key: string): string {
  const storageType = process.env.STORAGE_TYPE || 'local';

  if (storageType === 'cloud') {
    const cdnUrl = process.env.CDN_URL || process.env.OSS_BUCKET_URL;
    if (cdnUrl) {
      return `${cdnUrl}/${key}`;
    }
  }

  return `${BASE_URL}/${key}`;
}

/**
 * Get default avatar URL
 */
export function getDefaultAvatarUrl(): string {
  return process.env.DEFAULT_AVATAR_URL || `${BASE_URL}/default-avatar.png`;
}

export default {
  uploadFile,
  uploadAvatar,
  deleteFile,
  getFileUrl,
  getDefaultAvatarUrl,
};
