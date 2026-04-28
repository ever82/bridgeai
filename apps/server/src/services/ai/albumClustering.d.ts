/**
 * Album Clustering Service
 * AI-powered album organization with geographic, temporal, and scene clustering
 */
import { LLMService } from './llmService';
export interface Photo {
    id: string;
    url: string;
    userId: string;
    createdAt: Date;
    location?: {
        lat: number;
        lng: number;
        name?: string;
    };
    tags: string[];
    scene?: string;
    description?: string;
}
export interface Album {
    id: string;
    userId: string;
    name: string;
    description?: string;
    type: AlbumType;
    photos: Photo[];
    coverPhotoId?: string;
    createdAt: Date;
    updatedAt: Date;
    metadata: AlbumMetadata;
}
export type AlbumType = 'auto_ai' | 'location' | 'time' | 'scene' | 'custom';
export interface AlbumMetadata {
    photoCount: number;
    dateRange?: {
        start: Date;
        end: Date;
    };
    location?: {
        lat: number;
        lng: number;
        name: string;
        radius: number;
    };
    dominantTags?: string[];
    dominantScenes?: string[];
    aiGenerated?: boolean;
    confidence?: number;
}
export interface ClusterConfig {
    timeClustering: {
        enabled: boolean;
        gapThreshold: number;
        maxClusterSize: number;
    };
    locationClustering: {
        enabled: boolean;
        radiusMeters: number;
        minPhotos: number;
    };
    sceneClustering: {
        enabled: boolean;
        similarityThreshold: number;
    };
}
export interface ClusteringResult {
    albums: Album[];
    unclusteredPhotos: Photo[];
    stats: {
        totalPhotos: number;
        albumsCreated: number;
        avgPhotosPerAlbum: number;
    };
}
/**
 * Album Clustering Service
 * Automatically organizes photos into albums using AI
 */
export declare class AlbumClusteringService {
    private llmService;
    private albums;
    private defaultConfig;
    constructor(llmService: LLMService);
    /**
     * Auto-cluster user's photos into albums
     */
    autoClusterPhotos(userId: string, photos: Photo[], config?: Partial<ClusterConfig>): Promise<ClusteringResult>;
    /**
     * Cluster photos by geographic location
     */
    private clusterByLocation;
    /**
     * Cluster photos by time periods
     */
    private clusterByTime;
    /**
     * Cluster photos by scene/scenario similarity
     */
    private clusterByScene;
    /**
     * Create a time-based album
     */
    private createTimeAlbum;
    /**
     * Generate AI names for albums
     */
    private generateAlbumNames;
    /**
     * Calculate distance between two coordinates (haversine formula)
     */
    private calculateDistance;
    /**
     * Calculate cluster center
     */
    private calculateClusterCenter;
    /**
     * Get location name from coordinates
     */
    private getLocationName;
    /**
     * Get date range from photos
     */
    private getDateRange;
    /**
     * Generate name for time-based album
     */
    private generateTimeAlbumName;
    /**
     * Get photos not in any album
     */
    private getUnclusteredPhotos;
    /**
     * Create custom album
     */
    createCustomAlbum(userId: string, name: string, photoIds: string[], description?: string): Promise<Album | null>;
    /**
     * Get user's albums
     */
    getUserAlbums(userId: string): Promise<Album[]>;
    /**
     * Get album by ID
     */
    getAlbum(albumId: string): Promise<Album | null>;
    /**
     * Delete album
     */
    deleteAlbum(albumId: string): Promise<boolean>;
}
export declare function getAlbumClusteringService(llmService: LLMService): AlbumClusteringService;
//# sourceMappingURL=albumClustering.d.ts.map