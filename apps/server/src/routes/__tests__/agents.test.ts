/**
 * Agent Routes Tests
 * Agent 路由测试
 */

import request from 'supertest';
import express from 'express';
import agentRoutes from '../agents';
import * as agentService from '../../services/agentService';
import { authenticate } from '../../middleware/auth';
import { errorHandler } from '../../middleware/errorHandler';

// Mock dependencies
jest.mock('../../services/agentService');
jest.mock('../../middleware/auth', () => ({
  authenticate: jest.fn((req, res, next) => {
    req.user = { id: 'user-123', email: 'test@example.com' };
    next();
  }),
}));
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const mockedAgentService = jest.mocked(agentService);

describe('Agent Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/agents', agentRoutes);
    // Add error handler at the end
    app.use(errorHandler);
    jest.clearAllMocks();
  });

  describe('POST /api/v1/agents', () => {
    it('should create a new agent', async () => {
      const mockAgent = {
        id: 'agent-123',
        userId: 'user-123',
        type: agentService.AgentType.VISIONSHARE,
        name: 'Test Agent',
        description: 'Test Description',
        status: agentService.AgentStatus.DRAFT,
        config: null,
        latitude: null,
        longitude: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockedAgentService.createAgent.mockResolvedValue(mockAgent);

      const response = await request(app)
        .post('/api/v1/agents')
        .send({
          type: 'VISIONSHARE',
          name: 'Test Agent',
          description: 'Test Description',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe('Test Agent');
    });

    it('should return 401 without authentication', async () => {
      // Reset mock to simulate no auth
      (authenticate as jest.Mock).mockImplementationOnce((req, res, next) => {
        res.status(401).json({ success: false, error: 'Unauthorized' });
      });

      const response = await request(app)
        .post('/api/v1/agents')
        .send({
          type: 'VISIONSHARE',
          name: 'Test Agent',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/agents', () => {
    it('should return list of agents with pagination', async () => {
      const mockResult = {
        agents: [
          {
            id: 'agent-1',
            userId: 'user-123',
            type: agentService.AgentType.VISIONSHARE,
            name: 'Agent 1',
            description: null,
            status: agentService.AgentStatus.ACTIVE,
            config: null,
            latitude: null,
            longitude: null,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockedAgentService.getAgentsByUserId.mockResolvedValue(mockResult);

      const response = await request(app).get('/api/v1/agents');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.agents).toHaveLength(1);
      expect(response.body.data.pagination.total).toBe(1);
    });

    it('should support type filtering', async () => {
      const mockResult = {
        agents: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockedAgentService.getAgentsByUserId.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/v1/agents?type=VISIONSHARE');

      expect(response.status).toBe(200);
      expect(mockedAgentService.getAgentsByUserId).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({ type: 'VISIONSHARE' })
      );
    });

    it('should support status filtering', async () => {
      const mockResult = {
        agents: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockedAgentService.getAgentsByUserId.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/v1/agents?status=ACTIVE');

      expect(response.status).toBe(200);
      expect(mockedAgentService.getAgentsByUserId).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({ status: 'ACTIVE' })
      );
    });
  });

  describe('GET /api/v1/agents/:id', () => {
    it('should return agent by id', async () => {
      const mockAgent = {
        id: 'agent-123',
        userId: 'user-123',
        type: agentService.AgentType.VISIONSHARE,
        name: 'Test Agent',
        description: null,
        status: agentService.AgentStatus.ACTIVE,
        config: null,
        latitude: null,
        longitude: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockedAgentService.getAgentById.mockResolvedValue(mockAgent);

      const response = await request(app).get('/api/v1/agents/agent-123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('agent-123');
    });

    it('should return 404 when agent not found', async () => {
      mockedAgentService.getAgentById.mockResolvedValue(null);

      const response = await request(app).get('/api/v1/agents/non-existent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/agents/:id', () => {
    it('should update agent', async () => {
      const mockAgent = {
        id: 'agent-123',
        userId: 'user-123',
        type: agentService.AgentType.VISIONSHARE,
        name: 'Updated Agent',
        description: 'Updated Description',
        status: agentService.AgentStatus.ACTIVE,
        config: null,
        latitude: null,
        longitude: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockedAgentService.updateAgent.mockResolvedValue(mockAgent);

      const response = await request(app)
        .put('/api/v1/agents/agent-123')
        .send({
          name: 'Updated Agent',
          description: 'Updated Description',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Agent');
    });
  });

  describe('PATCH /api/v1/agents/:id/status', () => {
    it('should update agent status', async () => {
      const mockAgent = {
        id: 'agent-123',
        userId: 'user-123',
        type: agentService.AgentType.VISIONSHARE,
        name: 'Test Agent',
        description: null,
        status: agentService.AgentStatus.ACTIVE,
        config: null,
        latitude: null,
        longitude: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockedAgentService.updateAgentStatus.mockResolvedValue(mockAgent);

      const response = await request(app)
        .patch('/api/v1/agents/agent-123/status')
        .send({ status: 'ACTIVE' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockedAgentService.updateAgentStatus).toHaveBeenCalledWith(
        'agent-123',
        'user-123',
        agentService.AgentStatus.ACTIVE
      );
    });

    it('should return 400 for invalid status', async () => {
      const response = await request(app)
        .patch('/api/v1/agents/agent-123/status')
        .send({ status: 'INVALID_STATUS' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/agents/:id', () => {
    it('should delete agent', async () => {
      mockedAgentService.deleteAgent.mockResolvedValue(undefined);

      const response = await request(app).delete('/api/v1/agents/agent-123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockedAgentService.deleteAgent).toHaveBeenCalledWith(
        'agent-123',
        'user-123'
      );
    });
  });

  describe('GET /api/v1/agents/:id/history', () => {
    it('should return agent status history', async () => {
      const mockHistory = [
        { status: agentService.AgentStatus.DRAFT, changedAt: new Date() },
        { status: agentService.AgentStatus.ACTIVE, changedAt: new Date() },
      ];

      mockedAgentService.getAgentStatusHistory.mockResolvedValue(mockHistory);

      const response = await request(app).get('/api/v1/agents/agent-123/history');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });
  });
});
