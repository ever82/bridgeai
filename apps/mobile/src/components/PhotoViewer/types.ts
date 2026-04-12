/**
 * PhotoViewer Component Types
 * Type definitions for photo viewer components
 */

import { Photo, PhotoMetadata } from '../../../shared/types/photo.types';

/** Photo thumbnail grid props */
export interface PhotoGridProps {
  photos: Photo[];
  columns?: number;
  selectedIds?: string[];
  unlockedIds?: string[];
  onPhotoPress: (photo: Photo, index: number) => void;
  onPhotoLongPress?: (photo: Photo) => void;
  onSelectionChange?: (selectedIds: string[]) => void;
  onEndReached?: () => void;
  isLoading?: boolean;
  hasMore?: boolean;
}

/** Photo grid item props */
export interface PhotoGridItemProps {
  photo: Photo;
  isSelected: boolean;
  isUnlocked: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}

/** Full-screen photo viewer props */
export interface FullScreenViewerProps {
  photo: Photo;
  isUnlocked: boolean;
  scale: number;
  onZoom: (scale: number) => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onTap: () => void;
  onDoubleTap: () => void;
}

/** Photo info panel props */
export interface PhotoInfoPanelProps {
  photo: Photo;
  metadata: PhotoMetadata;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

/** Photo metadata display props */
export interface PhotoMetadataDisplayProps {
  metadata: PhotoMetadata;
  showLocation: boolean;
  showSettings: boolean;
}

/** Zoom controls props */
export interface ZoomControlsProps {
  scale: number;
  minScale: number;
  maxScale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

/** Watermark overlay props */
export interface WatermarkOverlayProps {
  text: string;
  opacity?: number;
  position?: 'center' | 'bottom-right' | 'tile';
}

/** Lock overlay props */
export interface LockOverlayProps {
  price: number;
  onUnlock: () => void;
  previewBlur?: boolean;
}

/** Navigation arrows props */
export interface NavigationArrowsProps {
  showPrev: boolean;
  showNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

/** Action bar props */
export interface ActionBarProps {
  photo: Photo;
  isUnlocked: boolean;
  isFavorited: boolean;
  onDownload: () => void;
  onFavorite: () => void;
  onShare: () => void;
  onPay: () => void;
}

/** Photo loading state */
export interface PhotoLoadingState {
  isLoading: boolean;
  progress: number;
  error?: string;
}
