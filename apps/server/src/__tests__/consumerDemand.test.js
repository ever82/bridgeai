"use strict";
/**
 * Consumer Demand Service Tests
 * 消费者需求画像服务测试
 *
 * @group unit
 * @group consumer-demand
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
const consumerDemandService = __importStar(require("../services/consumerDemandService"));
const client_1 = require("../db/client");
const AppError_1 = require("../errors/AppError");
// Mock Prisma
jest.mock('../../db/client', () => ({
    prisma: {
        agent: {
            create: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        agentProfile: {
            create: jest.fn(),
            findFirst: jest.fn(),
            update: jest.fn(),
        },
    },
}));
// Mock logger
jest.mock('../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    },
}));
describe('Consumer Demand Service', () => {
    const mockUserId = 'user-123';
    const mockAgentId = 'agent-123';
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('createConsumerAgent', () => {
        it('should create a consumer agent successfully', async () => {
            const mockAgent = {
                id: mockAgentId,
                userId: mockUserId,
                type: 'AGENTAD',
                name: 'Test Consumer Agent',
                description: null,
                status: 'DRAFT',
                config: {
                    role: 'CONSUMER',
                    consumerProfile: {
                        role: 'CONSUMER',
                        categories: [],
                        categoryIds: [],
                        budget: {
                            type: 'single',
                            min: 0,
                            max: 1000,
                            currency: 'CNY',
                            disclosure: 'RANGE_ONLY',
                        },
                        brandPreference: {
                            preferred: [],
                            avoided: [],
                            anyBrand: true,
                        },
                        merchantPreference: {
                            types: ['CHAIN', 'LOCAL'],
                            preferChain: true,
                            acceptIndividual: true,
                            requirePhysicalStore: false,
                        },
                        timeline: {
                            urgency: 'MEDIUM',
                            flexibleDates: true,
                        },
                        status: 'DRAFT',
                        createdAt: expect.any(Date),
                        updatedAt: expect.any(Date),
                    },
                },
                latitude: null,
                longitude: null,
                isActive: true,
            };
            client_1.prisma.agent.create.mockResolvedValue(mockAgent);
            const result = await consumerDemandService.createConsumerAgent(mockUserId, {
                name: 'Test Consumer Agent',
                role: 'CONSUMER',
            });
            expect(result).toBeDefined();
            expect(result.id).toBe(mockAgentId);
            expect(result.config.role).toBe('CONSUMER');
            expect(client_1.prisma.agent.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    userId: mockUserId,
                    type: 'AGENTAD',
                    name: 'Test Consumer Agent',
                    status: 'DRAFT',
                    config: expect.objectContaining({
                        role: 'CONSUMER',
                    }),
                }),
            });
        });
        it('should throw error if role is not CONSUMER', async () => {
            await expect(consumerDemandService.createConsumerAgent(mockUserId, {
                name: 'Test Agent',
                role: 'MERCHANT',
            })).rejects.toThrow(AppError_1.AppError);
        });
        it('should throw error if name is empty', async () => {
            await expect(consumerDemandService.createConsumerAgent(mockUserId, {
                name: '',
                role: 'CONSUMER',
            })).rejects.toThrow(AppError_1.AppError);
        });
        it('should throw error if name is too long', async () => {
            await expect(consumerDemandService.createConsumerAgent(mockUserId, {
                name: 'a'.repeat(101),
                role: 'CONSUMER',
            })).rejects.toThrow(AppError_1.AppError);
        });
    });
    describe('configureCategories', () => {
        const mockAgent = {
            id: mockAgentId,
            userId: mockUserId,
            config: {
                role: 'CONSUMER',
                consumerProfile: {
                    categories: [],
                    categoryIds: [],
                },
            },
        };
        beforeEach(() => {
            client_1.prisma.agent.findUnique.mockResolvedValue(mockAgent);
            client_1.prisma.agent.update.mockResolvedValue({
                ...mockAgent,
                config: {
                    ...mockAgent.config,
                    consumerProfile: {
                        ...mockAgent.config.consumerProfile,
                        categories: [
                            { id: 'food', name: '餐饮美食', level: 1, sortOrder: 0 },
                        ],
                        categoryIds: ['food'],
                    },
                },
            });
        });
        it('should configure categories successfully', async () => {
            const result = await consumerDemandService.configureCategories(mockAgentId, mockUserId, ['food']);
            expect(result).toBeDefined();
            expect(client_1.prisma.agent.update).toHaveBeenCalled();
        });
        it('should throw error if more than 5 categories', async () => {
            await expect(consumerDemandService.configureCategories(mockAgentId, mockUserId, ['1', '2', '3', '4', '5', '6'])).rejects.toThrow(AppError_1.AppError);
        });
        it('should throw error if no categories provided', async () => {
            await expect(consumerDemandService.configureCategories(mockAgentId, mockUserId, [])).rejects.toThrow(AppError_1.AppError);
        });
        it('should throw error if agent not found', async () => {
            client_1.prisma.agent.findUnique.mockResolvedValue(null);
            await expect(consumerDemandService.configureCategories(mockAgentId, mockUserId, ['food'])).rejects.toThrow(AppError_1.AppError);
        });
        it('should throw error if user is not authorized', async () => {
            client_1.prisma.agent.findUnique.mockResolvedValue({
                ...mockAgent,
                userId: 'other-user',
            });
            await expect(consumerDemandService.configureCategories(mockAgentId, mockUserId, ['food'])).rejects.toThrow(AppError_1.AppError);
        });
    });
    describe('configureBudget', () => {
        const mockAgent = {
            id: mockAgentId,
            userId: mockUserId,
            config: {
                role: 'CONSUMER',
                consumerProfile: {
                    budget: {
                        type: 'single',
                        min: 0,
                        max: 1000,
                        currency: 'CNY',
                        disclosure: 'RANGE_ONLY',
                    },
                },
            },
        };
        beforeEach(() => {
            client_1.prisma.agent.findUnique.mockResolvedValue(mockAgent);
            client_1.prisma.agent.update.mockResolvedValue(mockAgent);
        });
        it('should configure budget successfully', async () => {
            const budget = {
                type: 'single',
                min: 100,
                max: 500,
                currency: 'CNY',
                disclosure: 'RANGE_ONLY',
            };
            const result = await consumerDemandService.configureBudget(mockAgentId, mockUserId, budget);
            expect(result).toBeDefined();
            expect(client_1.prisma.agent.update).toHaveBeenCalled();
        });
        it('should throw error if min is negative', async () => {
            await expect(consumerDemandService.configureBudget(mockAgentId, mockUserId, {
                type: 'single',
                min: -100,
                max: 500,
                currency: 'CNY',
                disclosure: 'RANGE_ONLY',
            })).rejects.toThrow(AppError_1.AppError);
        });
        it('should throw error if max is negative', async () => {
            await expect(consumerDemandService.configureBudget(mockAgentId, mockUserId, {
                type: 'single',
                min: 100,
                max: -500,
                currency: 'CNY',
                disclosure: 'RANGE_ONLY',
            })).rejects.toThrow(AppError_1.AppError);
        });
        it('should throw error if min > max', async () => {
            await expect(consumerDemandService.configureBudget(mockAgentId, mockUserId, {
                type: 'single',
                min: 500,
                max: 100,
                currency: 'CNY',
                disclosure: 'RANGE_ONLY',
            })).rejects.toThrow(AppError_1.AppError);
        });
    });
    describe('configurePreferences', () => {
        const mockAgent = {
            id: mockAgentId,
            userId: mockUserId,
            config: {
                role: 'CONSUMER',
                consumerProfile: {
                    brandPreference: {
                        preferred: [],
                        avoided: [],
                        anyBrand: true,
                    },
                    merchantPreference: {
                        types: [],
                    },
                },
            },
        };
        beforeEach(() => {
            client_1.prisma.agent.findUnique.mockResolvedValue(mockAgent);
            client_1.prisma.agent.update.mockResolvedValue(mockAgent);
        });
        it('should configure brand preferences successfully', async () => {
            const result = await consumerDemandService.configurePreferences(mockAgentId, mockUserId, {
                brandPreference: {
                    preferred: ['Brand A', 'Brand B'],
                    avoided: ['Brand C'],
                    anyBrand: false,
                },
            });
            expect(result).toBeDefined();
            expect(client_1.prisma.agent.update).toHaveBeenCalled();
        });
        it('should configure merchant preferences successfully', async () => {
            const result = await consumerDemandService.configurePreferences(mockAgentId, mockUserId, {
                merchantPreference: {
                    types: ['CHAIN', 'LOCAL'],
                    minRating: 4,
                    preferChain: true,
                    acceptIndividual: true,
                    requirePhysicalStore: false,
                },
            });
            expect(result).toBeDefined();
            expect(client_1.prisma.agent.update).toHaveBeenCalled();
        });
        it('should throw error if rating is invalid', async () => {
            await expect(consumerDemandService.configurePreferences(mockAgentId, mockUserId, {
                merchantPreference: {
                    types: ['CHAIN'],
                    minRating: 6,
                },
            })).rejects.toThrow(AppError_1.AppError);
        });
    });
    describe('configureTimeline', () => {
        const mockAgent = {
            id: mockAgentId,
            userId: mockUserId,
            config: {
                role: 'CONSUMER',
                consumerProfile: {
                    timeline: {
                        urgency: 'MEDIUM',
                        flexibleDates: true,
                    },
                },
            },
        };
        beforeEach(() => {
            client_1.prisma.agent.findUnique.mockResolvedValue(mockAgent);
            client_1.prisma.agent.update.mockResolvedValue(mockAgent);
        });
        it('should configure timeline successfully', async () => {
            const timeline = {
                urgency: 'URGENT',
                flexibleDates: false,
                preferredStartDate: new Date(),
            };
            const result = await consumerDemandService.configureTimeline(mockAgentId, mockUserId, timeline);
            expect(result).toBeDefined();
            expect(client_1.prisma.agent.update).toHaveBeenCalled();
        });
    });
    describe('previewDemandProfile', () => {
        const mockAgent = {
            id: mockAgentId,
            userId: mockUserId,
            config: {
                role: 'CONSUMER',
                consumerProfile: {
                    categories: [{ id: 'food', name: '餐饮美食' }],
                    categoryIds: ['food'],
                    budget: {
                        type: 'single',
                        min: 100,
                        max: 500,
                        currency: 'CNY',
                        disclosure: 'RANGE_ONLY',
                    },
                    brandPreference: {
                        preferred: [],
                        avoided: [],
                        anyBrand: true,
                    },
                    merchantPreference: {
                        types: ['CHAIN', 'LOCAL'],
                    },
                    timeline: {
                        urgency: 'MEDIUM',
                        flexibleDates: true,
                    },
                },
            },
        };
        beforeEach(() => {
            client_1.prisma.agent.findUnique.mockResolvedValue(mockAgent);
        });
        it('should generate profile preview successfully', async () => {
            const result = await consumerDemandService.previewDemandProfile(mockAgentId, mockUserId);
            expect(result).toBeDefined();
            expect(result.summary).toBeDefined();
            expect(result.completeness).toBeDefined();
            expect(result.completenessScore).toBeGreaterThanOrEqual(0);
            expect(result.completenessScore).toBeLessThanOrEqual(100);
        });
        it('should include category summary', async () => {
            const result = await consumerDemandService.previewDemandProfile(mockAgentId, mockUserId);
            expect(result.categorySummary).toContain('餐饮美食');
        });
        it('should include budget summary', async () => {
            const result = await consumerDemandService.previewDemandProfile(mockAgentId, mockUserId);
            expect(result.budgetSummary).toContain('100');
            expect(result.budgetSummary).toContain('500');
        });
        it('should provide suggestions for incomplete profile', async () => {
            const incompleteAgent = {
                ...mockAgent,
                config: {
                    ...mockAgent.config,
                    consumerProfile: {
                        ...mockAgent.config.consumerProfile,
                        categories: [],
                    },
                },
            };
            client_1.prisma.agent.findUnique.mockResolvedValue(incompleteAgent);
            const result = await consumerDemandService.previewDemandProfile(mockAgentId, mockUserId);
            expect(result.suggestions.length).toBeGreaterThan(0);
        });
    });
    describe('publishDemand', () => {
        const mockAgent = {
            id: mockAgentId,
            userId: mockUserId,
            status: 'DRAFT',
            config: {
                role: 'CONSUMER',
                consumerProfile: {
                    categories: [{ id: 'food', name: '餐饮美食' }],
                    categoryIds: ['food'],
                    budget: {
                        type: 'single',
                        min: 100,
                        max: 500,
                        currency: 'CNY',
                        disclosure: 'RANGE_ONLY',
                    },
                    status: 'DRAFT',
                },
            },
        };
        beforeEach(() => {
            client_1.prisma.agent.findUnique.mockResolvedValue(mockAgent);
            client_1.prisma.agent.update.mockResolvedValue({
                ...mockAgent,
                status: 'ACTIVE',
                config: {
                    ...mockAgent.config,
                    consumerProfile: {
                        ...mockAgent.config.consumerProfile,
                        status: 'ACTIVE',
                        publishedAt: expect.any(Date),
                    },
                },
            });
        });
        it('should publish demand successfully', async () => {
            const result = await consumerDemandService.publishDemand(mockAgentId, mockUserId);
            expect(result).toBeDefined();
            expect(result.status).toBe('ACTIVE');
            expect(result.publishedAt).toBeDefined();
            expect(client_1.prisma.agent.update).toHaveBeenCalled();
        });
        it('should throw error if categories are missing', async () => {
            client_1.prisma.agent.findUnique.mockResolvedValue({
                ...mockAgent,
                config: {
                    ...mockAgent.config,
                    consumerProfile: {
                        ...mockAgent.config.consumerProfile,
                        categories: [],
                        categoryIds: [],
                    },
                },
            });
            await expect(consumerDemandService.publishDemand(mockAgentId, mockUserId)).rejects.toThrow(AppError_1.AppError);
        });
        it('should throw error if budget is missing', async () => {
            client_1.prisma.agent.findUnique.mockResolvedValue({
                ...mockAgent,
                config: {
                    ...mockAgent.config,
                    consumerProfile: {
                        ...mockAgent.config.consumerProfile,
                        budget: null,
                    },
                },
            });
            await expect(consumerDemandService.publishDemand(mockAgentId, mockUserId)).rejects.toThrow(AppError_1.AppError);
        });
    });
    describe('applyAIExtractedData', () => {
        const mockAgent = {
            id: mockAgentId,
            userId: mockUserId,
            config: {
                role: 'CONSUMER',
                consumerProfile: {
                    categories: [],
                    categoryIds: [],
                    budget: {
                        type: 'single',
                        min: 0,
                        max: 0,
                        currency: 'CNY',
                        disclosure: 'RANGE_ONLY',
                    },
                    brandPreference: {
                        preferred: [],
                        avoided: [],
                        anyBrand: true,
                    },
                    timeline: {
                        urgency: 'MEDIUM',
                        flexibleDates: true,
                    },
                    aiExtractedData: null,
                },
            },
        };
        beforeEach(() => {
            client_1.prisma.agent.findUnique.mockResolvedValue(mockAgent);
            client_1.prisma.agent.update.mockResolvedValue(mockAgent);
        });
        it('should apply AI extracted data successfully', async () => {
            const extractedData = {
                categories: ['food', 'restaurant'],
                budget: {
                    min: 200,
                    max: 800,
                    type: 'single',
                },
                brands: {
                    preferred: ['Brand A'],
                    avoided: ['Brand B'],
                },
                urgency: 'HIGH',
                location: {
                    city: '北京',
                    radius: 5,
                },
                confidence: 0.85,
                rawEntities: [],
            };
            const result = await consumerDemandService.applyAIExtractedData(mockAgentId, mockUserId, extractedData);
            expect(result).toBeDefined();
            expect(client_1.prisma.agent.update).toHaveBeenCalled();
        });
        it('should update categories from extracted data', async () => {
            const extractedData = {
                categories: ['food'],
                confidence: 0.8,
                rawEntities: [],
            };
            const result = await consumerDemandService.applyAIExtractedData(mockAgentId, mockUserId, extractedData);
            expect(result.categoryIds).toContain('food');
        });
        it('should update budget from extracted data', async () => {
            const extractedData = {
                budget: {
                    min: 100,
                    max: 500,
                },
                confidence: 0.8,
                rawEntities: [],
            };
            const result = await consumerDemandService.applyAIExtractedData(mockAgentId, mockUserId, extractedData);
            expect(result.budget.min).toBe(100);
            expect(result.budget.max).toBe(500);
        });
        it('should store AI extraction metadata', async () => {
            const extractedData = {
                confidence: 0.9,
                rawEntities: [{ type: 'category', value: 'food' }],
            };
            const result = await consumerDemandService.applyAIExtractedData(mockAgentId, mockUserId, extractedData);
            expect(result.aiExtractedData).toBeDefined();
            expect(result.aiExtractedData?.confidence).toBe(0.9);
        });
    });
    describe('getConsumerAgent', () => {
        const mockAgent = {
            id: mockAgentId,
            userId: mockUserId,
            type: 'AGENTAD',
            name: 'Test Agent',
            description: null,
            status: 'DRAFT',
            config: {
                role: 'CONSUMER',
                consumerProfile: {
                    categories: [],
                },
            },
            latitude: null,
            longitude: null,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        beforeEach(() => {
            client_1.prisma.agent.findUnique.mockResolvedValue(mockAgent);
        });
        it('should get consumer agent successfully', async () => {
            const result = await consumerDemandService.getConsumerAgent(mockAgentId, mockUserId);
            expect(result).toBeDefined();
            expect(result.id).toBe(mockAgentId);
            expect(result.profile).toBeDefined();
        });
        it('should throw error if agent not found', async () => {
            client_1.prisma.agent.findUnique.mockResolvedValue(null);
            await expect(consumerDemandService.getConsumerAgent(mockAgentId, mockUserId)).rejects.toThrow(AppError_1.AppError);
        });
        it('should throw error if not consumer agent', async () => {
            client_1.prisma.agent.findUnique.mockResolvedValue({
                ...mockAgent,
                config: {
                    role: 'MERCHANT',
                },
            });
            await expect(consumerDemandService.getConsumerAgent(mockAgentId, mockUserId)).rejects.toThrow(AppError_1.AppError);
        });
    });
});
//# sourceMappingURL=consumerDemand.test.js.map