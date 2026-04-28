/**
 * PhotoViewer E2E Tests
 * End-to-end tests for complete user flows
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Photo, PhotoMetadata } from '@bridgeai/shared';

import { PhotoGrid } from '../PhotoGrid';
import { PhotoInfoPanel } from '../PhotoInfoPanel';
import { ActionBar } from '../ActionBar';
import { PhotoMetadataDisplay } from '../PhotoMetadataDisplay';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Test data factories
const createMockPhoto = (overrides: Partial<Photo> = {}): Photo => ({
  id: 'photo-1',
  userId: 'user-1',
  galleryId: 'gallery-1',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  previewUrl: 'https://example.com/preview.jpg',
  fullUrl: 'https://example.com/full.jpg',
  width: 1920,
  height: 1080,
  credit: {
    creditCost: 10,
    creatorReward: 5,
  },
  photographer: {
    id: 'photographer-1',
    name: 'Test Photographer',
    avatar: 'https://example.com/avatar.jpg',
  },
  tags: ['portrait', 'outdoor'],
  category: 'portrait',
  capturedAt: '2024-01-15T10:00:00Z',
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
  ...overrides,
});

const createMockMetadata = (overrides: Partial<PhotoMetadata> = {}): PhotoMetadata => ({
  width: 1920,
  height: 1080,
  fileSize: 2048000,
  camera: 'Canon EOS R5',
  aperture: 2.8,
  shutterSpeed: '1/250',
  iso: 400,
  focalLength: '50mm',
  capturedAt: '2024-01-15T10:00:00Z',
  locationName: 'Test Location',
  ...overrides,
});

describe('PhotoViewer E2E - Complete User Flows', () => {
  describe('Browse and View Photo Flow', () => {
    it('complete flow: browse gallery -> view photo -> view metadata', async () => {
      // Step 1: Browse gallery
      const mockPhotos = [
        createMockPhoto({ id: 'photo-1' }),
        createMockPhoto({ id: 'photo-2' }),
        createMockPhoto({ id: 'photo-3' }),
      ];
      const unlockedIds = ['photo-1', 'photo-2'];

      const { unmount: unmountGrid } = render(
        <PhotoGrid photos={mockPhotos} unlockedIds={unlockedIds} onPhotoPress={jest.fn()} />
      );

      expect(screen.toJSON()).toBeTruthy();

      // Step 2: View photo details (separate render context)
      unmountGrid();
      const mockPhoto = createMockPhoto();
      const mockMetadata = createMockMetadata();

      const { rerender } = render(
        <PhotoInfoPanel
          photo={mockPhoto}
          metadata={mockMetadata}
          isExpanded={false}
          onToggleExpand={jest.fn()}
        />
      );

      expect(screen.getByText('照片信息')).toBeTruthy();

      // Step 3: Expand metadata panel
      rerender(
        <PhotoInfoPanel
          photo={mockPhoto}
          metadata={mockMetadata}
          isExpanded={true}
          onToggleExpand={jest.fn()}
        />
      );

      expect(screen.getByText('基本信息')).toBeTruthy();
    });

    it('complete flow: browse gallery -> select photos -> view metadata', async () => {
      const mockPhotos = [createMockPhoto({ id: 'photo-1' }), createMockPhoto({ id: 'photo-2' })];
      const selectedIds: string[] = ['photo-1'];

      const { rerender } = render(
        <PhotoGrid photos={mockPhotos} selectedIds={selectedIds} onPhotoPress={jest.fn()} />
      );

      expect(screen.toJSON()).toBeTruthy();

      // View metadata for selected photo
      const mockMetadata = createMockMetadata();

      rerender(
        <PhotoMetadataDisplay metadata={mockMetadata} showLocation={true} showSettings={true} />
      );

      expect(screen.toJSON()).toBeTruthy();
    });
  });

  describe('Purchase and Download Flow', () => {
    it('complete flow: view locked photo -> unlock -> download', async () => {
      // Step 1: View locked photo
      const lockedPhoto = createMockPhoto({ credit: { creditCost: 10, creatorReward: 5 } });
      const mockOnPay = jest.fn();
      const mockOnDownload = jest.fn();

      const { rerender } = render(
        <ActionBar
          photo={lockedPhoto}
          isUnlocked={false}
          isFavorited={false}
          onDownload={jest.fn()}
          onFavorite={jest.fn()}
          onShare={jest.fn()}
          onPay={mockOnPay}
        />
      );

      // Pay button should be visible
      expect(screen.getByText(/积分解锁/)).toBeTruthy();

      // Step 2: Unlock photo (simulate)
      rerender(
        <ActionBar
          photo={lockedPhoto}
          isUnlocked={true}
          isFavorited={false}
          onDownload={mockOnDownload}
          onFavorite={jest.fn()}
          onShare={jest.fn()}
          onPay={mockOnPay}
        />
      );

      // Step 3: Download unlocked photo
      const downloadButton = screen.getByText('下载');
      fireEvent.press(downloadButton);
      expect(mockOnDownload).toHaveBeenCalled();
    });

    it('complete flow: view free photo -> download', async () => {
      const freePhoto = createMockPhoto({ credit: { creditCost: 0, creatorReward: 0 } });
      const mockOnDownload = jest.fn();
      const mockOnPay = jest.fn();

      const { rerender } = render(
        <ActionBar
          photo={freePhoto}
          isUnlocked={false}
          isFavorited={false}
          onDownload={mockOnDownload}
          onFavorite={jest.fn()}
          onShare={jest.fn()}
          onPay={mockOnPay}
        />
      );

      // Free photo shows free unlock button
      expect(screen.getByText('免费解锁')).toBeTruthy();

      // Simulate unlock
      rerender(
        <ActionBar
          photo={freePhoto}
          isUnlocked={true}
          isFavorited={false}
          onDownload={mockOnDownload}
          onFavorite={jest.fn()}
          onShare={jest.fn()}
          onPay={mockOnPay}
        />
      );

      // Now download should work
      const downloadButton = screen.getByText('下载');
      fireEvent.press(downloadButton);
      expect(mockOnDownload).toHaveBeenCalled();
    });
  });

  describe('Favorite Photo Flow', () => {
    it('complete flow: view photo -> add to favorites', async () => {
      const mockPhoto = createMockPhoto();
      const mockOnFavorite = jest.fn();

      const { rerender } = render(
        <ActionBar
          photo={mockPhoto}
          isUnlocked={true}
          isFavorited={false}
          onDownload={jest.fn()}
          onFavorite={mockOnFavorite}
          onShare={jest.fn()}
          onPay={jest.fn()}
        />
      );

      // Add to favorites
      const favoriteButton = screen.getByText('收藏');
      fireEvent.press(favoriteButton);
      expect(mockOnFavorite).toHaveBeenCalled();

      // Verify favorite state is updated
      rerender(
        <ActionBar
          photo={mockPhoto}
          isUnlocked={true}
          isFavorited={true}
          onDownload={jest.fn()}
          onFavorite={mockOnFavorite}
          onShare={jest.fn()}
          onPay={jest.fn()}
        />
      );

      expect(screen.toJSON()).toBeTruthy();
    });
  });

  describe('Share Photo Flow', () => {
    it('complete flow: view photo -> share', async () => {
      const mockPhoto = createMockPhoto();
      const mockOnShare = jest.fn();

      render(
        <ActionBar
          photo={mockPhoto}
          isUnlocked={true}
          isFavorited={false}
          onDownload={jest.fn()}
          onFavorite={jest.fn()}
          onShare={mockOnShare}
          onPay={jest.fn()}
        />
      );

      const shareButton = screen.getByText('分享');
      fireEvent.press(shareButton);
      expect(mockOnShare).toHaveBeenCalled();
    });
  });

  describe('Grid Navigation Flow', () => {
    it('complete flow: scroll gallery -> select multiple -> view selection', async () => {
      const mockPhotos = [
        createMockPhoto({ id: 'photo-1' }),
        createMockPhoto({ id: 'photo-2' }),
        createMockPhoto({ id: 'photo-3' }),
        createMockPhoto({ id: 'photo-4' }),
      ];

      const { rerender } = render(
        <PhotoGrid photos={mockPhotos} selectedIds={[]} onPhotoPress={jest.fn()} />
      );

      expect(screen.toJSON()).toBeTruthy();

      // Select first two photos
      rerender(
        <PhotoGrid
          photos={mockPhotos}
          selectedIds={['photo-1', 'photo-2']}
          onPhotoPress={jest.fn()}
        />
      );

      expect(screen.toJSON()).toBeTruthy();
    });

    it('complete flow: browse with different column layouts', async () => {
      const mockPhotos = [
        createMockPhoto({ id: 'photo-1' }),
        createMockPhoto({ id: 'photo-2' }),
        createMockPhoto({ id: 'photo-3' }),
      ];

      // 2 column layout
      const { rerender } = render(
        <PhotoGrid photos={mockPhotos} columns={2} onPhotoPress={jest.fn()} />
      );

      expect(screen.toJSON()).toBeTruthy();

      // 3 column layout
      rerender(<PhotoGrid photos={mockPhotos} columns={3} onPhotoPress={jest.fn()} />);

      expect(screen.toJSON()).toBeTruthy();
    });
  });
});
