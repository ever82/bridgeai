/**
 * Human Chat Room Service
 * 真人聊天房间服务
 *
 * 管理真人聊天房间的创建和配置：
 * - 双方同意后自动创建1v1聊天房间
 * - 继承Agent对话上下文
 * - 身份标识切换
 * - 初始欢迎消息生成
 * - 人机切换标记
 */
import { ReferralRecord } from '../../models/ReferralRecord';
export declare enum ChatRoomType {
    AGENT = "agent",// Agent代理聊天
    HUMAN = "human",// 真人聊天
    HYBRID = "hybrid"
}
export declare enum ChatRoomStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    CLOSED = "closed",
    SUSPENDED = "suspended"
}
export interface ChatRoomParticipant {
    userId: string;
    joinedAt: Date;
    lastReadAt: Date;
    isOnline: boolean;
    nickname?: string;
    avatar?: string;
}
export interface ChatRoom {
    id: string;
    type: ChatRoomType;
    status: ChatRoomStatus;
    participants: ChatRoomParticipant[];
    createdAt: Date;
    createdFromReferralId: string;
    inheritedContext?: {
        agentConversationSummary: string;
        recommendedTopics: string[];
        matchScore: number;
    };
    settings: ChatRoomSettings;
    metadata: ChatRoomMetadata;
}
export interface ChatRoomSettings {
    allowImages: boolean;
    allowVoice: boolean;
    allowVideo: boolean;
    allowLocation: boolean;
    messageRetentionDays: number;
}
export interface ChatRoomMetadata {
    messageCount: number;
    lastMessageAt?: Date;
    lastMessagePreview?: string;
    unreadCount: Record<string, number>;
}
export interface WelcomeMessage {
    type: 'system' | 'tip' | 'suggestion';
    content: string;
    metadata?: Record<string, any>;
}
/**
 * 创建真人聊天房间
 */
export declare function createHumanChatRoom(referral: ReferralRecord): Promise<ChatRoom>;
/**
 * 生成欢迎消息
 */
export declare function generateWelcomeMessages(room: ChatRoom): WelcomeMessage[];
/**
 * 获取聊天房间
 */
export declare function getChatRoom(roomId: string): Promise<ChatRoom | null>;
/**
 * 获取用户的所有真人聊天房间
 */
export declare function getUserHumanChatRooms(userId: string): Promise<ChatRoom[]>;
/**
 * 用户加入房间
 */
export declare function joinRoom(roomId: string, userId: string): Promise<ChatRoom>;
/**
 * 用户离开房间
 */
export declare function leaveRoom(roomId: string, userId: string): Promise<void>;
/**
 * 标记消息已读
 */
export declare function markAsRead(roomId: string, userId: string): Promise<void>;
/**
 * 更新房间设置
 */
export declare function updateRoomSettings(roomId: string, settings: Partial<ChatRoomSettings>): Promise<ChatRoom>;
/**
 * 关闭聊天房间
 */
export declare function closeRoom(roomId: string, reason?: string): Promise<void>;
/**
 * 更新未读消息数
 */
export declare function incrementUnreadCount(roomId: string, userId: string): Promise<void>;
/**
 * 更新最后消息信息
 */
export declare function updateLastMessage(roomId: string, messagePreview: string): Promise<void>;
/**
 * 获取房间统计信息
 */
export declare function getRoomStats(roomId: string): Promise<{
    totalMessages: number;
    participantActivity: Record<string, {
        lastReadAt: Date;
        isOnline: boolean;
    }>;
}>;
/**
 * 错误类
 */
export declare class ChatRoomNotFoundError extends Error {
    constructor(message: string);
}
export declare class NotRoomParticipantError extends Error {
    constructor(message: string);
}
declare const _default: {
    createHumanChatRoom: typeof createHumanChatRoom;
    getChatRoom: typeof getChatRoom;
    getUserHumanChatRooms: typeof getUserHumanChatRooms;
    joinRoom: typeof joinRoom;
    leaveRoom: typeof leaveRoom;
    markAsRead: typeof markAsRead;
    updateRoomSettings: typeof updateRoomSettings;
    closeRoom: typeof closeRoom;
    generateWelcomeMessages: typeof generateWelcomeMessages;
};
export default _default;
//# sourceMappingURL=humanChatRoomService.d.ts.map