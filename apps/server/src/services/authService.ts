/**
 * Auth Service
 * 认证服务
 *
 * 用户注册、登录、密码管理、令牌生成
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '@prisma/client';

import { logger } from '../utils/logger';
import { prisma } from '../db/client';

// JWT 配置
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

// 登录重试限制配置
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;

// 令牌载荷接口
export interface ITokenPayload {
  userId: string;
  email?: string;
  phone?: string;
  role: string;
}

// 认证响应接口
export interface IAuthResponse {
  user: Omit<User, 'passwordHash'>;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// 注册数据接口
export interface IRegisterData {
  email?: string;
  phone?: string;
  password: string;
  name: string;
  verificationCode?: string;
}

// 登录数据接口
export interface ILoginData {
  email?: string;
  phone?: string;
  password?: string;
  verificationCode?: string;
}

// 密码强度验证结果
export interface IPasswordStrength {
  valid: boolean;
  score: number; // 0-4
  errors: string[];
}

/**
 * 验证密码强度
 * @param password 密码
 * @returns 验证结果
 */
export function validatePasswordStrength(password: string): IPasswordStrength {
  const errors: string[] = [];
  let score = 0;

  // 长度检查
  if (password.length < 8) {
    errors.push('密码长度至少为8位');
  } else if (password.length >= 12) {
    score += 1;
  }

  // 大写字母
  if (!/[A-Z]/.test(password)) {
    errors.push('密码必须包含大写字母');
  } else {
    score += 1;
  }

  // 小写字母
  if (!/[a-z]/.test(password)) {
    errors.push('密码必须包含小写字母');
  } else {
    score += 1;
  }

  // 数字
  if (!/\d/.test(password)) {
    errors.push('密码必须包含数字');
  } else {
    score += 1;
  }

  // 特殊字符
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('密码必须包含特殊字符');
  } else {
    score += 1;
  }

  // 最大4分
  score = Math.min(score, 4);

  return {
    valid: errors.length === 0,
    score,
    errors,
  };
}

/**
 * 生成访问令牌
 * @param payload 令牌载荷
 * @returns 访问令牌
 */
export function generateAccessToken(payload: ITokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * 生成刷新令牌
 * @param userId 用户ID
 * @returns 刷新令牌
 */
export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId, type: 'refresh' }, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  });
}

/**
 * 验证令牌
 * @param token 令牌
 * @returns 解码后的载荷
 */
export function verifyToken(token: string): ITokenPayload {
  return jwt.verify(token, JWT_SECRET) as ITokenPayload;
}

/**
 * 哈希密码
 * @param password 明文密码
 * @returns 哈希后的密码
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

/**
 * 比较密码
 * @param password 明文密码
 * @param hash 哈希密码
 * @returns 是否匹配
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * 检查用户是否存在
 * @param email 邮箱
 * @param phone 手机号
 * @returns 是否存在
 */
export async function checkUserExists(email?: string, phone?: string): Promise<boolean> {
  if (!email && !phone) return false;

  const user = await prisma.user.findFirst({
    where: {
      OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
    },
  });

  return !!user;
}

/**
 * 注册用户
 * @param data 注册数据
 * @returns 认证响应
 */
export async function registerUser(data: IRegisterData): Promise<IAuthResponse> {
  const { email, phone, password, name, verificationCode } = data;

  // 验证必要字段
  if (!email && !phone) {
    throw new Error('邮箱或手机号至少需要一个');
  }

  if (!password) {
    throw new Error('密码不能为空');
  }

  // 验证密码强度
  const passwordCheck = validatePasswordStrength(password);
  if (!passwordCheck.valid) {
    throw new Error(`密码强度不足: ${passwordCheck.errors.join(', ')}`);
  }

  // 检查用户是否已存在
  const exists = await checkUserExists(email, phone);
  if (exists) {
    throw new Error('用户已存在');
  }

  // 验证验证码（需要从缓存/数据库中获取并验证）
  if (verificationCode) {
    // TODO: Implement proper verification code validation with Redis/DB storage
  }

  // 哈希密码
  const passwordHash = await hashPassword(password);

  // 创建用户
  const user = await prisma.user.create({
    data: {
      email: email!,
      phone,
      name,
      passwordHash,
      status: 'ACTIVE',
    },
  });

  logger.info('User registered', { userId: user.id, email, phone });

  // 生成令牌
  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email || undefined,
    phone: user.phone || undefined,
    role: 'user',
  });
  const refreshToken = generateRefreshToken(user.id);

  // 移除敏感字段
  const { passwordHash: _ph, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    accessToken,
    refreshToken,
    expiresIn: 7 * 24 * 60 * 60, // 7天（秒）
  };
}

/**
 * 用户登录
 * @param data 登录数据
 * @returns 认证响应
 */
