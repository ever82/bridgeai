import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';

import { theme } from '../../theme';

import { UserAvatar } from './UserAvatar';

describe('UserAvatar', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    mockOnPress.mockClear();
  });

  it('renders correctly with default props', () => {
    render(<UserAvatar testID="avatar" />);
    expect(screen.getByTestId('avatar')).toBeTruthy();
    expect(screen.getByTestId('avatar-fallback')).toBeTruthy();
  });

  it('renders with image when uri is provided', () => {
    render(<UserAvatar uri="https://example.com/avatar.jpg" testID="avatar" />);
    expect(screen.getByTestId('avatar-image')).toBeTruthy();
  });

  it('renders fallback with initials when name is provided', () => {
    render(<UserAvatar name="John Doe" testID="avatar" />);
    expect(screen.getByText('J')).toBeTruthy();
  });

  it('renders with different sizes', () => {
    const sizes: Array<'xs' | 'sm' | 'md' | 'lg' | 'xl'> = ['xs', 'sm', 'md', 'lg', 'xl'];
    sizes.forEach((size) => {
      const { rerender } = render(<UserAvatar size={size} testID="avatar" />);
      expect(screen.getByTestId('avatar')).toBeTruthy();
      rerender(<></>);
    });
  });

  it('shows online status indicator', () => {
    render(<UserAvatar status="online" testID="avatar" />);
    expect(screen.getByTestId('avatar-status')).toBeTruthy();
  });

  it('shows offline status indicator', () => {
    render(<UserAvatar status="offline" testID="avatar" />);
    expect(screen.getByTestId('avatar-status')).toBeTruthy();
  });

  it('shows busy status indicator', () => {
    render(<UserAvatar status="busy" testID="avatar" />);
    expect(screen.getByTestId('avatar-status')).toBeTruthy();
  });

  it('shows away status indicator', () => {
    render(<UserAvatar status="away" testID="avatar" />);
    expect(screen.getByTestId('avatar-status')).toBeTruthy();
  });

  it('hides status indicator when showStatus is false', () => {
    render(<UserAvatar status="online" showStatus={false} testID="avatar" />);
    expect(screen.queryByTestId('avatar-status')).toBeNull();
  });

  it('applies agent border style for agent user type', () => {
    render(<UserAvatar userType="agent" testID="avatar" />);
    const avatar = screen.getByTestId('avatar');
    expect(avatar.props.style).toMatchObject({
      borderWidth: 2,
      borderColor: theme.colors.secondary,
    });
  });

  it('calls onPress when pressed', () => {
    render(<UserAvatar onPress={mockOnPress} testID="avatar" />);
    fireEvent.press(screen.getByTestId('avatar'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('has correct accessibility role when onPress is provided', () => {
    render(<UserAvatar onPress={mockOnPress} name="Test User" testID="avatar" />);
    expect(screen.getByRole('button')).toBeTruthy();
  });

  it('does not have button role when onPress is not provided', () => {
    render(<UserAvatar name="Test User" testID="avatar" />);
    const avatar = screen.getByTestId('avatar');
    expect(avatar.props.accessibilityRole).toBeUndefined();
  });

  it('applies custom style prop', () => {
    const customStyle = { marginTop: 10 };
    render(<UserAvatar style={customStyle} testID="avatar" />);
    const avatar = screen.getByTestId('avatar');
    expect(avatar.props.style).toMatchObject(customStyle);
  });
});
