import SQLite, { SQLiteDatabase, Transaction } from 'react-native-sqlite-storage';
import { Platform } from 'react-native';

SQLite.enablePromise(true);

export interface IndexMetadata {
  version: number;
  createdAt: Date;
  lastUpdated: Date;
  totalImages: number;
  indexSize: number;
}

export interface BackupMetadata {
  id: string;
  createdAt: Date;
  size: number;
  checksum: string;
}

export interface CompressionStats {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

const DB_NAME = 'LocalSearchIndex.db';
const CURRENT_VERSION = 1;

const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS index_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS image_index (
    id TEXT PRIMARY KEY,
    local_identifier TEXT UNIQUE,
    uri TEXT NOT NULL,
    tags TEXT NOT NULL,
    embeddings BLOB,
    scene_type TEXT,
    created_at INTEGER NOT NULL,
    modified_at INTEGER NOT NULL,
    file_size INTEGER,
    width INTEGER,
    height INTEGER
  );

  CREATE INDEX IF NOT EXISTS idx_scene_type ON image_index(scene_type);
  CREATE INDEX IF NOT EXISTS idx_modified_at ON image_index(modified_at);

  CREATE VIRTUAL TABLE IF NOT EXISTS search_fts USING fts5(
    image_id,
    content,
    content=''
  );

  CREATE TABLE IF NOT EXISTS incremental_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    image_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_changes_timestamp ON incremental_changes(timestamp);

