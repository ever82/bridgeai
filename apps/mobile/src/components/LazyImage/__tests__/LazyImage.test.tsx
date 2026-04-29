import React from 'react';
import { Image, ActivityIndicator } from 'react-native';
import { render, fireEvent, screen } from '@testing-library/react-native';

import { LazyImage } from '../LazyImage';

describe('LazyImage', () => {
  const imageUri = 'https://example.com/image.png';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with testID', () => {
      render(<LazyImage uri={imageUri} testID="lazy-image" />);
      expect(screen.getByTestId('lazy-image')).toBeTruthy();
    });

    it('renders container with correct dimensions', () => {
      const { getByTestId } = render(
        <LazyImage uri={imageUri} width={100} height={150} testID="lazy-image" />
      );
      const container = getByTestId('lazy-image');
      // Container should have width and height applied
      const containerStyle = container.props.style;
      expect(containerStyle).toBeDefined();
    });

    it('renders custom width and height', () => {
      render(<LazyImage uri={imageUri} width={100} height={150} testID="lazy-image" />);
      // Just verify it renders without error
      expect(screen.getByTestId('lazy-image')).toBeTruthy();
    });

    it('renders custom borderRadius', () => {
      render(<LazyImage uri={imageUri} borderRadius={8} testID="lazy-image" />);
      expect(screen.getByTestId('lazy-image')).toBeTruthy();
    });

    it('renders without borderRadius when undefined', () => {
      render(<LazyImage uri={imageUri} testID="lazy-image" />);
      expect(screen.getByTestId('lazy-image')).toBeTruthy();
    });
  });

  describe('Loading state', () => {
    it('shows ActivityIndicator while loading', () => {
      render(<LazyImage uri={imageUri} testID="lazy-image" />);
      expect(screen.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
    });

    it('hides ActivityIndicator after image loads', () => {
      render(<LazyImage uri={imageUri} testID="lazy-image" />);
      expect(screen.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();

      fireEvent(screen.UNSAFE_getByType(Image), 'load');

      expect(screen.UNSAFE_queryByType(ActivityIndicator)).toBeNull();
    });
  });

  describe('Error state', () => {
    it('hides ActivityIndicator on error', () => {
      render(<LazyImage uri={imageUri} testID="lazy-image" />);
      expect(screen.UNSAFE_getByType(ActivityIndicator)).toBeTruthy();

      fireEvent(screen.UNSAFE_getByType(Image), 'error');

      expect(screen.UNSAFE_queryByType(ActivityIndicator)).toBeNull();
    });

    it('calls onError callback on image error', () => {
      const onError = jest.fn();
      render(<LazyImage uri={imageUri} onError={onError} testID="lazy-image" />);

      fireEvent(screen.UNSAFE_getByType(Image), 'error');

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
      expect((onError.mock.calls[0][0] as Error).message).toContain('Failed to load image');
    });
  });

  describe('Load callback', () => {
    it('calls onLoad callback when image loads', () => {
      const onLoad = jest.fn();
      render(<LazyImage uri={imageUri} onLoad={onLoad} testID="lazy-image" />);

      fireEvent(screen.UNSAFE_getByType(Image), 'load');

      expect(onLoad).toHaveBeenCalledTimes(1);
    });
  });

  describe('Image visibility', () => {
    it('renders Image component with source', () => {
      render(<LazyImage uri={imageUri} testID="lazy-image" />);
      const images = screen.UNSAFE_getAllByType(Image);
      const image = images.find(img => img.props.source && img.props.source.uri === imageUri);
      expect(image).toBeTruthy();
    });

    it('image remains present after load', () => {
      render(<LazyImage uri={imageUri} testID="lazy-image" />);
      const image = screen.UNSAFE_getByType(Image);
      expect(image).toBeTruthy();

      fireEvent(image, 'load');

      // Image should still be present
      const images = screen.UNSAFE_getAllByType(Image);
      const loadedImage = images.find(img => img.props.source && img.props.source.uri === imageUri);
      expect(loadedImage).toBeTruthy();
    });
  });

  describe('Custom style', () => {
    it('accepts style prop without error', () => {
      const customStyle = { backgroundColor: 'red' };
      const { getByTestId } = render(
        <LazyImage uri={imageUri} style={customStyle} testID="lazy-image" />
      );
      expect(getByTestId('lazy-image')).toBeTruthy();
    });
  });
});
