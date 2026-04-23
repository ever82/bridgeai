import bcrypt from 'bcryptjs';

import { prisma } from '../db/client';
import { AppError } from '../errors/AppError';
import { PrivacySettings, DEFAULT_PRIVACY_SETTINGS } from '../types/privacy';

// Re-export PrivacySettings for convenience
export type { PrivacySettings } from '../types/privacy';

import * as storageService from './storageService';

export interface UserProfile {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  website: string | null;
  location: string | null;
  phone: string | null;
  phoneVerified: boolean;
  status: string;
  privacySettings: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateUserData {
  name?: string;
  displayName?: string;
  bio?: string;
  website?: string;
  location?: string;
  avatarUrl?: string;
}

export interface DeviceInfo {
  deviceId: string;
  deviceName?: string;
  deviceType?: string;
  osVersion?: string;
  appVersion?: string;
  pushToken?: string;
  ipAddress?: string;
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<UserProfile | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) return null;

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
    privacySettings: user.privacySettings as Record<string, any> | null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<UserProfile | null> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) return null;

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
    privacySettings: user.privacySettings as Record<string, any> | null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Update user profile
 */
export async function updateUser(userId: string, data: UpdateUserData): Promise<UserProfile> {
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
    privacySettings: user.privacySettings as Record<string, any> | null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Update user avatar
 */
export async function updateAvatar(userId: string, avatarUrl: string): Promise<UserProfile> {
  // Clean up old avatar before updating
  const oldUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarUrl: true },
  });
  if (oldUser?.avatarUrl) {
    try {
      await storageService.deleteFile(oldUser.avatarUrl);
    } catch (err) {
      // Ignore cleanup errors - file may already be gone
    }
  }
  return updateUser(userId, { avatarUrl });
}

/**
 * Delete user account
 */
export async function deleteUser(userId: string): Promise<void> {
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
    } catch (err) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Update privacy settings
 */
export async function updatePrivacySettings(
  userId: string,
  settings: Partial<PrivacySettings>
): Promise<PrivacySettings> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { privacySettings: true },
  });

  const currentSettings = (user?.privacySettings as unknown as PrivacySettings) || {
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
export async function getPrivacySettings(userId: string): Promise<PrivacySettings> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { privacySettings: true },
  });

  return (
    (user?.privacySettings as unknown as PrivacySettings) || {
      ...DEFAULT_PRIVACY_SETTINGS,
    }
  );
}

/**
 * Change password
 */
/**
 * Verify user password (for account deletion confirmation)
 */
export async function verifyPassword(userId: string, password: string): Promise<void> {
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

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
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

  // Hash new password
  const newPasswordHash = await bcrypt.hash(newPassword, 10);

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
export async function updatePhone(userId: string, phone: string): Promise<UserProfile> {
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
    privacySettings: user.privacySettings as Record<string, any> | null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Update email
 */
export async function updateEmail(userId: string, email: string): Promise<UserProfile> {
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
    privacySettings: user.privacySettings as Record<string, any> | null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Register or update device
 */
export async function registerDevice(userId: string, deviceInfo: DeviceInfo): Promise<void> {
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
export async function getUserDevices(userId: string) {
  return prisma.userDevice.findMany({
    where: { userId },
    orderBy: { lastActiveAt: 'desc' },
  });
}

/**
 * Remove device
 */
export async function removeDevice(userId: string, deviceId: string): Promise<void> {
  await prisma.userDevice.deleteMany({
    where: { userId, deviceId },
  });
}

/**
 * Add user to block list
 */
export async function blockUser(
  userId: string,
  blockedUserId: string,
  reason?: string
): Promise<void> {
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
export async function unblockUser(userId: string, blockedUserId: string): Promise<void> {
  await prisma.blockedUser.deleteMany({
    where: { userId, blockedUserId },
  });
}

/**
 * Get blocked users
 */
export async function getBlockedUsers(userId: string) {
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
export async function isUserBlocked(userId: string, blockedUserId: string): Promise<boolean> {
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
