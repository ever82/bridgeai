/**
 * Referral Service
 * 引荐服务
 *
 * 处理引荐的核心业务流程：
 * - 创建引荐记录
 * - 处理同意流程
 * - 管理引荐生命周期
 */

import {
  ReferralRecord,
  ReferralType,
  ReferralStatus,
  ReferralMatchData,
  createReferralRecord,
  updateReferralStatus,
  incrementViewCount,
} from '../../models/ReferralRecord';
import {
  MutualConsent,
  createMutualConsent,
} from '../../models/MutualConsent';

import { createHumanChatRoom } from './humanChatRoomService';
import { sendReferralNotification } from './referralNotificationService';

// 模拟存储
const referralStore = new Map<string, ReferralRecord>();
const consentStore = new Map<string, MutualConsent>();

export interface CreateReferralRequest {
  userAId: string;
  userBId: string;
  matchData: ReferralMatchData;
  type?: ReferralType;
  timeoutHours?: number;
  initiatedBy?: 'system' | 'userA' | 'userB';
}

export interface CreateReferralResponse {
  success: boolean;
  referralId?: string;
  consentId?: string;
  error?: string;
}

export interface ReferralDecisionRequest {
  referralId: string;
  userId: string;
  decision: 'accept' | 'reject';
  reason?: string;
}

export interface ReferralDecisionResponse {
  success: boolean;
  result?: 'pending' | 'mutual_accept' | 'single_accept' | 'mutual_reject' | 'single_reject';
  chatRoomId?: string;
  message: string;
}

/**
 * 创建引荐
 */
export async function createReferral(
  request: CreateReferralRequest
): Promise<CreateReferralResponse> {
  try {
    // 1. 创建引荐记录
    const referral = createReferralRecord(
      request.userAId,
      request.userBId,
      request.matchData,
      request.type || ReferralType.AGENT,
      request.timeoutHours
    );

    referralStore.set(referral.id, referral);

    // 2. 创建双向同意记录
    const consent = createMutualConsent(
      referral.id,
      request.userAId,
      request.userBId,
      {
        defaultTimeoutHours: request.timeoutHours,
      }
    );

    consentStore.set(consent.id, consent);

    // 3. 发送引荐通知
    await sendReferralNotification(referral, consent);

    return {
      success: true,
      referralId: referral.id,
      consentId: consent.id,
    };
  } catch (error) {
    console.error('Failed to create referral:', error);
    return {
      success: false,
      error: 'Failed to create referral',
    };
  }
}

/**
 * 获取引荐记录
 */
export async function getReferral(referralId: string): Promise<ReferralRecord | null> {
  return referralStore.get(referralId) || null;
}

/**
 * 获取引荐的同意记录
 */
export async function getReferralConsent(referralId: string): Promise<MutualConsent | null> {
  for (const consent of consentStore.values()) {
    if (consent.referralId === referralId) {
      return consent;
    }
  }
  return null;
}

/**
 * 记录引荐查看
 */
export async function recordReferralView(
  referralId: string,
  userId: string
): Promise<void> {
  const referral = await getReferral(referralId);
  if (!referral) return;

  // 检查用户是否有权查看
  if (referral.userAId !== userId && referral.userBId !== userId) {
    throw new UnauthorizedViewError('User is not authorized to view this referral');
  }

  const updatedReferral = incrementViewCount(referral);
  referralStore.set(referralId, updatedReferral);
}

/**
 * 处理引荐决策
 */
