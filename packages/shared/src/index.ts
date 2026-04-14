// Shared types and utilities
export * from './types';
export * from './schemas';
export * from './utils';
export * from './env';
export * from './config/scenes';
// Re-export from agentMessage, but exclude AgentType to avoid conflict with types/agent.ts
export {
  PROTOCOL_VERSION,
  AgentMessageType,
  MessagePriority,
  AgentMessageMetadata,
  AgentIdentity,
  AgentCreditInfo,
  AgentMessage,
  AgentProtocolErrorCode,
  AgentProtocolError,
  validateAgentMessage,
  createAgentMessage,
  isVersionCompatible,
  serializeMessage,
  parseMessage,
} from './protocols/agentMessage';
