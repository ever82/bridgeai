import SQLite, { SQLiteDatabase, Transaction } from 'react-native-sqlite-storage';
import { Platform } from 'react-native';
import { ImageAnalysisResult } from './localImageAnalysis';

SQLite.enablePromise(true);

export interface IndexedImage {
  id: string;
  uri: string;
  localIdentifier: string;
  tags: string[];
  embeddings: number[];
  sceneType: string;
  createdAt: Date;
  modifiedAt: Date;
  analyzedAt: Date;
  fileSize: number;
  width: number;
  height: number;
}

export interface SearchResult {
  id: string;
  uri: string;
  relevanceScore: number;
  source: 'local' | 'cloud';
  tags: string[];
  matchedTerms: string[];
}

export interface IndexStats {
  totalImages: number;
  lastUpdated: Date;
  indexVersion: number;
  indexSize: number;
}

const DB_NAME = 'LocalSearchIndex.db';
const INDEX_VERSION = 1;

const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS indexed_images (
    id TEXT PRIMARY KEY,
    uri TEXT NOT NULL,
    local_identifier TEXT UNIQUE,
    tags TEXT NOT NULL,
    embeddings BLOB,
    scene_type TEXT,
    created_at INTEGER NOT NULL,
    modified_at INTEGER NOT NULL,
    analyzed_at INTEGER,
    file_size INTEGER,
    width INTEGER,
    height INTEGER
  );

  CREATE INDEX IF NOT EXISTS idx_scene_type ON indexed_images(scene_type);
  CREATE INDEX IF NOT EXISTS idx_analyzed_at ON indexed_images(analyzed_at);
  CREATE INDEX IF NOT EXISTS idx_modified_at ON indexed_images(modified_at);

  CREATE VIRTUAL TABLE IF NOT EXISTS image_tags USING fts5(
    image_id,
    tag_content,
    content=''
  );

  CREATE TABLE IF NOT EXISTS index_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS incremental_sync (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    image_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  );
