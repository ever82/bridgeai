/**
 * VisionShare Photo Types
 * Shared types for photo viewing and payment functionality
 */

/** Photo metadata and display information */
export interface Photo {
  id: string;
  sceneId: string;
  supplierId: string;
  url: string;
  thumbnailUrl: string;
  hdUrl?: string;
  width: number;
  height: number;
  fileSize: number;
  format: 'jpg' | 'png' | 'webp' | 'heic';
  metadata: PhotoMetadata;
  status: PhotoStatus;
  price: number;
  createdAt: string;
  updatedAt: string;
}

/** Photo EXIF and capture metadata */
export interface PhotoMetadata {
  capturedAt?: string;
  location?: GeoLocation;
  device?: string;
  settings?: CameraSettings;
  tags: string[];
}

/** Geographic location */
export interface GeoLocation {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  country?: string;
}

/** Camera capture settings */
export interface CameraSettings {
  aperture?: string;
  shutterSpeed?: string;
  iso?: number;
  focalLength?: string;
}

/** Photo status enum */
export enum PhotoStatus {
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  READY = 'ready',
  LOCKED = 'locked',
  UNLOCKED = 'unlocked',
  DELETED = 'deleted',
}

/** Photo display options */
export interface PhotoDisplayOptions {
  showThumbnails: boolean;
  showInfo: boolean;
  allowZoom: boolean;
  allowDownload: boolean;
  watermarkEnabled: boolean;
}

/** Gallery view configuration */
export interface GalleryConfig {
  columns: number;
  spacing: number;
  aspectRatio: 'original' | 'square' | 'cover';
  sortBy: 'date' | 'price' | 'popularity';
  sortOrder: 'asc' | 'desc';
}

/** Photo filter criteria */
export interface PhotoFilter {
  sceneId?: string;
  supplierId?: string;
  status?: PhotoStatus;
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
  dateRange?: DateRange;
}

/** Date range filter */
export interface DateRange {
  start: string;
  end: string;
}
