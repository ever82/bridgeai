/**
 * User Service
 * 用户服务
 *
 * 用户资料管理、头像上传等
 */

import { PrismaClient, User } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// 可更新的用户字段
export interface IUpdateUserData {
  name?: string;
  phone?: string;
  email?: string;
}

// 用户资料响应（不包含敏感信息）
export interface IUserProfile {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  phone: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 获取用户资料
 * @param userId 用户ID
 * @returns 用户资料
 */
export async function getUserProfile(userId: string): Promise<IUserProfile> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('用户不存在');
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    phone: user.phone,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * 更新用户资料
 * @param userId 用户ID
 * @param data 更新数据
 * @returns 更新后的用户资料
 */
export async function updateUserProfile(
  userId: string,
  data: IUpdateUserData
): Promise<IUserProfile> {
  // 检查用户是否存在
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!existingUser) {
    throw new Error('用户不存在');
  }

  // 如果更新邮箱，检查是否已被使用
  if (data.email && data.email !== existingUser.email) {
    const emailExists = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (emailExists) {
      throw new Error('邮箱已被使用');
    }
  }

  // 如果更新手机号，检查是否已被使用
  if (data.phone && data.phone !== existingUser.phone) {
    const phoneExists = await prisma.user.findFirst({
      where: { phone: data.phone },
    });
    if (phoneExists) {
      throw new Error('手机号已被使用');
    }
  }

  // 更新用户
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.email !== undefined && { email: data.email }),
    },
  });

  logger.info('User profile updated', { userId });

  return {
    id: updatedUser.id,
    email: updatedUser.email,
    name: updatedUser.name,
    avatarUrl: updatedUser.avatarUrl,
    phone: updatedUser.phone,
    status: updatedUser.status,
    createdAt: updatedUser.createdAt,
    updatedAt: updatedUser.updatedAt,
  };
}

/**
 * 更新用户头像
 * @param userId 用户ID
 * @param avatarUrl 头像URL
 * @returns 更新后的用户资料
 */
export async function updateUserAvatar(
  userId: string,
  avatarUrl: string
): Promise<IUserProfile> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('用户不存在');
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl },
  });

  logger.info('User avatar updated', { userId, avatarUrl });

  return {
    id: updatedUser.id,
    email: updatedUser.email,
    name: updatedUser.name,
    avatarUrl: updatedUser.avatarUrl,
    phone: updatedUser.phone,
    status: updatedUser.status,
    createdAt: updatedUser.createdAt,
    updatedAt: updatedUser.updatedAt,
  };
}

/**
 * 删除用户账号
 * @param userId 用户ID
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('用户不存在');
  }

  // 软删除：将状态改为 INACTIVE
  await prisma.user.update({
    where: { id: userId },
    data: { status: 'INACTIVE' },
  });

  logger.info('User account deleted (soft delete)', { userId });
}

/**
 * 硬删除用户账号（谨慎使用）
 * @param userId 用户ID
 */
export async function permanentlyDeleteUser(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('用户不存在');
  }

  // 硬删除：从数据库中删除用户
  await prisma.user.delete({
    where: { id: userId },
  });

  logger.info('User account permanently deleted', { userId });
}
