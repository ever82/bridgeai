import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  it('renders default title and message', () => {
    render(<ErrorState />);

    expect(screen.getByText('出错了')).toBeTruthy();
    expect(screen.getByText('发生了一些错误，请稍后重试')).toBeTruthy();
  });

  it('renders custom title and message', () => {
    render(<ErrorState title="Custom Error" message="Something went wrong" />);

    expect(screen.getByText('Custom Error')).toBeTruthy();
    expect(screen.getByText('Something went wrong')).toBeTruthy();
  });

  it('renders custom icon', () => {
    render(<ErrorState icon="🚫" />);

    expect(screen.getByText('🚫')).toBeTruthy();
  });

  it('renders retry button when onRetry provided', () => {
    const mockOnRetry = jest.fn();
    render(<ErrorState onRetry={mockOnRetry} />);

    const retryButton = screen.getByText('重试');
    expect(retryButton).toBeTruthy();

    fireEvent.press(retryButton);
    expect(mockOnRetry).toHaveBeenCalled();
  });

  it('renders custom retry label', () => {
    const mockOnRetry = jest.fn();
    render(<ErrorState onRetry={mockOnRetry} retryLabel="Try Again" />);

    expect(screen.getByText('Try Again')).toBeTruthy();
  });
});
