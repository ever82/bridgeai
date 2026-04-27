import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';

import { StarRating } from './StarRating';

describe('StarRating', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders correct number of stars (default maxStars=5)', () => {
      render(<StarRating rating={3} testID="star-rating" />);
      expect(screen.getByTestId('star-rating-star-0')).toBeTruthy();
      expect(screen.getByTestId('star-rating-star-1')).toBeTruthy();
      expect(screen.getByTestId('star-rating-star-2')).toBeTruthy();
      expect(screen.getByTestId('star-rating-star-3')).toBeTruthy();
      expect(screen.getByTestId('star-rating-star-4')).toBeTruthy();
    });

    it('renders correct number of stars with custom maxStars', () => {
      render(<StarRating rating={2} maxStars={3} testID="star-rating" />);
      expect(screen.getByTestId('star-rating-star-0')).toBeTruthy();
      expect(screen.getByTestId('star-rating-star-1')).toBeTruthy();
      expect(screen.getByTestId('star-rating-star-2')).toBeTruthy();
      expect(screen.queryByTestId('star-rating-star-3')).toBeNull();
    });

    it('renders with testID on container', () => {
      render(<StarRating rating={2} testID="star-rating" />);
      expect(screen.getByTestId('star-rating')).toBeTruthy();
    });
  });

  describe('onRatingChange callback', () => {
    it('calls onRatingChange when a star is pressed', () => {
      const mockOnRatingChange = jest.fn();
      render(<StarRating rating={0} onRatingChange={mockOnRatingChange} testID="star-rating" />);

      fireEvent.press(screen.getByTestId('star-rating-star-2'));
      expect(mockOnRatingChange).toHaveBeenCalledWith(3);
    });

    it('calls onRatingChange with correct rating when pressing first star', () => {
      const mockOnRatingChange = jest.fn();
      render(<StarRating rating={0} onRatingChange={mockOnRatingChange} testID="star-rating" />);

      fireEvent.press(screen.getByTestId('star-rating-star-0'));
      expect(mockOnRatingChange).toHaveBeenCalledWith(1);
    });

    it('allows changing rating from non-zero', () => {
      const mockOnRatingChange = jest.fn();
      render(<StarRating rating={2} onRatingChange={mockOnRatingChange} testID="star-rating" />);

      fireEvent.press(screen.getByTestId('star-rating-star-3'));
      expect(mockOnRatingChange).toHaveBeenCalledWith(4);
    });

    it('does not call onRatingChange when no callback is provided', () => {
      render(<StarRating rating={3} testID="star-rating" />);
      // Should not throw
      expect(() => {
        fireEvent.press(screen.getByTestId('star-rating-star-2'));
      }).not.toThrow();
    });
  });

  describe('disabled state', () => {
    it('does not call onRatingChange when disabled', () => {
      const mockOnRatingChange = jest.fn();
      render(
        <StarRating
          rating={3}
          onRatingChange={mockOnRatingChange}
          disabled={true}
          testID="star-rating"
        />
      );

      fireEvent.press(screen.getByTestId('star-rating-star-2'));
      expect(mockOnRatingChange).not.toHaveBeenCalled();
    });

    it('renders with disabled prop', () => {
      render(<StarRating rating={3} disabled={true} testID="star-rating" />);
      expect(screen.getByTestId('star-rating')).toBeTruthy();
    });
  });

  describe('Size variants', () => {
    it('renders with size="sm"', () => {
      render(<StarRating rating={3} size="sm" testID="star-rating" />);
      expect(screen.getByTestId('star-rating')).toBeTruthy();
    });

    it('renders with size="md" (default)', () => {
      render(<StarRating rating={3} size="md" testID="star-rating" />);
      expect(screen.getByTestId('star-rating')).toBeTruthy();
    });

    it('renders with size="lg"', () => {
      render(<StarRating rating={3} size="lg" testID="star-rating" />);
      expect(screen.getByTestId('star-rating')).toBeTruthy();
    });
  });

  describe('Custom style', () => {
    it('applies custom style prop', () => {
      const customStyle = { marginTop: 10 };
      render(<StarRating rating={3} style={customStyle} testID="star-rating" />);
      expect(screen.getByTestId('star-rating')).toBeTruthy();
    });
  });

  describe('Edge cases', () => {
    it('renders with rating of 0', () => {
      render(<StarRating rating={0} testID="star-rating" />);
      expect(screen.getByTestId('star-rating')).toBeTruthy();
    });

    it('renders with rating at maxStars', () => {
      render(<StarRating rating={5} maxStars={5} testID="star-rating" />);
      expect(screen.getByTestId('star-rating')).toBeTruthy();
    });
  });
});
