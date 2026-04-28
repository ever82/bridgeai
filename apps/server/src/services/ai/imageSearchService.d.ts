/**
 * Image Search Service
 * AI相册检索服务
 */
import { ImageInput, ImageSearchResult, ImageEmbedding, SemanticTags, IVisionModelAdapter } from './vision/types';
interface VectorDatabase {
    search(embedding: number[], topK: number): Promise<Array<{
        id: string;
        score: number;
        metadata?: Record<string, unknown>;
    }>>;
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
export declare class ImageSearchService {
    private adapter;
    private vectorDB?;
    private config;
    private memoryIndex;
    constructor(config: ImageSearchServiceConfig);
    /**
     * 通过自然语言描述搜索图像
     */
    searchByText(query: string, options?: {
        topK?: number;
        filters?: Record<string, unknown>;
        minSimilarity?: number;
    }): Promise<ImageSearchResult[]>;
    /**
     * 通过图像搜索相似图像
     */
    searchByImage(image: ImageInput, options?: {
        topK?: number;
        filters?: Record<string, unknown>;
        minSimilarity?: number;
    }): Promise<ImageSearchResult[]>;
    /**
     * 通过嵌入向量搜索图像
     */
    searchByEmbedding(embedding: number[], options?: {
        topK?: number;
        filters?: Record<string, unknown>;
        minSimilarity?: number;
    }): Promise<ImageSearchResult[]>;
    /**
     * 通过语义标签搜索图像
     */
    searchByTags(tags: string[], options?: {
        matchType?: 'all' | 'any';
        topK?: number;
    }): Promise<ImageSearchResult[]>;
    /**
     * 为图像生成嵌入向量
     */
    generateImageEmbedding(image: ImageInput): Promise<number[]>;
    /**
     * 索引图像到搜索库
     */
    indexImage(imageId: string, image: ImageInput, metadata?: {
        url?: string;
        tags?: string[];
        [key: string]: unknown;
    }): Promise<ImageEmbedding>;
    /**
     * 批量索引图像
     */
    indexImages(images: Array<{
        imageId: string;
        image: ImageInput;
        metadata?: Record<string, unknown>;
    }>): Promise<void>;
    /**
     * 从索引中删除图像
     */
    removeFromIndex(imageId: string): Promise<void>;
    /**
     * 提取图像的语义标签
     */
    extractSemanticTags(image: ImageInput): Promise<SemanticTags>;
    /**
     * 获取图像搜索建议
     */
    getSearchSuggestions(partialQuery: string, options?: {
        maxSuggestions?: number;
    }): Promise<string[]>;
    /**
     * 将文本转换为嵌入向量
     * 使用 OpenAI text-embedding-3-large API
     */
    private textToEmbedding;
    /**
     * 在内存索引中搜索
     */
    private searchInMemory;
    /**
     * 计算余弦相似度
     */
    private calculateCosineSimilarity;
    /**
     * 应用过滤器
     */
    private applyFilters;
    /**
     * 解析语义标签
     */
    private parseSemanticTags;
}
export {};
//# sourceMappingURL=imageSearchService.d.ts.map