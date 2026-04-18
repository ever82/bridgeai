// Web stub for localIndexer - SQLite not available on web

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

export class LocalSearchIndex {
  private static instance: LocalSearchIndex;

  static getInstance(): LocalSearchIndex {
    if (!LocalSearchIndex.instance) {
      LocalSearchIndex.instance = new LocalSearchIndex();
    }
    return LocalSearchIndex.instance;
  }

  async initialize(): Promise<void> {
    // No-op on web
  }

  async addOrUpdateImage(_image: IndexedImage): Promise<void> {
    throw new Error('Local search index is not available on web');
  }

  async addBatch(_images: IndexedImage[]): Promise<void> {
    throw new Error('Local search index is not available on web');
  }

  async search(_query: string, _limit?: number): Promise<SearchResult[]> {
    return [];
  }

  async searchSemantic(_queryEmbedding: number[], _limit?: number): Promise<SearchResult[]> {
    return [];
  }

  async getIndexStats(): Promise<IndexStats> {
    return {
      totalImages: 0,
      lastUpdated: new Date(),
      indexVersion: 0,
      indexSize: 0,
    };
  }

  async deleteImage(_imageId: string): Promise<void> {
    // No-op on web
  }

  async backup(): Promise<string> {
    throw new Error('Local search index is not available on web');
  }

  async restore(_backupPath: string): Promise<void> {
    throw new Error('Local search index is not available on web');
  }

  async incrementIndexVersion(): Promise<void> {
    // No-op on web
  }
}

export const localSearchIndex = LocalSearchIndex.getInstance();