export async function processReferralDecision(
  request: ReferralDecisionRequest
): Promise<ReferralDecisionResponse> {
  const { referralId, userId, decision, reason } = request;

  // 获取引荐记录
  const referral = await getReferral(referralId);
  if (!referral) {
    return {
      success: false,
      message: '引荐记录不存在',
    };
  }

  // 检查引荐状态
  if (referral.status !== ReferralStatus.PENDING) {
    return {
      success: false,
      message: '该引荐已经处理完成，无法修改决策',
    };
  }

  // 检查用户是否有权决策
  if (referral.userAId !== userId && referral.userBId !== userId) {
    return {
      success: false,
      message: '您无权对此引荐进行决策',
    };
  }

  // 获取同意记录
  const consent = await getReferralConsent(referralId);
  if (!consent) {
    return {
      success: false,
      message: '同意记录不存在',
    };
  }

  // 检查是否已过期
  const now = new Date();
  if (now > consent.expiresAt) {
    return {
      success: false,
      message: '决策时间已过期',
    };
  }

  // 更新用户决策
  const isUserA = userId === consent.userAId;
  const userConsent = isUserA ? consent.userAConsent : consent.userBConsent;

  // 检查是否可以变更
  if (userConsent.status !== 'pending') {
    if (userConsent.changedCount >= 3) {
      return {
        success: false,
        message: '您已超出决策变更次数限制',
      };
    }
  }

  // 更新决策
  const newStatus = decision === 'accept' ? 'accepted' : 'rejected';
  const updatedConsent: MutualConsent = {
    ...consent,
    [isUserA ? 'userAConsent' : 'userBConsent']: {
      ...userConsent,
      status: newStatus as any,
      decidedAt: now,
      reason: decision === 'reject' ? reason : undefined,
      changedCount: userConsent.status !== 'pending'
        ? userConsent.changedCount + 1
        : userConsent.changedCount,
    },
  };

  consentStore.set(consent.id, updatedConsent);

  // 计算结果
  const result = calculateReferralResult(updatedConsent);
  const finalConsent = { ...updatedConsent, result };
  consentStore.set(consent.id, finalConsent);

  // 如果双方都已完成决策，处理最终结果
  if (isBothDecided(finalConsent)) {
    return await finalizeReferral(referral, finalConsent);
  }

  // 通知对方已决策（不透露具体选择）
  await notifyOtherUserDecided(referral, userId);

  return {
    success: true,
    result: 'pending',
    message: `您已选择${decision === 'accept' ? '同意' : '拒绝'}引荐。等待对方决策中...`,
  };
}

/**
 * 计算引荐结果
 */
function calculateReferralResult(consent: MutualConsent): 'pending' | 'mutual_accept' | 'single_accept' | 'mutual_reject' | 'single_reject' {
  const { userAConsent, userBConsent } = consent;

  // 如果任一方还在等待
  if (userAConsent.status === 'pending' || userBConsent.status === 'pending') {
    return 'pending';
  }

  const userAAccepted = userAConsent.status === 'accepted';
  const userBAccepted = userBConsent.status === 'accepted';

  if (userAAccepted && userBAccepted) {
    return 'mutual_accept';
  }

  if (!userAAccepted && !userBAccepted) {
    return 'mutual_reject';
  }

  if (userAAccepted || userBAccepted) {
    return 'single_accept';
  }

  return 'single_reject';
}

/**
 * 检查是否双方都已决策
 */
function isBothDecided(consent: MutualConsent): boolean {
  return consent.userAConsent.status !== 'pending' &&
         consent.userBConsent.status !== 'pending';
}

/**
 * 完成引荐流程
 */
async function finalizeReferral(
  referral: ReferralRecord,
  consent: MutualConsent
): Promise<ReferralDecisionResponse> {
  const result = consent.result;

  switch (result) {
    case 'mutual_accept':
      return await handleMutualAccept(referral, consent);

    case 'single_accept':
      return await handleSingleAccept(referral, consent);

    case 'mutual_reject':
      return await handleMutualReject(referral, consent);

    case 'single_reject':
      return await handleSingleReject(referral, consent);

    default:
      return {
        success: true,
        result: 'pending',
        message: '等待对方完成决策',
      };
  }
}

/**
 * 处理双方同意
 */
async function handleMutualAccept(
  referral: ReferralRecord,
  consent: MutualConsent
): Promise<ReferralDecisionResponse> {
  try {
    // 1. 更新引荐状态
    const updatedReferral = updateReferralStatus(
      referral,
      ReferralStatus.SUCCESS
    );
    referralStore.set(referral.id, updatedReferral);

    // 2. 创建真人聊天房间
    const chatRoom = await createHumanChatRoom(updatedReferral);

    // 3. 发送成功通知
    await sendMatchSuccessNotifications(referral, consent, chatRoom.id);

    return {
      success: true,
      result: 'mutual_accept',
      chatRoomId: chatRoom.id,
      message: '恭喜！双方已同意交换联系方式，真人聊天房间已创建',
    };
  } catch (error) {
    console.error('Failed to handle mutual accept:', error);
    return {
      success: false,
      result: 'mutual_accept',
      message: '创建聊天房间失败，请稍后重试',
    };
  }
}

/**
 * 处理单方同意
 */
async function handleSingleAccept(
  referral: ReferralRecord,
  consent: MutualConsent
): Promise<ReferralDecisionResponse> {
  const updatedReferral = updateReferralStatus(
    referral,
    ReferralStatus.FAILED
  );
  referralStore.set(referral.id, updatedReferral);

  await sendSingleAcceptNotifications(referral, consent);

  return {
    success: false,
    result: 'single_accept',
    message: '很抱歉，只有一方同意了这次引荐。您可以查看其他推荐。',
  };
}

