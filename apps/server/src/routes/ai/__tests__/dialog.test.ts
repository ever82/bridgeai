/**
 * Dialog Routes Tests
 * Test coverage for Agent Dialog REST API endpoints
 */
import request from 'supertest';
import express from 'express';
import { Router } from 'express';

// Mock the agent dialog service
jest.mock('../../../services/ai/agentDialogService', () => ({
  agentDialogService: {
    createSession: jest.fn(),
    getSession: jest.fn(),
    getSessionAsync: jest.fn(),
    getSessionMessages: jest.fn(),
    generateMessage: jest.fn(),
    agentToAgentDialog: jest.fn(),
    userToAgentDialog: jest.fn(),
    getSessionsForParticipant: jest.fn(),
    updateSessionContext: jest.fn(),
    archiveSession: jest.fn(),
    getSessionCount: jest.fn().mockReturnValue(5),
    getVersion: jest.fn().mockReturnValue('1.0.0'),
  },
}));

jest.mock('../../../middleware/auth', () => ({
  authenticate: (_req: any, _res: any, next: () => void) => next(),
}));

jest.mock('../../../middleware/validation', () => ({
  validate: (_schema: any) => (_req: any, _res: any, next: () => void) => next(),
}));

import dialogRouter from '../dialog';
import { agentDialogService } from '../../../services/ai/agentDialogService';

const router = Router();
router.use('/dialog', dialogRouter);

const app = express();
app.use(express.json());
app.use('/api/v1/ai', router);

describe('Dialog Routes', () => {
  const mockSession = {
    id: 'dialog-123',
    type: 'agent_to_user',
    participants: [
      { id: 'user-1', name: 'Test User', type: 'user' },
      { id: 'agent-1', name: 'Test Agent', type: 'agent', agentType: 'assistant' },
    ],
    scene: 'test',
    context: { goals: [], constraints: [] },
    messages: [],
    status: 'active' as const,
    dialogPhase: 'intro' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMessage = {
    id: 'msg-123',
    sessionId: 'dialog-123',
    senderId: 'agent-1',
    senderType: 'agent' as const,
    senderName: 'Test Agent',
    content: 'Hello, how can I help you?',
    timestamp: new Date(),
    metadata: {
      agentType: 'assistant',
      scene: 'test',
      confidence: 0.85,
      isMock: false,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/ai/dialog/sessions', () => {
    it('should create a new dialog session', async () => {
      (agentDialogService.createSession as jest.Mock).mockResolvedValue(mockSession);

      const response = await request(app)
        .post('/api/v1/ai/dialog/sessions')
        .send({
          type: 'agent_to_user',
          participants: [
            { id: 'user-1', name: 'Test User', type: 'user' },
            { id: 'agent-1', name: 'Test Agent', type: 'agent' },
          ],
          scene: 'test',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.session).toBeDefined();
      expect(response.body.data.session.id).toBe('dialog-123');
    });

    it('should return 500 on error', async () => {
      (agentDialogService.createSession as jest.Mock).mockRejectedValue(new Error('DB error'));

      const response = await request(app)
        .post('/api/v1/ai/dialog/sessions')
        .send({
          type: 'agent_to_user',
          participants: [
            { id: 'user-1', name: 'Test User', type: 'user' },
            { id: 'agent-1', name: 'Test Agent', type: 'agent' },
          ],
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/ai/dialog/sessions/:sessionId', () => {
    it('should get session by ID', async () => {
      (agentDialogService.getSessionAsync as jest.Mock).mockResolvedValue(mockSession);

      const response = await request(app).get('/api/v1/ai/dialog/sessions/dialog-123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.session.id).toBe('dialog-123');
    });

    it('should return 404 when session not found', async () => {
      (agentDialogService.getSessionAsync as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get('/api/v1/ai/dialog/sessions/not-found');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/ai/dialog/sessions/:sessionId/messages', () => {
    it('should get session messages', async () => {
      (agentDialogService.getSessionAsync as jest.Mock).mockResolvedValue(mockSession);
      (agentDialogService.getSessionMessages as jest.Mock).mockResolvedValue([mockMessage]);

      const response = await request(app).get('/api/v1/ai/dialog/sessions/dialog-123/messages');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.messages).toHaveLength(1);
    });
  });

  describe('POST /api/v1/ai/dialog/sessions/:sessionId/messages', () => {
    it('should generate a message in session', async () => {
      (agentDialogService.generateMessage as jest.Mock).mockResolvedValue(mockMessage);

      const response = await request(app)
        .post('/api/v1/ai/dialog/sessions/dialog-123/messages')
        .send({
          senderId: 'user-1',
          senderType: 'user',
          content: 'Hello',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message.content).toBe('Hello, how can I help you?');
    });
  });

  describe('POST /api/v1/ai/dialog/agent-to-agent', () => {
    it('should handle agent-to-agent dialog', async () => {
      (agentDialogService.agentToAgentDialog as jest.Mock).mockResolvedValue(mockMessage);

      const response = await request(app).post('/api/v1/ai/dialog/agent-to-agent').send({
        senderAgentId: 'agent-1',
        receiverAgentId: 'agent-2',
        content: 'Hello',
        scene: 'test',
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/v1/ai/dialog/user-to-agent', () => {
    it('should handle user-to-agent dialog', async () => {
      (agentDialogService.userToAgentDialog as jest.Mock).mockResolvedValue(mockMessage);

      const response = await request(app).post('/api/v1/ai/dialog/user-to-agent').send({
        userId: 'user-1',
        agentId: 'agent-1',
        content: 'Hello',
        scene: 'test',
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/ai/dialog/participants/:participantId/sessions', () => {
    it('should get participant sessions', async () => {
      (agentDialogService.getSessionsForParticipant as jest.Mock).mockReturnValue([mockSession]);

      const response = await request(app).get('/api/v1/ai/dialog/participants/user-1/sessions');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.sessions).toHaveLength(1);
    });
  });

  describe('PUT /api/v1/ai/dialog/sessions/:sessionId/context', () => {
    it('should update session context', async () => {
      (agentDialogService.updateSessionContext as jest.Mock).mockResolvedValue(mockSession);

      const response = await request(app)
        .put('/api/v1/ai/dialog/sessions/dialog-123/context')
        .send({ goals: ['test goal'] });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/v1/ai/dialog/sessions/:sessionId/archive', () => {
    it('should archive session', async () => {
      (agentDialogService.archiveSession as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app).post('/api/v1/ai/dialog/sessions/dialog-123/archive');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/ai/dialog/stats', () => {
    it('should return dialog service stats', async () => {
      const response = await request(app).get('/api/v1/ai/dialog/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.sessionCount).toBe(5);
      expect(response.body.data.version).toBe('1.0.0');
    });
  });
});
