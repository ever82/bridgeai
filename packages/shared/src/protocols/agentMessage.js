"use strict";
/**
 * Agent Message Protocol
 * Defines the communication protocol between Agents in the system
 * @version 1.0.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentProtocolErrorCode = exports.MessagePriority = exports.AgentType = exports.AgentMessageType = exports.PROTOCOL_VERSION = void 0;
exports.validateAgentMessage = validateAgentMessage;
exports.createAgentMessage = createAgentMessage;
exports.isVersionCompatible = isVersionCompatible;
exports.serializeMessage = serializeMessage;
exports.parseMessage = parseMessage;
/**
 * Protocol version for message compatibility
 */
exports.PROTOCOL_VERSION = '1.0.0';
/**
 * Message types supported in the Agent protocol
 */
var AgentMessageType;
(function (AgentMessageType) {
    /** Direct message between users/agents */
    AgentMessageType["DIRECT"] = "direct";
    /** Group chat message */
    AgentMessageType["GROUP"] = "group";
    /** System notification */
    AgentMessageType["SYSTEM"] = "system";
    /** Command instruction */
    AgentMessageType["COMMAND"] = "command";
    /** Response to a command */
    AgentMessageType["RESPONSE"] = "response";
    /** Status update */
    AgentMessageType["STATUS"] = "status";
    /** Error message */
    AgentMessageType["ERROR"] = "error";
})(AgentMessageType || (exports.AgentMessageType = AgentMessageType = {}));
/**
 * Agent types for identification
 */
var AgentType;
(function (AgentType) {
    /** Personal assistant agent */
    AgentType["PERSONAL"] = "personal";
    /** Business/enterprise agent */
    AgentType["BUSINESS"] = "business";
    /** Service provider agent */
    AgentType["SERVICE"] = "service";
    /** System agent */
    AgentType["SYSTEM"] = "system";
})(AgentType || (exports.AgentType = AgentType = {}));
/**
 * Message priority levels
 */
var MessagePriority;
(function (MessagePriority) {
    MessagePriority[MessagePriority["LOW"] = 1] = "LOW";
    MessagePriority[MessagePriority["NORMAL"] = 2] = "NORMAL";
    MessagePriority[MessagePriority["HIGH"] = 3] = "HIGH";
    MessagePriority[MessagePriority["URGENT"] = 4] = "URGENT";
})(MessagePriority || (exports.MessagePriority = MessagePriority = {}));
/**
 * Protocol error codes
 */
var AgentProtocolErrorCode;
(function (AgentProtocolErrorCode) {
    /** Invalid message format */
    AgentProtocolErrorCode["INVALID_FORMAT"] = "INVALID_FORMAT";
    /** Unsupported protocol version */
    AgentProtocolErrorCode["UNSUPPORTED_VERSION"] = "UNSUPPORTED_VERSION";
    /** Sender not authorized */
    AgentProtocolErrorCode["UNAUTHORIZED"] = "UNAUTHORIZED";
    /** Rate limit exceeded */
    AgentProtocolErrorCode["RATE_LIMITED"] = "RATE_LIMITED";
    /** Message content violation */
    AgentProtocolErrorCode["CONTENT_VIOLATION"] = "CONTENT_VIOLATION";
    /** Recipient not found */
    AgentProtocolErrorCode["RECIPIENT_NOT_FOUND"] = "RECIPIENT_NOT_FOUND";
    /** Message expired */
    AgentProtocolErrorCode["MESSAGE_EXPIRED"] = "MESSAGE_EXPIRED";
    /** Internal server error */
    AgentProtocolErrorCode["INTERNAL_ERROR"] = "INTERNAL_ERROR";
})(AgentProtocolErrorCode || (exports.AgentProtocolErrorCode = AgentProtocolErrorCode = {}));
/**
 * Validate message format
 * @param message - Message to validate
 * @returns Validation result
 */
function validateAgentMessage(message) {
    const errors = [];
    if (!message || typeof message !== 'object') {
        errors.push('Message must be an object');
        return { valid: false, errors };
    }
    const msg = message;
    // Required fields
    if (!msg.id || typeof msg.id !== 'string') {
        errors.push('Message id is required and must be a string');
    }
    if (!msg.type || !Object.values(AgentMessageType).includes(msg.type)) {
        errors.push(`Message type must be one of: ${Object.values(AgentMessageType).join(', ')}`);
    }
    if (!msg.sender || typeof msg.sender !== 'object') {
        errors.push('Message sender is required and must be an object');
    }
    if (!msg.recipientId || typeof msg.recipientId !== 'string') {
        errors.push('Message recipientId is required and must be a string');
    }
    if (!msg.content || typeof msg.content !== 'object') {
        errors.push('Message content is required and must be an object');
    }
    if (!msg.metadata || typeof msg.metadata !== 'object') {
        errors.push('Message metadata is required and must be an object');
    }
    else {
        const metadata = msg.metadata;
        if (!metadata.version || typeof metadata.version !== 'string') {
            errors.push('Metadata version is required');
        }
        if (!metadata.timestamp || typeof metadata.timestamp !== 'string') {
            errors.push('Metadata timestamp is required');
        }
    }
    return { valid: errors.length === 0, errors };
}
/**
 * Create a new agent message
 * @param params - Message parameters
 * @returns Constructed agent message
 */
function createAgentMessage(params) {
    const traceId = generateTraceId();
    return {
        id: generateMessageId(),
        type: params.type,
        sender: params.sender,
        recipientId: params.recipientId,
        content: params.content,
        metadata: {
            version: exports.PROTOCOL_VERSION,
            timestamp: new Date().toISOString(),
            priority: params.priority ?? MessagePriority.NORMAL,
            requireAck: false,
            ttl: 0,
            traceId,
            custom: params.customMetadata,
        },
        replyTo: params.replyTo,
        creditInfo: params.creditInfo,
    };
}
/**
 * Generate a unique message ID
 * @returns UUID string
 */
function generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
/**
 * Generate a trace ID for request tracking
 * @returns Trace ID string
 */
function generateTraceId() {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
/**
 * Check if protocol version is compatible
 * @param version - Version string to check
 * @returns Whether version is compatible
 */
function isVersionCompatible(version) {
    const [major] = version.split('.');
    const [currentMajor] = exports.PROTOCOL_VERSION.split('.');
    return major === currentMajor;
}
/**
 * Serialize message to JSON string
 * @param message - Agent message
 * @returns JSON string
 */
function serializeMessage(message) {
    return JSON.stringify(message);
}
/**
 * Parse message from JSON string
 * @param json - JSON string
 * @returns Parsed message or null if invalid
 */
function parseMessage(json) {
    try {
        const parsed = JSON.parse(json);
        const { valid } = validateAgentMessage(parsed);
        return valid ? parsed : null;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=agentMessage.js.map