/**
 * 处理双方拒绝
 */
async function handleMutualReject(
  referral: ReferralRecord,
  consent: MutualConsent
): Promise<ReferralDecisionResponse> {
  const updatedReferral = updateReferralStatus(
    referral,
    ReferralStatus.FAILED
  );
  referralStore.set(referral.id, updatedReferral);

  await sendRejectionNotifications(referral, consent, true);

  return {
    success: false,
    result: 'mutual_reject',
    message: '这次引荐未能成功，我们会继续为你寻找更合适的对象。',
  };
}

/**
 * 处理单方拒绝
 */
async function handleSingleReject(
  referral: ReferralRecord,
  consent: MutualConsent
): Promise<ReferralDecisionResponse> {
  const updatedReferral = updateReferralStatus(
    referral,
    ReferralStatus.FAILED
  );
  referralStore.set(referral.id, updatedReferral);

  await sendRejectionNotifications(referral, consent, false);

  return {
    success: false,
    result: 'single_reject',
    message: '这次引荐未能成功，有时候缘分需要一点时间。',
  };
}

/**
 * 取消引荐
 */
export async function cancelReferral(
  referralId: string,
  cancelledBy: string,
  reason?: string
): Promise<boolean> {
  const referral = await getReferral(referralId);
  if (!referral) return false;

  // 检查是否有权取消
  if (referral.userAId !== cancelledBy && referral.userBId !== cancelledBy) {
    throw new UnauthorizedCancelError('User is not authorized to cancel this referral');
  }

  const updatedReferral = updateReferralStatus(
    referral,
    ReferralStatus.CANCELLED
  );
  referralStore.set(referralId, updatedReferral);

  // 发送取消通知
  await sendCancelNotification(referral, cancelledBy, reason);

  return true;
}

/**
 * 获取用户的引荐列表
 */
export async function getUserReferrals(
  userId: string,
  status?: ReferralStatus
): Promise<ReferralRecord[]> {
  const referrals: ReferralRecord[] = [];

  for (const referral of referralStore.values()) {
    if (referral.userAId !== userId && referral.userBId !== userId) continue;
    if (status && referral.status !== status) continue;
    referrals.push(referral);
  }

  // 按创建时间倒序
  return referrals.sort((a, b) =>
    b.createdAt.getTime() - a.createdAt.getTime()
  );
}

/**
 * 获取待处理的引荐
 */
export async function getPendingReferrals(userId: string): Promise<ReferralRecord[]> {
  return getUserReferrals(userId, ReferralStatus.PENDING);
}

// 通知函数
async function notifyOtherUserDecided(
  referral: ReferralRecord,
  decidedUserId: string
): Promise<void> {
  const otherUserId = decidedUserId === referral.userAId
    ? referral.userBId
    : referral.userAId;

  console.log(`Notifying ${otherUserId} that ${decidedUserId} has decided`);
  // TODO: 实现实际的通知发送
}

async function sendMatchSuccessNotifications(
  referral: ReferralRecord,
  consent: MutualConsent,
  chatRoomId: string
): Promise<void> {
  console.log(`Sending match success notifications for ${referral.id}, chat room: ${chatRoomId}`);
  // TODO: 实现实际的通知发送
}

async function sendSingleAcceptNotifications(
  referral: ReferralRecord,
  consent: MutualConsent
): Promise<void> {
  console.log(`Sending single accept notifications for ${referral.id}`);
  // TODO: 实现实际的通知发送
}

async function sendRejectionNotifications(
  referral: ReferralRecord,
  consent: MutualConsent,
  mutual: boolean
): Promise<void> {
  console.log(`Sending ${mutual ? 'mutual' : 'single'} rejection notifications for ${referral.id}`);
  // TODO: 实现实际的通知发送
}

async function sendCancelNotification(
  referral: ReferralRecord,
  cancelledBy: string,
  reason?: string
): Promise<void> {
  const otherUserId = cancelledBy === referral.userAId
    ? referral.userBId
    : referral.userAId;

  console.log(`Sending cancel notification to ${otherUserId}. Reason: ${reason}`);
  // TODO: 实现实际的通知发送
}

/**
 * 错误类
 */
export class UnauthorizedViewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedViewError';
  }
}

export class UnauthorizedCancelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedCancelError';
  }
}

export default {
  createReferral,
  getReferral,
  getReferralConsent,
  recordReferralView,
  processReferralDecision,
  cancelReferral,
  getUserReferrals,
  getPendingReferrals,
};
