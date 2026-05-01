import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';
import { AppError } from '../errors/AppError';
const DEFAULT_OPTIONS = {
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
function validateFile(file, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    // Check file size
    if (file.size > opts.maxSize) {
        throw new AppError(`File size exceeds limit of ${opts.maxSize / 1024 / 1024}MB`, 'FILE_TOO_LARGE', 400);
    }
    // Check mime type
    if (!opts.allowedTypes.includes(file.mimeType)) {
        throw new AppError(`File type ${file.mimeType} not allowed. Allowed types: ${opts.allowedTypes.join(', ')}`, 'INVALID_FILE_TYPE', 400);
    }
}
/**
 * Generate unique file key using UUID and date-based directory partitioning.
 * Original filename is NOT retained — only the extension is preserved.
 */
function generateFileKey(originalName, prefix = '') {
    const ext = path.extname(originalName).toLowerCase();
    const uuid = randomUUID();
    const now = new Date();
    const datePath = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
    return `${prefix}${datePath}/${uuid}${ext}`;
}
/**
 * Ensure upload directory exists
 */
async function ensureUploadDir(subDir = '') {
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
async function getImageDimensions(_buffer) {
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
async function compressImage(buffer, _quality = 80) {
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
async function generateThumbnail(buffer, _width = 200, _height = 200) {
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
async function uploadToLocal(file, key, options = {}) {
    const keyDir = path.dirname(key);
    const dir = await ensureUploadDir(keyDir);
    const filePath = path.join(dir, path.basename(key));
    let buffer = file.buffer;
    let thumbnailUrl;
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
async function uploadToCloud(_file, _key, _options = {}) {
    // Placeholder - implement with aws-sdk or ali-oss
    // const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
    // or
    // const OSS = require('ali-oss');
    throw new AppError('Cloud storage not configured', 'CLOUD_STORAGE_NOT_CONFIGURED', 500);
}
/**
 * Upload file
 */
export async function uploadFile(file, options = {}, prefix = '') {
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
export async function uploadAvatar(file, userId) {
    const options = {
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
export async function deleteFile(key) {
    const storageType = process.env.STORAGE_TYPE || 'local';
    if (storageType === 'cloud') {
        // Placeholder - implement with cloud SDK
        // await deleteFromCloud(key);
        return;
    }
    // Delete from local storage
    const keyDir = path.dirname(key);
    const filePath = path.join(UPLOAD_DIR, keyDir, path.basename(key));
    try {
        await fs.unlink(filePath);
    }
    catch (error) {
        // File may not exist, ignore error
    }
    // Delete thumbnail if exists
    const thumbnailKey = key.replace(/\.(\w+)$/, '-thumb.$1');
    const thumbnailPath = path.join(UPLOAD_DIR, keyDir, path.basename(thumbnailKey));
    try {
        await fs.unlink(thumbnailPath);
    }
    catch (error) {
        // Thumbnail may not exist, ignore error
    }
}
/**
 * Get file URL
 */
export function getFileUrl(key) {
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
export function getDefaultAvatarUrl() {
    return process.env.DEFAULT_AVATAR_URL || `${BASE_URL}/default-avatar.png`;
}
export default {
    uploadFile,
    uploadAvatar,
    deleteFile,
    getFileUrl,
    getDefaultAvatarUrl,
};
//# sourceMappingURL=storageService.js.map