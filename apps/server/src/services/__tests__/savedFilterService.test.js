"use strict";
/**
 * Saved Filter Service Tests
 * 保存筛选器服务测试
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
const savedFilterService = __importStar(require("../savedFilterService"));
// Mock db/client
jest.mock('../../db/client', () => {
    const mockSavedFilter = {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
    };
    return {
        prisma: {
            savedFilter: mockSavedFilter,
        },
        __mockSavedFilter: mockSavedFilter,
    };
});
const { __mockSavedFilter: mockSavedFilter } = jest.requireMock('../../db/client');
// Mock logger
jest.mock('../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    },
}));
// ============================================
// Test data
// ============================================
const mockUserId = 'user-123';
const mockFilterId = 'filter-abc';
const mockFilterDSL = {
    where: {
        field: 'l1.age',
        operator: 'eq',
        value: 'AGE_26_30',
    },
};
const mockPrismaFilter = {
    id: mockFilterId,
    userId: mockUserId,
    name: 'My Filter',
    description: 'A test filter',
    category: 'agentdate',
    filter: mockFilterDSL,
    isPublic: false,
    usageCount: 0,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
};
const makeInput = (overrides = {}) => ({
    name: 'My Filter',
    description: 'A test filter',
    category: 'agentdate',
    filter: mockFilterDSL,
    isPublic: false,
    ...overrides,
});
beforeEach(() => {
    jest.clearAllMocks();
});
// ============================================
// createSavedFilter
// ============================================
describe('createSavedFilter', () => {
    it('creates a saved filter and returns mapped result', async () => {
        mockSavedFilter.create.mockResolvedValue(mockPrismaFilter);
        const result = await savedFilterService.createSavedFilter(mockUserId, makeInput());
        expect(mockSavedFilter.create).toHaveBeenCalledWith({
            data: {
                userId: mockUserId,
                name: 'My Filter',
                description: 'A test filter',
                category: 'agentdate',
                filter: mockFilterDSL,
                isPublic: false,
                usageCount: 0,
            },
        });
        expect(result).toEqual({
            id: mockFilterId,
            userId: mockUserId,
            name: 'My Filter',
            description: 'A test filter',
            category: 'agentdate',
            filter: mockFilterDSL,
            isPublic: false,
            usageCount: 0,
            createdAt: mockPrismaFilter.createdAt,
            updatedAt: mockPrismaFilter.updatedAt,
        });
    });
    it('defaults isPublic to false when not provided', async () => {
        mockSavedFilter.create.mockResolvedValue({
            ...mockPrismaFilter,
            isPublic: false,
        });
        const result = await savedFilterService.createSavedFilter(mockUserId, makeInput({ isPublic: undefined }));
        expect(mockSavedFilter.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ isPublic: false }),
        }));
        expect(result.isPublic).toBe(false);
    });
    it('creates a public filter when isPublic is true', async () => {
        mockSavedFilter.create.mockResolvedValue({
            ...mockPrismaFilter,
            isPublic: true,
        });
        const result = await savedFilterService.createSavedFilter(mockUserId, makeInput({ isPublic: true }));
        expect(mockSavedFilter.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ isPublic: true }),
        }));
        expect(result.isPublic).toBe(true);
    });
    it('re-throws on database error', async () => {
        const error = new Error('DB error');
        mockSavedFilter.create.mockRejectedValue(error);
        await expect(savedFilterService.createSavedFilter(mockUserId, makeInput())).rejects.toThrow('DB error');
    });
});
// ============================================
// getSavedFilter
// ============================================
describe('getSavedFilter', () => {
    it('returns filter when found and owned by user', async () => {
        mockSavedFilter.findFirst.mockResolvedValue(mockPrismaFilter);
        const result = await savedFilterService.getSavedFilter(mockFilterId, mockUserId);
        expect(mockSavedFilter.findFirst).toHaveBeenCalledWith({
            where: {
                id: mockFilterId,
                OR: [{ userId: mockUserId }, { isPublic: true }],
            },
        });
        expect(result).toEqual({
            id: mockFilterId,
            userId: mockUserId,
            name: 'My Filter',
            description: 'A test filter',
            category: 'agentdate',
            filter: mockFilterDSL,
            isPublic: false,
            usageCount: 0,
            createdAt: mockPrismaFilter.createdAt,
            updatedAt: mockPrismaFilter.updatedAt,
        });
    });
    it('returns null when filter not found', async () => {
        mockSavedFilter.findFirst.mockResolvedValue(null);
        const result = await savedFilterService.getSavedFilter('nonexistent', mockUserId);
        expect(result).toBeNull();
    });
    it('returns a public filter for a different user', async () => {
        const publicFilter = { ...mockPrismaFilter, isPublic: true, userId: 'other-user' };
        mockSavedFilter.findFirst.mockResolvedValue(publicFilter);
        const result = await savedFilterService.getSavedFilter(mockFilterId, mockUserId);
        expect(result).not.toBeNull();
        expect(result.isPublic).toBe(true);
        expect(result.userId).toBe('other-user');
    });
    it('re-throws on database error', async () => {
        mockSavedFilter.findFirst.mockRejectedValue(new Error('DB error'));
        await expect(savedFilterService.getSavedFilter(mockFilterId, mockUserId)).rejects.toThrow('DB error');
    });
});
// ============================================
// getSavedFiltersByUser
// ============================================
describe('getSavedFiltersByUser', () => {
    it('returns user filters with total count', async () => {
        const filters = [mockPrismaFilter, { ...mockPrismaFilter, id: 'filter-2' }];
        mockSavedFilter.findMany.mockResolvedValue(filters);
        mockSavedFilter.count.mockResolvedValue(2);
        const result = await savedFilterService.getSavedFiltersByUser(mockUserId);
        expect(mockSavedFilter.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { userId: mockUserId },
            orderBy: { usageCount: 'desc' },
        }));
        expect(result.items).toHaveLength(2);
        expect(result.total).toBe(2);
    });
    it('filters by category when provided', async () => {
        mockSavedFilter.findMany.mockResolvedValue([mockPrismaFilter]);
        mockSavedFilter.count.mockResolvedValue(1);
        await savedFilterService.getSavedFiltersByUser(mockUserId, {
            category: 'agentdate',
        });
        expect(mockSavedFilter.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { category: 'agentdate', userId: mockUserId },
        }));
    });
    it('includes public filters when includePublic is true', async () => {
        mockSavedFilter.findMany.mockResolvedValue([mockPrismaFilter]);
        mockSavedFilter.count.mockResolvedValue(1);
        await savedFilterService.getSavedFiltersByUser(mockUserId, {
            includePublic: true,
        });
        expect(mockSavedFilter.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: {
                OR: [{ userId: mockUserId }, { isPublic: true }],
            },
        }));
    });
    it('applies pagination with page and limit', async () => {
        mockSavedFilter.findMany.mockResolvedValue([mockPrismaFilter]);
        mockSavedFilter.count.mockResolvedValue(50);
        await savedFilterService.getSavedFiltersByUser(mockUserId, {
            page: 3,
            limit: 10,
        });
        expect(mockSavedFilter.findMany).toHaveBeenCalledWith(expect.objectContaining({
            skip: 20,
            take: 10,
        }));
    });
    it('defaults to limit 20 when not specified', async () => {
        mockSavedFilter.findMany.mockResolvedValue([]);
        mockSavedFilter.count.mockResolvedValue(0);
        await savedFilterService.getSavedFiltersByUser(mockUserId);
        expect(mockSavedFilter.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 20 }));
    });
    it('returns empty items when no filters exist', async () => {
        mockSavedFilter.findMany.mockResolvedValue([]);
        mockSavedFilter.count.mockResolvedValue(0);
        const result = await savedFilterService.getSavedFiltersByUser(mockUserId);
        expect(result.items).toEqual([]);
        expect(result.total).toBe(0);
    });
    it('re-throws on database error', async () => {
        mockSavedFilter.findMany.mockRejectedValue(new Error('DB error'));
        await expect(savedFilterService.getSavedFiltersByUser(mockUserId)).rejects.toThrow('DB error');
    });
});
// ============================================
// updateSavedFilter
// ============================================
describe('updateSavedFilter', () => {
    it('updates name when filter is owned by user', async () => {
        mockSavedFilter.findFirst.mockResolvedValue(mockPrismaFilter);
        const updated = { ...mockPrismaFilter, name: 'Updated Name' };
        mockSavedFilter.update.mockResolvedValue(updated);
        const result = await savedFilterService.updateSavedFilter(mockFilterId, mockUserId, {
            name: 'Updated Name',
        });
        expect(mockSavedFilter.findFirst).toHaveBeenCalledWith({
            where: { id: mockFilterId, userId: mockUserId },
        });
        expect(mockSavedFilter.update).toHaveBeenCalledWith({
            where: { id: mockFilterId },
            data: expect.objectContaining({ name: 'Updated Name' }),
        });
        expect(result.name).toBe('Updated Name');
    });
    it('updates isPublic to false', async () => {
        mockSavedFilter.findFirst.mockResolvedValue(mockPrismaFilter);
        const updated = { ...mockPrismaFilter, isPublic: false };
        mockSavedFilter.update.mockResolvedValue(updated);
        const result = await savedFilterService.updateSavedFilter(mockFilterId, mockUserId, {
            isPublic: false,
        });
        expect(mockSavedFilter.update).toHaveBeenCalledWith({
            where: { id: mockFilterId },
            data: expect.objectContaining({ isPublic: false }),
        });
        expect(result.isPublic).toBe(false);
    });
    it('returns null when filter not owned by user', async () => {
        mockSavedFilter.findFirst.mockResolvedValue(null);
        const result = await savedFilterService.updateSavedFilter(mockFilterId, 'other-user', {
            name: 'Hacked',
        });
        expect(result).toBeNull();
        expect(mockSavedFilter.update).not.toHaveBeenCalled();
    });
    it('only updates fields that are provided', async () => {
        mockSavedFilter.findFirst.mockResolvedValue(mockPrismaFilter);
        mockSavedFilter.update.mockResolvedValue(mockPrismaFilter);
        await savedFilterService.updateSavedFilter(mockFilterId, mockUserId, {
            description: 'New desc',
        });
        const data = mockSavedFilter.update.mock.calls[0][0].data;
        expect(data).toHaveProperty('description', 'New desc');
        expect(data).not.toHaveProperty('name');
        expect(data).not.toHaveProperty('filter');
    });
    it('re-throws on database error', async () => {
        mockSavedFilter.findFirst.mockResolvedValue(mockPrismaFilter);
        mockSavedFilter.update.mockRejectedValue(new Error('DB error'));
        await expect(savedFilterService.updateSavedFilter(mockFilterId, mockUserId, { name: 'X' })).rejects.toThrow('DB error');
    });
});
// ============================================
// deleteSavedFilter
// ============================================
describe('deleteSavedFilter', () => {
    it('deletes filter owned by user and returns true', async () => {
        mockSavedFilter.findFirst.mockResolvedValue(mockPrismaFilter);
        mockSavedFilter.delete.mockResolvedValue(mockPrismaFilter);
        const result = await savedFilterService.deleteSavedFilter(mockFilterId, mockUserId);
        expect(mockSavedFilter.findFirst).toHaveBeenCalledWith({
            where: { id: mockFilterId, userId: mockUserId },
        });
        expect(mockSavedFilter.delete).toHaveBeenCalledWith({
            where: { id: mockFilterId },
        });
        expect(result).toBe(true);
    });
    it('returns false when filter not found or not owned', async () => {
        mockSavedFilter.findFirst.mockResolvedValue(null);
        const result = await savedFilterService.deleteSavedFilter(mockFilterId, 'other-user');
        expect(result).toBe(false);
        expect(mockSavedFilter.delete).not.toHaveBeenCalled();
    });
    it('re-throws on database error', async () => {
        mockSavedFilter.findFirst.mockResolvedValue(mockPrismaFilter);
        mockSavedFilter.delete.mockRejectedValue(new Error('DB error'));
        await expect(savedFilterService.deleteSavedFilter(mockFilterId, mockUserId)).rejects.toThrow('DB error');
    });
});
// ============================================
// shareSavedFilter
// ============================================
describe('shareSavedFilter', () => {
    it('returns a share URL for owned filter', async () => {
        mockSavedFilter.findFirst.mockResolvedValue(mockPrismaFilter);
        mockSavedFilter.update.mockResolvedValue(mockPrismaFilter);
        const result = await savedFilterService.shareSavedFilter(mockFilterId, mockUserId);
        expect(result).toMatch(/^\/filters\/shared\/[a-f0-9]{32}$/);
    });
    it('returns null when filter not found', async () => {
        mockSavedFilter.findFirst.mockResolvedValue(null);
        const result = await savedFilterService.shareSavedFilter(mockFilterId, mockUserId);
        expect(result).toBeNull();
    });
    it('returns null on database error', async () => {
        mockSavedFilter.findFirst.mockRejectedValue(new Error('DB error'));
        const result = await savedFilterService.shareSavedFilter(mockFilterId, mockUserId);
        expect(result).toBeNull();
    });
});
// ============================================
// incrementUsageCount
// ============================================
describe('incrementUsageCount', () => {
    it('increments usage count without throwing', async () => {
        mockSavedFilter.update.mockResolvedValue(mockPrismaFilter);
        await savedFilterService.incrementUsageCount(mockFilterId);
        expect(mockSavedFilter.update).toHaveBeenCalledWith({
            where: { id: mockFilterId },
            data: { usageCount: { increment: 1 } },
        });
    });
    it('swallows errors gracefully', async () => {
        mockSavedFilter.update.mockRejectedValue(new Error('DB error'));
        // Should not throw
        await savedFilterService.incrementUsageCount(mockFilterId);
    });
});
// ============================================
// getPopularSavedFilters
// ============================================
describe('getPopularSavedFilters', () => {
    it('returns public filters ordered by usageCount', async () => {
        const popular = [
            { ...mockPrismaFilter, usageCount: 100, isPublic: true },
            { ...mockPrismaFilter, id: 'f2', usageCount: 50, isPublic: true },
        ];
        mockSavedFilter.findMany.mockResolvedValue(popular);
        const result = await savedFilterService.getPopularSavedFilters(5);
        expect(mockSavedFilter.findMany).toHaveBeenCalledWith({
            where: { isPublic: true },
            orderBy: { usageCount: 'desc' },
            take: 5,
        });
        expect(result).toHaveLength(2);
        expect(result[0].usageCount).toBe(100);
    });
    it('defaults to limit 10', async () => {
        mockSavedFilter.findMany.mockResolvedValue([]);
        await savedFilterService.getPopularSavedFilters();
        expect(mockSavedFilter.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 10 }));
    });
    it('re-throws on database error', async () => {
        mockSavedFilter.findMany.mockRejectedValue(new Error('DB error'));
        await expect(savedFilterService.getPopularSavedFilters()).rejects.toThrow('DB error');
    });
});
// ============================================
// duplicateSavedFilter
// ============================================
describe('duplicateSavedFilter', () => {
    it('duplicates a filter with "(复制)" suffix', async () => {
        // getSavedFilter call
        mockSavedFilter.findFirst.mockResolvedValueOnce(mockPrismaFilter);
        // createSavedFilter call
        const duplicated = {
            ...mockPrismaFilter,
            id: 'filter-new',
            name: 'My Filter (复制)',
        };
        mockSavedFilter.create.mockResolvedValue(duplicated);
        const result = await savedFilterService.duplicateSavedFilter(mockFilterId, mockUserId);
        expect(result).not.toBeNull();
        expect(result.name).toBe('My Filter (复制)');
        expect(mockSavedFilter.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                name: 'My Filter (复制)',
                isPublic: false,
            }),
        });
    });
    it('uses custom name when provided', async () => {
        mockSavedFilter.findFirst.mockResolvedValueOnce(mockPrismaFilter);
        mockSavedFilter.create.mockResolvedValue({
            ...mockPrismaFilter,
            id: 'filter-new',
            name: 'Custom Copy',
        });
        const result = await savedFilterService.duplicateSavedFilter(mockFilterId, mockUserId, 'Custom Copy');
        expect(mockSavedFilter.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ name: 'Custom Copy' }),
        });
        expect(result.name).toBe('Custom Copy');
    });
    it('returns null when original filter not found', async () => {
        mockSavedFilter.findFirst.mockResolvedValueOnce(null);
        const result = await savedFilterService.duplicateSavedFilter('nonexistent', mockUserId);
        expect(result).toBeNull();
        expect(mockSavedFilter.create).not.toHaveBeenCalled();
    });
});
//# sourceMappingURL=savedFilterService.test.js.map