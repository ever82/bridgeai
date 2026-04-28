/**
 * Auth Service
 * 认证服务
 *
 * 用户注册、登录、密码管理、令牌生成
 */
import { User } from '@prisma/client';
export interface ITokenPayload {
    userId: string;
    email?: string;
    phone?: string;
    role: string;
}
export interface IAuthResponse {
    user: Omit<User, 'passwordHash'>;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
export interface IRegisterData {
    email?: string;
    phone?: string;
    password: string;
    name: string;
    verificationCode?: string;
}
export interface ILoginData {
    email?: string;
    phone?: string;
    password?: string;
    verificationCode?: string;
}
export interface IPasswordStrength {
    valid: boolean;
    score: number;
    errors: string[];
}
/**
 * 验证密码强度
 * @param password 密码
 * @returns 验证结果
 */
export declare function validatePasswordStrength(password: string): IPasswordStrength;
/**
 * 生成并存储验证码（Redis TTL 5分钟）
 * @param identifier 手机号或邮箱
 * @returns 验证码
 */
export declare function generateVerificationCode(identifier: string): string;
/**
 * 验证验证码
 * @param identifier 手机号或邮箱
 * @param code 用户输入的验证码
 * @returns 是否验证通过
 */
export declare function verifyVerificationCode(identifier: string, code: string): Promise<boolean>;
/**
 * 生成访问令牌
 * @param payload 令牌载荷
 * @returns 访问令牌
 */
export declare function generateAccessToken(payload: ITokenPayload): string;
/**
 * 生成刷新令牌
 * @param userId 用户ID
 * @returns 刷新令牌
 */
export declare function generateRefreshToken(userId: string): string;
/**
 * 验证令牌
 * @param token 令牌
 * @returns 解码后的载荷
 */
export declare function verifyToken(token: string): ITokenPayload;
/**
 * 哈希密码
 * @param password 明文密码
 * @returns 哈希后的密码
 */
export declare function hashPassword(password: string): Promise<string>;
/**
 * 比较密码
 * @param password 明文密码
 * @param hash 哈希密码
 * @returns 是否匹配
 */
export declare function comparePassword(password: string, hash: string): Promise<boolean>;
/**
 * 检查用户是否存在
 * @param email 邮箱
 * @param phone 手机号
 * @returns 是否存在
 */
export declare function checkUserExists(email?: string, phone?: string): Promise<boolean>;
/**
 * 注册用户
 * @param data 注册数据
 * @returns 认证响应
 */
export declare function registerUser(data: IRegisterData): Promise<IAuthResponse>;
/**
 * 用户登录
 * @param data 登录数据
 * @returns 认证响应
 */
export declare function loginUser(data: ILoginData): Promise<IAuthResponse>;
/**
 * 刷新访问令牌
 * @param refreshToken 刷新令牌
 * @returns 新的认证响应
 */
export declare function refreshAccessToken(refreshToken: string): Promise<IAuthResponse>;
/**
 * 申请密码重置
 * @param email 邮箱
 * @param phone 手机号
 * @returns 重置令牌（实际应该发送到邮箱/手机）
 */
export declare function requestPasswordReset(email?: string, phone?: string): Promise<string>;
/**
 * 重置密码
 * @param resetToken 重置令牌
 * @param newPassword 新密码
 */
export declare function resetPassword(resetToken: string, newPassword: string): Promise<void>;
/**
 * 修改密码
 * @param userId 用户ID
 * @param oldPassword 旧密码
 * @param newPassword 新密码
 */
export declare function changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void>;
/**
 * 获取当前用户
 * @param userId 用户ID
 * @returns 用户信息
 */
export declare function getCurrentUser(userId: string): Promise<Omit<User, 'passwordHash'>>;
//# sourceMappingURL=authService.d.ts.map