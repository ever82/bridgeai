/**
 * VisionShare Types
 */

export interface PhotoData {
  uri: string;
  base64?: string;
  width: number;
  height: number;
  timestamp: number;
}

export interface EditedPhoto extends PhotoData {
  edits: PhotoEditOptions;
}

export interface PhotoEditOptions {
  crop?: CropOptions;
  rotation?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  filter?: string;
  annotations?: Annotation[];
}

export interface CropOptions {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Annotation {
  id: string;
  type: 'text' | 'draw' | 'arrow';
  content: string;
  position: { x: number; y: number };
  color?: string;
}

export interface UploadProgress {
  photoId: string;
  loaded: number;
  total: number;
  percentage: number;
}

export interface PhotoUploadTask {
  id: string;
  photo: PhotoData;
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'failed';
  progress: number;
  retryCount: number;
}

export interface PhotoMetadata {
  id: string;
  taskId: string;
  originalUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  size: number;
  mimeType: string;
  createdAt: Date;
  source: 'camera' | 'gallery';
}

export interface SecurityCheckResult {
  passed: boolean;
  violations: SecurityViolation[];
  warnings: string[];
}

export interface SecurityViolation {
  type: 'sensitive' | 'inappropriate' | 'low_quality' | 'privacy';
  description: string;
  confidence: number;
}
