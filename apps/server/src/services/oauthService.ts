/**
 * OAuth Service
 * 第三方登录服务
 *
 * 支持微信、Google OAuth 登录
 */

import { PrismaClient, User } from '@prisma/client';
import { logger } from '../utils/logger';
import { generateAccessToken, generateRefreshToken, IAuthResponse } from './authService';

const prisma = new PrismaClient();

// OAuth 提供商类型
export type OAuthProvider = 'wechat' | 'google';

// OAuth 用户数据
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

// OAuth 配置
interface IOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
}

// OAuth 配置映射
const oauthConfigs: Record<OAuthProvider, IOAuthConfig> = {
  wechat: {
    clientId: process.env.WECHAT_APP_ID || '',
    clientSecret: process.env.WECHAT_APP_SECRET || '',
    redirectUri: process.env.WECHAT_REDIRECT_URI || 'http://localhost:3000/api/v1/auth/oauth/wechat/callback',
    authorizeUrl: 'https://open.weixin.qq.com/connect/oauth2/authorize',
    tokenUrl: 'https://api.weixin.qq.com/sns/oauth2/access_token',
    userInfoUrl: 'https://api.weixin.qq.com/sns/userinfo',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/v1/auth/oauth/google/callback',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
  },
};

/**
 * 获取 OAuth 授权 URL
 * @param provider 提供商
 * @param state 状态参数
 * @returns 授权 URL
 */
export function getOAuthAuthorizationUrl(provider: OAuthProvider, state?: string): string {
  const config = oauthConfigs[provider];

  if (!config.clientId) {
    throw new Error(`${provider} OAuth 未配置`);
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: provider === 'google' ? 'openid email profile' : 'snsapi_userinfo',
  });

  if (state) {
    params.append('state', state);
  }

  // Google 需要特殊处理
  if (provider === 'google') {
    params.append('access_type', 'offline');
    params.append('prompt', 'consent');
  }

  return `${config.authorizeUrl}?${params.toString()}`;
}

/**
 * 交换授权码获取访问令牌
 * @param provider 提供商
 * @param code 授权码
 * @returns 令牌信息
 */
export async function exchangeCodeForToken(
  provider: OAuthProvider,
  code: string
): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}> {
  const config = oauthConfigs[provider];

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: config.redirectUri,
  });

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OAuth token exchange failed: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

/**
 * 获取用户信息
 * @param provider 提供商
 * @param accessToken 访问令牌
 * @returns 用户信息
 */
