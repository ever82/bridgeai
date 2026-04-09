import React from 'react';
import { render, fireEvent } from '../utils/test-utils';
import { Button } from '../../components/Button';

describe('Button', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    mockOnPress.mockClear();
  });

  it('renders correctly with default props', () => {
    const { getByText } = render(<Button title="Test Button" onPress={mockOnPress} />);

    expect(getByText('Test Button')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const { getByText } = render(<Button title="Test Button" onPress={mockOnPress} />);

    fireEvent.press(getByText('Test Button'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('renders with different variants', () => {
    const variants = ['primary', 'secondary', 'outline', 'ghost'] as const;

    variants.forEach((variant) => {
      const { getByText } = render(
        <Button title={`${variant} Button`} onPress={mockOnPress} variant={variant} />
      );
      expect(getByText(`${variant} Button`)).toBeTruthy();
    });
  });

  it('renders with different sizes', () => {
    const sizes = ['sm', 'md', 'lg'] as const;

    sizes.forEach((size) => {
      const { getByText } = render(
        <Button title={`${size} Button`} onPress={mockOnPress} size={size} />
      );
      expect(getByText(`${size} Button`)).toBeTruthy();
    });
  });

  it('shows loading state', () => {
    const { queryByText } = render(
      <Button title="Loading Button" onPress={mockOnPress} loading />
    );

    // Title should not be visible when loading
    expect(queryByText('Loading Button')).toBeNull();
  });

  it('is disabled when loading', () => {
    const { getByTestId } = render(
      <Button title="Loading Button" onPress={mockOnPress} loading testID="button" />
    );

    // Check that the button is disabled via accessibilityState
    const button = getByTestId('button');
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('is disabled when disabled prop is true', () => {
    const { getByTestId } = render(
      <Button title="Disabled Button" onPress={mockOnPress} disabled testID="button" />
    );

    // Check that the button is disabled via accessibilityState
    const button = getByTestId('button');
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('applies custom styles', () => {
    const customStyle = { backgroundColor: 'red' };
    const { getByTestId } = render(
      <Button
        title="Styled Button"
        onPress={mockOnPress}
        style={customStyle}
        testID="button"
      />
    );

    // Check that the style prop contains our custom style
    const button = getByTestId('button');
    expect(button.props.style).toContainEqual(customStyle);
  });
});