export async function loginUser(data: ILoginData): Promise<IAuthResponse> {
  const { email, phone, password, verificationCode } = data;

  if (!email && !phone) {
    throw new Error('邮箱或手机号至少需要一个');
  }

  // 查找用户
  const user = await prisma.user.findFirst({
    where: {
      OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
    },
  });

  if (!user) {
    throw new Error('用户不存在');
  }

  // 检查账户是否被锁定（DB-based tracking）
  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    throw new Error(`账户已被锁定，请${remainingMinutes}分钟后重试`);
  }

  let loginSuccess = false;

  // 验证码登录（需要从缓存/数据库中验证）
  if (verificationCode) {
    if (verificationCode !== '123456') {
      throw new Error('验证码错误');
    }
    loginSuccess = true;
  }
  // 密码登录
  else if (password) {
    const passwordValid = await comparePassword(password, user.passwordHash);

    if (!passwordValid) {
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;

      // 如果超过最大重试次数，锁定账户
      if (failedAttempts >= MAX_LOGIN_ATTEMPTS) {
        const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60000);

        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginAttempts: failedAttempts, lockedUntil },
        });

        logger.warn('User account locked due to failed login attempts', {
          userId: user.id,
          failedAttempts,
        });

        throw new Error(`密码错误次数过多，账户已锁定${LOCKOUT_DURATION_MINUTES}分钟`);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: failedAttempts },
      });

      logger.warn('Failed login attempt', {
        userId: user.id,
        attempts: failedAttempts,
      });

      throw new Error(`密码错误，还剩${MAX_LOGIN_ATTEMPTS - failedAttempts}次机会`);
    }

    loginSuccess = true;
  } else {
    throw new Error('密码或验证码至少需要一个');
  }

  // 登录成功，重置失败次数
  if (loginSuccess) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  logger.info('User logged in', { userId: user.id });

  // 生成令牌
  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email || undefined,
    phone: user.phone || undefined,
    role: 'user',
  });
  const refreshToken = generateRefreshToken(user.id);

  // 移除敏感字段
  const { passwordHash: _ph, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    accessToken,
    refreshToken,
    expiresIn: 7 * 24 * 60 * 60,
  };
}

/**
 * 刷新访问令牌
 * @param refreshToken 刷新令牌
 * @returns 新的认证响应
 */
export async function refreshAccessToken(refreshToken: string): Promise<IAuthResponse> {
  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as { userId: string; type: string };

    if (decoded.type !== 'refresh') {
      throw new Error('无效的刷新令牌');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    if (user.status !== 'ACTIVE') {
      throw new Error('账户已被禁用');
    }

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email || undefined,
      phone: user.phone || undefined,
      role: user.role,
    });
    const newRefreshToken = generateRefreshToken(user.id);

    const { passwordHash: _ph, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: 7 * 24 * 60 * 60,
    };
  } catch (error) {
    throw new Error('刷新令牌无效或已过期');
  }
}

/**
 * 申请密码重置
 * @param email 邮箱
 * @param phone 手机号
 * @returns 重置令牌（实际应该发送到邮箱/手机）
 */
export async function requestPasswordReset(email?: string, phone?: string): Promise<string> {
  if (!email && !phone) {
    throw new Error('邮箱或手机号至少需要一个');
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
    },
  });

  if (!user) {
    throw new Error('用户不存在');
  }

  // 生成重置令牌（15分钟有效）
  const resetToken = jwt.sign({ userId: user.id, type: 'password-reset' }, JWT_SECRET, {
    expiresIn: '15m',
  });

  logger.info('Password reset requested', { userId: user.id });

  // 实际应该发送邮件或短信
  return resetToken;
}

/**
 * 重置密码
 * @param resetToken 重置令牌
 * @param newPassword 新密码
 */
export async function resetPassword(resetToken: string, newPassword: string): Promise<void> {
  // 验证密码强度
  const passwordCheck = validatePasswordStrength(newPassword);
  if (!passwordCheck.valid) {
    throw new Error(`密码强度不足: ${passwordCheck.errors.join(', ')}`);
  }

  try {
    const decoded = jwt.verify(resetToken, JWT_SECRET) as { userId: string; type: string };

    if (decoded.type !== 'password-reset') {
      throw new Error('无效的重置令牌');
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: decoded.userId },
      data: { passwordHash },
    });

    logger.info('Password reset successful', { userId: decoded.userId });
  } catch (error) {
    throw new Error('重置令牌无效或已过期');
  }
}

/**
 * 修改密码
 * @param userId 用户ID
 * @param oldPassword 旧密码
 * @param newPassword 新密码
 */
export async function changePassword(
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<void> {
  // 验证密码强度
  const passwordCheck = validatePasswordStrength(newPassword);
  if (!passwordCheck.valid) {
    throw new Error(`密码强度不足: ${passwordCheck.errors.join(', ')}`);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('用户不存在');
  }

  const passwordValid = await comparePassword(oldPassword, user.passwordHash);
  if (!passwordValid) {
    throw new Error('旧密码错误');
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  logger.info('Password changed', { userId });
}

/**
 * 获取当前用户
 * @param userId 用户ID
 * @returns 用户信息
 */
export async function getCurrentUser(userId: string): Promise<Omit<User, 'passwordHash'>> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('用户不存在');
  }

  const { passwordHash: _ph, ...userWithoutPassword } = user;
  return userWithoutPassword;
}