export async function getOAuthUserInfo(
  provider: OAuthProvider,
  accessToken: string
): Promise<{
  id: string;
  email?: string;
  name: string;
  avatar?: string;
}> {
  const config = oauthConfigs[provider];

  const response = await fetch(config.userInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get user info: ${error}`);
  }

  const data = await response.json();

  if (provider === 'wechat') {
    return {
      id: data.openid,
      name: data.nickname,
      avatar: data.headimgurl,
    };
  }

  // Google
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    avatar: data.picture,
  };
}

/**
 * 处理 OAuth 回调
 * @param provider 提供商
 * @param code 授权码
 * @returns 认证响应
 */
export async function handleOAuthCallback(
  provider: OAuthProvider,
  code: string
): Promise<IAuthResponse> {
  // 1. 交换授权码获取令牌
  const tokenData = await exchangeCodeForToken(provider, code);

  // 2. 获取用户信息
  const userInfo = await getOAuthUserInfo(provider, tokenData.accessToken);

  // 3. 查找或创建用户
  let user = await findUserByOAuth(provider, userInfo.id);

  if (!user) {
    // 创建新用户
    user = await createOAuthUser(provider, {
      provider,
      providerUserId: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
      avatar: userInfo.avatar,
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      expiresAt: tokenData.expiresIn
        ? new Date(Date.now() + tokenData.expiresIn * 1000)
        : undefined,
    });

    logger.info('New user created via OAuth', {
      userId: user.id,
      provider,
    });
  } else {
    // 更新 OAuth 信息
    await updateOAuthConnection(user.id, provider, {
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      expiresAt: tokenData.expiresIn
        ? new Date(Date.now() + tokenData.expiresIn * 1000)
        : undefined,
    });

    logger.info('User logged in via OAuth', {
      userId: user.id,
      provider,
    });
  }

  // 4. 生成令牌
  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email || undefined,
    phone: user.phone || undefined,
    role: user.role,
  });
  const refreshToken = generateRefreshToken(user.id);

  // 5. 返回认证响应
  const { passwordHash: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    accessToken,
    refreshToken,
    expiresIn: 7 * 24 * 60 * 60,
  };
}

/**
 * 通过 OAuth 查找用户
 * @param provider 提供商
 * @param providerUserId 提供商用户ID
 * @returns 用户或 null
 */
async function findUserByOAuth(
  provider: OAuthProvider,
  providerUserId: string
): Promise<User | null> {
  const connection = await prisma.oAuthConnection.findFirst({
    where: {
      provider,
      providerUserId,
    },
    include: {
      user: true,
    },
  });

  return connection?.user || null;
}

/**
 * 创建 OAuth 用户
 * @param provider 提供商
 * @param data OAuth 用户数据
 * @returns 创建的用户
 */
async function createOAuthUser(provider: OAuthProvider, data: IOAuthUserData): Promise<User> {
  // 创建用户
  const user = await prisma.user.create({
    data: {
      email: data.email,
      phone: data.phone,
      name: data.name,
      avatar: data.avatar,
      role: 'user',
      status: 'active',
      passwordHash: '', // OAuth 用户不需要密码
    },
  });

  // 创建 OAuth 连接
  await prisma.oAuthConnection.create({
    data: {
      userId: user.id,
      provider,
      providerUserId: data.providerUserId,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt,
    },
  });

  return user;
}

/**
 * 更新 OAuth 连接
 * @param userId 用户ID
 * @param provider 提供商
 * @param data 更新数据
 */
async function updateOAuthConnection(
  userId: string,
  provider: OAuthProvider,
  data: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
  }
): Promise<void> {
  await prisma.oAuthConnection.updateMany({
    where: {
      userId,
      provider,
    },
    data: {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: data.expiresAt,
      updatedAt: new Date(),
    },
  });
}

/**
 * 绑定 OAuth 账户
 * @param userId 用户ID
 * @param provider 提供商
 * @param code 授权码
 */
export async function bindOAuthAccount(
  userId: string,
  provider: OAuthProvider,
  code: string
): Promise<void> {
  // 获取 OAuth 用户信息
  const tokenData = await exchangeCodeForToken(provider, code);
  const userInfo = await getOAuthUserInfo(provider, tokenData.accessToken);

  // 检查是否已绑定
  const existing = await prisma.oAuthConnection.findFirst({
    where: {
      provider,
      providerUserId: userInfo.id,
    },
  });

  if (existing) {
    throw new Error('该账号已绑定到其他用户');
  }

  // 创建 OAuth 连接
  await prisma.oAuthConnection.create({
    data: {
      userId,
      provider,
      providerUserId: userInfo.id,
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      expiresAt: tokenData.expiresIn
        ? new Date(Date.now() + tokenData.expiresIn * 1000)
        : undefined,
    },
  });

  logger.info('OAuth account bound', { userId, provider });
}

/**
 * 解绑 OAuth 账户
 * @param userId 用户ID
 * @param provider 提供商
 */
export async function unbindOAuthAccount(userId: string, provider: OAuthProvider): Promise<void> {
  await prisma.oAuthConnection.deleteMany({
    where: {
      userId,
      provider,
    },
  });

  logger.info('OAuth account unbound', { userId, provider });
}

/**
 * 获取用户的 OAuth 绑定列表
 * @param userId 用户ID
 * @returns OAuth 绑定列表
 */
export async function getUserOAuthConnections(
  userId: string
): Promise<Array<{ provider: OAuthProvider; connectedAt: Date }>> {
  const connections = await prisma.oAuthConnection.findMany({
    where: { userId },
    select: {
      provider: true,
      createdAt: true,
    },
  });

  return connections.map((c) => ({
    provider: c.provider as OAuthProvider,
    connectedAt: c.createdAt,
  }));
}
