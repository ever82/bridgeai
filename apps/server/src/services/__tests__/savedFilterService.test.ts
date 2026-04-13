/**
 * Saved Filter Service Tests
 * 保存筛选器服务单元测试
 */

import {
  createSavedFilter,
  getSavedFilter,
  getSavedFiltersByUser,
  updateSavedFilter,
  deleteSavedFilter,
  incrementUsageCount,
  getPopularSavedFilters,
  shareSavedFilter,
  duplicateSavedFilter,
} from '../savedFilterService';
import { prisma } from '../../db/client';
import { FilterDSL } from '@visionshare/shared';

// Mock Prisma
jest.mock('../../db/client', () => ({
  prisma: {
    savedFilter: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('SavedFilterService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSavedFilter', () => {
    it('should create a saved filter', async () => {
      const mockFilter = {
        id: 'filter-123',
        userId: 'user-123',
        name: 'Test Filter',
        description: 'Test Description',
        category: 'Test Category',
        filter: { where: { field: 'name', operator: 'eq', value: 'Test' } },
        isPublic: false,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.savedFilter.create as jest.Mock).mockResolvedValue(mockFilter);

      const input = {
        name: 'Test Filter',
        description: 'Test Description',
        category: 'Test Category',
        filter: { where: { field: 'name', operator: 'eq', value: 'Test' } } as FilterDSL,
        isPublic: false,
      };

      const result = await createSavedFilter('user-123', input);

      expect(prisma.savedFilter.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          name: input.name,
          description: input.description,
          category: input.category,
          filter: input.filter,
          isPublic: false,
          usageCount: 0,
        },
      });
      expect(result.id).toBe('filter-123');
      expect(result.name).toBe('Test Filter');
    });

    it('should set isPublic to false by default', async () => {
      const mockFilter = {
        id: 'filter-123',
        userId: 'user-123',
        name: 'Test Filter',
        description: null,
        category: null,
        filter: { where: { field: 'name', operator: 'eq', value: 'Test' } },
        isPublic: false,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.savedFilter.create as jest.Mock).mockResolvedValue(mockFilter);

      const input = {
        name: 'Test Filter',
        filter: { where: { field: 'name', operator: 'eq', value: 'Test' } } as FilterDSL,
      };

      await createSavedFilter('user-123', input);

      expect(prisma.savedFilter.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isPublic: false,
          }),
        })
      );
    });
  });

  describe('getSavedFilter', () => {
    it('should return filter by id for owner', async () => {
      const mockFilter = {
        id: 'filter-123',
        userId: 'user-123',
        name: 'Test Filter',
        description: null,
        category: null,
        filter: { where: { field: 'name', operator: 'eq', value: 'Test' } },
        isPublic: false,
        usageCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.savedFilter.findFirst as jest.Mock).mockResolvedValue(mockFilter);

      const result = await getSavedFilter('filter-123', 'user-123');

      expect(prisma.savedFilter.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'filter-123',
          OR: [
            { userId: 'user-123' },
            { isPublic: true },
          ],
        },
      });
      expect(result).not.toBeNull();
      expect(result?.id).toBe('filter-123');
    });

    it('should return public filter for non-owner', async () => {
      const mockFilter = {
        id: 'filter-123',
        userId: 'user-456',
        name: 'Public Filter',
        description: null,
        category: null,
        filter: { where: { field: 'name', operator: 'eq', value: 'Test' } },
        isPublic: true,
        usageCount: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.savedFilter.findFirst as jest.Mock).mockResolvedValue(mockFilter);

      const result = await getSavedFilter('filter-123', 'user-123');

      expect(result).not.toBeNull();
      expect(result?.isPublic).toBe(true);
    });

    it('should return null for non-existent filter', async () => {
      (prisma.savedFilter.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await getSavedFilter('non-existent', 'user-123');

      expect(result).toBeNull();
    });

    it('should return null for private filter of another user', async () => {
      (prisma.savedFilter.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await getSavedFilter('filter-123', 'user-123');

      expect(result).toBeNull();
    });
  });

  describe('getSavedFiltersByUser', () => {
    it('should return filters for user', async () => {
      const mockFilters = [
        {
          id: 'filter-1',
          userId: 'user-123',
          name: 'Filter 1',
          description: null,
          category: 'Category 1',
          filter: { where: { field: 'name', operator: 'eq', value: 'Test' } },
          isPublic: false,
          usageCount: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.savedFilter.findMany as jest.Mock).mockResolvedValue(mockFilters);
      (prisma.savedFilter.count as jest.Mock).mockResolvedValue(1);

      const result = await getSavedFiltersByUser('user-123');

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by category', async () => {
      (prisma.savedFilter.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.savedFilter.count as jest.Mock).mockResolvedValue(0);

      await getSavedFiltersByUser('user-123', { category: 'TestCategory' });

      expect(prisma.savedFilter.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: 'TestCategory',
          }),
        })
      );
    });

    it('should include public filters when requested', async () => {
      (prisma.savedFilter.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.savedFilter.count as jest.Mock).mockResolvedValue(0);

      await getSavedFiltersByUser('user-123', { includePublic: true });

      expect(prisma.savedFilter.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { userId: 'user-123' },
              { isPublic: true },
            ],
          }),
        })
      );
    });

    it('should support pagination', async () => {
      (prisma.savedFilter.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.savedFilter.count as jest.Mock).mockResolvedValue(0);

      await getSavedFiltersByUser('user-123', { page: 2, limit: 10 });

      expect(prisma.savedFilter.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
    });
  });

  describe('updateSavedFilter', () => {
    it('should update owned filter', async () => {
      const existingFilter = {
        id: 'filter-123',
        userId: 'user-123',
        name: 'Old Name',
      };

      const updatedFilter = {
        id: 'filter-123',
        userId: 'user-123',
        name: 'New Name',
        description: 'New Description',
        category: 'New Category',
        filter: { where: { field: 'name', operator: 'eq', value: 'Test' } },
        isPublic: true,
        usageCount: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.savedFilter.findFirst as jest.Mock).mockResolvedValue(existingFilter);
      (prisma.savedFilter.update as jest.Mock).mockResolvedValue(updatedFilter);

      const result = await updateSavedFilter('filter-123', 'user-123', {
        name: 'New Name',
        description: 'New Description',
        category: 'New Category',
        isPublic: true,
      });

      expect(result).not.toBeNull();
      expect(result?.name).toBe('New Name');
    });

    it('should return null when filter not found', async () => {
      (prisma.savedFilter.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await updateSavedFilter('filter-123', 'user-123', {
        name: 'New Name',
      });

      expect(result).toBeNull();
    });

    it('should not update filter owned by another user', async () => {
      (prisma.savedFilter.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await updateSavedFilter('filter-123', 'user-456', {
        name: 'New Name',
      });

      expect(result).toBeNull();
      expect(prisma.savedFilter.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteSavedFilter', () => {
    it('should delete owned filter', async () => {
      const existingFilter = {
        id: 'filter-123',
        userId: 'user-123',
      };

      (prisma.savedFilter.findFirst as jest.Mock).mockResolvedValue(existingFilter);
      (prisma.savedFilter.delete as jest.Mock).mockResolvedValue({});

      const result = await deleteSavedFilter('filter-123', 'user-123');

      expect(result).toBe(true);
      expect(prisma.savedFilter.delete).toHaveBeenCalledWith({
        where: { id: 'filter-123' },
      });
    });

    it('should return false when filter not found', async () => {
      (prisma.savedFilter.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await deleteSavedFilter('filter-123', 'user-123');

      expect(result).toBe(false);
    });
  });

  describe('incrementUsageCount', () => {
    it('should increment usage count', async () => {
      (prisma.savedFilter.update as jest.Mock).mockResolvedValue({});

      await incrementUsageCount('filter-123');

      expect(prisma.savedFilter.update).toHaveBeenCalledWith({
        where: { id: 'filter-123' },
        data: {
          usageCount: {
            increment: 1,
          },
        },
      });
    });
  });

  describe('getPopularSavedFilters', () => {
    it('should return popular public filters', async () => {
      const mockFilters = [
        {
          id: 'filter-1',
          userId: 'user-123',
          name: 'Popular Filter 1',
          description: null,
          category: null,
          filter: { where: { field: 'name', operator: 'eq', value: 'Test' } },
          isPublic: true,
          usageCount: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'filter-2',
          userId: 'user-456',
          name: 'Popular Filter 2',
          description: null,
          category: null,
          filter: { where: { field: 'name', operator: 'eq', value: 'Test' } },
          isPublic: true,
          usageCount: 50,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.savedFilter.findMany as jest.Mock).mockResolvedValue(mockFilters);

      const result = await getPopularSavedFilters(10);

      expect(prisma.savedFilter.findMany).toHaveBeenCalledWith({
        where: { isPublic: true },
        orderBy: { usageCount: 'desc' },
        take: 10,
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('shareSavedFilter', () => {
    it('should generate share token for owned filter', async () => {
      const mockFilter = {
        id: 'filter-123',
        userId: 'user-123',
        name: 'Test Filter',
      };

      (prisma.savedFilter.findFirst as jest.Mock).mockResolvedValue(mockFilter);

      const result = await shareSavedFilter('filter-123', 'user-123');

      expect(result).not.toBeNull();
      expect(result).toContain('/filters/shared/');
    });

    it('should return null for non-existent filter', async () => {
      (prisma.savedFilter.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await shareSavedFilter('filter-123', 'user-123');

      expect(result).toBeNull();
    });
  });

  describe('duplicateSavedFilter', () => {
    it('should duplicate existing filter', async () => {
      const existingFilter = {
        id: 'filter-123',
        userId: 'user-123',
        name: 'Original Filter',
        description: 'Original Description',
        category: 'Original Category',
        filter: { where: { field: 'name', operator: 'eq', value: 'Test' } },
        isPublic: true,
        usageCount: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const duplicatedFilter = {
        id: 'filter-456',
        userId: 'user-123',
        name: 'Original Filter (复制)',
        description: 'Original Description',
        category: 'Original Category',
        filter: { where: { field: 'name', operator: 'eq', value: 'Test' } },
        isPublic: false,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.savedFilter.findFirst as jest.Mock)
        .mockResolvedValueOnce(existingFilter) // First call in getSavedFilter
        .mockResolvedValueOnce(null); // Second call check in createSavedFilter

      (prisma.savedFilter.create as jest.Mock).mockResolvedValue(duplicatedFilter);

      const result = await duplicateSavedFilter('filter-123', 'user-123');

      expect(result).not.toBeNull();
      expect(prisma.savedFilter.create).toHaveBeenCalled();
    });

    it('should use custom name when provided', async () => {
      const existingFilter = {
        id: 'filter-123',
        userId: 'user-123',
        name: 'Original Filter',
        description: null,
        category: null,
        filter: { where: { field: 'name', operator: 'eq', value: 'Test' } },
        isPublic: false,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const duplicatedFilter = {
        id: 'filter-456',
        userId: 'user-123',
        name: 'Custom Name',
        description: null,
        category: null,
        filter: { where: { field: 'name', operator: 'eq', value: 'Test' } },
        isPublic: false,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.savedFilter.findFirst as jest.Mock)
        .mockResolvedValueOnce(existingFilter)
        .mockResolvedValueOnce(null);

      (prisma.savedFilter.create as jest.Mock).mockResolvedValue(duplicatedFilter);

      await duplicateSavedFilter('filter-123', 'user-123', 'Custom Name');

      expect(prisma.savedFilter.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Custom Name',
          }),
        })
      );
    });

    it('should return null for non-existent filter', async () => {
      (prisma.savedFilter.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await duplicateSavedFilter('filter-123', 'user-123');

      expect(result).toBeNull();
    });
  });
});
