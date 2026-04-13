/**
 * Chat Types
 * 聊天相关类型定义
 */

export type ChatRoomType = 'PRIVATE' | 'GROUP' | 'QUAD';
export type ChatRoomStatus = 'ACTIVE' | 'INACTIVE' | 'CLOSED';
export type ParticipantRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST';
export type MessageType = 'TEXT' | 'IMAGE' | 'FILE';

export interface ChatRoom {
  id: string;
  type: ChatRoomType;
  status: ChatRoomStatus;
  sceneId?: string;
  matchId?: string;
  participantIds: string[];
  metadata?: ChatRoomMetadata;
  settings?: ChatRoomSettings;
  lastMessage?: LastMessage;
  lastMessageAt?: string;
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
  participants?: RoomParticipant[];
}

export interface ChatRoomMetadata {
  name?: string;
  description?: string;
  avatarUrl?: string;
  topic?: string;
  [key: string]: any;
}

export interface ChatRoomSettings {
  notifications?: boolean;
  soundEnabled?: boolean;
  showPreview?: boolean;
  allowInvite?: boolean;
  allowLeave?: boolean;
  requireApproval?: boolean;
  maxParticipants?: number;
  isFixed?: boolean;
  [key: string]: any;
}

export interface LastMessage {
  id: string;
  content: string;
  senderId: string;
  senderName?: string;
  createdAt: string;
}

export interface RoomParticipant {
  id: string;
  roomId: string;
  userId: string;
  user: ParticipantUser;
  role: ParticipantRole;
  permissions?: Record<string, boolean>;
  isActive: boolean;
  joinedAt: string;
  leftAt?: string;
  lastReadAt?: string;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ParticipantUser {
  id: string;
  name?: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface ChatMessage {
  id: string;
  chatRoomId: string;
  senderId: string;
  sender?: ParticipantUser;
  senderType: 'USER' | 'AGENT';
  content: string;
  type: MessageType;
  attachments?: MessageAttachment[];
  metadata?: MessageMetadata;
  createdAt: string;
}

export interface MessageAttachment {
  id: string;
  type: 'image' | 'file' | 'audio';
  url: string;
  name?: string;
  size?: number;
  mimeType?: string;
  thumbnailUrl?: string;
}

export interface MessageMetadata {
  isPrivateSuggestion?: boolean;
  replyTo?: string;
  editedAt?: string;
  [key: string]: any;
}

export interface ChatRoomListItemProps {
  room: ChatRoom;
  onPress?: (room: ChatRoom) => void;
  onLongPress?: (room: ChatRoom) => void;
  selected?: boolean;
}

export interface ChatRoomListProps {
  rooms: ChatRoom[];
  onRoomPress?: (room: ChatRoom) => void;
  onRoomLongPress?: (room: ChatRoom) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  selectedRoomId?: string;
  emptyComponent?: React.ReactNode;
}
