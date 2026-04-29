import bcrypt from 'bcryptjs';
import { prisma } from '../db/client';
import { AppError } from '../errors/AppError';
import { DEFAULT_PRIVACY_SETTINGS } from '../types/privacy';
import * as storageService from './storageService';
/**
 * Get user by ID
 */
export async function getUserById(userId) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });
    if (!user)
        return null;
    return {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        name: user.name,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        website: user.website,
        location: user.location,
        phone: user.phone,
        phoneVerified: user.phoneVerified,
        status: user.status,
        privacySettings: user.privacySettings,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}
/**
 * Get user by email
 */
export async function getUserByEmail(email) {
    const user = await prisma.user.findUnique({
        where: { email },
    });
    if (!user)
        return null;
    return {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        name: user.name,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        website: user.website,
        location: user.location,
        phone: user.phone,
        phoneVerified: user.phoneVerified,
        status: user.status,
        privacySettings: user.privacySettings,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}
/**
 * Update user profile
 */
export async function updateUser(userId, data) {
    const user = await prisma.user.update({
        where: { id: userId },
        data: {
            ...data,
            updatedAt: new Date(),
        },
    });
    return {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        name: user.name,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        website: user.website,
        location: user.location,
        phone: user.phone,
        phoneVerified: user.phoneVerified,
        status: user.status,
        privacySettings: user.privacySettings,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}
/**
 * Update user avatar
 */
export async function updateAvatar(userId, avatarUrl) {
    // Clean up old avatar before updating
    const oldUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { avatarUrl: true },
    });
    if (oldUser?.avatarUrl) {
        try {
            await storageService.deleteFile(oldUser.avatarUrl);
        }
        catch (err) {
            // Ignore cleanup errors - file may already be gone
        }
    }
    return updateUser(userId, { avatarUrl });
}
/**
 * Delete user account
 */
export async function deleteUser(userId) {
    // Fetch avatar URL before deletion for cleanup
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { avatarUrl: true },
    });
    // Delete related records first due to foreign key constraints
    await prisma.$transaction([
        prisma.blockedUser.deleteMany({
            where: { OR: [{ userId }, { blockedUserId: userId }] },
        }),
        prisma.userDevice.deleteMany({
            where: { userId },
        }),
        prisma.connection.deleteMany({
            where: { userId },
        }),
        prisma.user.delete({
            where: { id: userId },
        }),
    ]);
    // Clean up avatar file after user deletion
    if (user?.avatarUrl) {
        try {
            await storageService.deleteFile(user.avatarUrl);
        }
        catch (err) {
            // Ignore cleanup errors
        }
    }
}
/**
 * Update privacy settings
 */
export async function updatePrivacySettings(userId, settings) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { privacySettings: true },
    });
    const currentSettings = user?.privacySettings || {
        ...DEFAULT_PRIVACY_SETTINGS,
    };
    const newSettings = { ...currentSettings, ...settings };
    await prisma.user.update({
        where: { id: userId },
        data: {
            privacySettings: newSettings,
            updatedAt: new Date(),
        },
    });
    return newSettings;
}
/**
 * Get privacy settings
 */
export async function getPrivacySettings(userId) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { privacySettings: true },
    });
    return (user?.privacySettings || {
        ...DEFAULT_PRIVACY_SETTINGS,
    });
}
/**
 * Change password
 */
/**
 * Verify user password (for account deletion confirmation)
 */
export async function verifyPassword(userId, password) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true },
    });
    if (!user) {
        throw new AppError('User not found', 'USER_NOT_FOUND', 404);
    }
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
        throw new AppError('Password is incorrect', 'INVALID_PASSWORD', 401);
    }
}
export async function changePassword(userId, currentPassword, newPassword) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true },
    });
    if (!user) {
        throw new AppError('User not found', 'USER_NOT_FOUND', 404);
    }
    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
        throw new AppError('Current password is incorrect', 'INVALID_PASSWORD', 401);
    }
    // Check new password is not the same as current password
    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
        throw new AppError('New password must be different from current password', 'SAME_PASSWORD', 400);
    }
    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
        where: { id: userId },
        data: {
            passwordHash: newPasswordHash,
            updatedAt: new Date(),
        },
    });
}
/**
 * Update phone number
 */
