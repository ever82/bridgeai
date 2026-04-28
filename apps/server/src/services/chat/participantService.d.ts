/**
 * Participant Service
 * 聊天室参与者管理服务
 */
import { RoomParticipant, ParticipantRole } from '@prisma/client';
export interface AddParticipantInput {
    roomId: string;
    userId: string;
    role?: ParticipantRole;
    addedBy: string;
}
export interface UpdateParticipantInput {
    role?: ParticipantRole;
    permissions?: Record<string, any>;
    isActive?: boolean;
}
export interface ParticipantWithUser extends RoomParticipant {
    user: {
        id: string;
        name: string | null;
        displayName: string | null;
        avatarUrl: string | null;
    };
}
/**
 * 添加参与者到房间
 */
export declare function addParticipant(input: AddParticipantInput): Promise<RoomParticipant>;
/**
 * 移除参与者
 */
export declare function removeParticipant(roomId: string, userId: string, removedBy: string): Promise<void>;
/**
 * 更新参与者信息
 */
export declare function updateParticipant(roomId: string, userId: string, input: UpdateParticipantInput, updatedBy: string): Promise<RoomParticipant>;
/**
 * 获取房间的所有参与者
 */
export declare function getRoomParticipants(roomId: string): Promise<ParticipantWithUser[]>;
/**
 * 获取参与者的房间
 */
export declare function getParticipantRooms(userId: string): Promise<RoomParticipant[]>;
/**
 * 获取单个参与者信息
 */
export declare function getParticipant(roomId: string, userId: string): Promise<ParticipantWithUser | null>;
/**
 * 转移房主权限
 */
export declare function transferOwnership(roomId: string, newOwnerId: string, currentOwnerId: string): Promise<void>;
/**
 * 获取角色权限
 */
export declare function getRolePermissions(role: ParticipantRole): string[];
/**
 * 检查用户是否有特定权限
 */
export declare function hasPermission(roomId: string, userId: string, permission: string): Promise<boolean>;
//# sourceMappingURL=participantService.d.ts.map