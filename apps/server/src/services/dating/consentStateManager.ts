/**
 * Consent State Manager
 * 双向同意状态管理服务
 *
 * 管理同意状态的生命周期，包括：
 * - 创建同意记录
 * - 更新用户决策
 * - 检查过期状态
 * - 计算最终结果
 */

import {
  MutualConsent,
  UserConsent,
  ConsentStatus,
  ReferralResult,
  createMutualConsent,
  updateUserDecision,
  expireConsent,
  isBothDecided,
  isMutualAccept,
  ConsentExpiredError,
  ConsentChangeLimitError,
} from '../../models/MutualConsent';

// 模拟数据存储（实际项目中应使用数据库）
const consentStore = new Map<string, MutualConsent>();

export interface ConsentState {
  consent: MutualConsent;
  canChange: boolean;
  timeRemaining: number;  // 剩余时间（毫秒）
  isExpired: boolean;
}

/**
 * 创建新的双向同意记录
 */
export async function createConsent(
  referralId: string,
  userAId: string,
  userBId: string,
  timeoutHours?: number
): Promise<MutualConsent> {
  const consent = createMutualConsent(referralId, userAId, userBId, {
    defaultTimeoutHours: timeoutHours,
  });

  consentStore.set(consent.id, consent);

  // TODO: 发送决策邀请通知给双方用户
  // await notifyUsersOfDecisionRequest(userAId, userBId, consent);

  return consent;
}

/**
 * 获取同意状态
 */
export async function getConsent(consentId: string): Promise<MutualConsent | null> {
  const consent = consentStore.get(consentId);
  if (!consent) return null;

  // 检查是否过期
  const now = new Date();
  if (now > consent.expiresAt && consent.result !== ReferralResult.EXPIRED) {
    const expiredConsent = expireConsent(consent);
    consentStore.set(consentId, expiredConsent);
    return expiredConsent;
  }

  return consent;
}

/**
 * 获取引荐的同意记录
 */
export async function getConsentByReferral(referralId: string): Promise<MutualConsent | null> {
  for (const consent of consentStore.values()) {
    if (consent.referralId === referralId) {
      return getConsent(consent.id);
    }
  }
  return null;
}

/**
 * 记录用户决策
 */
export async function recordDecision(
  consentId: string,
  userId: string,
  decision: 'accept' | 'reject',
  reason?: string
): Promise<MutualConsent> {
  const consent = await getConsent(consentId);
  if (!consent) {
    throw new ConsentNotFoundError('Consent not found');
  }

  if (consent.result === ReferralResult.EXPIRED) {
    throw new ConsentExpiredError('Consent has expired');
  }

  try {
    const updatedConsent = updateUserDecision(consent, userId, decision, reason);
    consentStore.set(consentId, updatedConsent);

    // TODO: 通知对方用户已决策（不透露具体选择）
    // await notifyOtherUserDecided(consent, userId);

    // 如果双方都已完成决策，触发结果处理
    if (isBothDecided(updatedConsent)) {
      // await processReferralResult(updatedConsent);
    }

    return updatedConsent;
  } catch (error) {
    if (error instanceof ConsentExpiredError) {
      throw error;
    }
    if (error instanceof ConsentChangeLimitError) {
      throw error;
    }
    throw new ConsentUpdateError('Failed to update consent decision');
  }
}

/**
 * 获取用户决策状态
 */
export async function getUserConsentState(
  consentId: string,
  userId: string
): Promise<ConsentState | null> {
  const consent = await getConsent(consentId);
  if (!consent) return null;

  const now = new Date();
  const isExpired = now > consent.expiresAt;
  const timeRemaining = Math.max(0, consent.expiresAt.getTime() - now.getTime());

  const userConsent = userId === consent.userAId
    ? consent.userAConsent
    : consent.userBConsent;

  // 检查是否可以变更决策
  const canChange = !isExpired &&
    userConsent.status !== ConsentStatus.PENDING &&
    userConsent.changedCount < 3;  // 最多变更3次

  return {
    consent,
    canChange,
    timeRemaining,
    isExpired,
  };
}

