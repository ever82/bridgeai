import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Button } from './Button';
import { Text } from 'react-native';

describe('Button', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    mockOnPress.mockClear();
  });

  it('renders correctly with default props', () => {
    render(<Button title="Test Button" onPress={mockOnPress} />);
    expect(screen.getByText('Test Button')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    render(<Button title="Test Button" onPress={mockOnPress} />);
    fireEvent.press(screen.getByText('Test Button'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    render(<Button title="Test Button" onPress={mockOnPress} disabled />);
    fireEvent.press(screen.getByText('Test Button'));
    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('does not call onPress when loading', () => {
    render(<Button title="Test Button" onPress={mockOnPress} loading />);
    expect(screen.queryByText('Test Button')).toBeNull();
    expect(mockOnPress).not.toHaveBeenCalled();
  });

  describe('variants', () => {
    it('renders primary variant', () => {
      render(<Button title="Primary" onPress={mockOnPress} variant="primary" />);
      expect(screen.getByText('Primary')).toBeTruthy();
    });

    it('renders secondary variant', () => {
      render(<Button title="Secondary" onPress={mockOnPress} variant="secondary" />);
      expect(screen.getByText('Secondary')).toBeTruthy();
    });

    it('renders outline variant', () => {
      render(<Button title="Outline" onPress={mockOnPress} variant="outline" />);
      expect(screen.getByText('Outline')).toBeTruthy();
    });

    it('renders ghost variant', () => {
      render(<Button title="Ghost" onPress={mockOnPress} variant="ghost" />);
      expect(screen.getByText('Ghost')).toBeTruthy();
    });

    it('renders text variant', () => {
      render(<Button title="Text" onPress={mockOnPress} variant="text" />);
      expect(screen.getByText('Text')).toBeTruthy();
    });
  });

  describe('sizes', () => {
    it('renders small size', () => {
      render(<Button title="Small" onPress={mockOnPress} size="sm" />);
      expect(screen.getByText('Small')).toBeTruthy();
    });

    it('renders medium size', () => {
      render(<Button title="Medium" onPress={mockOnPress} size="md" />);
      expect(screen.getByText('Medium')).toBeTruthy();
    });

    it('renders large size', () => {
      render(<Button title="Large" onPress={mockOnPress} size="lg" />);
      expect(screen.getByText('Large')).toBeTruthy();
    });
  });

  it('renders with left icon', () => {
    render(
      <Button
        title="With Left Icon"
        onPress={mockOnPress}
        leftIcon={<Text testID="left-icon">★</Text>}
      />
    );
    expect(screen.getByTestId('left-icon')).toBeTruthy();
    expect(screen.getByText('With Left Icon')).toBeTruthy();
  });

  it('renders with right icon', () => {
    render(
      <Button
        title="With Right Icon"
        onPress={mockOnPress}
        rightIcon={<Text testID="right-icon">→</Text>}
      />
    );
    expect(screen.getByTestId('right-icon')).toBeTruthy();
    expect(screen.getByText('With Right Icon')).toBeTruthy();
  });

  it('has correct accessibility role', () => {
    render(<Button title="Accessible" onPress={mockOnPress} />);
    expect(screen.getByRole('button')).toBeTruthy();
  });

  it('has correct accessibility state when disabled', () => {
    render(<Button title="Disabled" onPress={mockOnPress} disabled />);
    const button = screen.getByRole('button');
    expect(button.props.accessibilityState.disabled).toBe(true);
  });
});
