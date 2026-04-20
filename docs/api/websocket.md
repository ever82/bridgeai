# WebSocket Events Documentation

BridgeAI uses Socket.io for real-time communication. All WebSocket connections require JWT authentication.

## Connection

Connect to the WebSocket server with a valid JWT token:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-access-token',
  },
});
```

## Events

### Client → Server

| Event | Description | Payload |
|-------|-------------|---------|
| `chat:join` | Join a conversation room | `{ conversationId: string }` |
| `chat:leave` | Leave a conversation room | `{ conversationId: string }` |
| `chat:message` | Send a real-time message | `{ conversationId, content, attachments? }` |
| `chat:typing` | Indicate typing status | `{ conversationId: string }` |
| `chat:stop-typing` | Stop typing indicator | `{ conversationId: string }` |
| `notification:subscribe` | Subscribe to notifications | - |
| `presence:update` | Update user presence | `{ status: 'online' \| 'away' \| 'offline' }` |

### Server → Client

| Event | Description | Payload |
|-------|-------------|---------|
| `chat:message` | New message received | `Message` object |
| `chat:typing` | Another user is typing | `{ userId, conversationId }` |
| `chat:stop-typing` | User stopped typing | `{ userId, conversationId }` |
| `chat:read` | Messages marked as read | `{ conversationId, userId, messageIds }` |
| `notification:new` | New notification | `Notification` object |
| `match:new` | New mutual match | `Match` object |
| `match:update` | Match status changed | `Match` object |
| `presence:update` | User presence changed | `{ userId, status, lastSeen }` |
| `error` | Error occurred | `{ message, code }` |

## Message Types

```typescript
interface WebSocketMessage {
  id: string;            // UUID
  conversationId: string; // UUID
  role: 'user' | 'assistant' | 'system';
  content: string;       // 1-20000 characters
  attachments?: Attachment[];
  createdAt: string;     // ISO 8601 datetime
}

interface Attachment {
  type: 'image' | 'file' | 'audio' | 'video' | 'code';
  url: string;
  name: string;
  size: number;
}
```

## Error Handling

On connection or event errors, the server emits an `error` event:

```json
{
  "message": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

Common error codes:
- `UNAUTHORIZED` - Invalid or missing JWT token
- `FORBIDDEN` - No access to the requested resource
- `NOT_FOUND` - Conversation or resource not found
- `RATE_LIMITED` - Too many messages
- `VALIDATION_ERROR` - Invalid message payload
