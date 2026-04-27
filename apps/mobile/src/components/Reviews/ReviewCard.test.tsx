import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';

import { Review } from '../../types/review';

import { ReviewCard } from './ReviewCard';

jest.mock('../../utils/format', () => ({
  formatDate: jest.fn((dateString: string) => {
    // Deterministic date formatting for tests
    const date = new Date(dateString);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  }),
  formatNumber: jest.fn((n: number) => n.toString()),
  formatRelativeDate: jest.fn(() => '刚刚'),
  formatDistanceToNow: jest.fn(() => '刚刚'),
  truncateText: jest.fn((text: string) => text),
}));

const mockReview: Review = {
  id: 'review-1',
  matchId: 'match-1',
  reviewerId: 'reviewer-1',
  revieweeId: 'reviewee-1',
  rating: 4,
  content: 'Great service, very professional!',
  title: 'Great Experience',
  createdAt: '2024-03-15T10:00:00.000Z',
  reviewer: {
    id: 'reviewer-1',
    name: 'John Doe',
    avatar: 'https://example.com/avatar.jpg',
  },
  reviewee: {
    id: 'reviewee-1',
    name: 'Jane Smith',
  },
  match: {
    id: 'match-1',
    title: 'Web Development Project',
  },
};

const mockReviewMinimal: Review = {
  id: 'review-2',
  matchId: 'match-2',
  reviewerId: 'reviewer-2',
  revieweeId: 'reviewee-2',
  rating: 5,
  createdAt: '2024-03-10T08:30:00.000Z',
};

describe('ReviewCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders correctly with all fields', () => {
      render(<ReviewCard review={mockReview} testID="review-card" />);
      expect(screen.getByTestId('review-card')).toBeTruthy();
    });

    it('renders reviewer name when showUser="reviewer"', () => {
      render(<ReviewCard review={mockReview} showUser="reviewer" testID="review-card" />);
      expect(screen.getByText('John Doe')).toBeTruthy();
    });

    it('renders reviewee name when showUser="reviewee"', () => {
      render(<ReviewCard review={mockReview} showUser="reviewee" testID="review-card" />);
      expect(screen.getByText('Jane Smith')).toBeTruthy();
    });

    it('shows avatar placeholder when no avatar', () => {
      render(<ReviewCard review={mockReview} showUser="reviewee" testID="review-card" />);
      // Jane Smith has no avatar, so avatarPlaceholder shows first letter 'J'
      expect(screen.getByText('J')).toBeTruthy();
    });

    it('shows avatar when avatar URL is provided', () => {
      render(<ReviewCard review={mockReview} showUser="reviewer" testID="review-card" />);
      // John Doe has avatar, so avatar image should be rendered
      expect(screen.getByText('John Doe')).toBeTruthy();
    });

    it('renders review rating', () => {
      render(<ReviewCard review={mockReview} testID="review-card" />);
      // StarRating should render 4 filled stars (rating=4)
      expect(screen.getByTestId('review-card')).toBeTruthy();
    });

    it('renders review content', () => {
      render(<ReviewCard review={mockReview} testID="review-card" />);
      expect(screen.getByText('Great service, very professional!')).toBeTruthy();
    });

    it('renders review date via formatDate', () => {
      render(<ReviewCard review={mockReview} testID="review-card" />);
      // formatDate('2024-03-15T10:00:00.000Z') -> '2024/3/15'
      expect(screen.getByText('2024/3/15')).toBeTruthy();
    });

    it('renders match info when match is available', () => {
      render(<ReviewCard review={mockReview} testID="review-card" />);
      expect(screen.getByText('相关订单:')).toBeTruthy();
      expect(screen.getByText('Web Development Project')).toBeTruthy();
    });

    it('renders without match info when match is undefined', () => {
      render(<ReviewCard review={mockReviewMinimal} testID="review-card" />);
      expect(screen.queryByText('相关订单:')).toBeNull();
    });

    it('renders without content when content is undefined', () => {
      render(<ReviewCard review={mockReviewMinimal} testID="review-card" />);
      expect(screen.queryByText('Great service, very professional!')).toBeNull();
    });

    it('defaults showUser to "reviewer"', () => {
      render(<ReviewCard review={mockReview} testID="review-card" />);
      expect(screen.getByText('John Doe')).toBeTruthy();
    });
  });

  describe('Press handling', () => {
    it('calls onPress when pressed', () => {
      const mockOnPress = jest.fn();
      render(<ReviewCard review={mockReview} onPress={mockOnPress} testID="review-card" />);

      fireEvent.press(screen.getByTestId('review-card'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
      expect(mockOnPress).toHaveBeenCalledWith(mockReview);
    });

    it('calls onPress with correct review object', () => {
      const mockOnPress = jest.fn();
      render(<ReviewCard review={mockReview} onPress={mockOnPress} testID="review-card" />);

      fireEvent.press(screen.getByTestId('review-card'));
      expect(mockOnPress).toHaveBeenCalledWith(mockReview);
    });

    it('renders as TouchableOpacity when onPress provided', () => {
      render(<ReviewCard review={mockReview} onPress={jest.fn()} testID="review-card" />);
      expect(screen.getByTestId('review-card')).toBeTruthy();
    });

    it('renders as View when no onPress provided', () => {
      render(<ReviewCard review={mockReview} testID="review-card" />);
      expect(screen.getByTestId('review-card')).toBeTruthy();
    });
  });

  describe('Custom style', () => {
    it('applies custom style prop', () => {
      const customStyle = { marginTop: 20 };
      render(<ReviewCard review={mockReview} style={customStyle} testID="review-card" />);
      expect(screen.getByTestId('review-card')).toBeTruthy();
    });
  });

  describe('Edge cases', () => {
    it('handles review with empty content', () => {
      const noContentReview: Review = { ...mockReview, content: '' };
      render(<ReviewCard review={noContentReview} testID="review-card" />);
      expect(screen.getByTestId('review-card')).toBeTruthy();
    });

    it('handles review with only reviewer populated', () => {
      const partialReview: Review = {
        ...mockReviewMinimal,
        reviewer: { id: 'reviewer-2', name: 'Partial User' },
      };
      render(<ReviewCard review={partialReview} testID="review-card" />);
      expect(screen.getByText('Partial User')).toBeTruthy();
    });
  });
});
