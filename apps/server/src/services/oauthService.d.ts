/**
 * OAuth Service
 * 第三方登录服务
 *
 * 支持微信、Google OAuth 登录
 */
import { IAuthResponse } from './authService';
export type OAuthProvider = 'wechat' | 'google';
export interface IOAuthUserData {
    provider: OAuthProvider;
    providerUserId: string;
    email?: string;
    phone?: string;
    name: string;
    avatar?: string;
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
}
/**
 * 获取 OAuth 授权 URL
 * @param provider 提供商
 * @param state 状态参数
 * @returns 授权 URL
 */
export declare function getOAuthAuthorizationUrl(provider: OAuthProvider, state?: string): string;
/**
 * 交换授权码获取访问令牌
 * @param provider 提供商
 * @param code 授权码
 * @returns 令牌信息
 */
export declare function exchangeCodeForToken(provider: OAuthProvider, code: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
}>;
/**
 * 获取用户信息
 * @param provider 提供商
 * @param accessToken 访问令牌
 * @returns 用户信息
 */
export declare function getOAuthUserInfo(provider: OAuthProvider, accessToken: string): Promise<{
    id: string;
    email?: string;
    name: string;
    avatar?: string;
}>;
/**
 * 处理 OAuth 回调
 * @param provider 提供商
 * @param code 授权码
 * @returns 认证响应
 */
export declare function handleOAuthCallback(provider: OAuthProvider, code: string): Promise<IAuthResponse>;
/**
 * 绑定 OAuth 账户
 * @param userId 用户ID
 * @param provider 提供商
 * @param code 授权码
 */
export declare function bindOAuthAccount(userId: string, provider: OAuthProvider, code: string): Promise<void>;
/**
 * 解绑 OAuth 账户
 * @param userId 用户ID
 * @param provider 提供商
 */
export declare function unbindOAuthAccount(userId: string, provider: OAuthProvider): Promise<void>;
/**
 * 获取用户的 OAuth 绑定列表
 * @param userId 用户ID
 * @returns OAuth 绑定列表
 */
export declare function getUserOAuthConnections(userId: string): Promise<Array<{
    provider: OAuthProvider;
    connectedAt: Date;
}>>;
//# sourceMappingURL=oauthService.d.ts.map