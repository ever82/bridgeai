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
  location?: { lat: number; lng: number; name?: string };
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

export type AlbumType =
  | 'auto_ai'      // AI automatically generated
  | 'location'     // Location-based
  | 'time'         // Time period-based
  | 'scene'        // Scene/scenario-based
  | 'custom';      // User created

export interface AlbumMetadata {
  photoCount: number;
  dateRange?: { start: Date; end: Date };
  location?: { lat: number; lng: number; name: string; radius: number };
  dominantTags?: string[];
  dominantScenes?: string[];
  aiGenerated?: boolean;
  confidence?: number;
}

export interface ClusterConfig {
  timeClustering: {
    enabled: boolean;
    gapThreshold: number; // Minutes between clusters
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
export class AlbumClusteringService {
  private llmService: LLMService;
  private albums: Map<string, Album> = new Map();
  private defaultConfig: ClusterConfig = {
    timeClustering: {
      enabled: true,
      gapThreshold: 120, // 2 hours
      maxClusterSize: 100
    },
    locationClustering: {
      enabled: true,
      radiusMeters: 500,
      minPhotos: 3
    },
    sceneClustering: {
      enabled: true,
      similarityThreshold: 0.7
    }
  };

  constructor(llmService: LLMService) {
    this.llmService = llmService;
  }

  /**
   * Auto-cluster user's photos into albums
   */
  async autoClusterPhotos(
    userId: string,
    photos: Photo[],
    config?: Partial<ClusterConfig>
  ): Promise<ClusteringResult> {
    const mergedConfig = { ...this.defaultConfig, ...config };
    const albums: Album[] = [];
    let remainingPhotos = [...photos];

    // Step 1: Location-based clustering
    if (mergedConfig.locationClustering.enabled) {
      const locationAlbums = await this.clusterByLocation(
        userId,
        remainingPhotos,
        mergedConfig.locationClustering
      );
      albums.push(...locationAlbums);
      remainingPhotos = this.getUnclusteredPhotos(remainingPhotos, locationAlbums);
    }

    // Step 2: Time-based clustering
    if (mergedConfig.timeClustering.enabled) {
      const timeAlbums = await this.clusterByTime(
        userId,
        remainingPhotos,
        mergedConfig.timeClustering
      );
      albums.push(...timeAlbums);
      remainingPhotos = this.getUnclusteredPhotos(remainingPhotos, timeAlbums);
    }

    // Step 3: Scene-based clustering
    if (mergedConfig.sceneClustering.enabled) {
      const sceneAlbums = await this.clusterByScene(
        userId,
        remainingPhotos,
        mergedConfig.sceneClustering
      );
      albums.push(...sceneAlbums);
      remainingPhotos = this.getUnclusteredPhotos(remainingPhotos, sceneAlbums);
    }

    // Save albums
    albums.forEach(album => {
      this.albums.set(album.id, album);
    });

    // Generate AI names for auto albums
    await this.generateAlbumNames(albums.filter(a => a.type === 'auto_ai'));

    return {
      albums,
      unclusteredPhotos: remainingPhotos,
      stats: {
        totalPhotos: photos.length,
        albumsCreated: albums.length,
        avgPhotosPerAlbum: albums.length > 0
          ? photos.length / albums.length
          : 0
      }
    };
  }

  /**
   * Cluster photos by geographic location
   */
  private async clusterByLocation(
    userId: string,
    photos: Photo[],
    config: ClusterConfig['locationClustering']
  ): Promise<Album[]> {
    const albums: Album[] = [];
    const photosWithLocation = photos.filter(p => p.location);

    if (photosWithLocation.length < config.minPhotos) {
      return albums;
    }

    // Group photos by proximity
    const clusters: Photo[][] = [];
    const used = new Set<string>();

    for (const photo of photosWithLocation) {
      if (used.has(photo.id)) continue;

      const cluster: Photo[] = [photo];
      used.add(photo.id);

      for (const other of photosWithLocation) {
        if (used.has(other.id)) continue;

        const distance = this.calculateDistance(
          photo.location!,
          other.location!
        );

        if (distance <= config.radiusMeters) {
          cluster.push(other);
          used.add(other.id);
        }
      }

      if (cluster.length >= config.minPhotos) {
        clusters.push(cluster);
      }
    }

    // Create albums from clusters
    for (const cluster of clusters) {
      const center = this.calculateClusterCenter(cluster);
      const locationName = await this.getLocationName(center);

      const album: Album = {
        id: `album_loc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        name: locationName || 'Location Album',
        type: 'location',
        photos: cluster,
        coverPhotoId: cluster[0]?.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          photoCount: cluster.length,
          dateRange: this.getDateRange(cluster),
          location: {
            lat: center.lat,
            lng: center.lng,
            name: locationName || 'Unknown Location',
            radius: config.radiusMeters
          },
          aiGenerated: true
        }
      };

      albums.push(album);
    }

    return albums;
  }

  /**
   * Cluster photos by time periods
   */
  private async clusterByTime(
    userId: string,
    photos: Photo[],
    config: ClusterConfig['timeClustering']
  ): Promise<Album[]> {
    const albums: Album[] = [];

    // Sort by date
    const sortedPhotos = [...photos].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );

    let currentCluster: Photo[] = [];

    for (let i = 0; i < sortedPhotos.length; i++) {
      const photo = sortedPhotos[i];
      const prevPhoto = sortedPhotos[i - 1];

      if (
        !prevPhoto ||
        (photo.createdAt.getTime() - prevPhoto.createdAt.getTime()) /
          (1000 * 60) <=
          config.gapThreshold
      ) {
        currentCluster.push(photo);
      } else {
        // Gap detected, save current cluster
        if (currentCluster.length > 0) {
          albums.push(this.createTimeAlbum(userId, currentCluster));
        }
        currentCluster = [photo];
      }

      // Check max cluster size
      if (currentCluster.length >= config.maxClusterSize) {
        albums.push(this.createTimeAlbum(userId, currentCluster));
        currentCluster = [];
      }
    }

    // Add remaining photos
    if (currentCluster.length > 0) {
      albums.push(this.createTimeAlbum(userId, currentCluster));
    }

    return albums;
  }

  /**
   * Cluster photos by scene/scenario similarity
   */
  private async clusterByScene(
    userId: string,
    photos: Photo[],
    config: ClusterConfig['sceneClustering']
  ): Promise<Album[]> {
    const albums: Album[] = [];
    const sceneGroups = new Map<string, Photo[]>();

    // Group by scene tags
    for (const photo of photos) {
      const scene = photo.scene || photo.tags[0] || 'general';
      const group = sceneGroups.get(scene) || [];
      group.push(photo);
      sceneGroups.set(scene, group);
    }

    // Create albums for scenes with enough photos
    for (const [scene, group] of sceneGroups) {
      if (group.length >= 3) {
        const album: Album = {
          id: `album_scene_${Date.now()}_${scene}`,
          userId,
          name: `${scene.charAt(0).toUpperCase() + scene.slice(1)} Photos`,
          type: 'scene',
          photos: group,
          coverPhotoId: group[0]?.id,
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            photoCount: group.length,
            dateRange: this.getDateRange(group),
            dominantScenes: [scene],
            aiGenerated: true
          }
        };

        albums.push(album);
      }
    }

    return albums;
  }

  /**
   * Create a time-based album
   */
  private createTimeAlbum(userId: string, photos: Photo[]): Album {
    const dateRange = this.getDateRange(photos);
    const name = this.generateTimeAlbumName(dateRange);

    return {
      id: `album_time_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      name,
      type: 'time',
      photos,
      coverPhotoId: photos[0]?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        photoCount: photos.length,
        dateRange,
        aiGenerated: true
      }
    };
  }

  /**
   * Generate AI names for albums
   */
  private async generateAlbumNames(albums: Album[]): Promise<void> {
    for (const album of albums) {
      const prompt = `
        Generate a creative album name for these photos:
        - Photo count: ${album.metadata.photoCount}
        - Date range: ${album.metadata.dateRange?.start?.toLocaleDateString() || 'unknown'} to ${album.metadata.dateRange?.end?.toLocaleDateString() || 'unknown'}
        - Location: ${album.metadata.location?.name || 'unknown'}
        - Dominant scenes: ${album.metadata.dominantScenes?.join(', ') || 'various'}
        - Tags: ${album.metadata.dominantTags?.join(', ') || 'various'}

        Return a short, catchy name (2-5 words) that captures the essence.
      `;

      try {
        const response = await this.llmService.chatCompletion({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a creative album naming assistant.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 50
        });

        const name = response.choices[0]?.message?.content?.trim() || album.name;
        album.name = name.replace(/["']/g, '');
      } catch (error) {
        console.error('Album naming failed:', error);
      }
    }
  }

  /**
   * Calculate distance between two coordinates (haversine formula)
   */
  private calculateDistance(
    loc1: { lat: number; lng: number },
    loc2: { lat: number; lng: number }
  ): number {
    const R = 6371e3; // Earth radius in meters
    const lat1 = loc1.lat * Math.PI / 180;
    const lat2 = loc2.lat * Math.PI / 180;
    const deltaLat = (loc2.lat - loc1.lat) * Math.PI / 180;
    const deltaLng = (loc2.lng - loc1.lng) * Math.PI / 180;

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Calculate cluster center
   */
  private calculateClusterCenter(photos: Photo[]): { lat: number; lng: number } {
    const withLoc = photos.filter(p => p.location);
    const sumLat = withLoc.reduce((sum, p) => sum + p.location!.lat, 0);
    const sumLng = withLoc.reduce((sum, p) => sum + p.location!.lng, 0);

    return {
      lat: sumLat / withLoc.length,
      lng: sumLng / withLoc.length
    };
  }

  /**
   * Get location name from coordinates
   */
  private async getLocationName(coords: { lat: number; lng: number }): Promise<string | null> {
    // In a real implementation, this would use a geocoding service
    return null;
  }

  /**
   * Get date range from photos
   */
  private getDateRange(photos: Photo[]): { start: Date; end: Date } | undefined {
    if (photos.length === 0) return undefined;

    const dates = photos.map(p => p.createdAt).sort((a, b) => a.getTime() - b.getTime());
    return {
      start: dates[0],
      end: dates[dates.length - 1]
    };
  }

  /**
   * Generate name for time-based album
   */
  private generateTimeAlbumName(dateRange?: { start: Date; end: Date }): string {
    if (!dateRange) return 'Photo Collection';

    const start = dateRange.start;
    const end = dateRange.end;

    // Same day
    if (start.toDateString() === end.toDateString()) {
      return start.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    }

    // Same month
    if (
      start.getMonth() === end.getMonth() &&
      start.getFullYear() === end.getFullYear()
    ) {
      return `${start.toLocaleDateString('en-US', { month: 'long' })} ${start.getDate()}-${end.getDate()}`;
    }

    // Different months
    return `${start.toLocaleDateString('en-US', { month: 'short' })} - ${end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
  }

  /**
   * Get photos not in any album
   */
  private getUnclusteredPhotos(photos: Photo[], albums: Album[]): Photo[] {
    const inAlbums = new Set<string>();
    albums.forEach(album => {
      album.photos.forEach(p => inAlbums.add(p.id));
    });

    return photos.filter(p => !inAlbums.has(p.id));
  }

  /**
   * Create custom album
   */
  async createCustomAlbum(
    userId: string,
    name: string,
    photoIds: string[],
    description?: string
  ): Promise<Album | null> {
    // Get photos from store (simplified)
    const photos: Photo[] = []; // Would fetch from photo store

    const album: Album = {
      id: `album_custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      name,
      description,
      type: 'custom',
      photos,
      coverPhotoId: photoIds[0],
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        photoCount: photos.length,
        dateRange: this.getDateRange(photos)
      }
    };

    this.albums.set(album.id, album);
    return album;
  }

  /**
   * Get user's albums
   */
  async getUserAlbums(userId: string): Promise<Album[]> {
    return Array.from(this.albums.values())
      .filter(a => a.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Get album by ID
   */
  async getAlbum(albumId: string): Promise<Album | null> {
    return this.albums.get(albumId) || null;
  }

  /**
   * Delete album
   */
  async deleteAlbum(albumId: string): Promise<boolean> {
    return this.albums.delete(albumId);
  }
}

// Singleton instance
let serviceInstance: AlbumClusteringService | null = null;

export function getAlbumClusteringService(llmService: LLMService): AlbumClusteringService {
  if (!serviceInstance) {
    serviceInstance = new AlbumClusteringService(llmService);
  }
  return serviceInstance;
}
