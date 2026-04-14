/**
 * Image Search Service
 * AI相册检索服务
 */

import {
  ImageInput,
  ImageSearchResult,
  ImageEmbedding,
  SemanticTags,
  IVisionModelAdapter
} from './vision/types';

// 向量数据库接口（模拟，实际项目中使用真实的向量数据库）
interface VectorDatabase {
  search(embedding: number[], topK: number): Promise<Array<{ id: string; score: number; metadata?: Record<string, unknown> }>>;
  store(id: string, embedding: number[], metadata?: Record<string, unknown>): Promise<void>;
  delete(id: string): Promise<void>;
}

interface ImageSearchServiceConfig {
  adapter: IVisionModelAdapter;
  vectorDB?: VectorDatabase;
  embeddingDimension?: number;
  defaultTopK?: number;
  similarityThreshold?: number;
}

export class ImageSearchService {
  private adapter: IVisionModelAdapter;
  private vectorDB?: VectorDatabase;
  private config: ImageSearchServiceConfig;

  // 内存中的索引（当没有外部向量数据库时使用）
  private memoryIndex: Map<string, { embedding: number[]; metadata: Record<string, unknown> }> = new Map();

  constructor(config: ImageSearchServiceConfig) {
    this.adapter = config.adapter;
    this.vectorDB = config.vectorDB;
    this.config = {
      embeddingDimension: 1536,
      defaultTopK: 10,
      similarityThreshold: 0.7,
      ...config
    };
  }

