"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const agentMessage_1 = require("../agentMessage");
describe('AgentMessage Protocol', () => {
    const mockAgentIdentity = {
        agentId: 'agent_123',
        displayName: 'Test Agent',
        type: agentMessage_1.AgentType.PERSONAL,
        ownerId: 'user_456',
        ownerName: 'Test User',
        trustScore: 95,
        isVerified: true,
        capabilities: ['chat', 'search'],
    };
    describe('Constants', () => {
        it('should have correct protocol version', () => {
            expect(agentMessage_1.PROTOCOL_VERSION).toBe('1.0.0');
        });
        it('should have all message types', () => {
            expect(Object.values(agentMessage_1.AgentMessageType)).toContain('direct');
            expect(Object.values(agentMessage_1.AgentMessageType)).toContain('group');
            expect(Object.values(agentMessage_1.AgentMessageType)).toContain('system');
            expect(Object.values(agentMessage_1.AgentMessageType)).toContain('command');
            expect(Object.values(agentMessage_1.AgentMessageType)).toContain('response');
            expect(Object.values(agentMessage_1.AgentMessageType)).toContain('status');
            expect(Object.values(agentMessage_1.AgentMessageType)).toContain('error');
        });
        it('should have all agent types', () => {
            expect(Object.values(agentMessage_1.AgentType)).toContain('personal');
            expect(Object.values(agentMessage_1.AgentType)).toContain('business');
            expect(Object.values(agentMessage_1.AgentType)).toContain('service');
            expect(Object.values(agentMessage_1.AgentType)).toContain('system');
        });
        it('should have correct priority values', () => {
            expect(agentMessage_1.MessagePriority.LOW).toBe(1);
            expect(agentMessage_1.MessagePriority.NORMAL).toBe(2);
            expect(agentMessage_1.MessagePriority.HIGH).toBe(3);
            expect(agentMessage_1.MessagePriority.URGENT).toBe(4);
        });
    });
    describe('createAgentMessage', () => {
        it('should create a valid message with required fields', () => {
            const message = (0, agentMessage_1.createAgentMessage)({
                type: agentMessage_1.AgentMessageType.DIRECT,
                sender: mockAgentIdentity,
                recipientId: 'user_789',
                content: { text: 'Hello' },
            });
            expect(message).toBeDefined();
            expect(message.id).toMatch(/^msg_/);
            expect(message.type).toBe(agentMessage_1.AgentMessageType.DIRECT);
            expect(message.sender).toEqual(mockAgentIdentity);
            expect(message.recipientId).toBe('user_789');
            expect(message.content.text).toBe('Hello');
            expect(message.metadata.version).toBe(agentMessage_1.PROTOCOL_VERSION);
            expect(message.metadata.traceId).toMatch(/^trace_/);
            expect(message.metadata.timestamp).toBeDefined();
        });
        it('should create message with priority', () => {
            const message = (0, agentMessage_1.createAgentMessage)({
                type: agentMessage_1.AgentMessageType.DIRECT,
                sender: mockAgentIdentity,
                recipientId: 'user_789',
                content: { text: 'Urgent' },
                priority: agentMessage_1.MessagePriority.URGENT,
            });
            expect(message.metadata.priority).toBe(agentMessage_1.MessagePriority.URGENT);
        });
        it('should create message with custom metadata', () => {
            const message = (0, agentMessage_1.createAgentMessage)({
                type: agentMessage_1.AgentMessageType.DIRECT,
                sender: mockAgentIdentity,
                recipientId: 'user_789',
                content: { text: 'Hello' },
                customMetadata: { source: 'mobile', lang: 'zh' },
            });
            expect(message.metadata.custom).toEqual({ source: 'mobile', lang: 'zh' });
        });
        it('should create message with reply reference', () => {
            const message = (0, agentMessage_1.createAgentMessage)({
                type: agentMessage_1.AgentMessageType.DIRECT,
                sender: mockAgentIdentity,
                recipientId: 'user_789',
                content: { text: 'Reply' },
                replyTo: 'msg_original_123',
            });
            expect(message.replyTo).toBe('msg_original_123');
        });
    });
    describe('validateAgentMessage', () => {
        it('should validate a correct message', () => {
            const message = (0, agentMessage_1.createAgentMessage)({
                type: agentMessage_1.AgentMessageType.DIRECT,
                sender: mockAgentIdentity,
                recipientId: 'user_789',
                content: { text: 'Hello' },
            });
            const result = (0, agentMessage_1.validateAgentMessage)(message);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });
        it('should reject null message', () => {
            const result = (0, agentMessage_1.validateAgentMessage)(null);
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Message must be an object');
        });
        it('should reject message without id', () => {
            const result = (0, agentMessage_1.validateAgentMessage)({
                type: agentMessage_1.AgentMessageType.DIRECT,
                sender: mockAgentIdentity,
                recipientId: 'user_789',
                content: { text: 'Hello' },
                metadata: { version: '1.0.0', timestamp: new Date().toISOString() },
            });
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Message id is required and must be a string');
        });
        it('should reject invalid message type', () => {
            const result = (0, agentMessage_1.validateAgentMessage)({
                id: 'msg_123',
                type: 'invalid_type',
                sender: mockAgentIdentity,
                recipientId: 'user_789',
                content: { text: 'Hello' },
                metadata: { version: '1.0.0', timestamp: new Date().toISOString() },
            });
            expect(result.valid).toBe(false);
            expect(result.errors).toContain(`Message type must be one of: ${Object.values(agentMessage_1.AgentMessageType).join(', ')}`);
        });
        it('should reject message without sender', () => {
            const result = (0, agentMessage_1.validateAgentMessage)({
                id: 'msg_123',
                type: agentMessage_1.AgentMessageType.DIRECT,
                recipientId: 'user_789',
                content: { text: 'Hello' },
                metadata: { version: '1.0.0', timestamp: new Date().toISOString() },
            });
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Message sender is required and must be an object');
        });
    });
    describe('isVersionCompatible', () => {
        it('should accept same major version', () => {
            expect((0, agentMessage_1.isVersionCompatible)('1.0.0')).toBe(true);
            expect((0, agentMessage_1.isVersionCompatible)('1.1.0')).toBe(true);
            expect((0, agentMessage_1.isVersionCompatible)('1.0.5')).toBe(true);
        });
        it('should reject different major version', () => {
            expect((0, agentMessage_1.isVersionCompatible)('0.9.0')).toBe(false);
            expect((0, agentMessage_1.isVersionCompatible)('2.0.0')).toBe(false);
        });
    });
    describe('serializeMessage', () => {
        it('should serialize message to JSON', () => {
            const message = (0, agentMessage_1.createAgentMessage)({
                type: agentMessage_1.AgentMessageType.DIRECT,
                sender: mockAgentIdentity,
                recipientId: 'user_789',
                content: { text: 'Hello' },
            });
            const json = (0, agentMessage_1.serializeMessage)(message);
            const parsed = JSON.parse(json);
            expect(parsed.id).toBe(message.id);
            expect(parsed.type).toBe(message.type);
            expect(parsed.content.text).toBe('Hello');
        });
    });
    describe('parseMessage', () => {
        it('should parse valid JSON message', () => {
            const message = (0, agentMessage_1.createAgentMessage)({
                type: agentMessage_1.AgentMessageType.DIRECT,
                sender: mockAgentIdentity,
                recipientId: 'user_789',
                content: { text: 'Hello' },
            });
            const json = JSON.stringify(message);
            const parsed = (0, agentMessage_1.parseMessage)(json);
            expect(parsed).not.toBeNull();
            if (parsed) {
                expect(parsed.id).toBe(message.id);
                expect(parsed.type).toBe(message.type);
            }
        });
        it('should return null for invalid JSON', () => {
            const parsed = (0, agentMessage_1.parseMessage)('not valid json');
            expect(parsed).toBeNull();
        });
        it('should return null for invalid message structure', () => {
            const parsed = (0, agentMessage_1.parseMessage)('{"foo": "bar"}');
            expect(parsed).toBeNull();
        });
    });
});
//# sourceMappingURL=agentMessage.test.js.map