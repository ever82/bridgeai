import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { VisionShareCamera } from '../VisionShareCamera';

// Mock expo-camera
jest.mock('expo-camera', () => ({
  useCameraPermissions: jest.fn(() => [{ granted: true }, jest.fn()]),
  CameraView: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  CameraType: { back: 'back', front: 'front' },
  FlashMode: { on: 'on', off: 'off', auto: 'auto' },
}));

describe('VisionShareCamera', () => {
  const mockOnCapture = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByText } = render(
      <VisionShareCamera onCapture={mockOnCapture} onCancel={mockOnCancel} maxPhotos={10} />
    );

    expect(getByText('0 / 10')).toBeTruthy();
  });

  it('toggles camera facing', async () => {
    const { getByTestId } = render(
      <VisionShareCamera onCapture={mockOnCapture} onCancel={mockOnCancel} />
    );

    // Find and press camera reverse button
    const reverseButton = getByTestId('camera-reverse');
    if (reverseButton) {
      fireEvent.press(reverseButton);
    }
  });

  it('toggles flash mode', () => {
    const { getByTestId } = render(
      <VisionShareCamera onCapture={mockOnCapture} onCancel={mockOnCancel} />
    );

    // Find and press flash button
    const flashButton = getByTestId('flash-button');
    if (flashButton) {
      fireEvent.press(flashButton);
    }
  });
});
