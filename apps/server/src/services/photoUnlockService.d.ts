/**
 * Photo Unlock Service
 * Handles photo unlocking after successful points payment
 * Manages unlock tokens, access control, and photo URL generation
 */
import { PrismaClient } from '@prisma/client';
export interface UnlockToken {
    id: string;
    userId: string;
    photoId: string;
    token: string;
    expiresAt: Date;
    createdAt: Date;
    usedCount: number;
}
export interface PhotoUnlockRequest {
    userId: string;
    photoId: string;
    photographerUserId: string;
}
export interface PhotoUnlockResult {
    success: boolean;
    photoUrl?: string;
    unlockToken?: string;
    expiresAt?: string;
    error?: string;
}
export interface PhotoAccessResult {
    hasAccess: boolean;
    unlockToken?: string;
    paymentRequired: boolean;
    cost?: number;
}
export declare class PhotoUnlockService {
    private prisma;
    constructor(prismaClient?: PrismaClient);
    /**
     * Check if user has access to view a photo
     */
    checkPhotoAccess(userId: string, photoId: string): Promise<PhotoAccessResult>;
    /**
     * Unlock a photo after successful payment
     */
    unlockPhoto(request: PhotoUnlockRequest): Promise<PhotoUnlockResult>;
    /**
     * Validate an unlock token
     */
    validateToken(token: string): Promise<{
        valid: boolean;
        photoId?: string;
        userId?: string;
    }>;
    /**
     * Generate a signed URL for a photo with access control
     */
    private generatePhotoUrl;
    /**
     * Clean up expired unlock tokens
     */
    cleanupExpiredTokens(): Promise<{
        cleaned: number;
    }>;
    /**
     * Get list of photos a user has unlocked
     */
    getUnlockedPhotos(userId: string): Promise<any[]>;
}
export declare const photoUnlockService: PhotoUnlockService;
//# sourceMappingURL=photoUnlockService.d.ts.map