/**
 * Chat Room Service (Persistent / Database-Backed)
 *
 * Manages persistent ChatRoom records via Prisma/DB.
 * This service handles long-lived room CRUD, participant tracking,
 * and room metadata that persists across server restarts.
 *
 * NOTE: This is separate from `services/roomService.ts` which manages
 * ephemeral, in-memory rooms for real-time socket communication.
 * See that file for a detailed explanation of the relationship.
 *
 * This service is used by REST API routes for persistent room operations.
 */
import { ChatRoom, ChatRoomType, ChatRoomStatus, RoomParticipant } from '@prisma/client';
export interface CreateRoomInput {
    type: ChatRoomType;
    participantIds: string[];
    sceneId?: string;
    matchId?: string;
    metadata?: Record<string, any>;
    settings?: Record<string, any>;
    createdBy: string;
}
export interface UpdateRoomInput {
    status?: ChatRoomStatus;
    metadata?: Record<string, any>;
    settings?: Record<string, any>;
}
export interface RoomQueryOptions {
    userId?: string;
    type?: ChatRoomType;
    status?: ChatRoomStatus;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: 'lastMessageAt' | 'createdAt' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
}
export interface RoomWithParticipants extends ChatRoom {
    participants: RoomParticipant[];
    unreadCount: number;
}
/**
 * 创建聊天房间
 */
export declare function createRoom(input: CreateRoomInput): Promise<ChatRoom>;
/**
 * 获取房间详情
 */
export declare function getRoomById(roomId: string): Promise<RoomWithParticipants | null>;
/**
 * 更新房间
 */
export declare function updateRoom(roomId: string, input: UpdateRoomInput): Promise<ChatRoom>;
/**
 * 删除/关闭房间
 */
export declare function closeRoom(roomId: string): Promise<ChatRoom>;
/**
 * 获取用户的房间列表
 */
export declare function getUserRooms(userId: string, options?: RoomQueryOptions): Promise<{
    rooms: RoomWithParticipants[];
    total: number;
}>;
/**
 * 搜索房间
 */
export declare function searchRooms(userId: string, query: string, options?: Omit<RoomQueryOptions, 'search'>): Promise<{
    rooms: RoomWithParticipants[];
    total: number;
}>;
/**
 * 检查用户是否在房间中
 */
export declare function isUserInRoom(roomId: string, userId: string): Promise<boolean>;
/**
 * 获取房间成员数量
 */
export declare function getRoomParticipantCount(roomId: string): Promise<number>;
/**
 * 更新最后消息
 */
export declare function updateLastMessage(roomId: string, message: {
    id: string;
    content: string;
    senderId: string;
    createdAt: Date;
}): Promise<void>;
/**
 * 重置用户未读数
 */
export declare function resetUnreadCount(roomId: string, userId: string): Promise<void>;
//# sourceMappingURL=roomService.d.ts.map