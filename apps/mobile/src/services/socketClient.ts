/**
 * Socket.io Client Service
 *
 * Mobile Socket.io client with connection management,
 * reconnection, and event handling.
 */
import { io, type Socket } from 'socket.io-client';
import { EventEmitter } from 'eventemitter3';

// Connection configuration
const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:3000';
const RECONNECTION_ATTEMPTS = 5;
const RECONNECTION_DELAY = 1000;
const RECONNECTION_DELAY_MAX = 5000;
const TIMEOUT = 20000;

/**
 * Socket events
 */
export type SocketEventType =
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'reconnected'
  | 'error'
  | 'message'
  | 'user:status_update'
  | 'user:typing'
  | 'chat:message'
  | 'chat:user_joined'
  | 'chat:user_left'
  | 'chat:read_receipt'
  | 'group:state_sync'
  | 'group:member_online'
  | 'group:member_offline'
  | 'group:member_added'
  | 'group:member_removed'
  | 'group:settings_updated'
  | 'system:broadcast';

/**
 * Socket.io client service
 */
class SocketClient extends EventEmitter {
  private socket: Socket | null = null;
  private authToken: string | null = null;
  private reconnectAttempts = 0;
  private isManualDisconnect = false;
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' = 'disconnected';

  constructor() {
    super();
  }

  /**
   * Initialize socket connection
   */
  initialize(authToken: string): void {
    this.authToken = authToken;
    this.connect();
  }

  /**
   * Connect to socket server
   */
  private connect(namespace = '/'): void {
    if (this.socket?.connected) {
      return;
    }

    this.isManualDisconnect = false;
    this.connectionState = 'connecting';

    const url = namespace === '/' ? SOCKET_URL : `${SOCKET_URL}${namespace}`;

    this.socket = io(url, {
      auth: { token: this.authToken },
      transports: ['websocket', 'polling'],
      timeout: TIMEOUT,
      reconnection: true,
      reconnectionAttempts: RECONNECTION_ATTEMPTS,
      reconnectionDelay: RECONNECTION_DELAY,
      reconnectionDelayMax: RECONNECTION_DELAY_MAX,
      randomizationFactor: 0.5,
    });

    this.setupEventHandlers();
  }

  /**
   * Setup socket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('[SocketClient] Connected:', this.socket?.id);
      this.connectionState = 'connected';
      this.reconnectAttempts = 0;
      this.emit('connected', { socketId: this.socket?.id });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[SocketClient] Disconnected:', reason);
      this.connectionState = 'disconnected';
      this.emit('disconnected', { reason, wasManual: this.isManualDisconnect });

      // Auto-reconnect if not manual disconnect
      if (!this.isManualDisconnect && reason !== 'io client disconnect') {
        this.connectionState = 'reconnecting';
        this.emit('reconnecting', { attempt: this.reconnectAttempts + 1 });
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('[SocketClient] Connection error:', error.message);
      this.emit('error', { type: 'connection', error });
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('[SocketClient] Reconnected after', attemptNumber, 'attempts');
      this.connectionState = 'connected';
      this.reconnectAttempts = 0;
      this.emit('reconnected', { attemptNumber });
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('[SocketClient] Reconnection attempt:', attemptNumber);
      this.reconnectAttempts = attemptNumber;
      this.connectionState = 'reconnecting';
      this.emit('reconnecting', { attempt: attemptNumber });
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('[SocketClient] Reconnection error:', error);
      this.emit('error', { type: 'reconnection', error });
    });

    this.socket.on('reconnect_failed', () => {
      console.error('[SocketClient] Reconnection failed after all attempts');
      this.connectionState = 'disconnected';
      this.emit('error', { type: 'reconnection_failed', message: 'Max reconnection attempts reached' });
    });

    // Server acknowledgment
    this.socket.on('connected', (data) => {
      console.log('[SocketClient] Server acknowledged connection:', data);
    });

    // Ping/Pong for connection health
    this.socket.on('pong', (data) => {
      this.emit('pong', data);
    });

    // Chat events
    this.socket.on('chat:message', (data) => {
      this.emit('chat:message', data);
    });

    this.socket.on('chat:user_joined', (data) => {
      this.emit('chat:user_joined', data);
    });

    this.socket.on('chat:user_left', (data) => {
      this.emit('chat:user_left', data);
    });

    this.socket.on('chat:read_receipt', (data) => {
      this.emit('chat:read_receipt', data);
    });

    // User events
    this.socket.on('user:status_update', (data) => {
      this.emit('user:status_update', data);
    });

    this.socket.on('user:typing', (data) => {
      this.emit('user:typing', data);
    });

    // Group events
    this.socket.on('group:state_sync', (data) => {
      this.emit('group:state_sync', data);
    });

    this.socket.on('group:member_online', (data) => {
      this.emit('group:member_online', data);
    });

    this.socket.on('group:member_offline', (data) => {
      this.emit('group:member_offline', data);
    });

    this.socket.on('group:member_added', (data) => {
      this.emit('group:member_added', data);
    });

    this.socket.on('group:member_removed', (data) => {
      this.emit('group:member_removed', data);
    });

    this.socket.on('group:settings_updated', (data) => {
      this.emit('group:settings_updated', data);
    });

    // System events
    this.socket.on('system:broadcast', (data) => {
      this.emit('system:broadcast', data);
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('[SocketClient] Socket error:', error);
      this.emit('error', { type: 'socket', error });
    });
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get connection state
   */
  getConnectionState(): string {
    return this.connectionState;
  }

