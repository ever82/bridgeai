import React from 'react';
import { TouchableOpacity } from 'react-native';
import { render, fireEvent, screen } from '@testing-library/react-native';

import { NewMessageBadge } from '../NewMessageBadge';

describe('NewMessageBadge', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    mockOnPress.mockClear();
  });

  describe('Rendering', () => {
    it('renders with testID', () => {
      render(<NewMessageBadge count={5} onPress={mockOnPress} testID="new-message-badge" />);
      expect(screen.getByTestId('new-message-badge')).toBeTruthy();
    });

    it('displays count when count > 0', () => {
      render(<NewMessageBadge count={5} onPress={mockOnPress} />);
      expect(screen.getByText('5')).toBeTruthy();
    });

    it('displays 99+ when count > 99', () => {
      render(<NewMessageBadge count={150} onPress={mockOnPress} />);
      expect(screen.getByText('99+')).toBeTruthy();
    });

    it('displays 99+ when count is exactly 100', () => {
      render(<NewMessageBadge count={100} onPress={mockOnPress} />);
      expect(screen.getByText('99+')).toBeTruthy();
    });

    it('renders as TouchableOpacity', () => {
      render(<NewMessageBadge count={3} onPress={mockOnPress} />);
      expect(screen.UNSAFE_getByType(TouchableOpacity)).toBeTruthy();
    });
  });

  describe('Null rendering', () => {
    it('renders null when count is 0', () => {
      const { toJSON } = render(<NewMessageBadge count={0} onPress={mockOnPress} />);
      expect(toJSON()).toBeNull();
    });

    it('renders null when count is negative', () => {
      const { toJSON } = render(<NewMessageBadge count={-5} onPress={mockOnPress} />);
      expect(toJSON()).toBeNull();
    });
  });

  describe('Interactions', () => {
    it('calls onPress when badge is pressed', () => {
      render(<NewMessageBadge count={5} onPress={mockOnPress} testID="new-message-badge" />);

      fireEvent.press(screen.getByTestId('new-message-badge'));

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('has correct accessibility role', () => {
      render(<NewMessageBadge count={5} onPress={mockOnPress} testID="new-message-badge" />);
      const badge = screen.getByTestId('new-message-badge');
      expect(badge.props.accessibilityRole).toBe('button');
    });

    it('has correct accessibility label', () => {
      render(<NewMessageBadge count={7} onPress={mockOnPress} testID="new-message-badge" />);
      const badge = screen.getByTestId('new-message-badge');
      expect(badge.props.accessibilityLabel).toBe('7 new messages');
    });

    it('has correct accessibility label for 99+', () => {
      render(<NewMessageBadge count={150} onPress={mockOnPress} testID="new-message-badge" />);
      const badge = screen.getByTestId('new-message-badge');
      expect(badge.props.accessibilityLabel).toBe('150 new messages');
    });
  });
});
