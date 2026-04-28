"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Tests for agent schemas
 */
const agentSchemas_1 = require("../agentSchemas");
describe('Agent Schemas', () => {
    describe('createAgentSchema', () => {
        const validAgent = {
            name: 'Test Agent',
            description: 'A test agent',
            type: 'VISIONSHARE',
            latitude: 40.7128,
            longitude: -74.006,
        };
        it('should validate a valid agent creation', () => {
            const result = agentSchemas_1.createAgentSchema.safeParse(validAgent);
            expect(result.success).toBe(true);
        });
        it('should require name', () => {
            const result = agentSchemas_1.createAgentSchema.safeParse({ ...validAgent, name: '' });
            expect(result.success).toBe(false);
        });
        it('should limit name length', () => {
            const result = agentSchemas_1.createAgentSchema.safeParse({
                ...validAgent,
                name: 'a'.repeat(101),
            });
            expect(result.success).toBe(false);
        });
        it('should limit description length', () => {
            const result = agentSchemas_1.createAgentSchema.safeParse({
                ...validAgent,
                description: 'a'.repeat(2001),
            });
            expect(result.success).toBe(false);
        });
        it('should validate type options', () => {
            const result = agentSchemas_1.createAgentSchema.safeParse({
                ...validAgent,
                type: 'INVALID_TYPE',
            });
            expect(result.success).toBe(false);
        });
        it('should use defaults for optional fields', () => {
            const minimalAgent = { name: 'Test Agent', type: 'VISIONSHARE' };
            const result = agentSchemas_1.createAgentSchema.safeParse(minimalAgent);
            expect(result.success).toBe(true);
        });
    });
    describe('updateAgentSchema', () => {
        it('should allow partial updates', () => {
            const result = agentSchemas_1.updateAgentSchema.safeParse({
                name: 'Updated Name',
            });
            expect(result.success).toBe(true);
        });
        it('should validate all update fields', () => {
            const result = agentSchemas_1.updateAgentSchema.safeParse({
                name: 'Updated Name',
                temperature: 0.5,
                isActive: true,
            });
            expect(result.success).toBe(true);
        });
    });
    describe('sendMessageSchema', () => {
        const validMessage = {
            content: 'Hello, agent!',
            conversationId: '550e8400-e29b-41d4-a716-446655440000',
        };
        it('should validate valid message', () => {
            const result = agentSchemas_1.sendMessageSchema.safeParse(validMessage);
            expect(result.success).toBe(true);
        });
        it('should require content', () => {
            const result = agentSchemas_1.sendMessageSchema.safeParse({
                ...validMessage,
                content: '',
            });
            expect(result.success).toBe(false);
        });
        it('should limit content length', () => {
            const result = agentSchemas_1.sendMessageSchema.safeParse({
                ...validMessage,
                content: 'a'.repeat(10001),
            });
            expect(result.success).toBe(false);
        });
        it('should validate attachments', () => {
            const result = agentSchemas_1.sendMessageSchema.safeParse({
                ...validMessage,
                attachments: [
                    {
                        type: 'image',
                        url: 'https://example.com/image.jpg',
                        name: 'image.jpg',
                    },
                ],
            });
            expect(result.success).toBe(true);
        });
        it('should limit attachment count', () => {
            const result = agentSchemas_1.sendMessageSchema.safeParse({
                ...validMessage,
                attachments: Array(11).fill({
                    type: 'image',
                    url: 'https://example.com/image.jpg',
                    name: 'image.jpg',
                }),
            });
            expect(result.success).toBe(false);
        });
        it('should have stream default to false', () => {
            const result = agentSchemas_1.sendMessageSchema.safeParse(validMessage);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.stream).toBe(false);
            }
        });
    });
    describe('agentIdParamsSchema', () => {
        it('should validate UUID format', () => {
            const result = agentSchemas_1.agentIdParamsSchema.safeParse({
                agentId: '550e8400-e29b-41d4-a716-446655440000',
            });
            expect(result.success).toBe(true);
        });
        it('should reject invalid UUID', () => {
            const result = agentSchemas_1.agentIdParamsSchema.safeParse({
                agentId: 'invalid-uuid',
            });
            expect(result.success).toBe(false);
        });
    });
    describe('listAgentsQuerySchema', () => {
        it('should validate with defaults', () => {
            const result = agentSchemas_1.listAgentsQuerySchema.safeParse({});
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.page).toBe(1);
                expect(result.data.limit).toBe(20);
            }
        });
        it('should allow filters', () => {
            const result = agentSchemas_1.listAgentsQuerySchema.safeParse({
                model: 'gpt-4',
                isPublic: 'true',
                ownerId: '550e8400-e29b-41d4-a716-446655440000',
            });
            expect(result.success).toBe(true);
        });
        it('should coerce boolean from string', () => {
            const result = agentSchemas_1.listAgentsQuerySchema.safeParse({
                isPublic: 'true',
            });
            expect(result.success).toBe(true);
            if (result.success) {
                expect(typeof result.data.isPublic).toBe('boolean');
                expect(result.data.isPublic).toBe(true);
            }
        });
    });
    describe('agentStatsQuerySchema', () => {
        it('should validate with defaults', () => {
            const result = agentSchemas_1.agentStatsQuerySchema.safeParse({});
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.granularity).toBe('day');
            }
        });
        it('should validate date range', () => {
            const result = agentSchemas_1.agentStatsQuerySchema.safeParse({
                startDate: '2024-01-01',
                endDate: '2024-01-31',
            });
            expect(result.success).toBe(true);
        });
        it('should validate granularity options', () => {
            const result = agentSchemas_1.agentStatsQuerySchema.safeParse({
                granularity: 'invalid',
            });
            expect(result.success).toBe(false);
        });
    });
});
//# sourceMappingURL=agentSchemas.test.js.map