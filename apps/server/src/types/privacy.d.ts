/**
 * 用户隐私设置类型
 */
export declare enum ProfileVisibility {
    PUBLIC = "public",// 公开 - 所有人可见
    FRIENDS = "friends",// 好友 - 仅好友可见
    PRIVATE = "private"
}
export declare enum OnlineStatusVisibility {
    EVERYONE = "everyone",// 所有人可见
    FRIENDS = "friends",// 仅好友可见
    NOBODY = "nobody"
}
export declare enum ContactVisibility {
    PUBLIC = "public",// 公开
    FRIENDS = "friends",// 仅好友
    HIDDEN = "hidden"
}
export interface PrivacySettings {
    profileVisibility: ProfileVisibility;
    onlineStatusVisibility: OnlineStatusVisibility;
    phoneVisibility: ContactVisibility;
    emailVisibility: ContactVisibility;
    allowSearchByPhone: boolean;
    allowSearchByEmail: boolean;
    showLastSeen: boolean;
}
export declare const DEFAULT_PRIVACY_SETTINGS: PrivacySettings;
export interface SecuritySettings {
    twoFactorEnabled: boolean;
    lastPasswordChange: Date;
    passwordStrength: 'weak' | 'medium' | 'strong';
}
export interface PrivacySettingsResponse {
    profileVisibility: ProfileVisibility;
    onlineStatusVisibility: OnlineStatusVisibility;
    phoneVisibility: ContactVisibility;
    emailVisibility: ContactVisibility;
    allowSearchByPhone: boolean;
    allowSearchByEmail: boolean;
    showLastSeen: boolean;
}
export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
}
export interface BindPhoneRequest {
    phone: string;
    code: string;
}
export interface BindEmailRequest {
    email: string;
    code: string;
}
export interface SendVerificationCodeRequest {
    type: 'phone' | 'email';
    target: string;
}
//# sourceMappingURL=privacy.d.ts.map