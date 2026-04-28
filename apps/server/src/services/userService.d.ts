import { PrivacySettings } from '../types/privacy';
export type { PrivacySettings } from '../types/privacy';
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
export declare function getUserById(userId: string): Promise<UserProfile | null>;
/**
 * Get user by email
 */
export declare function getUserByEmail(email: string): Promise<UserProfile | null>;
/**
 * Update user profile
 */
export declare function updateUser(userId: string, data: UpdateUserData): Promise<UserProfile>;
/**
 * Update user avatar
 */
export declare function updateAvatar(userId: string, avatarUrl: string): Promise<UserProfile>;
/**
 * Delete user account
 */
export declare function deleteUser(userId: string): Promise<void>;
/**
 * Update privacy settings
 */
export declare function updatePrivacySettings(userId: string, settings: Partial<PrivacySettings>): Promise<PrivacySettings>;
/**
 * Get privacy settings
 */
export declare function getPrivacySettings(userId: string): Promise<PrivacySettings>;
/**
 * Change password
 */
/**
 * Verify user password (for account deletion confirmation)
 */
export declare function verifyPassword(userId: string, password: string): Promise<void>;
export declare function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
/**
 * Update phone number
 */
export declare function updatePhone(userId: string, phone: string): Promise<UserProfile>;
/**
 * Update email
 */
export declare function updateEmail(userId: string, email: string): Promise<UserProfile>;
/**
 * Register or update device
 */
export declare function registerDevice(userId: string, deviceInfo: DeviceInfo): Promise<void>;
/**
 * Get user devices
 */
export declare function getUserDevices(userId: string): Promise<{
    id: string;
    userId: string;
    createdAt: Date;
    deviceName: string | null;
    osVersion: string | null;
    appVersion: string | null;
    lastActiveAt: Date;
    deviceId: string;
    pushToken: string | null;
    ipAddress: string | null;
    deviceType: string | null;
    isCurrent: boolean;
}[]>;
/**
 * Remove device
 */
export declare function removeDevice(userId: string, deviceId: string): Promise<void>;
/**
 * Add user to block list
 */
export declare function blockUser(userId: string, blockedUserId: string, reason?: string): Promise<void>;
/**
 * Remove user from block list
 */
export declare function unblockUser(userId: string, blockedUserId: string): Promise<void>;
/**
 * Get blocked users
 */
export declare function getBlockedUsers(userId: string): Promise<({
    blockedUser: {
        id: string;
        name: string | null;
        displayName: string | null;
        avatarUrl: string | null;
    };
} & {
    id: string;
    userId: string;
    createdAt: Date;
    reason: string | null;
    blockedUserId: string;
})[]>;
/**
 * Check if user is blocked
 */
export declare function isUserBlocked(userId: string, blockedUserId: string): Promise<boolean>;
declare const _default: {
    getUserById: typeof getUserById;
    getUserByEmail: typeof getUserByEmail;
    updateUser: typeof updateUser;
    updateAvatar: typeof updateAvatar;
    deleteUser: typeof deleteUser;
    updatePrivacySettings: typeof updatePrivacySettings;
    getPrivacySettings: typeof getPrivacySettings;
    changePassword: typeof changePassword;
    updatePhone: typeof updatePhone;
    updateEmail: typeof updateEmail;
    registerDevice: typeof registerDevice;
    getUserDevices: typeof getUserDevices;
    removeDevice: typeof removeDevice;
    blockUser: typeof blockUser;
    unblockUser: typeof unblockUser;
    getBlockedUsers: typeof getBlockedUsers;
    isUserBlocked: typeof isUserBlocked;
};
export default _default;
//# sourceMappingURL=userService.d.ts.map