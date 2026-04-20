/**
 * Consent Processor
 * 引荐结果处理服务
 *
 * 处理双方同意后的各种结果：
 * - 双方同意：交换联系方式、创建真人聊天房间
 * - 单方同意：保持匿名、提示对方未同意
 * - 双方/单方拒绝：记录原因、更新推荐算法
 * - 超时处理：自动取消、提醒决策
 */

import {
  MutualConsent,
  ReferralResult,
  isMutualAccept,
} from '../../models/MutualConsent';
import {
  ReferralRecord,
  ReferralStatus,
  RejectionReason,
  updateReferralStatus,
  recordUserDecision,
  addToBlacklist,
} from '../../models/ReferralRecord';

import { getConsentByReferral } from './consentStateManager';

// 模拟存储
const referralStore = new Map<string, ReferralRecord>();

export interface ReferralProcessResult {
  success: boolean;
  result: ReferralResult;
  message: string;
  chatRoomId?: string;
  nextAction?: string;
}

export interface ProcessedDecision {
  userId: string;
  decision: 'accept' | 'reject';
  reason?: RejectionReason;
  customReason?: string;
}

/**
 * 处理引荐结果
 * 根据双方的决策处理不同的结果场景
 */
export async function processReferralResult(
  referralId: string
): Promise<ReferralProcessResult> {
  // 获取同意记录
  const consent = await getConsentByReferral(referralId);
  if (!consent) {
    throw new ReferralNotFoundError('Referral consent not found');
  }

  // 获取引荐记录
  const referral = referralStore.get(referralId);
  if (!referral) {
    throw new ReferralNotFoundError('Referral record not found');
  }

  switch (consent.result) {
    case ReferralResult.MUTUAL_ACCEPT:
      return await handleMutualAccept(consent, referral);

    case ReferralResult.SINGLE_ACCEPT:
      return await handleSingleAccept(consent, referral);

    case ReferralResult.MUTUAL_REJECT:
      return await handleMutualReject(consent, referral);

    case ReferralResult.SINGLE_REJECT:
      return await handleSingleReject(consent, referral);

    case ReferralResult.EXPIRED:
      return await handleExpired(consent, referral);

    default:
      return {
        success: false,
        result: consent.result,
        message: '引荐结果尚未确定',
        nextAction: '等待双方完成决策',
      };
  }
}

/**
 * 处理双方同意场景
 * - 交换联系方式
 * - 创建真人聊天房间
 * - 发送匹配成功通知
 */
async function handleMutualAccept(
  consent: MutualConsent,
  referral: ReferralRecord
): Promise<ReferralProcessResult> {
  try {
    // 1. 更新引荐状态
    let updatedReferral = updateReferralStatus(referral, ReferralStatus.SUCCESS, ReferralResult.MUTUAL_ACCEPT);

    // 2. 创建真人聊天房间
    const chatRoomId = await createHumanChatRoom(
      consent.userAId,
      consent.userBId,
      consent.contextSummary
    );

    updatedReferral = {
      ...updatedReferral,
      chatRoomId,
    };

    referralStore.set(referral.id, updatedReferral);

    // 3. 交换联系方式（通过聊天房间）
    await exchangeContactInfo(consent.userAId, consent.userBId, chatRoomId);

    // 4. 发送匹配成功通知
    await sendMatchSuccessNotifications(consent, chatRoomId);

    return {
      success: true,
      result: ReferralResult.MUTUAL_ACCEPT,
      message: '恭喜！双方已同意交换联系方式，真人聊天房间已创建',
      chatRoomId,
      nextAction: '进入真人聊天房间开始交流',
    };
  } catch (error) {
    console.error('Failed to process mutual accept:', error);
    return {
      success: false,
      result: ReferralResult.MUTUAL_ACCEPT,
      message: '双方同意，但创建聊天房间失败，请稍后重试',
      nextAction: '联系客服或重新尝试',
    };
  }
}

/**
 * 处理单方同意场景
 * - 保持匿名
 * - 提示对方未同意
 * - 提供再次推荐选项
 */
async function handleSingleAccept(
  consent: MutualConsent,
  referral: ReferralRecord
): Promise<ReferralProcessResult> {
  // 更新引荐状态
  const updatedReferral = updateReferralStatus(referral, ReferralStatus.FAILED, ReferralResult.SINGLE_ACCEPT);
  referralStore.set(referral.id, updatedReferral);

  // 确定哪一方同意了
  const userAAccepted = consent.userAConsent.status === 'accepted';
  const acceptedUserId = userAAccepted ? consent.userAId : consent.userBId;
  const rejectedUserId = userAAccepted ? consent.userBId : consent.userAId;

  // 发送单方同意通知
  await sendSingleAcceptNotifications(consent, acceptedUserId, rejectedUserId);

  return {
    success: false,
    result: ReferralResult.SINGLE_ACCEPT,
    message: '很抱歉，只有一方同意了这次引荐。为了保护隐私，我们不会透露对方的具体选择。',
    nextAction: '可以查看其他推荐或等待新的匹配',
  };
}

/**
 * 处理双方拒绝场景
 * - 记录原因
 * - 更新推荐算法
 * - 避免重复推荐
 */
