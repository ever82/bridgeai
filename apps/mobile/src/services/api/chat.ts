/**
 * Chat API Service
 * 聊天房间API服务
 */
import { api } from './client';
import { ChatRoom, ChatRoomType, ParticipantRole, RoomParticipant } from '../../types/chat';

export interface CreateRoomRequest {
  type: ChatRoomType;
  participantIds: string[];
  sceneId?: string;
  metadata?: Record<string, any>;
  settings?: Record<string, any>;
}

export interface UpdateRoomRequest {
  status?: 'ACTIVE' | 'INACTIVE' | 'CLOSED';
  metadata?: Record<string, any>;
  settings?: Record<string, any>;
}

export interface RoomQueryParams {
  type?: ChatRoomType;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'lastMessageAt' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface RoomsResponse {
  data: ChatRoom[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AddParticipantRequest {
  userId: string;
  role?: ParticipantRole;
}

export interface UpdateParticipantRequest {
  role?: ParticipantRole;
  permissions?: Record<string, any>;
}

/**
 * 创建聊天房间
 */
export const createRoom = async (data: CreateRoomRequest): Promise<ChatRoom> => {
  const response = await api.post<ChatRoom>('/v1/chat/rooms', data);
  return response.data.data!;
};

/**
 * 获取用户房间列表
 */
export const getUserRooms = async (params?: RoomQueryParams): Promise<RoomsResponse> => {
  const response = await api.get<ChatRoom[]>('/v1/chat/rooms', { params });
  return {
    data: response.data.data || [],
    meta: (response.data as any).meta || {
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    },
  };
};

/**
 * 搜索房间
 */
export const searchRooms = async (
  query: string,
  params?: Omit<RoomQueryParams, 'search'>
): Promise<RoomsResponse> => {
  const response = await api.get<ChatRoom[]>('/v1/chat/rooms/search', {
    params: { q: query, ...params },
  });
  return {
    data: response.data.data || [],
    meta: (response.data as any).meta || {
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    },
  };
};

/**
 * 获取房间详情
 */
export const getRoomById = async (roomId: string): Promise<ChatRoom> => {
  const response = await api.get<ChatRoom>(`/v1/chat/rooms/${roomId}`);
  return response.data.data!;
};

/**
 * 更新房间
 */
export const updateRoom = async (
  roomId: string,
  data: UpdateRoomRequest
): Promise<ChatRoom> => {
  const response = await api.patch<ChatRoom>(`/v1/chat/rooms/${roomId}`, data);
  return response.data.data!;
};

/**
 * 关闭房间
 */
export const closeRoom = async (roomId: string): Promise<ChatRoom> => {
  const response = await api.delete<ChatRoom>(`/v1/chat/rooms/${roomId}`);
  return response.data.data!;
};

/**
 * 标记房间已读
 */
export const markRoomAsRead = async (roomId: string): Promise<void> => {
  await api.post(`/v1/chat/rooms/${roomId}/read`);
};

// ==================== Participants ====================

/**
 * 获取房间参与者列表
 */
export const getRoomParticipants = async (roomId: string): Promise<RoomParticipant[]> => {
  const response = await api.get<RoomParticipant[]>(`/v1/chat/rooms/${roomId}/participants`);
  return response.data.data || [];
};

/**
 * 添加参与者
 */
export const addParticipant = async (
  roomId: string,
  data: AddParticipantRequest
): Promise<RoomParticipant> => {
  const response = await api.post<RoomParticipant>(
    `/v1/chat/rooms/${roomId}/participants`,
    data
  );
  return response.data.data!;
};

/**
 * 更新参与者
 */
export const updateParticipant = async (
  roomId: string,
  userId: string,
  data: UpdateParticipantRequest
): Promise<RoomParticipant> => {
  const response = await api.patch<RoomParticipant>(
    `/v1/chat/rooms/${roomId}/participants/${userId}`,
    data
  );
  return response.data.data!;
};

/**
 * 移除参与者
 */
export const removeParticipant = async (roomId: string, userId: string): Promise<void> => {
  await api.delete(`/v1/chat/rooms/${roomId}/participants/${userId}`);
};

/**
 * 转移房主权限
 */
export const transferOwnership = async (
  roomId: string,
  newOwnerId: string
): Promise<void> => {
  await api.post(`/v1/chat/rooms/${roomId}/transfer-ownership`, {
    userId: newOwnerId,
  });
};