export async function updatePhone(userId, phone) {
    // Check if phone is already used by another user
    const existingUser = await prisma.user.findFirst({
        where: { phone, NOT: { id: userId } },
    });
    if (existingUser) {
        throw new AppError('Phone number is already in use', 'PHONE_EXISTS', 409);
    }
    const user = await prisma.user.update({
        where: { id: userId },
        data: {
            phone,
            phoneVerified: false,
            updatedAt: new Date(),
        },
    });
    return {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        name: user.name,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        website: user.website,
        location: user.location,
        phone: user.phone,
        phoneVerified: user.phoneVerified,
        status: user.status,
        privacySettings: user.privacySettings,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}
/**
 * Update email
 */
export async function updateEmail(userId, email) {
    // Check if email is already used by another user
    const existingUser = await prisma.user.findFirst({
        where: { email, NOT: { id: userId } },
    });
    if (existingUser) {
        throw new AppError('Email is already in use', 'EMAIL_EXISTS', 409);
    }
    const user = await prisma.user.update({
        where: { id: userId },
        data: {
            email,
            emailVerified: false,
            updatedAt: new Date(),
        },
    });
    return {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        name: user.name,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        website: user.website,
        location: user.location,
        phone: user.phone,
        phoneVerified: user.phoneVerified,
        status: user.status,
        privacySettings: user.privacySettings,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}
/**
 * Register or update device
 */
export async function registerDevice(userId, deviceInfo) {
    await prisma.userDevice.upsert({
        where: { deviceId: deviceInfo.deviceId },
        create: {
            userId,
            deviceId: deviceInfo.deviceId,
            deviceName: deviceInfo.deviceName,
            deviceType: deviceInfo.deviceType,
            osVersion: deviceInfo.osVersion,
            appVersion: deviceInfo.appVersion,
            pushToken: deviceInfo.pushToken,
            ipAddress: deviceInfo.ipAddress,
            lastActiveAt: new Date(),
            isCurrent: true,
        },
        update: {
            deviceName: deviceInfo.deviceName,
            deviceType: deviceInfo.deviceType,
            osVersion: deviceInfo.osVersion,
            appVersion: deviceInfo.appVersion,
            pushToken: deviceInfo.pushToken,
            ipAddress: deviceInfo.ipAddress,
            lastActiveAt: new Date(),
            isCurrent: true,
        },
    });
    // Mark other devices as not current
    await prisma.userDevice.updateMany({
        where: {
            userId,
            deviceId: { not: deviceInfo.deviceId },
        },
        data: { isCurrent: false },
    });
}
/**
 * Get user devices
 */
export async function getUserDevices(userId) {
    return prisma.userDevice.findMany({
        where: { userId },
        orderBy: { lastActiveAt: 'desc' },
    });
}
/**
 * Remove device
 */
export async function removeDevice(userId, deviceId) {
    await prisma.userDevice.deleteMany({
        where: { userId, deviceId },
    });
}
/**
 * Add user to block list
 */
export async function blockUser(userId, blockedUserId, reason) {
    if (userId === blockedUserId) {
        throw new AppError('Cannot block yourself', 'SELF_BLOCK', 400);
    }
    await prisma.blockedUser.create({
        data: {
            userId,
            blockedUserId,
            reason,
        },
    });
}
/**
 * Remove user from block list
 */
export async function unblockUser(userId, blockedUserId) {
    await prisma.blockedUser.deleteMany({
        where: { userId, blockedUserId },
    });
}
/**
 * Get blocked users
 */
export async function getBlockedUsers(userId) {
    return prisma.blockedUser.findMany({
        where: { userId },
        include: {
            blockedUser: {
                select: {
                    id: true,
                    name: true,
                    displayName: true,
                    avatarUrl: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
}
/**
 * Check if user is blocked
 */
export async function isUserBlocked(userId, blockedUserId) {
    const blocked = await prisma.blockedUser.findUnique({
        where: {
            userId_blockedUserId: {
                userId,
                blockedUserId,
            },
        },
    });
    return !!blocked;
}
export default {
    getUserById,
    getUserByEmail,
    updateUser,
    updateAvatar,
    deleteUser,
    updatePrivacySettings,
    getPrivacySettings,
    changePassword,
    updatePhone,
    updateEmail,
    registerDevice,
    getUserDevices,
    removeDevice,
    blockUser,
    unblockUser,
    getBlockedUsers,
    isUserBlocked,
};
//# sourceMappingURL=userService.js.map