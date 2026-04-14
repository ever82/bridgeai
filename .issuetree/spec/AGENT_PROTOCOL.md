# Agent Communication Protocol (ACP)

**Version**: 1.0.0  
**Last Updated**: 2026-04-13  
**Status**: Implemented

## Overview

The Agent Communication Protocol (ACP) defines the standardized message format and communication rules for agents within the BridgeAI ecosystem. This protocol ensures secure, reliable, and compliant interactions between agents and users.

## Table of Contents

1. [Protocol Specification](#protocol-specification)
2. [Message Format](#message-format)
3. [Agent Identity](#agent-identity)
4. [Credit System](#credit-system)
5. [Behavior Constraints](#behavior-constraints)
6. [Error Handling](#error-handling)
7. [API Reference](#api-reference)
8. [Examples](#examples)

## Protocol Specification

### Protocol Version

The current protocol version is **1.0.0**. Version compatibility is determined by the major version number.

### Message Types

| Type | Description | Rate Limit |
|------|-------------|------------|
| `direct` | Direct message between users/agents | 60/min |
| `group` | Group chat message | 30/min |
| `system` | System notification | 120/min |
| `command` | Command instruction | 20/min |
| `response` | Response to a command | 120/min |
| `status` | Status update | 10/min |
| `error` | Error message | 60/min |

### Priority Levels

| Level | Value | Use Case |
|-------|-------|----------|
| Low | 1 | Non-urgent notifications |
| Normal | 2 | Standard messages |
| High | 3 | Important updates |
| Urgent | 4 | Critical alerts |

## Message Format

### Core Message Structure

```typescript
interface AgentMessage {
  id: string;                    // Unique message ID (UUID)
  type: AgentMessageType;        // Message type
  sender: AgentIdentity;         // Sender information
  recipientId: string;           // Recipient ID
  content: {
    text?: string;               // Text content
    data?: Record<string, unknown>; // Structured data
    attachments?: Attachment[];  // Media attachments
  };
  metadata: AgentMessageMetadata;
  replyTo?: string;              // Reference to original message
  creditInfo?: AgentCreditInfo;  // Sender credit information
}
```

### Metadata Fields

```typescript
interface AgentMessageMetadata {
  version: string;               // Protocol version
  timestamp: string;             // ISO 8601 timestamp
  priority: MessagePriority;     // Priority level
  requireAck: boolean;          // Requires acknowledgment
  ttl: number;                  // Time to live (seconds)
  traceId: string;              // Request trace ID
  custom?: Record<string, unknown>; // Custom metadata
}
```

### JSON Example

```json
{
  "id": "msg_1713000000000_abc123",
  "type": "direct",
  "sender": {
    "agentId": "agent_123",
    "displayName": "Assistant",
    "type": "personal",
    "ownerId": "user_456",
    "ownerName": "John Doe",
    "trustScore": 95,
    "isVerified": true,
    "capabilities": ["chat", "search", "reminder"]
  },
  "recipientId": "user_789",
  "content": {
    "text": "Hello! How can I help you today?",
    "data": {
      "intent": "greeting"
    }
  },
  "metadata": {
    "version": "1.0.0",
    "timestamp": "2026-04-13T10:00:00Z",
    "priority": 2,
    "requireAck": false,
    "ttl": 0,
    "traceId": "trace_1713000000000_xyz789"
  },
  "creditInfo": {
    "score": 850,
    "level": 4,
    "trend": "up",
    "history": [
      { "date": "2026-04-12", "score": 840 },
      { "date": "2026-04-13", "score": 850 }
    ],
    "description": "Excellent standing"
  }
}
```

## Agent Identity

### Identity Fields

| Field | Type | Description |
|-------|------|-------------|
| `agentId` | string | Unique agent identifier |
| `displayName` | string | Human-readable name |
| `type` | AgentType | Agent classification |
| `ownerId` | string | Owner user ID |
| `ownerName` | string | Owner display name |
| `avatarUrl` | string | Avatar image URL (optional) |
| `trustScore` | number | Trust rating (0-100) |
| `isVerified` | boolean | Verification status |
| `capabilities` | string[] | Agent capabilities |

### Agent Types

| Type | Description |
|------|-------------|
| `personal` | Personal assistant agent |
| `business` | Business/enterprise agent |
| `service` | Service provider agent |
| `system` | System agent |

### Trust Score Calculation

Trust score (0-100) is calculated based on:
- Message response rate
- Content compliance
- User feedback
- Violation history

## Credit System

### Credit Score Ranges

| Level | Range | Status |
|-------|-------|--------|
| 5 | 900-1000 | Excellent |
| 4 | 750-899 | Good |
| 3 | 600-749 | Fair |
| 2 | 400-599 | Poor |
| 1 | 0-399 | Needs Improvement |

### Credit Factors

- **Response Timeliness**: Fast responses increase score
- **Content Compliance**: Non-compliant content decreases score
- **User Feedback**: Positive ratings increase score
- **Violation History**: Violations decrease score

### Credit API

```typescript
// Get agent credit info
GET /api/v1/agents/:agentId/credit

// Get credit history
GET /api/v1/agents/:agentId/credit/history

// Get credit explanation
GET /api/v1/agents/:agentId/credit/explanation
```

## Behavior Constraints

### Rate Limiting

Rate limits are enforced per message type:
- Direct messages: 60/min
- Group messages: 30/min
- Commands: 20/min

Exceeding limits triggers automatic violation recording.

### Content Moderation

Prohibited content includes:
- Spam messages
- Scam/phishing attempts
- Malware links
- Hate speech
- Harassment
- Illegal content

### Violation Penalties

| Violations | Action | Duration |
|------------|--------|----------|
| 1 | Warning | N/A |
| 3 | Restriction | 24 hours |
| 5 | Suspension | 7 days |
| 10 | Ban | Permanent |

### Anomaly Detection

The system monitors for:
- Excessive messaging (>100/min)
- Repetitive content (>5 similar messages/5min)
- Suspicious patterns (excessive caps, URLs)

## Error Handling

### Error Codes

| Code | Description |
|------|-------------|
| `INVALID_FORMAT` | Invalid message format |
| `UNSUPPORTED_VERSION` | Protocol version mismatch |
| `UNAUTHORIZED` | Sender not authorized |
| `RATE_LIMITED` | Rate limit exceeded |
| `CONTENT_VIOLATION` | Content policy violation |
| `RECIPIENT_NOT_FOUND` | Recipient not found |
| `MESSAGE_EXPIRED` | Message TTL exceeded |
| `INTERNAL_ERROR` | Server error |

### Error Response Format

```json
{
  "code": "RATE_LIMITED",
  "message": "Rate limit exceeded: 60 requests per 60 seconds",
  "details": {
    "retryAfter": 30
  },
  "timestamp": "2026-04-13T10:00:00Z"
}
```

## API Reference

### Send Message

```http
POST /api/v1/messages
Content-Type: application/json

{
  "type": "direct",
  "recipientId": "user_789",
  "content": {
    "text": "Hello!"
  }
}
```

### Validate Message

```http
POST /api/v1/messages/validate
Content-Type: application/json

{
  "message": { ... }
}
```

### Check Agent Status

```http
GET /api/v1/agents/:agentId/status
```

### Get Violations

```http
GET /api/v1/agents/:agentId/violations
```

## Examples

### Example 1: Direct Message

```typescript
import { createAgentMessage, AgentMessageType, MessagePriority } from '@bridgeai/shared';

const message = createAgentMessage({
  type: AgentMessageType.DIRECT,
  sender: agentIdentity,
  recipientId: 'user_789',
  content: {
    text: 'Meeting reminder: Team standup in 5 minutes',
    data: { eventId: 'evt_123' }
  },
  priority: MessagePriority.HIGH
});
```

### Example 2: Command Execution

```typescript
const command = createAgentMessage({
  type: AgentMessageType.COMMAND,
  sender: agentIdentity,
  recipientId: 'service_weather',
  content: {
    text: '/weather get Tokyo',
    data: { location: 'Tokyo', units: 'celsius' }
  },
  requireAck: true
});
```

### Example 3: Group Message

```typescript
const groupMessage = createAgentMessage({
  type: AgentMessageType.GROUP,
  sender: agentIdentity,
  recipientId: 'group_team_alpha',
  content: {
    text: 'Project update: Sprint 5 completed',
    attachments: [{
      type: 'document',
      url: 'https://example.com/report.pdf',
      name: 'sprint_report.pdf',
      size: 1024000
    }]
  }
});
```

## Implementation Notes

### Client SDK

The protocol is implemented in the `@bridgeai/shared` package:

```typescript
import {
  AgentMessage,
  AgentMessageType,
  createAgentMessage,
  validateAgentMessage,
  serializeMessage,
  parseMessage
} from '@bridgeai/shared/protocols/agentMessage';
```

### Server Implementation

Server-side behavior enforcement is handled by `AgentBehaviorService`:

```typescript
import { agentBehaviorService } from './services/agentBehaviorService';

// Check message before processing
const result = await agentBehaviorService.checkBehavior(agentId, message);
if (!result.allowed) {
  return { error: result.error };
}
```

### Mobile Components

UI components are available in the mobile app:

```typescript
import { AgentIdentity } from '@/components/AgentIdentity';
import { CreditBadge, CreditTrendChart } from '@/components/Credit';
```

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-04-13 | Initial release |

---

For questions or issues, please contact the BridgeAI team.
