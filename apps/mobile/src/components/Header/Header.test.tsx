import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import { Header } from './Header';

// Mock navigation
const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    canGoBack: mockCanGoBack,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

describe('Header', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
    mockCanGoBack.mockClear();
  });

  it('renders title correctly', () => {
    render(<Header title="Test Title" />);

    expect(screen.getByText('Test Title')).toBeTruthy();
  });

  it('renders subtitle when provided', () => {
    render(<Header title="Test Title" subtitle="Test Subtitle" />);

    expect(screen.getByText('Test Title')).toBeTruthy();
    expect(screen.getByText('Test Subtitle')).toBeTruthy();
  });

  it('shows back button when showBackButton is true', () => {
    mockCanGoBack.mockReturnValue(true);
    render(<Header title="Test Title" showBackButton />);

    const backButton = screen.getByText('←');
    expect(backButton).toBeTruthy();
  });

  it('calls goBack when back button is pressed', () => {
    mockCanGoBack.mockReturnValue(true);
    render(<Header title="Test Title" showBackButton />);

    const backButton = screen.getByText('←');
    fireEvent.press(backButton);

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('renders right element when provided', () => {
    render(
      <Header title="Test Title" rightElement={<Text testID="right-element">Right</Text>} />
    );

    expect(screen.getByTestId('right-element')).toBeTruthy();
  });

  it('renders left element when provided and showBackButton is false', () => {
    render(
      <Header title="Test Title" leftElement={<Text testID="left-element">Left</Text>} />
    );

    expect(screen.getByTestId('left-element')).toBeTruthy();
  });
});

import { Text } from 'react-native';