/**
 * 获取对方用户的决策状态（不透露具体选择）
 */
export async function getOtherUserDecisionStatus(
  consentId: string,
  userId: string
): Promise<'pending' | 'decided'> {
  const consent = await getConsent(consentId);
  if (!consent) throw new ConsentNotFoundError('Consent not found');

  const otherUserId = userId === consent.userAId ? consent.userBId : consent.userAId;
  const otherConsent = userId === consent.userAId
    ? consent.userBConsent
    : consent.userAConsent;

  return otherConsent.status === ConsentStatus.PENDING ? 'pending' : 'decided';
}

/**
 * 检查是否需要发送超时提醒
 */
export async function checkAndSendTimeoutReminders(): Promise<void> {
  const now = new Date();
  const reminderThresholds = [24, 4];  // 到期前24小时和4小时

  for (const consent of consentStore.values()) {
    if (consent.result !== ReferralResult.PENDING) continue;

    const hoursUntilExpiry = (consent.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

    for (const threshold of reminderThresholds) {
      // 如果在提醒时间窗口内（±5分钟）
      if (hoursUntilExpiry <= threshold && hoursUntilExpiry > threshold - 0.08) {
        // TODO: 发送超时提醒
        // await sendTimeoutReminder(consent, threshold);
        break;
      }
    }
  }
}

/**
 * 处理过期同意记录
 */
export async function processExpiredConsents(): Promise<number> {
  const now = new Date();
  let expiredCount = 0;

  for (const [id, consent] of consentStore.entries()) {
    if (consent.result === ReferralResult.PENDING && now > consent.expiresAt) {
      const expiredConsent = expireConsent(consent);
      consentStore.set(id, expiredConsent);
      expiredCount++;

      // TODO: 发送过期通知
      // await notifyConsentExpired(expiredConsent);
    }
  }

  return expiredCount;
}

/**
 * 获取等待决策的同意记录
 */
export async function getPendingConsents(userId: string): Promise<MutualConsent[]> {
  const pending: MutualConsent[] = [];

  for (const consent of consentStore.values()) {
    if (consent.userAId !== userId && consent.userBId !== userId) continue;

    const userConsent = userId === consent.userAId
      ? consent.userAConsent
      : consent.userBConsent;

    if (userConsent.status === ConsentStatus.PENDING) {
      const updatedConsent = await getConsent(consent.id);
      if (updatedConsent && updatedConsent.result !== ReferralResult.EXPIRED) {
        pending.push(updatedConsent);
      }
    }
  }

  // 按过期时间排序
  return pending.sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime());
}

/**
 * 获取用户的所有同意记录
 */
export async function getUserConsents(userId: string): Promise<MutualConsent[]> {
  const consents: MutualConsent[] = [];

  for (const consent of consentStore.values()) {
    if (consent.userAId === userId || consent.userBId === userId) {
      const updatedConsent = await getConsent(consent.id);
      if (updatedConsent) {
        consents.push(updatedConsent);
      }
    }
  }

  // 按创建时间倒序
  return consents.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * 取消同意记录
 */
export async function cancelConsent(consentId: string, reason?: string): Promise<void> {
  const consent = await getConsent(consentId);
  if (!consent) {
    throw new ConsentNotFoundError('Consent not found');
  }

  // TODO: 实现取消逻辑
  // - 从存储中删除或标记为取消
  // - 发送取消通知

  consentStore.delete(consentId);
}

/**
 * 错误类
 */
export class ConsentNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConsentNotFoundError';
  }
}

export class ConsentUpdateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConsentUpdateError';
  }
}

export default {
  createConsent,
  getConsent,
  getConsentByReferral,
  recordDecision,
  getUserConsentState,
  getOtherUserDecisionStatus,
  checkAndSendTimeoutReminders,
  processExpiredConsents,
  getPendingConsents,
  getUserConsents,
  cancelConsent,
};
