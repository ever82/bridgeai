/**
 * 用户隐私设置类型
 */

// 资料可见性级别
export enum ProfileVisibility {
  PUBLIC = 'public',       // 公开 - 所有人可见
  FRIENDS = 'friends',     // 好友 - 仅好友可见
  PRIVATE = 'private',     // 私密 - 仅自己可见
}

// 在线状态可见性
export enum OnlineStatusVisibility {
  EVERYONE = 'everyone',   // 所有人可见
  FRIENDS = 'friends',     // 仅好友可见
  NOBODY = 'nobody',       // 对所有人隐身
}

// 联系方式可见性
export enum ContactVisibility {
  PUBLIC = 'public',       // 公开
  FRIENDS = 'friends',     // 仅好友
  HIDDEN = 'hidden',       // 隐藏
}

// 隐私设置结构
export interface PrivacySettings {
  profileVisibility: ProfileVisibility;      // 资料可见性
  onlineStatusVisibility: OnlineStatusVisibility; // 在线状态可见性
  phoneVisibility: ContactVisibility;        // 手机号可见性
  emailVisibility: ContactVisibility;        // 邮箱可见性
  allowSearchByPhone: boolean;               // 允许通过手机号搜索
  allowSearchByEmail: boolean;               // 允许通过邮箱搜索
  showLastSeen: boolean;                     // 显示最后在线时间
}

// 默认隐私设置
export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  profileVisibility: ProfileVisibility.PUBLIC,
  onlineStatusVisibility: OnlineStatusVisibility.EVERYONE,
  phoneVisibility: ContactVisibility.HIDDEN,
  emailVisibility: ContactVisibility.HIDDEN,
  allowSearchByPhone: false,
  allowSearchByEmail: false,
  showLastSeen: true,
};

// 安全设置类型
export interface SecuritySettings {
  twoFactorEnabled: boolean;
  lastPasswordChange: Date;
  passwordStrength: 'weak' | 'medium' | 'strong';
}

// API 响应类型
export interface PrivacySettingsResponse {
  profileVisibility: ProfileVisibility;
  onlineStatusVisibility: OnlineStatusVisibility;
  phoneVisibility: ContactVisibility;
  emailVisibility: ContactVisibility;
  allowSearchByPhone: boolean;
  allowSearchByEmail: boolean;
  showLastSeen: boolean;
}

// 修改密码请求
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// 绑定手机号请求
export interface BindPhoneRequest {
  phone: string;
  code: string; // 验证码
}

// 绑定邮箱请求
export interface BindEmailRequest {
  email: string;
  code: string; // 验证码
}

// 发送验证码请求
export interface SendVerificationCodeRequest {
  type: 'phone' | 'email';
  target: string; // 手机号或邮箱
}
