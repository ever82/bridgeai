/**
 * Dating Services Index
 * 约会引荐服务模块入口
 */

export * from './consentStateManager';
export { getReferral, ReferralNotFoundError } from './consentProcessor';
export * from './referralService';
export * from './referralNotificationService';
export * from './referralHistoryService';
export * from './humanChatRoomService';
export * from './profileService';
export * from './profileQualityService';
export * from './privacyService';

// 默认导出
export { default as consentStateManager } from './consentStateManager';
export { default as consentProcessor } from './consentProcessor';
export { default as referralService } from './referralService';
export { default as referralNotificationService } from './referralNotificationService';
export { default as referralHistoryService } from './referralHistoryService';
export { default as humanChatRoomService } from './humanChatRoomService';
