export interface UploadOptions {
    maxSize?: number;
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
/**
 * Upload file
 */
export declare function uploadFile(file: FileInfo, options?: UploadOptions, prefix?: string): Promise<UploadResult>;
/**
 * Upload avatar
 */
export declare function uploadAvatar(file: FileInfo, userId: string): Promise<UploadResult>;
/**
 * Delete file
 */
export declare function deleteFile(key: string): Promise<void>;
/**
 * Get file URL
 */
export declare function getFileUrl(key: string): string;
/**
 * Get default avatar URL
 */
export declare function getDefaultAvatarUrl(): string;
declare const _default: {
    uploadFile: typeof uploadFile;
    uploadAvatar: typeof uploadAvatar;
    deleteFile: typeof deleteFile;
    getFileUrl: typeof getFileUrl;
    getDefaultAvatarUrl: typeof getDefaultAvatarUrl;
};
export default _default;
//# sourceMappingURL=storageService.d.ts.map