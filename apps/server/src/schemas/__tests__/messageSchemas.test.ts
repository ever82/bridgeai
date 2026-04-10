/**
 * Tests for message schemas
 */
import {
  createConversationSchema,
  sendMessageRequestSchema,
  updateMessageSchema,
  conversationIdParamsSchema,
  messageIdParamsSchema,
  listMessagesQuerySchema,
  listConversationsQuerySchema,
  searchMessagesQuerySchema,
} from '../messageSchemas';

describe('Message Schemas', () => {
  describe('createConversationSchema', () => {
    it('should validate valid conversation creation', () => {
      const result = createConversationSchema.safeParse({
        agentId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should require agentId', () => {
      const result = createConversationSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should validate UUID format for agentId', () => {
      const result = createConversationSchema.safeParse({
        agentId: 'invalid-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('should allow optional title', () => {
      const result = createConversationSchema.safeParse({
        agentId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'My Conversation',
      });
      expect(result.success).toBe(true);
    });

    it('should limit title length', () => {
      const result = createConversationSchema.safeParse({
        agentId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'a'.repeat(201),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('sendMessageRequestSchema', () => {
    const validMessage = {
      content: 'Hello!',
    };

    it('should validate valid message', () => {
      const result = sendMessageRequestSchema.safeParse(validMessage);
      expect(result.success).toBe(true);
    });

    it('should require content', () => {
      const result = sendMessageRequestSchema.safeParse({
        content: '',
      });
      expect(result.success).toBe(false);
    });

    it('should limit content length', () => {
      const result = sendMessageRequestSchema.safeParse({
        content: 'a'.repeat(20001),
      });
      expect(result.success).toBe(false);
    });

    it('should validate role options', () => {
      const result = sendMessageRequestSchema.safeParse({
        ...validMessage,
        role: 'invalid-role',
      });
      expect(result.success).toBe(false);
    });

    it('should validate parent message ID', () => {
      const result = sendMessageRequestSchema.safeParse({
        ...validMessage,
        parentMessageId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should validate attachments', () => {
      const result = sendMessageRequestSchema.safeParse({
        ...validMessage,
        attachments: [
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            type: 'image',
            name: 'photo.jpg',
            url: 'https://example.com/photo.jpg',
            size: 1024,
            mimeType: 'image/jpeg',
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should limit attachment count', () => {
      const result = sendMessageRequestSchema.safeParse({
        ...validMessage,
        attachments: Array(11).fill({
          id: '550e8400-e29b-41d4-a716-446655440001',
          type: 'image',
          name: 'photo.jpg',
          url: 'https://example.com/photo.jpg',
          size: 1024,
          mimeType: 'image/jpeg',
        }),
      });
      expect(result.success).toBe(false);
    });

    it('should have role default to user', () => {
      const result = sendMessageRequestSchema.safeParse(validMessage);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('user');
      }
    });
  });

  describe('updateMessageSchema', () => {
    it('should allow partial updates', () => {
      const result = updateMessageSchema.safeParse({
        content: 'Updated content',
      });
      expect(result.success).toBe(true);
    });

    it('should allow empty update', () => {
      const result = updateMessageSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('conversationIdParamsSchema', () => {
    it('should validate UUID format', () => {
      const result = conversationIdParamsSchema.safeParse({
        conversationId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = conversationIdParamsSchema.safeParse({
        conversationId: 'invalid-uuid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('messageIdParamsSchema', () => {
    it('should validate UUID format', () => {
      const result = messageIdParamsSchema.safeParse({
        messageId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = messageIdParamsSchema.safeParse({
        messageId: 'invalid-uuid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('listMessagesQuerySchema', () => {
    it('should validate with defaults', () => {
      const result = listMessagesQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(50);
        expect(result.data.includeDeleted).toBe(false);
      }
    });

    it('should coerce includeDeleted from string', () => {
      const result = listMessagesQuerySchema.safeParse({
        includeDeleted: 'true',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.includeDeleted).toBe('boolean');
        expect(result.data.includeDeleted).toBe(true);
      }
    });

    it('should validate pagination', () => {
      const result = listMessagesQuerySchema.safeParse({
        page: 2,
        limit: 25,
      });
      expect(result.success).toBe(true);
    });

    it('should limit max page size', () => {
      const result = listMessagesQuerySchema.safeParse({
        limit: 101,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('listConversationsQuerySchema', () => {
    it('should validate with defaults', () => {
      const result = listConversationsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
        expect(result.data.sortBy).toBe('lastMessageAt');
      }
    });

    it('should allow agentId filter', () => {
      const result = listConversationsQuerySchema.safeParse({
        agentId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should allow search filter', () => {
      const result = listConversationsQuerySchema.safeParse({
        search: 'test query',
      });
      expect(result.success).toBe(true);
    });

    it('should limit search length', () => {
      const result = listConversationsQuerySchema.safeParse({
        search: 'a'.repeat(201),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('searchMessagesQuerySchema', () => {
    it('should require search query', () => {
      const result = searchMessagesQuerySchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should validate search with defaults', () => {
      const result = searchMessagesQuerySchema.safeParse({
        q: 'test query',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('should allow conversation filter', () => {
      const result = searchMessagesQuerySchema.safeParse({
        q: 'test',
        conversationId: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });
  });
});
