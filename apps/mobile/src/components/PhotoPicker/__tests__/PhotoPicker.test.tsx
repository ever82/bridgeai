import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
/* eslint-disable @typescript-eslint/no-require-imports */
import { PhotoPicker } from '../PhotoPicker';

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({
    canceled: false,
    assets: [
      {
        uri: 'file://test/photo1.jpg',
        width: 1920,
        height: 1080,
        exif: { DateTimeOriginal: '2024-01-01' },
      },
    ],
  })),
  MediaTypeOptions: { Images: 'images' },
}));

describe('PhotoPicker', () => {
  const mockOnSelect = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders permission request initially', async () => {
    jest.spyOn(require('expo-image-picker'), 'requestMediaLibraryPermissionsAsync')
      .mockResolvedValue({ status: 'denied' });

    const { findByText } = render(
      <PhotoPicker
        onSelect={mockOnSelect}
        onCancel={mockOnCancel}
      />
    );

    expect(await findByText('需要相册权限')).toBeTruthy();
  });

  it('renders photo grid when permission granted', async () => {
    const { findByText } = render(
      <PhotoPicker
        onSelect={mockOnSelect}
        onCancel={mockOnCancel}
        maxPhotos={5}
      />
    );

    expect(await findByText('选择照片')).toBeTruthy();
    expect(await findByText('0 / 5')).toBeTruthy();
  });

  it('calls onCancel when cancel pressed', async () => {
    const { findByText } = render(
      <PhotoPicker
        onSelect={mockOnSelect}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = await findByText('取消');
    fireEvent.press(cancelButton);
    expect(mockOnCancel).toHaveBeenCalled();
  });
});
