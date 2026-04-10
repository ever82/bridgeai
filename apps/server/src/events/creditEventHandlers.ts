/**
 * 信用分事件处理器
 * 监听各类事件，触发信用分实时更新
 */

import { CreditSourceType } from '../types/credit';
import { creditScoreService } from '../services/creditScoreService';

/**
 * 用户资料更新事件
 */
export async function handleProfileUpdate(userId: string): Promise<void> {
  try {
    const result = await creditScoreService.updateCreditScore(
      userId,
      CreditSourceType.PROFILE_UPDATE
    );
    console.log(`Credit score updated for user ${userId} after profile update:`, result);
  } catch (error) {
    console.error('Error updating credit score on profile update:', error);
  }
}

/**
 * 交易完成事件
 */
export async function handleTransactionComplete(
  userId: string,
  transactionId: string
): Promise<void> {
  try {
    const result = await creditScoreService.updateCreditScore(
      userId,
      CreditSourceType.TRANSACTION,
      transactionId
    );
    console.log(`Credit score updated for user ${userId} after transaction:`, result);
  } catch (error) {
    console.error('Error updating credit score on transaction:', error);
  }
}

/**
 * 评价提交事件
 */
export async function handleRatingSubmitted(
  userId: string,
  ratingId: string
): Promise<void> {
  try {
    const result = await creditScoreService.updateCreditScore(
      userId,
      CreditSourceType.RATING,
      ratingId
    );
    console.log(`Credit score updated for user ${userId} after rating:`, result);
  } catch (error) {
    console.error('Error updating credit score on rating:', error);
  }
}

/**
 * 投诉事件 (负面事件)
 */
export async function handleComplaintReceived(
  userId: string,
  complaintId: string
): Promise<void> {
  try {
    const result = await creditScoreService.updateCreditScore(
      userId,
      CreditSourceType.COMPLAINT,
      complaintId
    );
    console.log(`Credit score updated for user ${userId} after complaint:`, result);
  } catch (error) {
    console.error('Error updating credit score on complaint:', error);
  }
}

/**
 * 匹配完成事件
 */
export async function handleMatchCompleted(
  userId: string,
  matchId: string
): Promise<void> {
  try {
    const result = await creditScoreService.updateCreditScore(
      userId,
      CreditSourceType.TRANSACTION,
      matchId
    );
    console.log(`Credit score updated for user ${userId} after match completion:`, result);
  } catch (error) {
    console.error('Error updating credit score on match completion:', error);
  }
}

/**
 * 消息响应事件
 */
export async function handleMessageResponse(
  userId: string,
  messageId: string
): Promise<void> {
  try {
    // 消息响应不立即更新，避免频繁更新
    // 可以记录到缓存，批量处理
    console.log(`Message response recorded for user ${userId}`);
  } catch (error) {
    console.error('Error handling message response:', error);
  }
}

// 事件类型到处理函数的映射
export const creditEventHandlers = {
  profileUpdate: handleProfileUpdate,
  transactionComplete: handleTransactionComplete,
  ratingSubmitted: handleRatingSubmitted,
  complaintReceived: handleComplaintReceived,
  matchCompleted: handleMatchCompleted,
  messageResponse: handleMessageResponse,
};

// 导出事件类型
export type CreditEventType = keyof typeof creditEventHandlers;
