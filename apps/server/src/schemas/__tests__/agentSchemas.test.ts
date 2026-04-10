/**
 * Tests for agent schemas
 */
import {
  createAgentSchema,
  updateAgentSchema,
  sendMessageSchema,
  agentIdParamsSchema,
  listAgentsQuerySchema,
  agentStatsQuerySchema,
} from '../agentSchemas';

describe('Agent Schemas', () => {
  describe('createAgentSchema', () => {
    const validAgent = {
      name: 'Test Agent',
      description: 'A test agent',
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2048,
      systemPrompt: 'You are a helpful assistant',
      isPublic: false,
    };

    it('should validate a valid agent creation', () => {
      const result = createAgentSchema.safeParse(validAgent);
      expect(result.success).toBe(true);
    });

    it('should require name', () => {
      const result = createAgentSchema.safeParse({ ...validAgent, name: '' });
      expect(result.success).toBe(false);
    });

    it('should limit name length', () => {
      const result = createAgentSchema.safeParse({
        ...validAgent,
        name: 'a'.repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it('should limit description length', () => {
      const result = createAgentSchema.safeParse({
        ...validAgent,
        description: 'a'.repeat(2001),
      });
      expect(result.success).toBe(false);
    });

    it('should validate model options', () => {
      const result = createAgentSchema.safeParse({
        ...validAgent,
        model: 'invalid-model',
      });
      expect(result.success).toBe(false);
    });

    it('should validate temperature range', () => {
      const result = createAgentSchema.safeParse({
        ...validAgent,
        temperature: 3,
      });
      expect(result.success).toBe(false);
    });

    it('should validate maxTokens range', () => {
      const result = createAgentSchema.safeParse({
        ...validAgent,
        maxTokens: 10000,
      });
      expect(result.success).toBe(false);
    });

    it('should limit allowedTools count', () => {
      const result = createAgentSchema.safeParse({
        ...validAgent,
        allowedTools: Array(21).fill('tool'),
      });
      expect(result.success).toBe(false);
    });

    it('should use defaults for optional fields', () => {
      const minimalAgent = { name: 'Test Agent' };
      const result = createAgentSchema.safeParse(minimalAgent);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.model).toBe('gpt-3.5-turbo');
        expect(result.data.temperature).toBe(0.7);
        expect(result.data.maxTokens).toBe(2048);
        expect(result.data.isPublic).toBe(false);
      }
    });
  });

  describe('updateAgentSchema', () => {
    it('should allow partial updates', () => {
      const result = updateAgentSchema.safeParse({
        name: 'Updated Name',
      });
      expect(result.success).toBe(true);
    });

    it('should validate all update fields', () => {
      const result = updateAgentSchema.safeParse({
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
      const result = sendMessageSchema.safeParse(validMessage);
      expect(result.success).toBe(true);
    });

    it('should require content', () => {
      const result = sendMessageSchema.safeParse({
        ...validMessage,
        content: '',
      });
      expect(result.success).toBe(false);
    });

    it('should limit content length', () => {
      const result = sendMessageSchema.safeParse({
        ...validMessage,
        content: 'a'.repeat(10001),
      });
      expect(result.success).toBe(false);
    });

    it('should validate attachments', () => {
      const result = sendMessageSchema.safeParse({
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
      const result = sendMessageSchema.safeParse({
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
      const result = sendMessageSchema.safeParse(validMessage);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.stream).toBe(false);
      }
    });
  });

  describe('agentIdParamsSchema', () => {
    it('should validate UUID format', () => {
      const result = agentIdParamsSchema.safeParse({
        agentId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = agentIdParamsSchema.safeParse({
        agentId: 'invalid-uuid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('listAgentsQuerySchema', () => {
    it('should validate with defaults', () => {
      const result = listAgentsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should allow filters', () => {
      const result = listAgentsQuerySchema.safeParse({
        model: 'gpt-4',
        isPublic: 'true',
        ownerId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should coerce boolean from string', () => {
      const result = listAgentsQuerySchema.safeParse({
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
      const result = agentStatsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.granularity).toBe('day');
      }
    });

    it('should validate date range', () => {
      const result = agentStatsQuerySchema.safeParse({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });
      expect(result.success).toBe(true);
    });

    it('should validate granularity options', () => {
      const result = agentStatsQuerySchema.safeParse({
        granularity: 'invalid',
      });
      expect(result.success).toBe(false);
    });
  });
});
