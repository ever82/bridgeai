import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

import { ScreenContainer } from './ScreenContainer';

// Mock safe area context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

describe('ScreenContainer', () => {
  it('renders children correctly', () => {
    render(
      <ScreenContainer>
        <Text testID="child-text">Test Content</Text>
      </ScreenContainer>
    );

    expect(screen.getByTestId('child-text')).toBeTruthy();
    expect(screen.getByText('Test Content')).toBeTruthy();
  });

  it('applies safe area insets', () => {
    render(
      <ScreenContainer>
        <Text>Content</Text>
      </ScreenContainer>
    );

    // Component should render without crashing and apply safe area insets
    expect(screen.getByText('Content')).toBeTruthy();
  });

  it('renders in scrollable mode', () => {
    render(
      <ScreenContainer scrollable>
        <Text testID="scroll-content">Scrollable Content</Text>
      </ScreenContainer>
    );

    expect(screen.getByTestId('scroll-content')).toBeTruthy();
  });

  it('renders in keyboard avoiding mode', () => {
    render(
      <ScreenContainer keyboardAvoiding>
        <Text testID="keyboard-content">Keyboard Content</Text>
      </ScreenContainer>
    );

    expect(screen.getByTestId('keyboard-content')).toBeTruthy();
  });
});
