"use strict";
/**
 * Probe Tests for ISSUE-C001 — Agent创建与基础配置
 *
 * 从最刁钻的角度测试 agentService 的边界、安全、异常路径。
 * 只做只读验证，不修改源代码。
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
Object.defineProperty(exports, "__esModule", { value: true });
const agentService = __importStar(require("../agentService"));
const AppError_1 = require("../../errors/AppError");
// Mock db/client
jest.mock('../../db/client', () => {
    const mockAgent = {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
    };
    const mockDemand = { count: jest.fn().mockResolvedValue(0) };
    const mockSupply = { count: jest.fn().mockResolvedValue(0) };
    const mockProfile = {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    };
    const mockStatusHistory = { findMany: jest.fn().mockResolvedValue([]) };
    return {
        prisma: {
            agent: mockAgent,
            demand: mockDemand,
            supply: mockSupply,
            agentProfile: mockProfile,
            agentStatusHistory: mockStatusHistory,
        },
        __mockAgent: mockAgent,
        __mockDemand: mockDemand,
        __mockSupply: mockSupply,
        __mockProfile: mockProfile,
        __mockStatusHistory: mockStatusHistory,
    };
});
const { __mockAgent: mockAgent, __mockDemand: mockDemand, __mockSupply: mockSupply, __mockProfile: mockProfile, } = jest.requireMock('../../db/client');
// Mock logger
jest.mock('../../utils/logger', () => ({
    logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));
// Suppress dynamic import of agentProfileService
jest.mock('../agentProfileService', () => ({
    getOrCreateProfile: jest.fn().mockResolvedValue({
        id: 'profile-1',
        agentId: 'agent-1',
        sceneId: null,
        l1Data: {},
        l2Data: {},
        l3Description: null,
        sceneConfig: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    }),
}));
describe('PROBE: ISSUE-C001 — Agent创建与基础配置', () => {
    const userId = 'user-123';
    const agentId = 'agent-123';
    const baseAgent = {
        id: agentId,
        userId,
        type: 'VISIONSHARE',
        name: 'Test Agent',
        description: 'Test',
        status: 'DRAFT',
        config: {},
        latitude: null,
        longitude: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    beforeEach(() => {
        jest.clearAllMocks();
        mockDemand.count.mockResolvedValue(0);
        mockSupply.count.mockResolvedValue(0);
    });
    // ========================================================================
    // PROBE 1: Status transition — ARCHIVED→ARCHIVED bypass
    // ========================================================================
    describe('P1: Status transition edge cases', () => {
        it('ARCHIVED→ARCHIVED is allowed (same-status bypass)', async () => {
            // isValidStatusTransition returns true when current===new
            // This means archived agent can "transition" to archived — harmless but wasteful
            const archivedAgent = { ...baseAgent, status: 'ARCHIVED' };
            mockAgent.findUnique.mockResolvedValue(archivedAgent);
            mockAgent.update.mockResolvedValue({ ...archivedAgent });
            const result = await agentService.updateAgentStatus(agentId, userId, agentService.AgentStatus.ARCHIVED);
            // BUG? No error thrown, but this is a no-op transition.
            // The status history will record a pointless "ARCHIVED → ARCHIVED" entry.
            expect(result).toBeDefined();
            expect(mockAgent.update).toHaveBeenCalled();
        });
        it('ARCHIVED→ACTIVE is blocked (as expected)', async () => {
            const archivedAgent = { ...baseAgent, status: 'ARCHIVED' };
            mockAgent.findUnique.mockResolvedValue(archivedAgent);
            await expect(agentService.updateAgentStatus(agentId, userId, agentService.AgentStatus.ACTIVE)).rejects.toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
        });
        it('ARCHIVED→DRAFT is blocked', async () => {
            const archivedAgent = { ...baseAgent, status: 'ARCHIVED' };
            mockAgent.findUnique.mockResolvedValue(archivedAgent);
            await expect(agentService.updateAgentStatus(agentId, userId, agentService.AgentStatus.DRAFT)).rejects.toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
        });
    });
    // ========================================================================
    // PROBE 2: Name validation edge cases
    // ========================================================================
    describe('P2: Name boundary inputs', () => {
        it('Name with only whitespace → should fail', async () => {
            await expect(agentService.createAgent(userId, {
                type: agentService.AgentType.VISIONSHARE,
                name: '   ',
                description: 'test',
            })).rejects.toMatchObject({ code: 'AGENT_NAME_REQUIRED' });
        });
        it('Name with exactly 100 chars → should pass', async () => {
            const name100 = 'a'.repeat(100);
            mockAgent.create.mockResolvedValue({ ...baseAgent, name: name100 });
            const result = await agentService.createAgent(userId, {
                type: agentService.AgentType.VISIONSHARE,
                name: name100,
            });
            expect(result.name).toBe(name100);
        });
        it('Name with 101 chars → should fail', async () => {
            await expect(agentService.createAgent(userId, {
                type: agentService.AgentType.VISIONSHARE,
                name: 'a'.repeat(101),
            })).rejects.toMatchObject({ code: 'AGENT_NAME_TOO_LONG' });
        });
        it('Name with XSS injection → HTML tags stripped and stored safely', async () => {
            mockAgent.create.mockImplementation(({ data }) => Promise.resolve({ ...baseAgent, name: data.name }));
            const result = await agentService.createAgent(userId, {
                type: agentService.AgentType.VISIONSHARE,
                name: '<script>alert("xss")</script>',
            });
            // FIXED: HTML tags stripped by sanitizeName() — no < > stored
            expect(result.name).toBe('alert("xss")');
            expect(result.name).not.toContain('<');
            expect(result.name).not.toContain('>');
        });
        it('Name with unicode/emoji → should pass', async () => {
            const unicodeName = '🎨 中文 Agent 🤖';
            mockAgent.create.mockResolvedValue({ ...baseAgent, name: unicodeName });
            const result = await agentService.createAgent(userId, {
                type: agentService.AgentType.VISIONSHARE,
                name: unicodeName,
            });
            expect(result.name).toBe(unicodeName);
        });
        it('Name trimming: leading/trailing whitespace removed', async () => {
            mockAgent.create.mockImplementation(({ data }) => Promise.resolve({ ...baseAgent, name: data.name }));
            const result = await agentService.createAgent(userId, {
                type: agentService.AgentType.VISIONSHARE,
                name: '  Hello  ',
            });
            expect(result.name).toBe('Hello');
        });
    });
    // ========================================================================
    // PROBE 3: Type validation
    // ========================================================================
    describe('P3: Agent type validation', () => {
        it('DEMAND type is accepted by service (not just 4 scene types)', async () => {
            mockAgent.create.mockResolvedValue({
                ...baseAgent,
                type: 'DEMAND',
            });
            const result = await agentService.createAgent(userId, {
                type: agentService.AgentType.DEMAND,
                name: 'Demand Agent',
            });
            expect(result.type).toBe('DEMAND');
        });
        it('SUPPLY type is accepted by service', async () => {
            mockAgent.create.mockResolvedValue({
                ...baseAgent,
                type: 'SUPPLY',
            });
            const result = await agentService.createAgent(userId, {
                type: agentService.AgentType.SUPPLY,
                name: 'Supply Agent',
            });
            expect(result.type).toBe('SUPPLY');
        });
        it('Invalid type string throws', async () => {
            await expect(agentService.createAgent(userId, {
                type: 'HACKER_TYPE',
                name: 'Evil Agent',
            })).rejects.toThrow(AppError_1.AppError);
        });
    });
    // ========================================================================
    // PROBE 4: Ownership / authorization
    // ========================================================================
    describe('P4: Ownership and authorization', () => {
        it('getAgentById with wrong userId → throws AGENT_NOT_FOUND (not UNAUTHORIZED)', async () => {
            mockAgent.findUnique.mockResolvedValue({
                ...baseAgent,
                userId: 'different-user',
            });
            // NOTE: returns 404 not 403 — could be security info leak
            // but actually this is a common pattern to avoid leaking existence
            await expect(agentService.getAgentById(agentId, userId)).rejects.toMatchObject({ code: 'AGENT_NOT_FOUND', statusCode: 404 });
        });
        it('updateAgent with wrong userId → throws UNAUTHORIZED (403)', async () => {
            mockAgent.findUnique.mockResolvedValue({
                ...baseAgent,
                userId: 'different-user',
            });
            await expect(agentService.updateAgent(agentId, userId, { name: 'Hacked' })).rejects.toMatchObject({ code: 'UNAUTHORIZED', statusCode: 403 });
        });
        it('deleteAgent with wrong userId → throws UNAUTHORIZED (403)', async () => {
            mockAgent.findUnique.mockResolvedValue({
                ...baseAgent,
                userId: 'different-user',
            });
            await expect(agentService.deleteAgent(agentId, userId)).rejects.toMatchObject({ code: 'UNAUTHORIZED', statusCode: 403 });
        });
        it('updateAgentStatus with wrong userId → throws UNAUTHORIZED', async () => {
            mockAgent.findUnique.mockResolvedValue({
                ...baseAgent,
                userId: 'different-user',
            });
            await expect(agentService.updateAgentStatus(agentId, userId, agentService.AgentStatus.ACTIVE)).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
        });
        it('getAgentById WITHOUT userId → returns agent data regardless of ownership', async () => {
            mockAgent.findUnique.mockResolvedValue(baseAgent);
            const result = await agentService.getAgentById(agentId);
            // No ownership check when userId is omitted
            expect(result).toBeDefined();
            expect(result?.id).toBe(agentId);
        });
    });
    // ========================================================================
    // PROBE 5: deleteAgent — active match guard
    // ========================================================================
    describe('P5: deleteAgent active match guard', () => {
        it('Blocks archive when agent has active demands', async () => {
            mockAgent.findUnique.mockResolvedValue(baseAgent);
            mockDemand.count.mockResolvedValue(3);
            mockSupply.count.mockResolvedValue(0);
            await expect(agentService.deleteAgent(agentId, userId)).rejects.toMatchObject({
                code: 'AGENT_HAS_ACTIVE_MATCHES',
                statusCode: 409,
            });
        });
        it('Blocks archive when agent has active supplies', async () => {
            mockAgent.findUnique.mockResolvedValue(baseAgent);
            mockDemand.count.mockResolvedValue(0);
            mockSupply.count.mockResolvedValue(1);
            await expect(agentService.deleteAgent(agentId, userId)).rejects.toMatchObject({ code: 'AGENT_HAS_ACTIVE_MATCHES' });
        });
        it('Allows archive when no active matches', async () => {
            mockAgent.findUnique.mockResolvedValue(baseAgent);
            mockDemand.count.mockResolvedValue(0);
            mockSupply.count.mockResolvedValue(0);
            mockAgent.update.mockResolvedValue({ ...baseAgent, status: 'ARCHIVED', isActive: false });
            await agentService.deleteAgent(agentId, userId);
            expect(mockAgent.update).toHaveBeenCalledWith({
                where: { id: agentId },
                data: expect.objectContaining({
                    status: 'ARCHIVED',
                    isActive: false,
                }),
            });
        });
        it('Already-archived agent can be "deleted" again (no guard)', async () => {
            // Note: deleteAgent doesn't check if agent is already ARCHIVED
            // It will set status=ARCHIVED, isActive=false again — idempotent but wasteful
            const archivedAgent = { ...baseAgent, status: 'ARCHIVED', isActive: false };
            mockAgent.findUnique.mockResolvedValue(archivedAgent);
            mockAgent.update.mockResolvedValue(archivedAgent);
            await agentService.deleteAgent(agentId, userId);
            expect(mockAgent.update).toHaveBeenCalled();
        });
    });
    // ========================================================================
    // PROBE 6: Pagination edge cases
    // ========================================================================
    describe('P6: Pagination boundary inputs', () => {
        it('page=0 → normalized to page=1 (no negative skip)', async () => {
            mockAgent.count.mockResolvedValue(0);
            mockAgent.findMany.mockResolvedValue([]);
            const result = await agentService.getAgentsByUserId(userId, {
                page: 0,
                limit: 10,
            });
            // FIXED: page=0 normalized to page=1, skip=0
            expect(mockAgent.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 10 }));
            expect(result.pagination.page).toBe(1);
        });
        it('Negative page number → normalized to page=1', async () => {
            mockAgent.count.mockResolvedValue(0);
            mockAgent.findMany.mockResolvedValue([]);
            await agentService.getAgentsByUserId(userId, {
                page: -5,
                limit: 10,
            });
            // FIXED: page=-5 normalized to page=1
            expect(mockAgent.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 10 }));
        });
        it('limit=0 → normalized to limit=1', async () => {
            mockAgent.count.mockResolvedValue(5);
            mockAgent.findMany.mockResolvedValue([]);
            const result = await agentService.getAgentsByUserId(userId, {
                page: 1,
                limit: 0,
            });
            // FIXED: limit=0 normalized to limit=1
            expect(mockAgent.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 1 }));
        });
        it('Very large limit (999999) → capped to 100', async () => {
            mockAgent.count.mockResolvedValue(100);
            mockAgent.findMany.mockResolvedValue([]);
            await agentService.getAgentsByUserId(userId, {
                page: 1,
                limit: 999999,
            });
            // FIXED: limit capped to max 100
            expect(mockAgent.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }));
        });
    });
    // ========================================================================
    // PROBE 7: Coordinate validation (latitude/longitude)
    // ========================================================================
    describe('P7: Latitude/longitude validation', () => {
        it('Out-of-range latitude (999) → throws INVALID_COORDINATES', async () => {
            await expect(agentService.createAgent(userId, {
                type: agentService.AgentType.VISIONSHARE,
                name: 'Bad Coords',
                latitude: 999,
                longitude: 0,
            })).rejects.toMatchObject({ code: 'INVALID_COORDINATES', statusCode: 400 });
        });
        it('Out-of-range longitude (-999) → throws INVALID_COORDINATES', async () => {
            await expect(agentService.createAgent(userId, {
                type: agentService.AgentType.VISIONSHARE,
                name: 'Bad Coords',
                latitude: 0,
                longitude: -999,
            })).rejects.toMatchObject({ code: 'INVALID_COORDINATES' });
        });
        it('Valid coordinates (lat=45, lon=120) → accepted', async () => {
            mockAgent.create.mockResolvedValue({ ...baseAgent, latitude: 45, longitude: 120 });
            const result = await agentService.createAgent(userId, {
                type: agentService.AgentType.VISIONSHARE,
                name: 'Good Coords',
                latitude: 45,
                longitude: 120,
            });
            expect(result.latitude).toBe(45);
            expect(result.longitude).toBe(120);
        });
    });
    // ========================================================================
    // PROBE 8: Config injection / overwrite
    // ========================================================================
    describe('P8: Config object handling', () => {
        it('createAgent merges user config with personality', async () => {
            const userConfig = { scene: { range: '5km' }, custom: 'value' };
            mockAgent.create.mockImplementation(({ data }) => Promise.resolve({ ...baseAgent, config: data.config }));
            await agentService.createAgent(userId, {
                type: agentService.AgentType.VISIONSHARE,
                name: 'Config Agent',
                config: userConfig,
            });
            const createCall = mockAgent.create.mock.calls[0][0];
            expect(createCall.data.config).toHaveProperty('personality');
            expect(createCall.data.config).toHaveProperty('scene');
            expect(createCall.data.config).toHaveProperty('custom');
        });
        it('User can overwrite personality via config input', async () => {
            const maliciousConfig = {
                personality: { traits: ['EVIL'], communicationStyle: 'hostile' },
            };
            mockAgent.create.mockImplementation(({ data }) => Promise.resolve({ ...baseAgent, config: data.config }));
            // BUG: User config is spread FIRST, then personality is set via spread.
            // Actually looking at the code: { ...(input.config || {}), personality }
            // This means personality OVERWRITES user's personality key — GOOD, this is safe.
            await agentService.createAgent(userId, {
                type: agentService.AgentType.VISIONSHARE,
                name: 'Evil Agent',
                config: maliciousConfig,
            });
            const createCall = mockAgent.create.mock.calls[0][0];
            expect(createCall.data.config.personality.communicationStyle).toBe('friendly');
            // Personality from generateAgentPersonality overwrites user's injected value
        });
    });
    // ========================================================================
    // PROBE 9: updateAgent name validation
    // ========================================================================
    describe('P9: updateAgent name validation', () => {
        it('Updating name to whitespace-only → fails', async () => {
            mockAgent.findUnique.mockResolvedValue(baseAgent);
            await expect(agentService.updateAgent(agentId, userId, { name: '   ' })).rejects.toMatchObject({ code: 'AGENT_NAME_REQUIRED' });
        });
        it('Updating name to 101 chars → fails', async () => {
            mockAgent.findUnique.mockResolvedValue(baseAgent);
            await expect(agentService.updateAgent(agentId, userId, { name: 'a'.repeat(101) })).rejects.toMatchObject({ code: 'AGENT_NAME_TOO_LONG' });
        });
        it('Updating with empty object → succeeds (no-op)', async () => {
            mockAgent.findUnique.mockResolvedValue(baseAgent);
            mockAgent.update.mockResolvedValue(baseAgent);
            const result = await agentService.updateAgent(agentId, userId, {});
            expect(result).toBeDefined();
        });
        it('Updating name with XSS injection → HTML tags stripped', async () => {
            mockAgent.findUnique.mockResolvedValue(baseAgent);
            mockAgent.update.mockImplementation(({ data }) => Promise.resolve({ ...baseAgent, name: data.name }));
            // <b>Test</b> → "Test" (tags stripped)
            const result = await agentService.updateAgent(agentId, userId, {
                name: '<b>Test</b>',
            });
            // FIXED: sanitizeName strips HTML tags
            expect(result.name).toBe('Test');
            expect(result.name).not.toContain('<');
            expect(result.name).not.toContain('>');
        });
        it('Updating with out-of-range latitude → throws INVALID_COORDINATES', async () => {
            mockAgent.findUnique.mockResolvedValue(baseAgent);
            await expect(agentService.updateAgent(agentId, userId, { latitude: 91 })).rejects.toMatchObject({ code: 'INVALID_COORDINATES', statusCode: 400 });
        });
        it('Updating with out-of-range longitude → throws INVALID_COORDINATES', async () => {
            mockAgent.findUnique.mockResolvedValue(baseAgent);
            await expect(agentService.updateAgent(agentId, userId, { longitude: 181 })).rejects.toMatchObject({ code: 'INVALID_COORDINATES' });
        });
    });
    // ========================================================================
    // PROBE 10: generateAgentPersonality coverage
    // ========================================================================
    describe('P10: generateAgentPersonality for all types', () => {
        const types = [
            agentService.AgentType.VISIONSHARE,
            agentService.AgentType.AGENTDATE,
            agentService.AgentType.AGENTJOB,
            agentService.AgentType.AGENTAD,
            agentService.AgentType.DEMAND,
            agentService.AgentType.SUPPLY,
        ];
        types.forEach(type => {
            it(`${type} returns non-empty traits and communicationStyle`, () => {
                const personality = agentService.generateAgentPersonality(type);
                expect(personality.traits.length).toBeGreaterThan(0);
                expect(personality.communicationStyle).toBeTruthy();
            });
        });
        it('Unknown type returns empty traits and neutral style', () => {
            const personality = agentService.generateAgentPersonality('UNKNOWN');
            expect(personality.traits).toEqual([]);
            expect(personality.communicationStyle).toBe('neutral');
        });
    });
    // ========================================================================
    // PROBE 11: Status history
    // ========================================================================
    describe('P11: getAgentStatusHistory', () => {
        it('Returns empty array when no history', async () => {
            mockAgent.findUnique.mockResolvedValue(baseAgent);
            const { __mockStatusHistory } = jest.requireMock('../../db/client');
            __mockStatusHistory.findMany.mockResolvedValue([]);
            const result = await agentService.getAgentStatusHistory(agentId, userId);
            expect(result).toEqual([]);
        });
        it('Wrong userId → throws AGENT_NOT_FOUND', async () => {
            mockAgent.findUnique.mockResolvedValue({
                ...baseAgent,
                userId: 'different-user',
            });
            await expect(agentService.getAgentStatusHistory(agentId, userId)).rejects.toMatchObject({ code: 'AGENT_NOT_FOUND' });
        });
        it('Without userId → returns history without ownership check', async () => {
            mockAgent.findUnique.mockResolvedValue(baseAgent);
            const { __mockStatusHistory } = jest.requireMock('../../db/client');
            __mockStatusHistory.findMany.mockResolvedValue([
                { status: 'DRAFT', createdAt: new Date(), reason: 'created' },
            ]);
            const result = await agentService.getAgentStatusHistory(agentId);
            expect(result.length).toBe(1);
        });
    });
    // ========================================================================
    // PROBE 12: Concurrent/duplicate operations
    // ========================================================================
    describe('P12: Idempotency and ordering', () => {
        it('Double-delete on same agent succeeds (idempotent)', async () => {
            mockAgent.findUnique.mockResolvedValue(baseAgent);
            mockAgent.update.mockResolvedValue({ ...baseAgent, status: 'ARCHIVED' });
            await agentService.deleteAgent(agentId, userId);
            await agentService.deleteAgent(agentId, userId);
            expect(mockAgent.update).toHaveBeenCalledTimes(2);
        });
        it('Status transition DRAFT→ACTIVE→PAUSED→ACTIVE is valid chain', async () => {
            // DRAFT → ACTIVE
            mockAgent.findUnique.mockResolvedValue(baseAgent);
            mockAgent.update.mockResolvedValue({ ...baseAgent, status: 'ACTIVE' });
            await agentService.updateAgentStatus(agentId, userId, agentService.AgentStatus.ACTIVE);
            // ACTIVE → PAUSED
            mockAgent.findUnique.mockResolvedValue({ ...baseAgent, status: 'ACTIVE' });
            mockAgent.update.mockResolvedValue({ ...baseAgent, status: 'PAUSED' });
            await agentService.updateAgentStatus(agentId, userId, agentService.AgentStatus.PAUSED);
            // PAUSED → ACTIVE
            mockAgent.findUnique.mockResolvedValue({ ...baseAgent, status: 'PAUSED' });
            mockAgent.update.mockResolvedValue({ ...baseAgent, status: 'ACTIVE' });
            await agentService.updateAgentStatus(agentId, userId, agentService.AgentStatus.ACTIVE);
            expect(mockAgent.update).toHaveBeenCalledTimes(3);
        });
    });
    // ========================================================================
    // PROBE 13: Error code consistency
    // ========================================================================
    describe('P13: Error handling consistency', () => {
        it('getAgentById(not-found, with userId) → AGENT_NOT_FOUND 404', async () => {
            mockAgent.findUnique.mockResolvedValue(null);
            // With userId, should throw AGENT_NOT_FOUND (not return null)
            // Actually getAgentById returns null when agent not found, even with userId
            // Only throws when agent exists but belongs to different user
            const result = await agentService.getAgentById('nonexistent', userId);
            expect(result).toBeNull();
        });
        it('updateAgent(not-found) → AGENT_NOT_FOUND 404', async () => {
            mockAgent.findUnique.mockResolvedValue(null);
            await expect(agentService.updateAgent('nonexistent', userId, { name: 'X' })).rejects.toMatchObject({ code: 'AGENT_NOT_FOUND', statusCode: 404 });
        });
        it('deleteAgent(not-found) → AGENT_NOT_FOUND 404', async () => {
            mockAgent.findUnique.mockResolvedValue(null);
            await expect(agentService.deleteAgent('nonexistent', userId)).rejects.toMatchObject({ code: 'AGENT_NOT_FOUND', statusCode: 404 });
        });
    });
});
//# sourceMappingURL=probe_C001.test.js.map