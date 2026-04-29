import React from 'react';
import { TouchableOpacity, Animated } from 'react-native';
import { render, fireEvent, screen } from '@testing-library/react-native';

import { ScrollToBottom } from '../ScrollToBottom';

describe('ScrollToBottom', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Visibility', () => {
    it('renders null when visible is false (default)', () => {
      const { toJSON } = render(<ScrollToBottom onPress={mockOnPress} />);
      expect(toJSON()).toBeNull();
    });

    it('renders when visible is true', () => {
      render(<ScrollToBottom onPress={mockOnPress} visible testID="scroll-to-bottom" />);
      expect(screen.getByTestId('scroll-to-bottom')).toBeTruthy();
    });

    it('renders with custom testID', () => {
      render(<ScrollToBottom onPress={mockOnPress} visible testID="custom-testid" />);
      expect(screen.getByTestId('custom-testid')).toBeTruthy();
    });
  });

  describe('Badge', () => {
    it('renders badge when unreadCount > 0', () => {
      render(
        <ScrollToBottom onPress={mockOnPress} visible unreadCount={5} testID="scroll-to-bottom" />
      );
      expect(screen.getByText('5')).toBeTruthy();
    });

    it('renders badge with testID suffix when testID provided', () => {
      render(
        <ScrollToBottom onPress={mockOnPress} visible unreadCount={3} testID="scroll-to-bottom" />
      );
      expect(screen.getByTestId('scroll-to-bottom-badge')).toBeTruthy();
    });

    it('displays 99+ when unreadCount > 99', () => {
      render(
        <ScrollToBottom onPress={mockOnPress} visible unreadCount={150} testID="scroll-to-bottom" />
      );
      expect(screen.getByText('99+')).toBeTruthy();
    });

    it('does not render badge when unreadCount is 0', () => {
      render(
        <ScrollToBottom onPress={mockOnPress} visible unreadCount={0} testID="scroll-to-bottom" />
      );
      expect(screen.queryByTestId('scroll-to-bottom-badge')).toBeNull();
    });

    it('does not render badge when unreadCount is not provided', () => {
      render(<ScrollToBottom onPress={mockOnPress} visible testID="scroll-to-bottom" />);
      expect(screen.queryByTestId('scroll-to-bottom-badge')).toBeNull();
    });
  });

  describe('Interactions', () => {
    it('calls onPress when button is pressed', () => {
      render(<ScrollToBottom onPress={mockOnPress} visible testID="scroll-to-bottom" />);

      const buttons = screen.UNSAFE_getAllByType(TouchableOpacity);
      fireEvent.press(buttons[0]);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('button has correct accessibility role', () => {
      render(<ScrollToBottom onPress={mockOnPress} visible testID="scroll-to-bottom" />);
      const buttons = screen.UNSAFE_getAllByType(TouchableOpacity);
      expect(buttons[0].props.accessibilityRole).toBe('button');
    });

    it('button has correct accessibility label', () => {
      render(<ScrollToBottom onPress={mockOnPress} visible testID="scroll-to-bottom" />);
      const buttons = screen.UNSAFE_getAllByType(TouchableOpacity);
      expect(buttons[0].props.accessibilityLabel).toBe('Scroll to bottom');
    });
  });

  describe('Animated opacity', () => {
    it('uses Animated.View for container', () => {
      render(<ScrollToBottom onPress={mockOnPress} visible testID="scroll-to-bottom" />);
      const animatedViews = screen.UNSAFE_getAllByType(Animated.View);
      expect(animatedViews.length).toBeGreaterThan(0);
    });

    it('container style contains opacity animation', () => {
      const { getByTestId } = render(
        <ScrollToBottom onPress={mockOnPress} visible testID="scroll-to-bottom" />
      );
      const container = getByTestId('scroll-to-bottom');
      expect(container.type).toBe('Animated.View');
    });
  });
});
