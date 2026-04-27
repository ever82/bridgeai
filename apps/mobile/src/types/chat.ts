/**
 * Chat Types
 * 聊天相关类型定义
 */

export type ChatRoomType = 'PRIVATE' | 'GROUP' | 'QUAD';
export type ChatRoomStatus = 'ACTIVE' | 'INACTIVE' | 'CLOSED';
export type ParticipantRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'GUEST';
export type ParticipantIdentity = 'agent' | 'human';
export type UserOnlineStatus = 'online' | 'offline' | 'away';

export interface ParticipantStatusInfo {
  identity: ParticipantIdentity;
  onlineStatus: UserOnlineStatus;
  isTyping?: boolean;
}
export type MessageType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE';

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
  [key: string]: unknown;
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
  [key: string]: unknown;
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

/**
 * Snapshot of sender identity captured at message creation time.
 * Prevents retroactive changes (name/avatar updates) from affecting
 * historical message display.
 */
export interface SenderSnapshot {
  id: string;
  name?: string;
  displayName?: string;
  avatarUrl?: string;
  senderType: 'USER' | 'AGENT';
}

export interface ChatMessage {
  id: string;
  chatRoomId: string;
  senderId: string;
  sender?: ParticipantUser;
  senderType: 'USER' | 'AGENT';
  /** Identity snapshot captured when the message was created. */
  senderSnapshot?: SenderSnapshot;
  content: string;
  type: MessageType;
  attachments?: MessageAttachment[];
  metadata?: MessageMetadata;
  createdAt: string;
}

export interface MessageAttachment {
  id: string;
  type: 'image' | 'file' | 'audio' | 'video';
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
  [key: string]: unknown;
}

/**
 * Capture a sender identity snapshot from message data.
 * Used when creating a message to freeze identity at that point in time.
 */
export function createSenderSnapshot(
  senderId: string,
  senderType: 'USER' | 'AGENT',
  sender?: ParticipantUser
): SenderSnapshot {
  return {
    id: senderId,
    name: sender?.name,
    displayName: sender?.displayName,
    avatarUrl: sender?.avatarUrl,
    senderType,
  };
}

/**
 * Resolve the display identity for a message.
 * Prefers the senderSnapshot (identity at send time) over the live sender data
 * to prevent name/avatar changes from rewriting history.
 */
export function resolveMessageSender(message: ChatMessage): {
  displayName?: string;
  avatarUrl?: string;
  senderType: 'USER' | 'AGENT';
} {
  const snapshot = message.senderSnapshot;
  const sender = message.sender;
  return {
    displayName: snapshot?.displayName || snapshot?.name || sender?.displayName || sender?.name,
    avatarUrl: snapshot?.avatarUrl ?? sender?.avatarUrl,
    senderType: snapshot?.senderType ?? message.senderType,
  };
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