  /**
   * 通过自然语言描述搜索图像
   */
  async searchByText(
    query: string,
    options?: {
      topK?: number;
      filters?: Record<string, unknown>;
      minSimilarity?: number;
    }
  ): Promise<ImageSearchResult[]> {
    // Validate query
    if (!query || query.trim().length === 0) {
      throw new Error('Search query cannot be empty');
    }

    const startTime = Date.now();

    try {
      // 将查询文本转换为嵌入向量
      // 注意：这里使用图像适配器生成文本嵌入（或者使用外部文本嵌入服务）
      const queryEmbedding = await this.textToEmbedding(query);

      // 搜索相似图像
      return this.searchByEmbedding(queryEmbedding, options);
    } catch (error) {
      throw new Error(`Text search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 通过图像搜索相似图像
   */
  async searchByImage(
    image: ImageInput,
    options?: {
      topK?: number;
      filters?: Record<string, unknown>;
      minSimilarity?: number;
    }
  ): Promise<ImageSearchResult[]> {
    try {
      // 生成图像嵌入
      const embedding = await this.generateImageEmbedding(image);

      // 搜索相似图像
      return this.searchByEmbedding(embedding, options);
    } catch (error) {
      throw new Error(`Image search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 通过嵌入向量搜索图像
   */
  async searchByEmbedding(
    embedding: number[],
    options?: {
      topK?: number;
      filters?: Record<string, unknown>;
      minSimilarity?: number;
    }
  ): Promise<ImageSearchResult[]> {
    const topK = options?.topK || this.config.defaultTopK || 10;
    const minSimilarity = options?.minSimilarity || this.config.similarityThreshold || 0.7;

    let results: ImageSearchResult[] = [];

    if (this.vectorDB) {
      // 使用外部向量数据库
      const dbResults = await this.vectorDB.search(embedding, topK);
      results = dbResults.map(r => ({
        imageId: r.id,
        url: String(r.metadata?.url || ''),
        similarity: r.score,
        metadata: r.metadata
      }));
    } else {
      // 使用内存索引
      results = this.searchInMemory(embedding, topK);
    }

    // 应用相似度阈值过滤
    results = results.filter(r => r.similarity >= minSimilarity);

    // 应用额外过滤器
    if (options?.filters) {
      results = this.applyFilters(results, options.filters);
    }

    return results;
  }

  /**
   * 通过语义标签搜索图像
   */
  async searchByTags(
    tags: string[],
    options?: {
      matchType?: 'all' | 'any';
      topK?: number;
    }
  ): Promise<ImageSearchResult[]> {
    const matchType = options?.matchType || 'any';
    const topK = options?.topK || this.config.defaultTopK || 10;

    // 构建标签查询
    const query = tags.join(matchType === 'all' ? ' AND ' : ' OR ');

    return this.searchByText(query, { topK });
  }

  /**
   * 为图像生成嵌入向量
   */
  async generateImageEmbedding(
    image: ImageInput
  ): Promise<number[]> {
    if (this.adapter.generateEmbedding) {
      return this.adapter.generateEmbedding(image);
    }

    // 如果适配器不支持嵌入生成，通过描述生成文本嵌入
    const descriptionPrompt = `Describe this image in detail for semantic search indexing.
Focus on: objects, scene, activities, colors, style, mood.
Keep the description concise but comprehensive.`;

    const description = await this.adapter.analyzeImage(image, descriptionPrompt, {
      maxTokens: 512,
      temperature: 0.3
    });

    return this.textToEmbedding(description);
  }

  /**
   * 索引图像到搜索库
   */
  async indexImage(
    imageId: string,
    image: ImageInput,
    metadata?: {
      url?: string;
      tags?: string[];
      [key: string]: unknown;
    }
  ): Promise<ImageEmbedding> {
    // 生成图像嵌入
    const embedding = await this.generateImageEmbedding(image);

    // 提取语义标签
    const semanticTags = await this.extractSemanticTags(image);

    // 合并元数据
    const fullMetadata = {
      ...metadata,
      tags: [...(metadata?.tags || []), ...semanticTags.tags],
      categories: semanticTags.categories,
      attributes: semanticTags.attributes
    };

    if (this.vectorDB) {
      // 存储到外部向量数据库
      await this.vectorDB.store(imageId, embedding, fullMetadata);
    } else {
      // 存储到内存索引
      this.memoryIndex.set(imageId, { embedding, metadata: fullMetadata });
    }

    return {
      embedding,
      dimension: embedding.length,
      model: this.adapter.id
    };
  }

  /**
   * 批量索引图像
   */
  async indexImages(
    images: Array<{
      imageId: string;
      image: ImageInput;
      metadata?: Record<string, unknown>;
    }>
  ): Promise<void> {
    // 限制并发
    const concurrency = 3;
    for (let i = 0; i < images.length; i += concurrency) {
      const batch = images.slice(i, i + concurrency);
      await Promise.all(
        batch.map(({ imageId, image, metadata }) =>
          this.indexImage(imageId, image, metadata).catch(error => {
            console.error(`Failed to index image ${imageId}:`, error);
          })
        )
      );
    }
  }

  /**
   * 从索引中删除图像
   */
  async removeFromIndex(imageId: string): Promise<void> {
    if (this.vectorDB) {
      await this.vectorDB.delete(imageId);
    } else {
      this.memoryIndex.delete(imageId);
    }
  }

  /**
   * 提取图像的语义标签
   */
  async extractSemanticTags(image: ImageInput): Promise<SemanticTags> {
    const tagsPrompt = `Analyze this image and extract semantic tags for search indexing.

Provide tags in the following categories:
1. Objects (e.g., person, car, dog, building)
2. Scenes (e.g., beach, city, forest, office)
3. Activities (e.g., running, eating, working)
4. Attributes (e.g., sunny, crowded, vintage)
5. Mood/Style (e.g., happy, dramatic, minimalist)

Return as JSON:
{
  "tags": ["general", "tags", "here"],
  "categories": ["scene1", "scene2"],
  "attributes": {
    "color": ["red", "blue"],
    "lighting": ["bright", "natural"],
    "composition": ["portrait", "landscape"]
  }
}`;

    const response = await this.adapter.analyzeImage(image, tagsPrompt, {
      maxTokens: 1024,
      temperature: 0.3
    });

    return this.parseSemanticTags(response);
  }

  /**
   * 获取图像搜索建议
   */
  async getSearchSuggestions(
    partialQuery: string,
    options?: { maxSuggestions?: number }
  ): Promise<string[]> {
    // 基于部分查询生成建议
    // 这里可以实现更复杂的建议逻辑，如基于历史搜索、热门标签等
    const suggestions: string[] = [];

    // 常见的图像搜索前缀
    const commonPrefixes = [
      'photos of',
      'images with',
      'pictures of',
      'scenes with',
      'photos showing'
    ];

    commonPrefixes.forEach(prefix => {
      suggestions.push(`${prefix} ${partialQuery}`);
    });

    return suggestions.slice(0, options?.maxSuggestions || 5);
  }

  /**
   * 将文本转换为嵌入向量
   * 注意：实际项目中应该使用文本嵌入服务
   */
  private async textToEmbedding(text: string): Promise<number[]> {
    // 这里使用简单的哈希模拟文本嵌入
    // 实际项目中应该调用文本嵌入API（如OpenAI text-embedding-3-large）
    const dimension = this.config.embeddingDimension || 1536;
    const embedding = new Array(dimension).fill(0);

    // 使用文本内容生成伪随机但确定的向量
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    for (let i = 0; i < dimension; i++) {
      embedding[i] = Math.sin(hash + i * 0.1) * 0.5;
    }

    // 归一化
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }

  /**
   * 在内存索引中搜索
   */
  private searchInMemory(
    queryEmbedding: number[],
    topK: number
  ): ImageSearchResult[] {
    const similarities: Array<{ imageId: string; similarity: number; metadata: Record<string, unknown> }> = [];

    for (const [imageId, data] of this.memoryIndex.entries()) {
      const similarity = this.calculateCosineSimilarity(queryEmbedding, data.embedding);
      similarities.push({
        imageId,
        similarity,
        metadata: data.metadata
      });
    }

    // 按相似度排序并返回前K个
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)
      .map(s => ({
        imageId: s.imageId,
        url: String(s.metadata.url || ''),
        similarity: s.similarity,
        metadata: s.metadata
      }));
  }

  /**
   * 计算余弦相似度
   */
  private calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Embedding dimensions must match');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * 应用过滤器
   */
  private applyFilters(
    results: ImageSearchResult[],
    filters: Record<string, unknown>
  ): ImageSearchResult[] {
    return results.filter(result => {
      for (const [key, value] of Object.entries(filters)) {
        const metadataValue = result.metadata?.[key];
        if (metadataValue !== value) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * 解析语义标签
   */
  private parseSemanticTags(response: string): SemanticTags {
    const defaultTags: SemanticTags = {
      tags: [],
      categories: [],
      attributes: {}
    };

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return defaultTags;
      }

      const data = JSON.parse(jsonMatch[0]);

      return {
        tags: Array.isArray(data.tags) ? data.tags.slice(0, 20) : [],
        categories: Array.isArray(data.categories) ? data.categories : [],
        attributes: typeof data.attributes === 'object' && data.attributes !== null
          ? data.attributes
          : {}
      };
    } catch {
      return defaultTags;
    }
  }
}
