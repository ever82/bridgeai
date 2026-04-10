/**
 * Agent Service Tests
 * Agent 服务测试
 */

import * as agentService from '../agentService';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../../errors/AppError';

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockAgent = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };

  return {
    PrismaClient: jest.fn(() => ({
      agent: mockAgent,
    })),
  };
});

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('AgentService', () => {
  const mockUserId = 'user-123';
  const mockAgentId = 'agent-123';
  const mockDate = new Date('2026-04-10');

  const mockAgent = {
    id: mockAgentId,
    userId: mockUserId,
    type: 'VISIONSHARE',
    name: 'Test Agent',
    description: 'Test Description',
    status: 'DRAFT',
    config: { key: 'value' },
    latitude: null,
    longitude: null,
    isActive: true,
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createAgent', () => {
    const createInput = {
      type: agentService.AgentType.VISIONSHARE,
      name: 'New Agent',
      description: 'A new agent',
    };

    it('should create agent successfully', async () => {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      prisma.agent.create.mockResolvedValue({
        ...mockAgent,
        ...createInput,
      });

      const result = await agentService.createAgent(mockUserId, createInput);

      expect(result).toBeDefined();
      expect(result.name).toBe(createInput.name);
      expect(result.type).toBe(createInput.type);
      expect(prisma.agent.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          type: createInput.type,
          name: createInput.name,
          description: createInput.description,
          status: agentService.AgentStatus.DRAFT,
          config: {},
          latitude: null,
          longitude: null,
          isActive: true,
        },
      });
    });

    it('should throw error for invalid agent type', async () => {
      const invalidInput = {
        ...createInput,
        type: 'INVALID_TYPE' as agentService.AgentType,
      };

      await expect(
        agentService.createAgent(mockUserId, invalidInput)
      ).rejects.toThrow(AppError);
    });

    it('should throw error for empty name', async () => {
      const invalidInput = {
        ...createInput,
        name: '',
      };

      await expect(
        agentService.createAgent(mockUserId, invalidInput)
      ).rejects.toMatchObject({ code: 'AGENT_NAME_REQUIRED' });
    });

    it('should throw error for name too long', async () => {
      const invalidInput = {
        ...createInput,
        name: 'a'.repeat(101),
      };

      await expect(
        agentService.createAgent(mockUserId, invalidInput)
      ).rejects.toMatchObject({ code: 'AGENT_NAME_TOO_LONG' });
    });
  });

  describe('getAgentById', () => {
    it('should return agent by id', async () => {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      prisma.agent.findUnique.mockResolvedValue(mockAgent);

      const result = await agentService.getAgentById(mockAgentId);

      expect(result).toBeDefined();
      expect(result?.id).toBe(mockAgentId);
      expect(prisma.agent.findUnique).toHaveBeenCalledWith({
        where: { id: mockAgentId },
      });
    });

    it('should return null when agent not found', async () => {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      prisma.agent.findUnique.mockResolvedValue(null);

      const result = await agentService.getAgentById('non-existent-id');

      expect(result).toBeNull();
    });

    it('should verify ownership when userId provided', async () => {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      prisma.agent.findUnique.mockResolvedValue({
        ...mockAgent,
        userId: 'different-user',
      });

      await expect(
        agentService.getAgentById(mockAgentId, mockUserId)
      ).rejects.toMatchObject({ code: 'AGENT_NOT_FOUND' });
    });
  });

  describe('getAgentsByUserId', () => {
    it('should return agents list with pagination', async () => {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      prisma.agent.count.mockResolvedValue(2);
      prisma.agent.findMany.mockResolvedValue([mockAgent, { ...mockAgent, id: 'agent-2' }]);

      const result = await agentService.getAgentsByUserId(mockUserId, {
        page: 1,
        limit: 10,
      });

      expect(result.agents).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(prisma.agent.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by type', async () => {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      prisma.agent.count.mockResolvedValue(1);
      prisma.agent.findMany.mockResolvedValue([mockAgent]);

      await agentService.getAgentsByUserId(mockUserId, {
        type: agentService.AgentType.VISIONSHARE,
      });

      expect(prisma.agent.count).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          type: agentService.AgentType.VISIONSHARE,
        },
      });
    });

    it('should filter by status', async () => {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      prisma.agent.count.mockResolvedValue(1);
      prisma.agent.findMany.mockResolvedValue([mockAgent]);

      await agentService.getAgentsByUserId(mockUserId, {
        status: agentService.AgentStatus.DRAFT,
      });

      expect(prisma.agent.count).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          status: agentService.AgentStatus.DRAFT,
        },
      });
    });
  });

  describe('updateAgent', () => {
    const updateInput = {
      name: 'Updated Agent Name',
      description: 'Updated Description',
    };

    it('should update agent successfully', async () => {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      prisma.agent.findUnique.mockResolvedValue(mockAgent);
      prisma.agent.update.mockResolvedValue({
        ...mockAgent,
        ...updateInput,
      });

      const result = await agentService.updateAgent(mockAgentId, mockUserId, updateInput);

      expect(result.name).toBe(updateInput.name);
      expect(result.description).toBe(updateInput.description);
    });

    it('should throw error when agent not found', async () => {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      prisma.agent.findUnique.mockResolvedValue(null);

      await expect(
        agentService.updateAgent(mockAgentId, mockUserId, updateInput)
      ).rejects.toMatchObject({ code: 'AGENT_NOT_FOUND' });
    });

    it('should throw error when user is not owner', async () => {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      prisma.agent.findUnique.mockResolvedValue({
        ...mockAgent,
        userId: 'different-user',
      });

      await expect(
        agentService.updateAgent(mockAgentId, mockUserId, updateInput)
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    });
  });

  describe('updateAgentStatus', () => {
    it('should update status successfully for valid transition', async () => {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      prisma.agent.findUnique.mockResolvedValue(mockAgent);
      prisma.agent.update.mockResolvedValue({
        ...mockAgent,
        status: agentService.AgentStatus.ACTIVE,
      });

      const result = await agentService.updateAgentStatus(
        mockAgentId,
        mockUserId,
        agentService.AgentStatus.ACTIVE
      );

      expect(result.status).toBe(agentService.AgentStatus.ACTIVE);
    });

    it('should throw error for invalid status transition', async () => {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      prisma.agent.findUnique.mockResolvedValue({
        ...mockAgent,
        status: agentService.AgentStatus.ARCHIVED,
      });

      await expect(
        agentService.updateAgentStatus(
          mockAgentId,
          mockUserId,
          agentService.AgentStatus.ACTIVE
        )
      ).rejects.toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
    });
  });

  describe('deleteAgent', () => {
    it('should delete agent successfully', async () => {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      prisma.agent.findUnique.mockResolvedValue(mockAgent);
      prisma.agent.delete.mockResolvedValue(mockAgent);

      await agentService.deleteAgent(mockAgentId, mockUserId);

      expect(prisma.agent.delete).toHaveBeenCalledWith({
        where: { id: mockAgentId },
      });
    });

    it('should throw error when agent not found', async () => {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      prisma.agent.findUnique.mockResolvedValue(null);

      await expect(
        agentService.deleteAgent(mockAgentId, mockUserId)
      ).rejects.toMatchObject({ code: 'AGENT_NOT_FOUND' });
    });
  });
});
