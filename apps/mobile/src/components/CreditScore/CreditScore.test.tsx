import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { CreditScore, TrustBadge } from './CreditScore';
import { theme } from '../../theme';

describe('CreditScore', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    mockOnPress.mockClear();
  });

  it('renders correctly with score', () => {
    render(<CreditScore score={85} testID="credit" />);
    expect(screen.getByTestId('credit')).toBeTruthy();
    expect(screen.getByTestId('credit-badge')).toBeTruthy();
  });

  it('displays correct label for excellent credit (>=90)', () => {
    render(<CreditScore score={95} testID="credit" />);
    expect(screen.getByText('信用优秀')).toBeTruthy();
  });

  it('displays correct label for good credit (70-89)', () => {
    render(<CreditScore score={85} testID="credit" />);
    expect(screen.getByText('信用良好')).toBeTruthy();
  });

  it('displays correct label for fair credit (50-69)', () => {
    render(<CreditScore score={60} testID="credit" />);
    expect(screen.getByText('信用一般')).toBeTruthy();
  });

  it('displays correct label for poor credit (<50)', () => {
    render(<CreditScore score={40} testID="credit" />);
    expect(screen.getByText('信用较差')).toBeTruthy();
  });

  it('renders stars by default', () => {
    render(<CreditScore score={85} testID="credit" />);
    expect(screen.getByTestId('credit-stars')).toBeTruthy();
  });

  it('hides stars when showStars is false', () => {
    render(<CreditScore score={85} showStars={false} testID="credit" />);
    expect(screen.queryByTestId('credit-stars')).toBeNull();
  });

  it('renders label by default', () => {
    render(<CreditScore score={85} testID="credit" />);
    expect(screen.getByTestId('credit-label')).toBeTruthy();
  });

  it('hides label when showLabel is false', () => {
    render(<CreditScore score={85} showLabel={false} testID="credit" />);
    expect(screen.queryByTestId('credit-label')).toBeNull();
  });

  it('renders with different sizes', () => {
    const sizes: Array<'sm' | 'md' | 'lg'> = ['sm', 'md', 'lg'];
    sizes.forEach((size) => {
      const { rerender } = render(<CreditScore score={85} size={size} testID="credit" />);
      expect(screen.getByTestId('credit')).toBeTruthy();
      rerender(<></>);
    });
  });

  it('calls onPress when pressed', () => {
    render(<CreditScore score={85} onPress={mockOnPress} testID="credit" />);
    fireEvent.press(screen.getByRole('button'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('applies correct color for excellent credit', () => {
    render(<CreditScore score={95} testID="credit" />);
    const label = screen.getByTestId('credit-label');
    expect(label.props.style).toMatchObject({ color: theme.colors.success });
  });

  it('applies correct color for poor credit', () => {
    render(<CreditScore score={30} testID="credit" />);
    const label = screen.getByTestId('credit-label');
    expect(label.props.style).toMatchObject({ color: theme.colors.error });
  });

  it('has correct accessibility label', () => {
    render(<CreditScore score={85} testID="credit" />);
    expect(screen.getByLabelText(/信用分: 85/)).toBeTruthy();
  });
});

describe('TrustBadge', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    mockOnPress.mockClear();
  });

  it('renders correctly', () => {
    render(<TrustBadge score={85} testID="trust" />);
    expect(screen.getByTestId('trust')).toBeTruthy();
  });

  it('displays trophy for excellent credit', () => {
    render(<TrustBadge score={95} testID="trust" />);
    expect(screen.getByText('🏆')).toBeTruthy();
  });

  it('displays checkmark for good credit', () => {
    render(<TrustBadge score={85} testID="trust" />);
    expect(screen.getByText('✓')).toBeTruthy();
  });

  it('displays warning for fair credit', () => {
    render(<TrustBadge score={60} testID="trust" />);
    expect(screen.getByText('⚠')).toBeTruthy();
  });

  it('displays x for poor credit', () => {
    render(<TrustBadge score={40} testID="trust" />);
    expect(screen.getByText('✗')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    render(<TrustBadge score={85} onPress={mockOnPress} testID="trust" />);
    fireEvent.press(screen.getByRole('button'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('renders with different sizes', () => {
    const sizes: Array<'sm' | 'md' | 'lg'> = ['sm', 'md', 'lg'];
    sizes.forEach((size) => {
      const { rerender } = render(<TrustBadge score={85} size={size} testID="trust" />);
      expect(screen.getByTestId('trust')).toBeTruthy();
      rerender(<></>);
    });
  });
});
