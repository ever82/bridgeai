/**
 * Image Indexing Service
 * AI-powered image tagging, description generation, and multi-dimensional indexing
 */
import { LLMService } from './llmService';
export interface ImageForIndexing {
    id: string;
    url: string;
    userId: string;
    metadata?: {
        createdAt?: Date;
        location?: {
            lat: number;
            lng: number;
            name?: string;
        };
        camera?: string;
        dimensions?: {
            width: number;
            height: number;
        };
        fileSize?: number;
        format?: string;
    };
}
export interface ImageIndex {
    id: string;
    imageId: string;
    userId: string;
    tags: Tag[];
    description: string;
    embedding: number[];
    categories: string[];
    colors: string[];
    objects: DetectedObject[];
    faces: FaceInfo[];
    scenes: string[];
    emotions: string[];
    quality: ImageQuality;
    location?: {
        lat: number;
        lng: number;
        name?: string;
    };
    createdAt: Date;
    indexedAt: Date;
}
export interface Tag {
    name: string;
    confidence: number;
    category: TagCategory;
}
export type TagCategory = 'object' | 'scene' | 'activity' | 'person' | 'animal' | 'nature' | 'architecture' | 'concept' | 'color' | 'time' | 'location' | 'event';
export interface DetectedObject {
    label: string;
    confidence: number;
    boundingBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}
export interface FaceInfo {
    faceId: string;
    confidence: number;
    age?: number;
    gender?: string;
    emotions?: string[];
    boundingBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}
export interface ImageQuality {
    score: number;
    brightness: number;
    sharpness: number;
    contrast: number;
    noise: number;
}
export interface IndexUpdateEvent {
    imageId: string;
    action: 'created' | 'updated' | 'deleted';
    timestamp: Date;
    changes?: string[];
}
/**
 * Image Indexing Service
 * Generates AI tags, descriptions, and multi-dimensional indexes for images
 */
export declare class ImageIndexingService {
    private llmService;
    private indexStore;
    private updateCallbacks;
    constructor(llmService: LLMService);
    /**
     * Index a single image
     */
    indexImage(image: ImageForIndexing): Promise<ImageIndex>;
    /**
     * Batch index multiple images
     */
    indexImages(images: ImageForIndexing[]): Promise<ImageIndex[]>;
    /**
     * Generate natural language description of image
     */
    private generateDescription;
    /**
     * Generate tags for image
     */
    private generateTags;
    /**
     * Generate embedding for semantic search
     */
    private generateEmbedding;
    /**
     * Detect objects in image
     */
    private detectObjects;
    /**
     * Analyze dominant colors
     */
    private analyzeColors;
    /**
     * Detect scene types
     */
    private detectScenes;
    /**
     * Analyze emotions in image
     */
    private analyzeEmotions;
    /**
     * Assess image quality
     */
    private assessQuality;
    /**
     * Detect faces in image
     */
    private detectFaces;
    /**
     * Categorize image based on tags, scenes, and objects
     */
    private categorizeImage;
    /**
     * Get index by image ID
     */
    getIndex(imageId: string): Promise<ImageIndex | null>;
    /**
     * Get all indexes for a user
     */
    getUserIndexes(userId: string): Promise<ImageIndex[]>;
    /**
     * Update index
     */
    updateIndex(imageId: string, updates: Partial<ImageIndex>): Promise<ImageIndex | null>;
    /**
     * Delete index
     */
    deleteIndex(imageId: string): Promise<boolean>;
    /**
     * Get all tags used by a user
     */
    getUserTags(userId: string): Promise<{
        tag: string;
        count: number;
    }[]>;
    /**
     * Subscribe to index updates
     */
    onUpdate(callback: (event: IndexUpdateEvent) => void): () => void;
    private notifyUpdate;
}
export declare function getImageIndexingService(llmService: LLMService): ImageIndexingService;
//# sourceMappingURL=imageIndexing.d.ts.map