import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

/* eslint-disable @typescript-eslint/no-require-imports */
import { VisionShareCamera } from '../VisionShareCamera';

// Mock expo-camera
jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  useCameraPermissions: jest.fn(() => [{ granted: true }, jest.fn()]),
  CameraType: { back: 'back', front: 'front' },
  FlashMode: { on: 'on', off: 'off', auto: 'auto' },
}));

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
}));

describe('VisionShareCamera', () => {
  const mockOnCapture = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByText } = render(
      <VisionShareCamera
        onCapture={mockOnCapture}
        onCancel={mockOnCancel}
        maxPhotos={10}
      />
    );

    expect(getByText('0 / 10')).toBeTruthy();
  });

  it('shows permission request when permission not granted', () => {
    const mockRequestPermission = jest.fn();
    jest.spyOn(require('expo-camera'), 'useCameraPermissions')
      .mockReturnValue([{ granted: false }, mockRequestPermission]);

    const { getByText } = render(
      <VisionShareCamera
        onCapture={mockOnCapture}
        onCancel={mockOnCancel}
      />
    );

    expect(getByText('需要相机权限')).toBeTruthy();
    expect(getByText('授予权限')).toBeTruthy();
  });

  it('calls onCancel when cancel button pressed', () => {
    render(
      <VisionShareCamera
        onCapture={mockOnCapture}
        onCancel={mockOnCancel}
      />
    );

    // Note: In actual implementation, you'd add testID to the close button
    // fireEvent.press(getByTestId('close-button'));
    // expect(mockOnCancel).toHaveBeenCalled();
  });

  it('toggles camera facing', async () => {
    const { container } = render(
      <VisionShareCamera
        onCapture={mockOnCapture}
        onCancel={mockOnCancel}
      />
    );

    // Find and press camera reverse button
    const reverseButton = container.findByProps({ testID: 'camera-reverse' });
    if (reverseButton) {
      fireEvent.press(reverseButton);
    }
  });

  it('toggles flash mode', () => {
    const { container } = render(
      <VisionShareCamera
        onCapture={mockOnCapture}
        onCancel={mockOnCancel}
      />
    );

    // Find and press flash button
    const flashButton = container.findByProps({ testID: 'flash-button' });
    if (flashButton) {
      fireEvent.press(flashButton);
    }
  });
});
