"use strict";
/**
 * Agent Routes Tests
 * Agent 路由测试
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const agents_1 = __importDefault(require("../agents"));
const agentService = __importStar(require("../../services/agentService"));
const auth_1 = require("../../middleware/auth");
const errorHandler_1 = require("../../middleware/errorHandler");
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
    let app;
    beforeEach(() => {
        app = (0, express_1.default)();
        app.use(express_1.default.json());
        app.use('/api/v1/agents', agents_1.default);
        // Add error handler at the end
        app.use(errorHandler_1.errorHandler);
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
            const response = await (0, supertest_1.default)(app).post('/api/v1/agents').send({
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
            auth_1.authenticate.mockImplementationOnce((req, res, _next) => {
                res.status(401).json({ success: false, error: 'Unauthorized' });
            });
            const response = await (0, supertest_1.default)(app).post('/api/v1/agents').send({
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
            const response = await (0, supertest_1.default)(app).get('/api/v1/agents');
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
            const response = await (0, supertest_1.default)(app).get('/api/v1/agents?type=VISIONSHARE');
            expect(response.status).toBe(200);
            expect(mockedAgentService.getAgentsByUserId).toHaveBeenCalledWith('user-123', expect.objectContaining({ type: 'VISIONSHARE' }));
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
            const response = await (0, supertest_1.default)(app).get('/api/v1/agents?status=ACTIVE');
            expect(response.status).toBe(200);
            expect(mockedAgentService.getAgentsByUserId).toHaveBeenCalledWith('user-123', expect.objectContaining({ status: 'ACTIVE' }));
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
            const response = await (0, supertest_1.default)(app).get('/api/v1/agents/agent-123');
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.id).toBe('agent-123');
        });
        it('should return 404 when agent not found', async () => {
            mockedAgentService.getAgentById.mockResolvedValue(null);
            const response = await (0, supertest_1.default)(app).get('/api/v1/agents/non-existent');
            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });
    describe('PATCH /api/v1/agents/:id', () => {
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
            const response = await (0, supertest_1.default)(app).patch('/api/v1/agents/agent-123').send({
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
            const response = await (0, supertest_1.default)(app)
                .patch('/api/v1/agents/agent-123/status')
                .send({ status: 'ACTIVE' });
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(mockedAgentService.updateAgentStatus).toHaveBeenCalledWith('agent-123', 'user-123', agentService.AgentStatus.ACTIVE);
        });
        it('should return 400 for invalid status', async () => {
            const response = await (0, supertest_1.default)(app)
                .patch('/api/v1/agents/agent-123/status')
                .send({ status: 'INVALID_STATUS' });
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });
    describe('DELETE /api/v1/agents/:id', () => {
        it('should delete agent', async () => {
            mockedAgentService.deleteAgent.mockResolvedValue(undefined);
            const response = await (0, supertest_1.default)(app).delete('/api/v1/agents/agent-123');
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(mockedAgentService.deleteAgent).toHaveBeenCalledWith('agent-123', 'user-123');
        });
    });
    describe('GET /api/v1/agents/:id/history', () => {
        it('should return agent status history', async () => {
            const mockHistory = [
                { status: agentService.AgentStatus.DRAFT, changedAt: new Date() },
                { status: agentService.AgentStatus.ACTIVE, changedAt: new Date() },
            ];
            mockedAgentService.getAgentStatusHistory.mockResolvedValue(mockHistory);
            const response = await (0, supertest_1.default)(app).get('/api/v1/agents/agent-123/history');
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2);
        });
    });
});
//# sourceMappingURL=agents.test.js.map