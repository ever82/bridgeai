import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { LoadingSkeleton, Skeleton } from './LoadingSkeleton';

describe('Skeleton', () => {
  it('renders with default props', () => {
    render(<Skeleton testID="skeleton" />);

    expect(screen.getByTestId('skeleton')).toBeTruthy();
  });

  it('renders with custom dimensions', () => {
    render(<Skeleton testID="skeleton" width={100} height={50} />);

    expect(screen.getByTestId('skeleton')).toBeTruthy();
  });
});

describe('LoadingSkeleton', () => {
  it('renders card type skeleton', () => {
    render(<LoadingSkeleton type="card" testID="loading-skeleton" />);

    expect(screen.getByTestId('loading-skeleton')).toBeTruthy();
  });

  it('renders list type skeleton', () => {
    render(<LoadingSkeleton type="list" testID="loading-skeleton" />);

    expect(screen.getByTestId('loading-skeleton')).toBeTruthy();
  });

  it('renders text type skeleton', () => {
    render(<LoadingSkeleton type="text" testID="loading-skeleton" />);

    expect(screen.getByTestId('loading-skeleton')).toBeTruthy();
  });

  it('renders avatar type skeleton', () => {
    render(<LoadingSkeleton type="avatar" testID="loading-skeleton" />);

    expect(screen.getByTestId('loading-skeleton')).toBeTruthy();
  });

  it('renders multiple skeletons when count > 1', () => {
    const { container } = render(<LoadingSkeleton type="card" count={3} />);

    expect(container.children.length).toBeGreaterThan(0);
  });
});