  CREATE TABLE IF NOT EXISTS index_backups (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    size INTEGER NOT NULL,
    checksum TEXT NOT NULL,
    file_path TEXT NOT NULL
  );
`;

export class LocalSearchIndexStorage {
  private static instance: LocalSearchIndexStorage;
  private db: SQLiteDatabase | null = null;
  private isInitialized = false;

  static getInstance(): LocalSearchIndexStorage {
    if (!LocalSearchIndexStorage.instance) {
      LocalSearchIndexStorage.instance = new LocalSearchIndexStorage();
    }
    return LocalSearchIndexStorage.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.db = await SQLite.openDatabase({
        name: DB_NAME,
        location: 'default',
      });

      await this.db.executeSql(CREATE_TABLES_SQL);
      await this.initializeMetadata();
      await this.cleanupOldChanges();

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize local search index:', error);
      throw error;
    }
  }

  private async initializeMetadata(): Promise<void> {
    if (!this.db) return;

    const [result] = await this.db.executeSql(
      'SELECT value FROM index_metadata WHERE key = ?',
      ['version']
    );

    if (result.rows.length === 0) {
      const now = Date.now();
      await this.db.executeSql(
        `INSERT OR REPLACE INTO index_metadata (key, value) VALUES (?, ?)`,
        ['version', CURRENT_VERSION.toString()]
      );
      await this.db.executeSql(
        `INSERT OR REPLACE INTO index_metadata (key, value) VALUES (?, ?)`,
        ['created_at', now.toString()]
      );
      await this.db.executeSql(
        `INSERT OR REPLACE INTO index_metadata (key, value) VALUES (?, ?)`,
        ['last_updated', now.toString()]
      );
    }
  }

  async getMetadata(): Promise<IndexMetadata> {
    if (!this.db) throw new Error('Database not initialized');

    const [result] = await this.db.executeSql(
      'SELECT key, value FROM index_metadata'
    );

    const metadata: Record<string, string> = {};
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      metadata[row.key] = row.value;
    }

    const [countResult] = await this.db.executeSql(
      'SELECT COUNT(*) as count FROM image_index'
    );

    return {
      version: parseInt(metadata['version'] || '1', 10),
      createdAt: new Date(parseInt(metadata['created_at'] || '0', 10)),
      lastUpdated: new Date(parseInt(metadata['last_updated'] || '0', 10)),
      totalImages: countResult.rows.item(0).count,
      indexSize: await this.getIndexSize(),
    };
  }

  private async getIndexSize(): Promise<number> {
    if (!this.db) return 0;

    try {
      const [result] = await this.db.executeSql(
        "SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()"
      );
      return result.rows.item(0)?.size || 0;
    } catch {
      return 0;
    }
  }

  async addImageIndex(imageData: {
    id: string;
    localIdentifier: string;
    uri: string;
    tags: string[];
    embeddings?: number[];
    sceneType?: string;
    createdAt: Date;
    modifiedAt: Date;
    fileSize?: number;
    width?: number;
    height?: number;
  }): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const timestamp = Date.now();

    await this.db.executeSql(
      `INSERT OR REPLACE INTO image_index (
        id, local_identifier, uri, tags, embeddings, scene_type,
        created_at, modified_at, file_size, width, height
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        imageData.id,
        imageData.localIdentifier,
        imageData.uri,
        JSON.stringify(imageData.tags),
        imageData.embeddings ? Buffer.from(new Float32Array(imageData.embeddings).buffer) : null,
        imageData.sceneType || null,
        imageData.createdAt.getTime(),
        imageData.modifiedAt.getTime(),
        imageData.fileSize || null,
        imageData.width || null,
        imageData.height || null,
      ]
    );

    // Update FTS index
    await this.db.executeSql(
      `INSERT OR REPLACE INTO search_fts (image_id, content) VALUES (?, ?)`,
      [imageData.id, imageData.tags.join(' ')]
    );

    // Record incremental change
    await this.db.executeSql(
      `INSERT INTO incremental_changes (action, image_id, timestamp) VALUES (?, ?, ?)`,
      ['upsert', imageData.id, timestamp]
    );

    // Update last_updated
    await this.db.executeSql(
      `INSERT OR REPLACE INTO index_metadata (key, value) VALUES (?, ?)`,
      ['last_updated', timestamp.toString()]
    );
  }

  async removeImageIndex(imageId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const timestamp = Date.now();

    await this.db.executeSql(
      'DELETE FROM image_index WHERE id = ?',
      [imageId]
    );

    await this.db.executeSql(
      'DELETE FROM search_fts WHERE image_id = ?',
      [imageId]
    );

    await this.db.executeSql(
      `INSERT INTO incremental_changes (action, image_id, timestamp) VALUES (?, ?, ?)`,
      ['delete', imageId, timestamp]
    );
  }

  async searchByTags(query: string): Promise<string[]> {
    if (!this.db) throw new Error('Database not initialized');

    const [result] = await this.db.executeSql(
      `SELECT image_id FROM search_fts WHERE content MATCH ?`,
      [query]
    );

    const ids: string[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      ids.push(result.rows.item(i).image_id);
    }

    return ids;
  }

  async getIncrementalChanges(since: Date): Promise<Array<{
    action: string;
    imageId: string;
    timestamp: Date;
  }>>> {
    if (!this.db) throw new Error('Database not initialized');

    const [result] = await this.db.executeSql(
      `SELECT action, image_id, timestamp FROM incremental_changes
       WHERE timestamp > ? ORDER BY timestamp ASC`,
      [since.getTime()]
    );

    const changes: Array<{ action: string; imageId: string; timestamp: Date }> = [];
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      changes.push({
        action: row.action,
        imageId: row.image_id,
        timestamp: new Date(row.timestamp),
      });
    }

    return changes;
  }

  async createBackup(): Promise<BackupMetadata> {
    if (!this.db) throw new Error('Database not initialized');

    const backupId = `backup_${Date.now()}`;
    const dbPath = Platform.select({
      ios: `${SQLite.databasePath || ''}${DB_NAME}`,
      android: `/data/data/com.bridgeai/databases/${DB_NAME}`,
    });

    // In a real implementation, this would copy the database file
    // and calculate a checksum
    const metadata: BackupMetadata = {
      id: backupId,
      createdAt: new Date(),
      size: await this.getIndexSize(),
      checksum: 'mock_checksum',
    };

    await this.db.executeSql(
      `INSERT INTO index_backups (id, created_at, size, checksum, file_path) VALUES (?, ?, ?, ?, ?)`,
      [backupId, metadata.createdAt.getTime(), metadata.size, metadata.checksum, dbPath || '']
    );

    return metadata;
  }

  async restoreBackup(backupId: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    const [result] = await this.db.executeSql(
      'SELECT * FROM index_backups WHERE id = ?',
      [backupId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    // In a real implementation, this would restore the database from backup
    return true;
  }

  async compressIndex(): Promise<CompressionStats> {
    const originalSize = await this.getIndexSize();

    if (!this.db) {
      return {
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1,
      };
    }

    // Run VACUUM to optimize the database
    await this.db.executeSql('VACUUM');

    const compressedSize = await this.getIndexSize();

    return {
      originalSize,
      compressedSize,
      compressionRatio: originalSize > 0 ? compressedSize / originalSize : 1,
    };
  }

  async cleanupOldChanges(): Promise<void> {
    if (!this.db) return;

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    await this.db.executeSql(
      'DELETE FROM incremental_changes WHERE timestamp < ?',
      [thirtyDaysAgo]
    );
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
  }
}

export const localSearchIndexStorage = LocalSearchIndexStorage.getInstance();