`;

export class LocalSearchIndex {
  private static instance: LocalSearchIndex;
  private db: SQLiteDatabase | null = null;
  private isInitialized = false;
  private compressionEnabled = true;

  static getInstance(): LocalSearchIndex {
    if (!LocalSearchIndex.instance) {
      LocalSearchIndex.instance = new LocalSearchIndex();
    }
    return LocalSearchIndex.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.db = await SQLite.openDatabase({
        name: DB_NAME,
        location: 'default',
      });

      await this.db.executeSql(CREATE_TABLES_SQL);
      await this.migrateIfNeeded();

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize search index:', error);
      throw new Error('Database initialization failed');
    }
  }

  async addOrUpdateImage(image: IndexedImage): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const tagsJson = JSON.stringify(image.tags);
    const embeddingsBlob = this.compressEmbeddings(image.embeddings);

    await this.db.executeSql(
      `INSERT OR REPLACE INTO indexed_images
       (id, uri, local_identifier, tags, embeddings, scene_type,
        created_at, modified_at, analyzed_at, file_size, width, height)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        image.id,
        image.uri,
        image.localIdentifier,
        tagsJson,
        embeddingsBlob,
        image.sceneType,
        image.createdAt.getTime(),
        image.modifiedAt.getTime(),
        image.analyzedAt.getTime(),
        image.fileSize,
        image.width,
        image.height,
      ],
    );

    await this.updateTagsFTS(image.id, image.tags);
    await this.recordSyncAction('upsert', image.id);
  }

  async addBatch(images: IndexedImage[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.transaction(async (tx: Transaction) => {
      for (const image of images) {
        const tagsJson = JSON.stringify(image.tags);
        const embeddingsBlob = this.compressEmbeddings(image.embeddings);

        tx.executeSql(
          `INSERT OR REPLACE INTO indexed_images
           (id, uri, local_identifier, tags, embeddings, scene_type,
            created_at, modified_at, analyzed_at, file_size, width, height)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            image.id,
            image.uri,
            image.localIdentifier,
            tagsJson,
            embeddingsBlob,
            image.sceneType,
            image.createdAt.getTime(),
            image.modifiedAt.getTime(),
            image.analyzedAt.getTime(),
            image.fileSize,
            image.width,
            image.height,
          ],
        );

        tx.executeSql(
          'DELETE FROM image_tags WHERE image_id = ?',
          [image.id],
        );

        for (const tag of image.tags) {
          tx.executeSql(
            'INSERT INTO image_tags (image_id, tag_content) VALUES (?, ?)',
            [image.id, tag],
          );
        }
      }
    });

    await this.recordSyncAction('batch_upsert', `batch_${Date.now()}`);
  }

  async search(query: string, limit: number = 50): Promise<SearchResult[]> {
    if (!this.db) throw new Error('Database not initialized');

    const normalizedQuery = query.trim().toLowerCase();

    const [ftsResults] = await this.db.executeSql(
      `SELECT DISTINCT i.id, i.uri, i.tags,
              1.0 as relevance_score
       FROM indexed_images i
       JOIN image_tags t ON i.id = t.image_id
       WHERE t.tag_content MATCH ?
       ORDER BY relevance_score DESC
       LIMIT ?`,
      [normalizedQuery, limit],
    );

    const [semanticResults] = await this.db.executeSql(
      `SELECT id, uri, tags, embeddings
       FROM indexed_images
       WHERE scene_type LIKE ? OR tags LIKE ?
       LIMIT ?`,
      [`%${normalizedQuery}%`, `%${normalizedQuery}%`, limit],
    );

    const results: SearchResult[] = [];

    for (let i = 0; i < ftsResults.rows.length; i++) {
      const row = ftsResults.rows.item(i);
      results.push({
        id: row.id,
        uri: row.uri,
        relevanceScore: row.relevance_score,
        source: 'local',
        tags: JSON.parse(row.tags),
        matchedTerms: [normalizedQuery],
      });
    }

    return results.slice(0, limit);
  }

  async searchSemantic(
    queryEmbedding: number[],
    limit: number = 50,
  ): Promise<SearchResult[]> {
    if (!this.db) throw new Error('Database not initialized');

    const [results] = await this.db.executeSql(
      `SELECT id, uri, tags, embeddings FROM indexed_images
       WHERE embeddings IS NOT NULL
       LIMIT 1000`,
    );

    const scored: Array<SearchResult & { score: number }> = [];

    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      const embeddings = this.decompressEmbeddings(row.embeddings);
      const similarity = this.cosineSimilarity(queryEmbedding, embeddings);

      if (similarity > 0.6) {
        scored.push({
          id: row.id,
          uri: row.uri,
          relevanceScore: similarity,
          source: 'local',
          tags: JSON.parse(row.tags),
          matchedTerms: [],
          score: similarity,
        });
      }
    }

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ score, ...rest }) => rest);
  }

  async getIndexStats(): Promise<IndexStats> {
    if (!this.db) throw new Error('Database not initialized');

    const [countResult] = await this.db.executeSql(
      'SELECT COUNT(*) as total FROM indexed_images',
    );
    const total = countResult.rows.item(0).total;

    const [versionResult] = await this.db.executeSql(
      "SELECT value FROM index_metadata WHERE key = 'version'",
    );
    const version = versionResult.rows.length > 0
      ? parseInt(versionResult.rows.item(0).value, 10)
      : INDEX_VERSION;

    const [updatedResult] = await this.db.executeSql(
      "SELECT value FROM index_metadata WHERE key = 'last_updated'",
    );
    const lastUpdated = updatedResult.rows.length > 0
      ? new Date(parseInt(updatedResult.rows.item(0).value, 10))
      : new Date();

    return {
      totalImages: total,
      lastUpdated,
      indexVersion: version,
      indexSize: await this.getDatabaseSize(),
    };
  }

  async deleteImage(imageId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.executeSql(
      'DELETE FROM indexed_images WHERE id = ?',
      [imageId],
    );
    await this.db.executeSql(
      'DELETE FROM image_tags WHERE image_id = ?',
      [imageId],
    );
    await this.recordSyncAction('delete', imageId);
  }

  async backup(): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const backupPath = `${Platform.OS === 'ios'
      ? SQLite.databasePath
      : '/data/data/com.bridgeai/databases/'}backup_${Date.now()}.db`;

    await this.db.executeSql(`VACUUM INTO '${backupPath}'`);
    return backupPath;
  }

  async restore(backupPath: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.close();
    this.isInitialized = false;

    await SQLite.deleteDatabase({ name: DB_NAME, location: 'default' });

    await this.initialize();
  }

  async incrementIndexVersion(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const newVersion = INDEX_VERSION + 1;
    await this.db.executeSql(
      `INSERT OR REPLACE INTO index_metadata (key, value) VALUES ('version', ?)`,
      [newVersion.toString()],
    );
  }

  private async migrateIfNeeded(): Promise<void> {
    if (!this.db) return;

    const [result] = await this.db.executeSql(
      "SELECT value FROM index_metadata WHERE key = 'version'",
    );

    if (result.rows.length === 0) {
      await this.db.executeSql(
        `INSERT INTO index_metadata (key, value) VALUES ('version', ?)`,
        [INDEX_VERSION.toString()],
      );
      await this.db.executeSql(
        `INSERT INTO index_metadata (key, value) VALUES ('last_updated', ?)`,
        [Date.now().toString()],
      );
    }
  }

  private async updateTagsFTS(imageId: string, tags: string[]): Promise<void> {
    if (!this.db) return;

    await this.db.executeSql(
      'DELETE FROM image_tags WHERE image_id = ?',
      [imageId],
    );

    for (const tag of tags) {
      await this.db.executeSql(
        'INSERT INTO image_tags (image_id, tag_content) VALUES (?, ?)',
        [imageId, tag],
      );
    }
  }

  private async recordSyncAction(action: string, imageId: string): Promise<void> {
    if (!this.db) return;

    await this.db.executeSql(
      `INSERT INTO incremental_sync (action, image_id, timestamp) VALUES (?, ?, ?)`,
      [action, imageId, Date.now()],
    );

    await this.db.executeSql(
      `UPDATE index_metadata SET value = ? WHERE key = 'last_updated'`,
      [Date.now().toString()],
    );
  }

  private compressEmbeddings(embeddings: number[]): Uint8Array {
    if (!this.compressionEnabled) {
      const buffer = new Float32Array(embeddings).buffer;
      return new Uint8Array(buffer);
    }

    const quantized = embeddings.map(v => Math.round((v + 1) * 127.5));
    return new Uint8Array(quantized);
  }

  private decompressEmbeddings(data: Uint8Array): number[] {
    if (!this.compressionEnabled || data.length < 512) {
      const floatArray = new Float32Array(data.buffer);
      return Array.from(floatArray);
    }

    return Array.from(data).map(v => v / 127.5 - 1);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private async getDatabaseSize(): Promise<number> {
    return 0;
  }
}

export const localSearchIndex = LocalSearchIndex.getInstance();
