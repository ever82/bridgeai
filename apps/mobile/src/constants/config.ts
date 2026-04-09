/**
 * App configuration constants
 */

// API Configuration
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

// App Configuration
export const APP_NAME = 'VisionShare';
export const APP_VERSION = '1.0.0';

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Media Configuration
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
export const MAX_MEDIA_ITEMS = 10;

// Timeouts
export const API_TIMEOUT = 30000;
export const REFRESH_TOKEN_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Cache Configuration
export const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Feature Flags
export const FEATURES = {
  ENABLE_ANALYTICS: true,
  ENABLE_PUSH_NOTIFICATIONS: true,
  ENABLE_LOCATION_SERVICES: true,
  ENABLE_OFFLINE_MODE: true,
};
