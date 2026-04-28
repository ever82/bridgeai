# WebSocket Events Documentation

Socket.io-based real-time event system for chat, presence, and room management.

## Connection

**Endpoint:** `{SERVER_URL}` (with `transports: ['websocket', 'polling']`)

**Authentication:** All namespaces require a valid JWT token passed via `auth.token` or `query.token` during connection.

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/chat', {
  auth: { token: 'your-jwt-token' },
  transports: ['websocket', 'polling'],
});
```

## Namespaces

| Namespace           | Path                  | Description                        | Auth Required |
| ------------------- | --------------------- | ---------------------------------- | ------------- |
| Main                | `/`                   | General events                     | Yes           |
| Chat                | `/chat`               | Chat messaging and room events     | Yes           |
| User                | `/user`               | User-specific events               | Yes           |
| Room                | `/room`               | Room management operations         | Yes           |
| Presence            | `/presence`           | Online/offline presence tracking   | Yes           |
| Group               | `/group`              | Group chat events                  | Yes           |
| Handoff             | `/handoff`            | Human-agent switching              | Yes           |
| Dialog              | `/dialog`             | Agent dialog events                | Yes           |
| Negotiation         | `/negotiation`        | Agent negotiation events           | Yes           |
| Match Subscriptions | `/matchSubscriptions` | Real-time query subscriptions      | Yes           |
| System              | `/system`             | Admin/monitoring (admin role only) | Yes + Admin   |

## Connection Lifecycle

### `connected` (server -> client)

Emitted immediately after successful connection.

```json
{
  "socketId": "abc123",
  "timestamp": "2026-04-29T12:00:00.000Z",
  "namespace": "chat"
}
```

### `disconnect` (client -> server)

Triggered when the client disconnects. The server automatically cleans up rooms and presence.

**Disconnect reasons:** `io server disconnect`, `io client disconnect`, `ping timeout`, `transport close`, `transport error`

### `error` (server -> client)

Emitted when a socket-level error occurs.

```json
{
  "message": "Error description"
}
```

---

## Chat Namespace (`/chat`)

Chat-specific real-time messaging with message persistence.

### `chat:join` (client -> server)

Join a chat room to receive messages.

**Payload:**

```json
{
  "roomId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Callback response (success):**

```json
{
  "success": true,
  "data": {
    "roomId": "550e8400-e29b-41d4-a716-446655440000",
    "memberCount": 5
  }
}
```

**Callback response (error):**

```json
{
  "success": false,
  "error": "Not a member of this room"
}
```

### `chat:user_joined` (server -> client, broadcast)

Emitted to other room members when a user joins.

```json
{
  "userId": "user-uuid",
  "roomId": "room-uuid",
  "timestamp": "2026-04-29T12:00:00.000Z"
}
```

### `chat:leave` (client -> server)

Leave a chat room.

**Payload:**

```json
{
  "roomId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Callback response:**

```json
{
  "success": true
}
```

### `chat:user_left` (server -> client, broadcast)

Emitted to other room members when a user leaves.

```json
{
  "userId": "user-uuid",
  "roomId": "room-uuid",
  "timestamp": "2026-04-29T12:00:00.000Z"
}
```

### `chat:message` (client -> server)

Send a message to a chat room. Must have joined the room first.

**Payload:**

```json
{
  "roomId": "room-uuid",
  "content": "Hello, world!",
  "type": "text",
  "attachments": [],
  "metadata": {}
}
```

**Callback response (success):**

```json
{
  "success": true,
  "data": {
    "messageId": "msg-uuid"
  }
}
```

### `chat:message` (server -> client, broadcast to room)

Broadcast to all room members (including sender) when a message is sent.

```json
{
  "id": "msg-uuid",
  "roomId": "room-uuid",
  "senderId": "user-uuid",
  "sender": { "id": "user-uuid", "name": "John", "avatarUrl": "..." },
  "senderSnapshot": {
    "id": "user-uuid",
    "name": "John",
    "displayName": "John",
    "avatarUrl": "...",
    "senderType": "USER"
  },
  "content": "Hello, world!",
  "type": "text",
  "attachments": null,
  "metadata": null,
  "status": "SENT",
  "createdAt": "2026-04-29T12:00:00.000Z"
}
```

### `chat:ack` (client -> server)

Acknowledge message delivery.

**Payload:**

```json
{
  "roomId": "room-uuid",
  "messageIds": ["msg-uuid-1", "msg-uuid-2"]
}
```

### `chat:delivered` (server -> client, broadcast)

Emitted when delivery is acknowledged.

```json
{
  "userId": "user-uuid",
  "roomId": "room-uuid",
  "messageIds": ["msg-uuid-1"],
  "deliveredAt": "2026-04-29T12:00:00.000Z"
}
```

### `chat:read` (client -> server)

Mark messages as read. Creates read receipts and updates message status.

**Payload:**

```json
{
  "roomId": "room-uuid",
  "messageIds": ["msg-uuid-1", "msg-uuid-2"]
}
```

**Note:** Maximum batch size is 500 message IDs per request.

**Callback response (success):**

```json
{
  "success": true,
  "data": {
    "updated": 2
  }
}
```

### `chat:read_receipt` (server -> client, broadcast)

Emitted when a user marks messages as read.

```json
{
  "userId": "user-uuid",
  "roomId": "room-uuid",
  "messageIds": ["msg-uuid-1"],
  "readAt": "2026-04-29T12:00:00.000Z"
}
```

### `chat:history` (client -> server)

Retrieve message history for a room. Must have joined the room first.

**Payload:**

```json
{
  "roomId": "room-uuid",
  "limit": 50,
  "before": "2026-04-29T12:00:00.000Z",
  "after": "2026-04-29T10:00:00.000Z"
}
```

**Callback response (success):**

```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "msg-uuid",
        "roomId": "room-uuid",
        "senderId": "user-uuid",
        "sender": {},
        "senderSnapshot": {},
        "content": "Hello",
        "type": "text",
        "attachments": null,
        "metadata": null,
        "status": "SENT",
        "createdAt": "2026-04-29T12:00:00.000Z"
      }
    ]
  }
}
```

### `chat:sync` (client -> server)

Synchronize messages since a given timestamp (for offline support).

**Payload:**

```json
{
  "roomId": "room-uuid",
  "lastMessageCreatedAt": "2026-04-29T10:00:00.000Z",
  "limit": 100
}
```

**Callback response (success):**

```json
{
  "success": true,
  "data": {
    "messages": [],
    "lastMessageCreatedAt": "2026-04-29T12:00:00.000Z",
    "hasMore": false
  }
}
```

### `chat:edit` (client -> server)

Edit an existing message. Only the original sender can edit.

**Payload:**

```json
{
  "messageId": "msg-uuid",
  "content": "Updated message content"
}
```

**Callback response (success):**

```json
{
  "success": true,
  "data": {
    "message": {}
  }
}
```

### `chat:message_edited` (server -> client, broadcast)

Emitted when a message is edited.

```json
{
  "messageId": "msg-uuid",
  "content": "Updated message content",
  "editedAt": "2026-04-29T12:00:00.000Z"
}
```

### `chat:delete` (client -> server)

Delete a message. Only the original sender or room admin/owner can delete.

**Payload:**

```json
{
  "messageId": "msg-uuid"
}
```

### `chat:message_deleted` (server -> client, broadcast)

Emitted when a message is deleted.

```json
{
  "messageId": "msg-uuid",
  "deletedAt": "2026-04-29T12:00:00.000Z"
}
```

### `user:online` (client -> server)

Signal that the user is online. Triggers delivery of offline messages.

**Callback response (success):**

```json
{
  "success": true,
  "data": {
    "deliveredCount": 5
  }
}
```

### `chat:offline_messages` (server -> client)

Delivered when coming online or joining a room with pending offline messages.

```json
{
  "roomId": "room-uuid",
  "messages": [
    {
      "id": "msg-uuid",
      "roomId": "room-uuid",
      "senderId": "user-uuid",
      "sender": {},
      "content": "Hello while you were away",
      "type": "text",
      "attachments": null,
      "metadata": null,
      "status": "SENT",
      "sequenceId": "42",
      "createdAt": "2026-04-29T12:00:00.000Z"
    }
  ]
}
```

---

## Room Namespace (`/room`)

Room management operations with authentication and security.

### `room:create` (client -> server)

Create a new room.

**Payload:**

```json
{
  "roomId": "custom-room-id",
  "options": {
    "name": "Room Name",
    "isPrivate": false,
    "maxMembers": 50
  }
}
```

### `room:join` (client -> server)

Join an existing room.

**Payload:**

```json
{
  "roomId": "room-id",
  "password": "optional-password-for-private-rooms"
}
```

### `room:leave` (client -> server)

Leave a room.

**Payload:**

```json
{
  "roomId": "room-id"
}
```

### `room:user_joined` (server -> client, broadcast)

Emitted when a user joins a room.

```json
{
  "roomId": "room-id",
  "userId": "user-uuid",
  "role": "member",
  "timestamp": "2026-04-29T12:00:00.000Z"
}
```

### `room:user_left` (server -> client, broadcast)

Emitted when a user leaves or disconnects.

```json
{
  "roomId": "room-id",
  "userId": "user-uuid",
  "timestamp": "2026-04-29T12:00:00.000Z",
  "reason": "disconnected"
}
```

### `room:broadcast` (client -> server)

Broadcast a custom event to a room.

**Payload:**

```json
{
  "roomId": "room-id",
  "event": "custom:event_name",
  "payload": { "key": "value" },
  "excludeSelf": false
}
```

### `room:broadcast_multi` (client -> server)

Broadcast to multiple rooms simultaneously.

**Payload:**

```json
{
  "roomIds": ["room-1", "room-2"],
  "event": "custom:event_name",
  "payload": { "key": "value" }
}
```

### `room:info` (client -> server)

Get room information.

**Payload:**

```json
{
  "roomId": "room-id"
}
```

### `room:members` (client -> server)

Get room members with presence data.

**Payload:**

```json
{
  "roomId": "room-id"
}
```

### `room:my_rooms` (client -> server)

Get all rooms the current user belongs to.

**Callback response (success):**

```json
{
  "success": true,
  "data": {
    "rooms": []
  }
}
```

### `room:kick` (client -> server, admin/owner only)

Kick a user from a room.

**Payload:**

```json
{
  "roomId": "room-id",
  "targetUserId": "user-uuid"
}
```

### `room:kicked` (server -> client, to kicked user)

Emitted to the kicked user.

### `room:user_kicked` (server -> client, broadcast to room)

Emitted to the room when a user is kicked.

### `room:ban` (client -> server, admin/owner only)

Ban a user from a room.

**Payload:**

```json
{
  "roomId": "room-id",
  "targetUserId": "user-uuid"
}
```

### `room:banned` (server -> client, to banned user)

Emitted to the banned user.

### `room:user_banned` (server -> client, broadcast to room)

Emitted to the room when a user is banned.

### `room:unban` (client -> server, admin/owner only)

Unban a previously banned user.

**Payload:**

```json
{
  "roomId": "room-id",
  "targetUserId": "user-uuid"
}
```

### `room:set_role` (client -> server, admin/owner only)

Set a user's role in a room.

**Payload:**

```json
{
  "roomId": "room-id",
  "targetUserId": "user-uuid",
  "role": "admin"
}
```

### `room:role_changed` (server -> client, to target user)

Emitted to the user whose role was changed.

### `room:user_role_changed` (server -> client, broadcast to room)

Emitted to the room when a user's role is changed.

---

## Presence Namespace (`/presence`)

User online/offline presence tracking and status management.

### `presence:update` (client -> server)

Update the current user's presence status.

**Payload:**

```json
{
  "status": "online",
  "customMessage": "In a meeting"
}
```

**Valid statuses:** `online`, `away`, `busy`, `offline`

**Callback response (success):**

```json
{
  "success": true,
  "data": {
    "status": "online"
  }
}
```

### `presence:status_changed` (server -> client, broadcast to subscribers)

Emitted when a subscribed user's status changes.

```json
{
  "userId": "user-uuid",
  "previousStatus": "online",
  "newStatus": "away",
  "customMessage": "In a meeting",
  "timestamp": "2026-04-29T12:00:00.000Z"
}
```

### `presence:subscribe` (client -> server)

Subscribe to another user's presence updates.

**Payload:**

```json
{
  "targetUserId": "user-uuid"
}
```

**Callback response (success):**

```json
{
  "success": true,
  "data": {
    "userId": "user-uuid",
    "status": "online",
    "lastSeen": "2026-04-29T12:00:00.000Z"
  }
}
```

### `presence:unsubscribe` (client -> server)

Unsubscribe from a user's presence updates.

**Payload:**

```json
{
  "targetUserId": "user-uuid"
}
```

---

## User Namespace (`/user`)

User-specific events including typing indicators and presence queries.

### `user:typing` (client -> server)

Indicate that the user is typing in a room.

**Payload:**

```json
{
  "roomId": "room-uuid",
  "isTyping": true
}
```

The server broadcasts `user:typing` to other users in the room.

### `user:status` (client -> server)

Update the user's status.

**Payload:**

```json
{
  "status": "online"
}
```

### `user:presence` (client -> server)

Query presence status of multiple users.

**Payload:**

```json
{
  "userIds": ["user-uuid-1", "user-uuid-2"]
}
```

### `user:subscribe` (client -> server)

Subscribe to a user's events.

**Payload:**

```json
{
  "userId": "user-uuid"
}
```

### `user:unsubscribe` (client -> server)

Unsubscribe from a user's events.

**Payload:**

```json
{
  "userId": "user-uuid"
}
```

---

## Error Handling

All events use a consistent callback response format:

**Success:**

```json
{
  "success": true,
  "data": {}
}
```

**Error:**

```json
{
  "success": false,
  "error": "Error description"
}
```

Common error messages:

- `Authentication required` - JWT token missing or invalid
- `Not in room` - User has not joined the room via `chat:join` or `room:join`
- `Not a member of this room` - User is not a database-level member of the room
- `Message content cannot be empty` - Empty content in `chat:message`
- `Too many message IDs (max 500)` - Batch size exceeded in `chat:read`
- `Admin access required` - Non-admin accessing system namespace

## Configuration

| Setting           | Value              | Description                  |
| ----------------- | ------------------ | ---------------------------- |
| pingTimeout       | 60000ms            | Heartbeat timeout            |
| pingInterval      | 25000ms            | Heartbeat interval           |
| connectTimeout    | 45000ms            | Connection timeout           |
| upgradeTimeout    | 10000ms            | Transport upgrade timeout    |
| maxHttpBufferSize | 1MB                | Maximum message payload size |
| transports        | websocket, polling | Supported transport modes    |

## Redis Adapter

Multi-node deployments use a Redis adapter for cross-node event broadcasting. All events are automatically propagated across server instances.