  /**
   * Send ping to server
   */
  ping(): void {
    this.socket?.emit('ping');
  }

  /**
   * Join a chat room
   */
  joinRoom(roomId: string, callback?: (result: any) => void): void {
    this.socket?.emit('chat:join', { roomId }, callback);
  }

  /**
   * Leave a chat room
   */
  leaveRoom(roomId: string, callback?: (result: any) => void): void {
    this.socket?.emit('chat:leave', { roomId }, callback);
  }

  /**
   * Send message to room
   */
  sendMessage(roomId: string, content: string, type = 'text', callback?: (result: any) => void): void {
    this.socket?.emit('chat:message', { roomId, content, type }, callback);
  }

  /**
   * Mark messages as read
   */
  markAsRead(roomId: string, messageIds: string[]): void {
    this.socket?.emit('chat:read', { roomId, messageIds });
  }

  /**
   * Update user status
   */
  updateStatus(status: string): void {
    this.socket?.emit('user:status', { status });
  }

  /**
   * Set typing indicator
   */
  setTyping(roomId: string, isTyping: boolean): void {
    this.socket?.emit('user:typing', { roomId, isTyping });
  }

  /**
   * Get user presence
   */
  getPresence(userIds: string[]): Promise<any> {
    return new Promise((resolve, reject) => {
      this.socket?.emit('user:presence', { userIds }, (response: any) => {
        if (response?.success) {
          resolve(response.data);
        } else {
          reject(new Error(response?.error || 'Failed to get presence'));
        }
      });
    });
  }

  /**
   * Subscribe to user events
   */
  subscribeToUser(userId: string): void {
    this.socket?.emit('user:subscribe', { userId });
  }

  /**
   * Unsubscribe from user events
   */
  unsubscribeFromUser(userId: string): void {
    this.socket?.emit('user:unsubscribe', { userId });
  }

  /**
   * Start private conversation
   */
  startPrivateConversation(targetUserId: string): Promise<{ roomId: string }> {
    return new Promise((resolve, reject) => {
      this.socket?.emit('chat:start_private', { targetUserId }, (response: any) => {
        if (response?.success) {
          resolve(response.data);
        } else {
          reject(new Error(response?.error || 'Failed to start conversation'));
        }
      });
    });
  }

  /**
   * Disconnect socket
   */
  disconnect(): void {
    this.isManualDisconnect = true;
    this.socket?.disconnect();
    this.connectionState = 'disconnected';
  }

  /**
   * Reconnect socket
   */
  reconnect(): void {
    if (this.socket && !this.socket.connected) {
      this.isManualDisconnect = false;
      this.socket.connect();
    }
  }

  // ==================== Group Methods ====================

  /**
   * Create a group
   */
  createGroup(name: string, memberIds?: string[]): Promise<{ groupId: string; state: any }> {
    return new Promise((resolve, reject) => {
      this.socket?.emit('group:create', { name, memberIds }, (response: any) => {
        if (response?.success) {
          resolve(response.data);
        } else {
          reject(new Error(response?.error || 'Failed to create group'));
        }
      });
    });
  }

  /**
   * Join a group
   */
  joinGroup(groupId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.socket?.emit('group:join', { groupId }, (response: any) => {
        if (response?.success) {
          resolve(response.data);
        } else {
          reject(new Error(response?.error || 'Failed to join group'));
        }
      });
    });
  }

  /**
   * Leave a group
   */
  leaveGroup(groupId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket?.emit('group:leave', { groupId }, (response: any) => {
        if (response?.success) {
          resolve();
        } else {
          reject(new Error(response?.error || 'Failed to leave group'));
        }
      });
    });
  }

  /**
   * Sync group state
   */
  syncGroup(groupId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.socket?.emit('group:sync', { groupId }, (response: any) => {
        if (response?.success) {
          resolve(response.data);
        } else {
          reject(new Error(response?.error || 'Failed to sync group'));
        }
      });
    });
  }

  /**
   * Update group settings
   */
  updateGroupSettings(groupId: string, settings: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.socket?.emit('group:update_settings', { groupId, settings }, (response: any) => {
        if (response?.success) {
          resolve(response.data);
        } else {
          reject(new Error(response?.error || 'Failed to update settings'));
        }
      });
    });
  }

  /**
   * Add member to group
   */
  addGroupMember(groupId: string, userId: string, role?: 'admin' | 'member'): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket?.emit('group:add_member', { groupId, userId, role }, (response: any) => {
        if (response?.success) {
          resolve();
        } else {
          reject(new Error(response?.error || 'Failed to add member'));
        }
      });
    });
  }

  /**
   * Remove member from group
   */
  removeGroupMember(groupId: string, userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket?.emit('group:remove_member', { groupId, userId }, (response: any) => {
        if (response?.success) {
          resolve();
        } else {
          reject(new Error(response?.error || 'Failed to remove member'));
        }
      });
    });
  }

  // ==================== Cleanup ====================

  /**
   * Clean up and destroy
   */
  destroy(): void {
    this.disconnect();
    this.socket = null;
    this.authToken = null;
    this.removeAllListeners();
  }
}

// Export singleton instance
export const socketClient = new SocketClient();
export default socketClient;
