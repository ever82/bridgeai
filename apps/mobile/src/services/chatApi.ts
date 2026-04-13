/**
 * Chat API Service
 * 聊天相关 API 调用
 */

import { ChatRoom, ChatMessage, RoomParticipant } from '../types/chat';

// API 基础配置
const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';

// 请求工具函数
async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  // TODO: 从存储中获取 token
  const token = '';

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response;
}

// ==================== Room APIs ====================

/**
 * 获取用户房间列表
 */
export async function getUserRooms(options: {
  type?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
} = {}): Promise<{ rooms: ChatRoom[]; total: number; totalPages: number }> {
  const params = new URLSearchParams();
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined) {
      params.append(key, String(value));
    }
  });

  const response = await fetchWithAuth(`/api/v1/chat/rooms?${params.toString()}`);
  const data = await response.json();

  return {
    rooms: data.data,
    total: data.meta?.total || 0,
    totalPages: data.meta?.totalPages || 0,
  };
}

/**
 * 搜索房间
 */
export async function searchRooms(
  query: string,
  options: {
    type?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}
): Promise<{ rooms: ChatRoom[]; total: number; totalPages: number }> {
  const params = new URLSearchParams({ q: query });
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined) {
      params.append(key, String(value));
    }
  });

  const response = await fetchWithAuth(`/api/v1/chat/rooms/search?${params.toString()}`);
  const data = await response.json();

  return {
    rooms: data.data,
    total: data.meta?.total || 0,
    totalPages: data.meta?.totalPages || 0,
  };
}

/**
 * 获取房间详情
 */
export async function getRoomById(roomId: string): Promise<ChatRoom> {
  const response = await fetchWithAuth(`/api/v1/chat/rooms/${roomId}`);
  const data = await response.json();
  return data.data;
}

/**
 * 创建房间
 */
export async function createRoom(input: {
  type: 'PRIVATE' | 'GROUP' | 'QUAD';
  participantIds: string[];
  sceneId?: string;
  metadata?: Record<string, any>;
  settings?: Record<string, any>;
}): Promise<ChatRoom> {
  const response = await fetchWithAuth('/api/v1/chat/rooms', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const data = await response.json();
  return data.data;
}

/**
 * 更新房间
 */
export async function updateRoom(
  roomId: string,
  input: {
    status?: string;
    metadata?: Record<string, any>;
    settings?: Record<string, any>;
  }
): Promise<ChatRoom> {
  const response = await fetchWithAuth(`/api/v1/chat/rooms/${roomId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  const data = await response.json();
  return data.data;
}

/**
 * 关闭房间
 */
export async function closeRoom(roomId: string): Promise<ChatRoom> {
  const response = await fetchWithAuth(`/api/v1/chat/rooms/${roomId}`, {
    method: 'DELETE',
  });
  const data = await response.json();
  return data.data;
}

/**
 * 标记房间已读
 */
export async function markRoomAsRead(roomId: string): Promise<void> {
  await fetchWithAuth(`/api/v1/chat/rooms/${roomId}/read`, {
    method: 'POST',
  });
}

// ==================== Participant APIs ====================

/**
 * 获取房间参与者列表
 */
export async function getRoomParticipants(roomId: string): Promise<RoomParticipant[]> {
  const response = await fetchWithAuth(`/api/v1/chat/rooms/${roomId}/participants`);
  const data = await response.json();
  return data.data;
}

/**
 * 添加参与者
 */
export async function addParticipant(
  roomId: string,
  input: {
    userId: string;
    role?: 'MEMBER' | 'ADMIN' | 'GUEST';
  }
): Promise<RoomParticipant> {
  const response = await fetchWithAuth(`/api/v1/chat/rooms/${roomId}/participants`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const data = await response.json();
  return data.data;
}

/**
 * 更新参与者
 */
export async function updateParticipant(
  roomId: string,
  userId: string,
  input: {
    role?: 'MEMBER' | 'ADMIN' | 'GUEST';
    permissions?: Record<string, boolean>;
  }
): Promise<RoomParticipant> {
  const response = await fetchWithAuth(`/api/v1/chat/rooms/${roomId}/participants/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  const data = await response.json();
  return data.data;
}

/**
 * 移除参与者
 */
export async function removeParticipant(roomId: string, userId: string): Promise<void> {
  await fetchWithAuth(`/api/v1/chat/rooms/${roomId}/participants/${userId}`, {
    method: 'DELETE',
  });
}

/**
 * 转移房主权限
 */
export async function transferOwnership(roomId: string, newOwnerId: string): Promise<void> {
  await fetchWithAuth(`/api/v1/chat/rooms/${roomId}/transfer-ownership`, {
    method: 'POST',
    body: JSON.stringify({ userId: newOwnerId }),
  });
}

// ==================== Message APIs (Placeholder) ====================

/**
 * 获取房间消息列表
 */
export async function getRoomMessages(
  roomId: string,
  options: {
    before?: string;
    after?: string;
    limit?: number;
  } = {}
): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
  const params = new URLSearchParams();
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined) {
      params.append(key, String(value));
    }
  });

  const response = await fetchWithAuth(`/api/v1/chat/rooms/${roomId}/messages?${params.toString()}`);
  const data = await response.json();

  return {
    messages: data.data,
    hasMore: data.meta?.hasMore || false,
  };
}

/**
 * 发送消息
 */
export async function sendMessage(
  roomId: string,
  input: {
    content: string;
    type?: 'TEXT' | 'IMAGE' | 'FILE';
    attachments?: Array<{
      type: 'image' | 'file' | 'audio';
      url: string;
      name?: string;
      size?: number;
    }>;
    metadata?: Record<string, any>;
  }
): Promise<ChatMessage> {
  const response = await fetchWithAuth(`/api/v1/chat/rooms/${roomId}/messages`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const data = await response.json();
  return data.data;
}

// ==================== Export ====================

export default {
  // Room
  getUserRooms,
  searchRooms,
  getRoomById,
  createRoom,
  updateRoom,
  closeRoom,
  markRoomAsRead,
  // Participant
  getRoomParticipants,
  addParticipant,
  updateParticipant,
  removeParticipant,
  transferOwnership,
  // Message
  getRoomMessages,
  sendMessage,
};
