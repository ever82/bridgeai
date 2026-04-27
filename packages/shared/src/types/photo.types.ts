/**
 * Photo Types
 * Type definitions for photo-related features including gallery, viewer, and metadata
 */

import { GeoCoordinates } from './location';

/** Photo status */
export type PhotoStatus = 'active' | 'inactive' | 'processing';

/** Photo category/tag */
export type PhotoCategory =
  | 'landscape'
  | 'portrait'
  | 'street'
  | 'architecture'
  | 'nature'
  | 'food'
  | 'product'
  | 'event'
  | 'other';

/** Photo price type */
export type PhotoPriceType = 'fixed' | 'negotiable' | 'free';

/** Photo unlock type */
export type PhotoUnlockType = 'paid' | 'subscription' | 'free' | 'credit';

/** Photo metadata */
export interface PhotoMetadata {
  /** Camera model */
  camera?: string;
  /** Lens model */
  lens?: string;
  /** ISO value */
  iso?: number;
  /** Aperture value (f-stop) */
  aperture?: string;
  /** Shutter speed */
  shutterSpeed?: string;
  /** Focal length */
  focalLength?: string;
  /** Photo location */
  location?: GeoCoordinates;
  /** Location name */
  locationName?: string;
  /** Photo capture timestamp */
  capturedAt?: string;
  /** Photo file size in bytes */
  fileSize?: number;
  /** Image width in pixels */
  width?: number;
  /** Image height in pixels */
  height?: number;
  /** Color space */
  colorSpace?: string;
}

/** Photo credit/pricing info */
export interface PhotoCredit {
  /** Credit cost to unlock */
  creditCost: number;
  /** Price type */
  priceType: PhotoPriceType;
  /** Price amount (for non-credit pricing) */
  priceAmount?: number;
  /** Currency code */
  currency?: string;
}

/** Photographer info */
export interface PhotographerInfo {
  /** Photographer user ID */
  id: string;
  /** Display name */
  name: string;
  /** Credit score (0-100) */
  creditScore: number;
  /** Avatar URL */
  avatarUrl?: string;
  /** Verification status */
  isVerified?: boolean;
}

/** Core Photo entity */
export interface Photo {
  /** Unique photo ID */
  id: string;
  /** Photo title */
  title?: string;
  /** Photo description */
  description?: string;
  /** Scene ID this photo belongs to */
  sceneId: string;
  /** Photographer info */
  photographer: PhotographerInfo;
  /** Photo metadata */
  metadata?: PhotoMetadata;
  /** Thumbnail URL */
  thumbnailUrl: string;
  /** Full-size URL */
  fullUrl: string;
  /** Preview/blurred URL (shown when locked) */
  previewUrl?: string;
  /** Photo status */
  status: PhotoStatus;
  /** Categories/tags */
  categories?: PhotoCategory[];
  /** Credit/pricing info */
  credit: PhotoCredit;
  /** Whether the current user has unlocked this photo */
  isUnlocked?: boolean;
  /** Unlock type */
  unlockType?: PhotoUnlockType;
  /** Number of times purchased */
  purchaseCount?: number;
  /** Average rating */
  rating?: number;
  /** Number of ratings */
  ratingCount?: number;
  /** Photo upload timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Whether the photo is favorited by current user */
  isFavorited?: boolean;
}

/** Photo sort field */
export type PhotoSortField = 'createdAt' | 'credit' | 'rating' | 'purchaseCount';

/** Photo sort order */
export type PhotoSortOrder = 'asc' | 'desc';

/** Photo filter */
export interface PhotoFilter {
  /** Filter by scene ID */
  sceneId?: string;
  /** Filter by categories */
  categories?: PhotoCategory[];
  /** Filter by minimum credit cost */
  minCredit?: number;
  /** Filter by maximum credit cost */
  maxCredit?: number;
  /** Filter by minimum rating */
  minRating?: number;
  /** Filter by photographer credit score range */
  photographerCreditRange?: { min?: number; max?: number };
  /** Filter by date range */
  dateRange?: { start?: string; end?: string };
  /** Sort by field */
  sortBy?: PhotoSortField;
  /** Sort order */
  sortOrder?: PhotoSortOrder;
  /** Page number (1-based) */
  page?: number;
  /** Items per page */
  limit?: number;
}

/** Gallery configuration */
export interface GalleryConfig {
  /** Number of columns in grid */
  columns?: number;
  /** Enable selection mode */
  selectionEnabled?: boolean;
  /** Maximum selectable photos */
  maxSelection?: number;
  /** Show photographer credit score */
  showPhotographerCredit?: boolean;
  /** Show price on thumbnails */
  showPrice?: boolean;
  /** Enable pull-to-refresh */
  pullToRefresh?: boolean;
  /** Enable infinite scroll/pagination */
  infiniteScroll?: boolean;
  /** Initial sort field */
  defaultSortBy?: PhotoSortField;
  /** Initial sort order */
  defaultSortOrder?: PhotoSortOrder;
}

/** Photo gallery list response */
export interface PhotoGalleryResponse {
  success: boolean;
  data: {
    photos: Photo[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}
