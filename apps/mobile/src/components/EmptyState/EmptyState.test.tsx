import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders title correctly', () => {
    render(<EmptyState title="No Data" />);

    expect(screen.getByText('No Data')).toBeTruthy();
  });

  it('renders description when provided', () => {
    render(<EmptyState title="No Data" description="There is no data to display" />);

    expect(screen.getByText('No Data')).toBeTruthy();
    expect(screen.getByText('There is no data to display')).toBeTruthy();
  });

  it('renders custom icon', () => {
    render(<EmptyState title="No Data" icon="🔍" />);

    expect(screen.getByText('🔍')).toBeTruthy();
  });

  it('renders action button when actionLabel and onAction provided', () => {
    const mockOnAction = jest.fn();
    render(<EmptyState title="No Data" actionLabel="Retry" onAction={mockOnAction} />);

    const actionButton = screen.getByText('Retry');
    expect(actionButton).toBeTruthy();

    fireEvent.press(actionButton);
    expect(mockOnAction).toHaveBeenCalled();
  });
});
