import SQLite from 'react-native-sqlite-storage';

import { LocalSearchIndexStorage } from '../localSearchIndex';

// Mock react-native-sqlite-storage
jest.mock('react-native-sqlite-storage', () => ({
  openDatabase: jest.fn(),
  enablePromise: jest.fn(),
}));

// Mock Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((obj: { ios?: unknown; android?: unknown }) => obj.ios),
  },
}));

describe('LocalSearchIndexStorage', () => {
  let storage: LocalSearchIndexStorage;
  let mockDb: {
    executeSql: jest.Mock;
    close: jest.Mock;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    (LocalSearchIndexStorage as unknown as { instance: LocalSearchIndexStorage | null }).instance =
      null;

    mockDb = {
      executeSql: jest.fn().mockResolvedValue([{ rows: { length: 0, item: jest.fn() } }]),
      close: jest.fn().mockResolvedValue(undefined),
    };

    (SQLite.openDatabase as jest.Mock).mockResolvedValue(mockDb);

    storage = LocalSearchIndexStorage.getInstance();
    await storage.initialize();
  });

  afterEach(async () => {
    await storage.close();
  });

  describe('Singleton Pattern', () => {
    it('returns the same instance', () => {
      const instance1 = LocalSearchIndexStorage.getInstance();
      const instance2 = LocalSearchIndexStorage.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Initialization', () => {
    it('initializes database with correct schema', async () => {
      expect(mockDb.executeSql).toHaveBeenCalled();

      // Check that tables are created
      const calls = mockDb.executeSql.mock.calls;
      const createTableCall = calls.find((call: string[]) =>
        call[0].includes('CREATE TABLE IF NOT EXISTS')
      );
      expect(createTableCall).toBeDefined();
    });

    it('sets up metadata on first initialization', async () => {
      mockDb.executeSql.mockImplementation((sql: string) => {
        if (sql.includes('SELECT value FROM index_metadata')) {
          return [{ rows: { length: 0, item: jest.fn() } }];
        }
        return [{ rows: { length: 0, item: jest.fn() } }];
      });

      // Re-initialize to trigger metadata setup
      (
        LocalSearchIndexStorage as unknown as { instance: LocalSearchIndexStorage | null }
      ).instance = null;
      storage = LocalSearchIndexStorage.getInstance();
      await storage.initialize();

      // Should insert version metadata
      const calls = mockDb.executeSql.mock.calls;
      const versionInsert = calls.find(
        (call: string[]) => call[0].includes('version') && call[0].includes('INSERT')
      );
      expect(versionInsert).toBeDefined();
    });
  });

  describe('SQLite Index Storage', () => {
    it('adds image index with all fields', async () => {
      const imageData = {
        id: 'test-id',
        localIdentifier: 'local-123',
        uri: 'file:///test.jpg',
        tags: ['beach', 'sunset'],
        embeddings: [0.1, 0.2, 0.3],
        sceneType: 'landscape',
        createdAt: new Date(),
        modifiedAt: new Date(),
        fileSize: 1024,
        width: 1920,
        height: 1080,
      };

      await storage.addImageIndex(imageData);

      const insertCall = mockDb.executeSql.mock.calls.find((call: string[]) =>
        call[0].includes('INSERT OR REPLACE INTO image_index')
      );
      expect(insertCall).toBeDefined();
    });

    it('removes image index by id', async () => {
      await storage.removeImageIndex('test-id');

      const deleteCall = mockDb.executeSql.mock.calls.find((call: string[]) =>
        call[0].includes('DELETE FROM image_index')
      );
      expect(deleteCall).toBeDefined();
    });

    it('searches images by tags using FTS', async () => {
      mockDb.executeSql.mockImplementation((sql: string) => {
        if (sql.includes('search_fts')) {
          return [
            {
              rows: {
                length: 2,
                item: (i: number) => ({ image_id: `id-${i}` }),
              },
            },
          ];
        }
        return [{ rows: { length: 0, item: jest.fn() } }];
      });

      const results = await storage.searchByTags('beach');

      expect(results).toHaveLength(2);
      expect(results[0]).toBe('id-0');
    });

    it('returns metadata with correct structure', async () => {
      mockDb.executeSql.mockImplementation((sql: string) => {
        if (sql.includes('index_metadata')) {
          return [
            {
              rows: {
                length: 3,
                item: (i: number) => {
                  const items = [
                    { key: 'version', value: '1' },
                    { key: 'created_at', value: '1234567890' },
                    { key: 'last_updated', value: '1234567890' },
                  ];
                  return items[i];
                },
              },
            },
          ];
        }
        if (sql.includes('COUNT')) {
          return [{ rows: { length: 1, item: () => ({ count: 100 }) } }];
        }
        return [{ rows: { length: 0, item: jest.fn() } }];
      });

      const metadata = await storage.getMetadata();

      expect(metadata).toMatchObject({
        version: 1,
        totalImages: 100,
        createdAt: expect.any(Date),
        lastUpdated: expect.any(Date),
      });
    });
  });

  describe('Incremental Updates', () => {
    it('records changes for incremental sync', async () => {
      const imageData = {
        id: 'test-id',
        localIdentifier: 'local-123',
        uri: 'file:///test.jpg',
        tags: ['beach'],
        createdAt: new Date(),
        modifiedAt: new Date(),
      };

      await storage.addImageIndex(imageData);

      const changeLogCall = mockDb.executeSql.mock.calls.find((call: string[]) =>
        call[0].includes('incremental_changes')
      );
      expect(changeLogCall).toBeDefined();
    });

    it('retrieves incremental changes since a timestamp', async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago

      mockDb.executeSql.mockImplementation((sql: string) => {
        if (sql.includes('incremental_changes')) {
          return [
            {
              rows: {
                length: 2,
                item: (i: number) => ({
                  action: 'upsert',
                  image_id: `img-${i}`,
                  timestamp: Date.now(),
                }),
              },
            },
          ];
        }
        return [{ rows: { length: 0, item: jest.fn() } }];
      });

      const changes = await storage.getIncrementalChanges(since);

      expect(changes).toHaveLength(2);
      expect(changes[0]).toMatchObject({
        action: 'upsert',
        imageId: expect.any(String),
        timestamp: expect.any(Date),
      });
    });

    it('cleans up old changes', async () => {
      await storage.cleanupOldChanges();

      const cleanupCall = mockDb.executeSql.mock.calls.find((call: string[]) =>
        call[0].includes('DELETE FROM incremental_changes')
      );
      expect(cleanupCall).toBeDefined();
    });
  });

  describe('Index Compression', () => {
    it('compresses the database using VACUUM', async () => {
      await storage.compressIndex();

      const vacuumCall = mockDb.executeSql.mock.calls.find(
        (call: string[]) => call[0] === 'VACUUM'
      );
      expect(vacuumCall).toBeDefined();
    });

    it('returns compression statistics', async () => {
      mockDb.executeSql.mockImplementation((sql: string) => {
        if (sql.includes('pragma_page_count')) {
          return [{ rows: { item: () => ({ size: 50000 }) } }];
        }
        if (sql === 'VACUUM') {
          return [];
        }
        return [{ rows: { item: () => ({ size: 40000 }) } }];
      });

      const stats = await storage.compressIndex();

      expect(stats).toMatchObject({
        originalSize: 50000,
        compressedSize: 40000,
        compressionRatio: 0.8,
      });
    });
  });

  describe('Backup and Restore', () => {
    it('creates a backup with metadata', async () => {
      mockDb.executeSql.mockImplementation((sql: string) => {
        if (sql.includes('pragma_page_count')) {
          return [{ rows: { item: () => ({ size: 100000 }) } }];
        }
        return [{ rows: { length: 0, item: jest.fn() } }];
      });

      const backup = await storage.createBackup();

      expect(backup).toMatchObject({
        id: expect.stringContaining('backup_'),
        createdAt: expect.any(Date),
        size: 100000,
        checksum: expect.any(String),
      });
    });

    it('records backup in database', async () => {
      await storage.createBackup();

      const backupInsertCall = mockDb.executeSql.mock.calls.find(
        (call: string[]) => call[0].includes('index_backups') && call[0].includes('INSERT')
      );
      expect(backupInsertCall).toBeDefined();
    });

    it('restores from backup by id', async () => {
      mockDb.executeSql.mockImplementation((sql: string, params: unknown[]) => {
        if (sql.includes('index_backups') && params?.[0] === 'backup-123') {
          return [
            {
              rows: {
                length: 1,
                item: () => ({
                  id: 'backup-123',
                  created_at: Date.now(),
                  size: 100000,
                  checksum: 'abc123',
                }),
              },
            },
          ];
        }
        return [{ rows: { length: 0, item: jest.fn() } }];
      });

      const result = await storage.restoreBackup('backup-123');

      expect(result).toBe(true);
    });

    it('returns false for non-existent backup', async () => {
      mockDb.executeSql.mockImplementation((sql: string) => {
        if (sql.includes('index_backups')) {
          return [{ rows: { length: 0, item: jest.fn() } }];
        }
        return [{ rows: { length: 0, item: jest.fn() } }];
      });

      const result = await storage.restoreBackup('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('Index Version Management', () => {
    it('stores version in metadata', async () => {
      mockDb.executeSql.mockImplementation((sql: string) => {
        if (sql.includes('index_metadata') && sql.includes('version')) {
          return [
            {
              rows: {
                length: 1,
                item: () => ({ key: 'version', value: '1' }),
              },
            },
          ];
        }
        return [{ rows: { length: 0, item: jest.fn() } }];
      });

      const metadata = await storage.getMetadata();

      expect(metadata.version).toBe(1);
    });
  });
});
