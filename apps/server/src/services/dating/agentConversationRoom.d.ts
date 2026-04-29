/**
 * Agent Conversation Room Service
 * Agent对话房间服务 (ISSUE-DATE003 c1)
 *
 * 实现双Agent隔离对话房间机制：
 * - 两个Agent在独立房间内进行对话
 * - 对话状态管理（轮次、超时）
 * - 房间生命周期：创建 → 活跃 → 完成/过期
 */
export interface ConversationRoom {
    id: string;
    agentAId: string;
    agentBId: string;
    userIdA: string;
    userIdB: string;
    status: 'pending' | 'active' | 'completed' | 'expired' | 'terminated';
    currentRound: number;
    maxRounds: number;
    timeoutMs: number;
    startedAt: Date | null;
    completedAt: Date | null;
    lastMessageAt: Date | null;
    conversationSummary: string | null;
    qualityScore: number | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface RoomConfig {
    maxRounds: number;
    timeoutMs: number;
    qualityThreshold: number;
}
export interface RoomMessage {
    id: string;
    roomId: string;
    senderId: string;
    senderType: 'agent_a' | 'agent_b' | 'system';
    content: string;
    round: number;
    timestamp: Date;
}
export declare class RoomNotFoundError extends Error {
    constructor(roomId: string);
}
export declare class RoomStatusError extends Error {
    constructor(roomId: string, expected: string, actual: string);
}
export declare class RoomMaxRoundsError extends Error {
    constructor(roomId: string, maxRounds: number);
}
/**
 * 创建对话房间
 * 创建后状态为 pending，需要调用 activateRoom 激活
 */
export declare function createRoom(agentAId: string, agentBId: string, userIdA: string, userIdB: string, config?: Partial<RoomConfig>): Promise<ConversationRoom>;
/**
 * 获取房间信息
 */
export declare function getRoom(roomId: string): Promise<ConversationRoom | null>;
/**
 * 激活房间
 * 将状态从 pending 转为 active，开始计时
 */
export declare function activateRoom(roomId: string): Promise<ConversationRoom>;
/**
 * 添加消息到房间
 */
export declare function addMessage(roomId: string, senderId: string, senderType: 'agent_a' | 'agent_b' | 'system', content: string): Promise<RoomMessage>;
/**
 * 检查房间是否超时
 * 返回 true 表示已超时并处理
 */
export declare function checkRoomTimeout(roomId: string): Promise<boolean>;
/**
 * 递增轮次
 * 如果达到最大轮次则自动完成房间
 */
export declare function incrementRound(roomId: string): Promise<ConversationRoom>;
/**
 * 完成房间
 * 标记对话为完成状态，生成摘要和质量评分
 */
export declare function completeRoom(roomId: string, summary: string, qualityScore: number | null): Promise<ConversationRoom>;
/**
 * 终止房间
 * 强制终止对话，记录原因
 */
export declare function terminateRoom(roomId: string, reason: string): Promise<ConversationRoom>;
/**
 * 获取房间所有消息
 */
export declare function getRoomMessages(roomId: string): Promise<RoomMessage[]>;
/**
 * 获取用户相关的活跃房间
 */
export declare function getActiveRoomsByUser(userId: string): Promise<ConversationRoom[]>;
/**
 * 清除所有房间和消息（仅用于测试）
 */
export declare function clearAllRooms(): void;
declare const _default: {
    createRoom: typeof createRoom;
    getRoom: typeof getRoom;
    activateRoom: typeof activateRoom;
    addMessage: typeof addMessage;
    checkRoomTimeout: typeof checkRoomTimeout;
    incrementRound: typeof incrementRound;
    completeRoom: typeof completeRoom;
    terminateRoom: typeof terminateRoom;
    getRoomMessages: typeof getRoomMessages;
    getActiveRoomsByUser: typeof getActiveRoomsByUser;
    clearAllRooms: typeof clearAllRooms;
};
export default _default;
//# sourceMappingURL=agentConversationRoom.d.ts.map