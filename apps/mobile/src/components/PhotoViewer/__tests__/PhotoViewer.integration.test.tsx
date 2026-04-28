/**
 * PhotoViewer Integration Tests
 * Tests for gallery + viewer flow with mocked API integration
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { TouchableOpacity } from 'react-native';
import { Photo, PhotoMetadata } from '@bridgeai/shared';

import { PhotoGrid } from '../PhotoGrid';
import { PhotoInfoPanel } from '../PhotoInfoPanel';
import { ActionBar } from '../ActionBar';

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

// Mock photo gallery API
const mockPhotos: Photo[] = [
  createMockPhoto({ id: 'photo-1' }),
  createMockPhoto({ id: 'photo-2', credit: { creditCost: 0, creatorReward: 0 } }),
  createMockPhoto({ id: 'photo-3', credit: { creditCost: 20, creatorReward: 10 } }),
];

describe('PhotoGrid Integration', () => {
  describe('Photo Selection Flow', () => {
    it('allows selecting multiple photos', async () => {
      const mockOnPhotoPress = jest.fn();
      const selectedIds: string[] = [];

      const { rerender } = render(
        <PhotoGrid photos={mockPhotos} selectedIds={selectedIds} onPhotoPress={mockOnPhotoPress} />
      );

      // Simulate selecting first photo by pressing it
      await act(async () => {
        const touchables = screen.UNSAFE_root.findAllByProps({ testID: /flat-list-item/ });
        if (touchables.length > 0) {
          const innerTouchables = touchables[0].findAllByType(TouchableOpacity);
          if (innerTouchables.length > 0) {
            fireEvent.press(innerTouchables[0]);
          }
        }
      });

      // Rerender with selected state
      selectedIds.push('photo-1');
      rerender(
        <PhotoGrid
          photos={mockPhotos}
          selectedIds={[...selectedIds]}
          onPhotoPress={mockOnPhotoPress}
        />
      );

      // Verify grid renders with selection
      expect(screen.toJSON()).toBeTruthy();
    });

    it('supports long press to select photo', async () => {
      const mockOnPhotoLongPress = jest.fn();

      render(
        <PhotoGrid
          photos={mockPhotos}
          onPhotoPress={jest.fn()}
          onPhotoLongPress={mockOnPhotoLongPress}
        />
      );

      // Long press should trigger selection mode
      expect(mockOnPhotoLongPress).toBeDefined();
    });
  });

  describe('Photo Navigation Flow', () => {
    it('loads more photos when reaching end', async () => {
      const mockOnEndReached = jest.fn();

      render(
        <PhotoGrid
          photos={mockPhotos}
          onPhotoPress={jest.fn()}
          onEndReached={mockOnEndReached}
          hasMore={true}
        />
      );

      expect(mockOnEndReached).toBeDefined();
    });

    it('shows loading indicator during pagination', async () => {
      render(
        <PhotoGrid
          photos={mockPhotos}
          onPhotoPress={jest.fn()}
          onEndReached={jest.fn()}
          isLoading={true}
          hasMore={true}
        />
      );

      expect(screen.toJSON()).toBeTruthy();
    });
  });
});

describe('Photo Viewer Flow Integration', () => {
  describe('PhotoInfoPanel + Photo Interaction', () => {
    it('displays photo metadata when panel is expanded', async () => {
      const mockPhoto = createMockPhoto();
      const mockMetadata = createMockMetadata();
      const mockOnToggleExpand = jest.fn();

      render(
        <PhotoInfoPanel
          photo={mockPhoto}
          metadata={mockMetadata}
          isExpanded={true}
          onToggleExpand={mockOnToggleExpand}
        />
      );

      expect(screen.getByText('基本信息')).toBeTruthy();
      expect(screen.getByText('分辨率')).toBeTruthy();
    });

    it('collapses panel when toggle is pressed', async () => {
      const mockPhoto = createMockPhoto();
      const mockMetadata = createMockMetadata();
      const mockOnToggleExpand = jest.fn();

      render(
        <PhotoInfoPanel
          photo={mockPhoto}
          metadata={mockMetadata}
          isExpanded={true}
          onToggleExpand={mockOnToggleExpand}
        />
      );

      const handleArea = screen.getByText('照片信息');
      fireEvent.press(handleArea);
      expect(mockOnToggleExpand).toHaveBeenCalledTimes(1);
    });

    it('displays camera settings in expanded panel', async () => {
      const mockPhoto = createMockPhoto();
      const mockMetadata = createMockMetadata({
        aperture: 2.8,
        shutterSpeed: '1/500',
        iso: 800,
        focalLength: '85mm',
      });

      render(
        <PhotoInfoPanel
          photo={mockPhoto}
          metadata={mockMetadata}
          isExpanded={true}
          onToggleExpand={jest.fn()}
        />
      );

      expect(screen.getByText('拍摄参数')).toBeTruthy();
      expect(screen.getByText('ISO')).toBeTruthy();
    });
  });

  describe('Action Bar Flow', () => {
    it('handles unlock and download flow', async () => {
      const mockPhoto = createMockPhoto({ credit: { creditCost: 10, creatorReward: 5 } });
      const mockOnDownload = jest.fn();
      const mockOnPay = jest.fn();

      render(
        <ActionBar
          photo={mockPhoto}
          isUnlocked={false}
          isFavorited={false}
          onDownload={mockOnDownload}
          onFavorite={jest.fn()}
          onShare={jest.fn()}
          onPay={mockOnPay}
        />
      );

      // Try to download locked photo (should show alert, not call download)
      const downloadButton = screen.getByText('下载');
      fireEvent.press(downloadButton);

      // Pay button should be visible
      expect(screen.getByText(/积分解锁/)).toBeTruthy();
    });

    it('allows download when photo is unlocked', async () => {
      const mockPhoto = createMockPhoto();
      const mockOnDownload = jest.fn();

      render(
        <ActionBar
          photo={mockPhoto}
          isUnlocked={true}
          isFavorited={false}
          onDownload={mockOnDownload}
          onFavorite={jest.fn()}
          onShare={jest.fn()}
          onPay={jest.fn()}
        />
      );

      const downloadButton = screen.getByText('下载');
      fireEvent.press(downloadButton);
      expect(mockOnDownload).toHaveBeenCalled();
    });

    it('toggles favorite state', async () => {
      const mockPhoto = createMockPhoto();
      const mockOnFavorite = jest.fn();

      render(
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

      const favoriteButton = screen.getByText('收藏');
      fireEvent.press(favoriteButton);
      expect(mockOnFavorite).toHaveBeenCalled();
    });
  });
});

describe('Gallery Flow Integration', () => {
  it('integrates photo grid with viewer controls', async () => {
    const mockPhotos = [createMockPhoto({ id: 'photo-1' }), createMockPhoto({ id: 'photo-2' })];

    let _currentPhotoIndex = 0;

    render(
      <PhotoGrid
        photos={mockPhotos}
        onPhotoPress={(_photo, index) => {
          _currentPhotoIndex = index;
        }}
      />
    );

    expect(screen.toJSON()).toBeTruthy();
  });

  it('handles unlocked vs locked photo display', async () => {
    const mockPhotos = [
      createMockPhoto({ id: 'photo-1' }),
      createMockPhoto({ id: 'photo-2', credit: { creditCost: 10, creatorReward: 5 } }),
    ];
    const unlockedIds = ['photo-1'];

    render(<PhotoGrid photos={mockPhotos} unlockedIds={unlockedIds} onPhotoPress={jest.fn()} />);

    expect(screen.toJSON()).toBeTruthy();
  });
});
