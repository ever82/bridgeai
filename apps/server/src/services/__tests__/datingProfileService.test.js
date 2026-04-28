"use strict";
/**
 * Dating Profile Service Tests
 * 交友画像服务测试
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
const profileService = __importStar(require("../dating/profileService"));
const client_1 = require("../../db/client");
const AppError_1 = require("../../errors/AppError");
// Mock Prisma
jest.mock('../../db/client', () => ({
    prisma: {
        agent: {
            findUnique: jest.fn(),
        },
        datingProfile: {
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
    },
}));
describe('DatingProfileService', () => {
    const mockUserId = 'user-123';
    const mockAgentId = 'agent-123';
    const mockProfileId = 'profile-123';
    const mockDate = new Date('2026-04-10');
    const mockAgent = {
        id: mockAgentId,
        userId: mockUserId,
        type: 'AGENTDATE',
        name: 'Test Agent',
    };
    const mockProfile = {
        id: mockProfileId,
        agentId: mockAgentId,
        userId: mockUserId,
        basicConditions: {
            ageRange: 'AGE_20_25',
            education: 'BACHELOR',
        },
        personality: null,
        interests: null,
        lifestyle: null,
        expectations: null,
        description: null,
        aiExtractedData: null,
        aiExtractionConfidence: null,
        privacySettings: {
            profileVisibility: 'PUBLIC',
            fieldVisibility: {
                basicInfo: 'PUBLIC',
                photos: 'PUBLIC',
                income: 'MATCHED_ONLY',
                location: 'MATCHED_ONLY',
                contactInfo: 'PRIVATE',
                personalDetails: 'PUBLIC',
            },
        },
        completenessScore: 25,
        qualityScore: null,
        isActive: true,
        isComplete: false,
        createdAt: mockDate,
        updatedAt: mockDate,
    };
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('getOrCreateProfile', () => {
        it('should return existing profile', async () => {
            client_1.prisma.agent.findUnique.mockResolvedValue(mockAgent);
            client_1.prisma.datingProfile.findUnique.mockResolvedValue(mockProfile);
            const result = await profileService.getOrCreateProfile(mockAgentId, mockUserId);
            expect(result).toBeDefined();
            expect(result.agentId).toBe(mockAgentId);
            expect(result.userId).toBe(mockUserId);
        });
        it('should create new profile if not exists', async () => {
            client_1.prisma.agent.findUnique.mockResolvedValue(mockAgent);
            client_1.prisma.datingProfile.findUnique.mockResolvedValue(null);
            client_1.prisma.datingProfile.create.mockResolvedValue(mockProfile);
            const result = await profileService.getOrCreateProfile(mockAgentId, mockUserId);
            expect(result).toBeDefined();
            expect(client_1.prisma.datingProfile.create).toHaveBeenCalled();
        });
        it('should throw error if agent not found', async () => {
            client_1.prisma.agent.findUnique.mockResolvedValue(null);
            await expect(profileService.getOrCreateProfile(mockAgentId, mockUserId))
                .rejects.toThrow(AppError_1.AppError);
        });
        it('should throw error if user not authorized', async () => {
            client_1.prisma.agent.findUnique.mockResolvedValue({
                ...mockAgent,
                userId: 'other-user',
            });
            await expect(profileService.getOrCreateProfile(mockAgentId, mockUserId))
                .rejects.toThrow(AppError_1.AppError);
        });
    });
    describe('createProfile', () => {
        const createInput = {
            agentId: mockAgentId,
            basicConditions: {
                ageRange: 'AGE_26_30',
                education: 'MASTER',
            },
        };
        it('should create profile successfully', async () => {
            client_1.prisma.agent.findUnique.mockResolvedValue(mockAgent);
            client_1.prisma.datingProfile.findUnique.mockResolvedValue(null);
            client_1.prisma.datingProfile.create.mockResolvedValue({
                ...mockProfile,
                ...createInput,
            });
            const result = await profileService.createProfile(createInput, mockUserId);
            expect(result).toBeDefined();
            expect(result.basicConditions?.ageRange).toBe(createInput.basicConditions.ageRange);
            expect(client_1.prisma.datingProfile.create).toHaveBeenCalled();
        });
        it('should throw error if profile already exists', async () => {
            client_1.prisma.agent.findUnique.mockResolvedValue(mockAgent);
            client_1.prisma.datingProfile.findUnique.mockResolvedValue(mockProfile);
            await expect(profileService.createProfile(createInput, mockUserId))
                .rejects.toThrow('Dating profile already exists');
        });
        it('should throw error if agent not found', async () => {
            client_1.prisma.agent.findUnique.mockResolvedValue(null);
            await expect(profileService.createProfile(createInput, mockUserId))
                .rejects.toThrow(AppError_1.AppError);
        });
    });
    describe('updateProfile', () => {
        const updateInput = {
            description: 'Updated description',
            basicConditions: {
                ageRange: 'AGE_26_30',
            },
        };
        it('should update profile successfully', async () => {
            client_1.prisma.datingProfile.findUnique.mockResolvedValue(mockProfile);
            client_1.prisma.datingProfile.update.mockResolvedValue({
                ...mockProfile,
                ...updateInput,
            });
            const result = await profileService.updateProfile(mockAgentId, mockUserId, updateInput);
            expect(result).toBeDefined();
            expect(result.description).toBe(updateInput.description);
            expect(client_1.prisma.datingProfile.update).toHaveBeenCalled();
        });
        it('should throw error if profile not found', async () => {
            client_1.prisma.datingProfile.findUnique.mockResolvedValue(null);
            await expect(profileService.updateProfile(mockAgentId, mockUserId, updateInput))
                .rejects.toThrow('Dating profile not found');
        });
        it('should throw error if user not authorized', async () => {
            client_1.prisma.datingProfile.findUnique.mockResolvedValue({
                ...mockProfile,
                userId: 'other-user',
            });
            await expect(profileService.updateProfile(mockAgentId, mockUserId, updateInput))
                .rejects.toThrow('Unauthorized');
        });
    });
    describe('deleteProfile', () => {
        it('should delete profile successfully', async () => {
            client_1.prisma.datingProfile.findUnique.mockResolvedValue(mockProfile);
            client_1.prisma.datingProfile.delete.mockResolvedValue(mockProfile);
            await profileService.deleteProfile(mockAgentId, mockUserId);
            expect(client_1.prisma.datingProfile.delete).toHaveBeenCalledWith({
                where: { agentId: mockAgentId },
            });
        });
        it('should throw error if profile not found', async () => {
            client_1.prisma.datingProfile.findUnique.mockResolvedValue(null);
            await expect(profileService.deleteProfile(mockAgentId, mockUserId))
                .rejects.toThrow('Dating profile not found');
        });
    });
    describe('checkCompleteness', () => {
        it('should calculate completeness correctly for empty profile', () => {
            const profile = {
                agentId: mockAgentId,
                userId: mockUserId,
                privacySettings: { profileVisibility: 'PUBLIC', fieldVisibility: {} },
                isActive: true,
                createdAt: mockDate.toISOString(),
                updatedAt: mockDate.toISOString(),
            };
            const result = profileService.checkCompleteness(profile);
            expect(result.score).toBeLessThan(50);
            expect(result.missingFields.length).toBeGreaterThan(0);
            expect(result.complete).toBe(false);
        });
        it('should return complete for filled profile', () => {
            const profile = {
                agentId: mockAgentId,
                userId: mockUserId,
                basicConditions: {
                    ageRange: 'AGE_26_30',
                    education: 'MASTER',
                    location: { city: 'Beijing' },
                },
                personality: {
                    mbti: ['INTJ'],
                    traits: ['CREATIVE'],
                },
                interests: {
                    interests: [{ category: 'SPORTS', name: 'Basketball' }],
                },
                lifestyle: {
                    sleepSchedule: 'NIGHT_OWL',
                    smoking: 'NEVER',
                },
                expectations: {
                    purpose: 'SERIOUS_RELATIONSHIP',
                },
                description: 'This is a detailed description about me...',
                privacySettings: { profileVisibility: 'PUBLIC', fieldVisibility: {} },
                isActive: true,
                createdAt: mockDate.toISOString(),
                updatedAt: mockDate.toISOString(),
            };
            const result = profileService.checkCompleteness(profile);
            expect(result.score).toBeGreaterThan(70);
            expect(result.complete).toBe(true);
        });
    });
    describe('updateAIExtractedData', () => {
        it('should update AI extracted data', async () => {
            const extractedData = { ageRange: 'AGE_26_30' };
            const confidence = 0.85;
            client_1.prisma.datingProfile.findUnique.mockResolvedValue(mockProfile);
            client_1.prisma.datingProfile.update.mockResolvedValue({
                ...mockProfile,
                aiExtractedData: extractedData,
                aiExtractionConfidence: confidence,
            });
            const result = await profileService.updateAIExtractedData(mockAgentId, mockUserId, extractedData, confidence);
            expect(result).toBeDefined();
            expect(result.aiExtractedData).toEqual(extractedData);
            expect(result.aiExtractionConfidence).toBe(confidence);
        });
    });
});
//# sourceMappingURL=datingProfileService.test.js.map