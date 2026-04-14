/**
 * VisionShare Screen Types
 * Type definitions for VisionShare screens
 */

import { Photo, PhotoFilter, GalleryConfig } from '../../../shared/types/photo.types';
import { PaymentTransaction, CreditBalance } from '../../../shared/types/payment.types';

/** Photo gallery screen props */
export interface PhotoGalleryProps {
  sceneId: string;
  initialFilter?: PhotoFilter;
  config?: GalleryConfig;
  onPhotoSelect?: (photo: Photo) => void;
  onBack?: () => void;
}

/** Photo gallery state */
export interface PhotoGalleryState {
  photos: Photo[];
  selectedPhotos: string[];
  filter: PhotoFilter;
  isLoading: boolean;
  hasMore: boolean;
  error?: string;
}

/** Photo viewer screen props */
export interface PhotoViewerProps {
  photo: Photo;
  photoList: Photo[];
  currentIndex: number;
  isUnlocked: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onPay: (photo: Photo) => void;
  onDownload: (photo: Photo) => void;
  onFavorite: (photo: Photo) => void;
}

/** Photo viewer state */
export interface PhotoViewerState {
  scale: number;
  isZooming: boolean;
  showInfo: boolean;
  isTransitioning: boolean;
}

/** Payment screen props */
export interface PhotoPaymentProps {
  photos: Photo[];
  balance: CreditBalance;
  onConfirm: (password: string) => Promise<void>;
  onCancel: () => void;
}

/** Payment screen state */
export interface PhotoPaymentState {
  isProcessing: boolean;
  password: string;
  showPassword: boolean;
  error?: string;
}

/** Transaction history screen props */
export interface TransactionHistoryProps {
  userId: string;
  filter?: TransactionFilter;
}

/** Transaction filter */
export interface TransactionFilter {
  type?: 'all' | 'purchase' | 'refund' | 'bonus';
  status?: 'all' | 'completed' | 'pending' | 'failed';
  dateRange?: { start: string; end: string };
}

/** Transaction history state */
export interface TransactionHistoryState {
  transactions: PaymentTransaction[];
  isLoading: boolean;
  hasMore: boolean;
  filter: TransactionFilter;
}

/** Refund request screen props */
export interface RefundRequestProps {
  transaction: PaymentTransaction;
  onSubmit: (reason: string, details: string) => Promise<void>;
  onCancel: () => void;
}

/** VisionShare navigation params */
export interface VisionShareParams {
  PhotoGallery: { sceneId: string };
  PhotoViewer: { photoId: string; sceneId: string };
  PhotoPayment: { photoIds: string[]; totalAmount: number };
  TransactionHistory: { userId: string };
  RefundRequest: { transactionId: string };
}
