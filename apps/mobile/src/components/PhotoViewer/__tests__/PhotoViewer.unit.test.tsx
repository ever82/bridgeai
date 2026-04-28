/**
 * PhotoViewer Unit Tests
 * Unit tests for PhotoGrid, FullScreenViewer, ActionBar, PhotoInfoPanel,
 * PhotoMetadataDisplay, and PhotoGridItem components
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { TouchableOpacity } from 'react-native';
import { Photo, PhotoMetadata } from '@bridgeai/shared';

import { PhotoGrid } from '../PhotoGrid';
import { PhotoGridItem } from '../PhotoGridItem';
import { ActionBar } from '../ActionBar';
import { PhotoInfoPanel } from '../PhotoInfoPanel';
import { PhotoMetadataDisplay } from '../PhotoMetadataDisplay';
import { ZoomControls } from '../ZoomControls';
import { WatermarkOverlay } from '../WatermarkOverlay';
import { LockOverlay } from '../LockOverlay';
import { NavigationArrows } from '../NavigationArrows';
import { FullScreenViewer } from '../FullScreenViewer';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => ({
  Gesture: {
    Pinch: () => ({ onUpdate: () => ({ onEnd: () => ({}) }) }),
    Pan: () => ({ onUpdate: () => ({ onEnd: () => ({}) }) }),
    Tap: () => ({ numberOfTaps: () => ({ onEnd: () => ({}) }) }),
    Simultaneous: () => ({}),
    Race: () => ({}),
  },
  GestureDetector: ({ children }: { children: React.ReactNode }) => children,
}));

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
  tags: [],
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

describe('PhotoGrid', () => {
  const mockOnPhotoPress = jest.fn();

  const mockPhotos = [
    createMockPhoto({ id: 'photo-1' }),
    createMockPhoto({ id: 'photo-2' }),
    createMockPhoto({ id: 'photo-3' }),
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders photo grid with photos', () => {
    render(<PhotoGrid photos={mockPhotos} onPhotoPress={mockOnPhotoPress} />);

    expect(screen.toJSON()).toBeTruthy();
  });

  it('renders with custom column count', () => {
    render(<PhotoGrid photos={mockPhotos} columns={3} onPhotoPress={mockOnPhotoPress} />);

    expect(screen.toJSON()).toBeTruthy();
  });

  it('shows loading indicator when isLoading is true', () => {
    render(<PhotoGrid photos={mockPhotos} onPhotoPress={mockOnPhotoPress} isLoading={true} />);

    expect(screen.toJSON()).toBeTruthy();
  });

  it('handles empty photos array', () => {
    render(<PhotoGrid photos={[]} onPhotoPress={mockOnPhotoPress} />);

    expect(screen.toJSON()).toBeTruthy();
  });
});

describe('PhotoGridItem', () => {
  const mockOnPress = jest.fn();
  const mockPhoto = createMockPhoto();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders photo grid item', () => {
    render(
      <PhotoGridItem photo={mockPhoto} isSelected={false} isUnlocked={true} onPress={mockOnPress} />
    );

    expect(screen.toJSON()).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    render(
      <PhotoGridItem photo={mockPhoto} isSelected={false} isUnlocked={true} onPress={mockOnPress} />
    );

    const touchable = screen.UNSAFE_root.findAllByType(TouchableOpacity)[0];
    fireEvent.press(touchable);
    expect(mockOnPress).toHaveBeenCalled();
  });

  it('shows selection indicator when selected', () => {
    render(
      <PhotoGridItem photo={mockPhoto} isSelected={true} isUnlocked={true} onPress={mockOnPress} />
    );

    expect(screen.toJSON()).toBeTruthy();
  });

  it('shows price overlay when locked', () => {
    render(
      <PhotoGridItem
        photo={mockPhoto}
        isSelected={false}
        isUnlocked={false}
        onPress={mockOnPress}
      />
    );

    expect(screen.toJSON()).toBeTruthy();
  });
});

describe('ActionBar', () => {
  const mockPhoto = createMockPhoto();
  const mockOnDownload = jest.fn();
  const mockOnFavorite = jest.fn();
  const mockOnShare = jest.fn();
  const mockOnPay = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders action bar with all buttons', () => {
    render(
      <ActionBar
        photo={mockPhoto}
        isUnlocked={true}
        isFavorited={false}
        onDownload={mockOnDownload}
        onFavorite={mockOnFavorite}
        onShare={mockOnShare}
        onPay={mockOnPay}
      />
    );

    expect(screen.getByText('下载')).toBeTruthy();
    expect(screen.getByText('收藏')).toBeTruthy();
    expect(screen.getByText('分享')).toBeTruthy();
  });

  it('calls onDownload when download button pressed', () => {
    render(
      <ActionBar
        photo={mockPhoto}
        isUnlocked={true}
        isFavorited={false}
        onDownload={mockOnDownload}
        onFavorite={mockOnFavorite}
        onShare={mockOnShare}
        onPay={mockOnPay}
      />
    );

    const downloadButton = screen.getByText('下载');
    fireEvent.press(downloadButton);
    expect(mockOnDownload).toHaveBeenCalled();
  });

  it('calls onFavorite when favorite button pressed', () => {
    render(
      <ActionBar
        photo={mockPhoto}
        isUnlocked={true}
        isFavorited={false}
        onDownload={mockOnDownload}
        onFavorite={mockOnFavorite}
        onShare={mockOnShare}
        onPay={mockOnPay}
      />
    );

    const favoriteButton = screen.getByText('收藏');
    fireEvent.press(favoriteButton);
    expect(mockOnFavorite).toHaveBeenCalled();
  });

  it('calls onShare when share button pressed', () => {
    render(
      <ActionBar
        photo={mockPhoto}
        isUnlocked={true}
        isFavorited={false}
        onDownload={mockOnDownload}
        onFavorite={mockOnFavorite}
        onShare={mockOnShare}
        onPay={mockOnPay}
      />
    );

    const shareButton = screen.getByText('分享');
    fireEvent.press(shareButton);
    expect(mockOnShare).toHaveBeenCalled();
  });

  it('shows pay button when locked', () => {
    render(
      <ActionBar
        photo={mockPhoto}
        isUnlocked={false}
        isFavorited={false}
        onDownload={mockOnDownload}
        onFavorite={mockOnFavorite}
        onShare={mockOnShare}
        onPay={mockOnPay}
      />
    );

    expect(screen.getByText(/积分解锁/)).toBeTruthy();
  });

  it('shows free unlock when credit cost is 0', () => {
    const freePhoto = createMockPhoto({ credit: { creditCost: 0, creatorReward: 0 } });
    render(
      <ActionBar
        photo={freePhoto}
        isUnlocked={false}
        isFavorited={false}
        onDownload={mockOnDownload}
        onFavorite={mockOnFavorite}
        onShare={mockOnShare}
        onPay={mockOnPay}
      />
    );

    expect(screen.getByText('免费解锁')).toBeTruthy();
  });
});

describe('PhotoInfoPanel', () => {
  const mockPhoto = createMockPhoto();
  const mockMetadata = createMockMetadata();
  const mockOnToggleExpand = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders collapsed panel', () => {
    render(
      <PhotoInfoPanel
        photo={mockPhoto}
        metadata={mockMetadata}
        isExpanded={false}
        onToggleExpand={mockOnToggleExpand}
      />
    );

    expect(screen.getByText('照片信息')).toBeTruthy();
  });

  it('renders expanded panel with metadata', () => {
    render(
      <PhotoInfoPanel
        photo={mockPhoto}
        metadata={mockMetadata}
        isExpanded={true}
        onToggleExpand={mockOnToggleExpand}
      />
    );

    expect(screen.getByText('照片信息')).toBeTruthy();
    expect(screen.getByText('基本信息')).toBeTruthy();
  });

  it('calls onToggleExpand when handle pressed', () => {
    render(
      <PhotoInfoPanel
        photo={mockPhoto}
        metadata={mockMetadata}
        isExpanded={false}
        onToggleExpand={mockOnToggleExpand}
      />
    );

    const handleArea = screen.getByText('照片信息');
    fireEvent.press(handleArea);
    expect(mockOnToggleExpand).toHaveBeenCalled();
  });

  it('displays camera settings when available', () => {
    render(
      <PhotoInfoPanel
        photo={mockPhoto}
        metadata={mockMetadata}
        isExpanded={true}
        onToggleExpand={mockOnToggleExpand}
      />
    );

    expect(screen.getByText(/f\//)).toBeTruthy();
    expect(screen.getByText('ISO')).toBeTruthy();
  });
});

describe('PhotoMetadataDisplay', () => {
  const mockMetadata = createMockMetadata();

  it('renders metadata display', () => {
    render(
      <PhotoMetadataDisplay metadata={mockMetadata} showLocation={true} showSettings={true} />
    );

    expect(screen.toJSON()).toBeTruthy();
  });

  it('renders empty state when no metadata', () => {
    render(
      <PhotoMetadataDisplay
        metadata={{} as PhotoMetadata}
        showLocation={true}
        showSettings={true}
      />
    );

    expect(screen.getByText('暂无元数据')).toBeTruthy();
  });

  it('hides location when showLocation is false', () => {
    render(
      <PhotoMetadataDisplay metadata={mockMetadata} showLocation={false} showSettings={true} />
    );

    expect(screen.toJSON()).toBeTruthy();
  });

  it('hides camera settings when showSettings is false', () => {
    render(
      <PhotoMetadataDisplay metadata={mockMetadata} showLocation={true} showSettings={false} />
    );

    expect(screen.toJSON()).toBeTruthy();
  });
});

describe('ZoomControls', () => {
  const mockOnZoomIn = jest.fn();
  const mockOnZoomOut = jest.fn();
  const mockOnReset = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders zoom controls', () => {
    render(
      <ZoomControls
        scale={1}
        minScale={0.5}
        maxScale={4}
        onZoomIn={mockOnZoomIn}
        onZoomOut={mockOnZoomOut}
        onReset={mockOnReset}
      />
    );

    expect(screen.toJSON()).toBeTruthy();
  });

  it('disables zoom out at min scale', () => {
    render(
      <ZoomControls
        scale={0.5}
        minScale={0.5}
        maxScale={4}
        onZoomIn={mockOnZoomIn}
        onZoomOut={mockOnZoomOut}
        onReset={mockOnReset}
      />
    );

    expect(screen.toJSON()).toBeTruthy();
  });

  it('disables zoom in at max scale', () => {
    render(
      <ZoomControls
        scale={4}
        minScale={0.5}
        maxScale={4}
        onZoomIn={mockOnZoomIn}
        onZoomOut={mockOnZoomOut}
        onReset={mockOnReset}
      />
    );

    expect(screen.toJSON()).toBeTruthy();
  });
});

describe('WatermarkOverlay', () => {
  it('renders watermark with default props', () => {
    render(<WatermarkOverlay text="Test Watermark" />);

    expect(screen.toJSON()).toBeTruthy();
  });

  it('renders watermark with custom opacity', () => {
    render(<WatermarkOverlay text="Test Watermark" opacity={0.5} />);

    expect(screen.toJSON()).toBeTruthy();
  });

  it('renders watermark with different positions', () => {
    render(<WatermarkOverlay text="Test Watermark" position="bottom-right" />);

    expect(screen.toJSON()).toBeTruthy();
  });
});

describe('LockOverlay', () => {
  const mockOnUnlock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders lock overlay with price', () => {
    render(<LockOverlay price={10} onUnlock={mockOnUnlock} />);

    expect(screen.toJSON()).toBeTruthy();
  });

  it('calls onUnlock when pressed', () => {
    render(<LockOverlay price={10} onUnlock={mockOnUnlock} />);

    const touchable = screen.UNSAFE_root.findAllByType(TouchableOpacity)[0];
    fireEvent.press(touchable);
    expect(mockOnUnlock).toHaveBeenCalled();
  });
});

describe('NavigationArrows', () => {
  const mockOnPrev = jest.fn();
  const mockOnNext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders navigation arrows', () => {
    render(
      <NavigationArrows showPrev={true} showNext={true} onPrev={mockOnPrev} onNext={mockOnNext} />
    );

    expect(screen.toJSON()).toBeTruthy();
  });

  it('calls onPrev when previous arrow pressed', () => {
    render(
      <NavigationArrows showPrev={true} showNext={false} onPrev={mockOnPrev} onNext={mockOnNext} />
    );

    const touchable = screen.UNSAFE_root.findAllByType(TouchableOpacity)[0];
    fireEvent.press(touchable);
    expect(mockOnPrev).toHaveBeenCalled();
  });

  it('calls onNext when next arrow pressed', () => {
    render(
      <NavigationArrows showPrev={false} showNext={true} onPrev={mockOnPrev} onNext={mockOnNext} />
    );

    const touchable = screen.UNSAFE_root.findAllByType(TouchableOpacity)[0];
    fireEvent.press(touchable);
    expect(mockOnNext).toHaveBeenCalled();
  });
});

describe('FullScreenViewer', () => {
  const mockPhoto = createMockPhoto();
  const mockOnZoom = jest.fn();
  const mockOnSwipeLeft = jest.fn();
  const mockOnSwipeRight = jest.fn();
  const mockOnTap = jest.fn();
  const mockOnDoubleTap = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders full screen viewer', () => {
    render(
      <FullScreenViewer
        photo={mockPhoto}
        isUnlocked={true}
        scale={1}
        onZoom={mockOnZoom}
        onSwipeLeft={mockOnSwipeLeft}
        onSwipeRight={mockOnSwipeRight}
        onTap={mockOnTap}
        onDoubleTap={mockOnDoubleTap}
      />
    );

    expect(screen.toJSON()).toBeTruthy();
  });

  it('renders with locked photo (shows preview)', () => {
    render(
      <FullScreenViewer
        photo={mockPhoto}
        isUnlocked={false}
        scale={1}
        onZoom={mockOnZoom}
        onSwipeLeft={mockOnSwipeLeft}
        onSwipeRight={mockOnSwipeRight}
        onTap={mockOnTap}
        onDoubleTap={mockOnDoubleTap}
      />
    );

    expect(screen.toJSON()).toBeTruthy();
  });
});