async function handleMutualReject(
  consent: MutualConsent,
  referral: ReferralRecord
): Promise<ReferralProcessResult> {
  // 更新引荐状态
  const updatedReferral = updateReferralStatus(referral, ReferralStatus.FAILED, ReferralResult.MUTUAL_REJECT);

  // 加入黑名单（避免重复推荐）
  const finalReferral = addToBlacklist(updatedReferral, '双方拒绝');

  referralStore.set(referral.id, finalReferral);

  // 更新推荐算法
  await updateMatchingAlgorithm(consent.userAId, consent.userBId, 'mutual_reject', {
    userAReason: consent.userAConsent.reason,
    userBReason: consent.userBConsent.reason,
  });

  // 发送婉转化失败通知
  await sendRejectionNotifications(consent, true);

  return {
    success: false,
    result: ReferralResult.MUTUAL_REJECT,
    message: '这次引荐未能成功，但这只是缘分未到。我们会继续为你寻找更合适的对象。',
    nextAction: '查看新的推荐匹配',
  };
}

/**
 * 处理单方拒绝场景
 * - 记录原因
 * - 更新推荐算法
 * - 避免重复推荐
 */
async function handleSingleReject(
  consent: MutualConsent,
  referral: ReferralRecord
): Promise<ReferralProcessResult> {
  // 更新引荐状态
  const updatedReferral = updateReferralStatus(referral, ReferralStatus.FAILED, ReferralResult.SINGLE_REJECT);

  // 确定哪一方拒绝了
  const userARejected = consent.userAConsent.status === 'rejected';
  const rejectedUserId = userARejected ? consent.userAId : consent.userBId;
  const acceptedUserId = userARejected ? consent.userBId : consent.userAId;

  // 加入黑名单
  const finalReferral = addToBlacklist(updatedReferral, '单方拒绝');
  referralStore.set(referral.id, finalReferral);

  // 更新推荐算法
  await updateMatchingAlgorithm(acceptedUserId, rejectedUserId, 'single_reject', {
    rejectedBy: rejectedUserId,
    reason: userARejected ? consent.userAConsent.reason : consent.userBConsent.reason,
  });

  // 发送婉转化失败通知
  await sendRejectionNotifications(consent, false);

  return {
    success: false,
    result: ReferralResult.SINGLE_REJECT,
    message: '这次引荐未能成功。有时候缘分需要一点时间，我们会继续为你寻找更合适的人。',
    nextAction: '查看新的推荐匹配',
  };
}

/**
 * 处理超时场景
 * - 自动取消
 * - 提醒决策
 */
async function handleExpired(
  consent: MutualConsent,
  referral: ReferralRecord
): Promise<ReferralProcessResult> {
  // 更新引荐状态
  const updatedReferral = updateReferralStatus(referral, ReferralStatus.FAILED, ReferralResult.EXPIRED);
  referralStore.set(referral.id, updatedReferral);

  // 发送超时通知
  await sendTimeoutNotifications(consent);

  return {
    success: false,
    result: ReferralResult.EXPIRED,
    message: '决策时间已过期。如果仍有意向，可以重新发起引荐请求。',
    nextAction: '重新发起引荐或查看其他推荐',
  };
}

/**
 * 创建真人聊天房间
 */
async function createHumanChatRoom(
  userAId: string,
  userBId: string,
  contextSummary?: string
): Promise<string> {
  // TODO: 调用聊天服务创建1v1房间
  // 这里返回模拟的房间ID
  const chatRoomId = `chat_human_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  console.log(`Creating human chat room ${chatRoomId} for users ${userAId} and ${userBId}`);

  // TODO: 继承Agent对话上下文
  if (contextSummary) {
    console.log(`Inheriting context: ${contextSummary}`);
  }

  return chatRoomId;
}

/**
 * 交换联系方式
 */
async function exchangeContactInfo(
  userAId: string,
  userBId: string,
  chatRoomId: string
): Promise<void> {
  // TODO: 在聊天房间中交换双方联系方式
  console.log(`Exchanging contact info between ${userAId} and ${userBId} in room ${chatRoomId}`);
}

/**
 * 更新推荐算法
 */
async function updateMatchingAlgorithm(
  userAId: string,
  userBId: string,
  outcome: string,
  details: Record<string, any>
): Promise<void> {
  // TODO: 调用匹配服务更新算法
  console.log(`Updating matching algorithm for ${userAId} and ${userBId}: ${outcome}`, details);
}

/**
 * 发送匹配成功通知
 */
async function sendMatchSuccessNotifications(
  consent: MutualConsent,
  chatRoomId: string
): Promise<void> {
  // TODO: 发送通知给双方
  console.log(`Sending match success notifications for consent ${consent.id}`);
}

/**
 * 发送单方同意通知
 */
async function sendSingleAcceptNotifications(
  consent: MutualConsent,
  acceptedUserId: string,
  rejectedUserId: string
): Promise<void> {
  // TODO: 发送通知
  console.log(`Sending single accept notifications. Accepted: ${acceptedUserId}, Rejected: ${rejectedUserId}`);
}

/**
 * 发送拒绝通知（婉转化）
 */
async function sendRejectionNotifications(
  consent: MutualConsent,
  mutual: boolean
): Promise<void> {
  // TODO: 发送婉转化失败通知
  console.log(`Sending ${mutual ? 'mutual' : 'single'} rejection notifications for consent ${consent.id}`);
}

/**
 * 发送超时通知
 */
async function sendTimeoutNotifications(consent: MutualConsent): Promise<void> {
  // TODO: 发送超时通知
  console.log(`Sending timeout notifications for consent ${consent.id}`);
}

/**
 * 获取引荐记录
 */
export async function getReferral(referralId: string): Promise<ReferralRecord | null> {
  return referralStore.get(referralId) || null;
}

/**
 * 保存引荐记录
 */
export async function saveReferral(referral: ReferralRecord): Promise<void> {
  referralStore.set(referral.id, referral);
}

/**
 * 错误类
 */
export class ReferralNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReferralNotFoundError';
  }
}

export default {
  processReferralResult,
  getReferral,
  saveReferral,
};
