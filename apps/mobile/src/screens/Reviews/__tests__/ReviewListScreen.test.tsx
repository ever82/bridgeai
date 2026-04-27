import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';

import * as reviewApi from '../../../services/api/reviewApi';
import { ApiResponse } from '../../../types';
import { Review, ReviewStats } from '../../../types/review';
import { ReviewListScreen } from '../ReviewListScreen';

jest.mock('../../../services/api/reviewApi');

const mockReview: Review = {
  id: 'review-1',
  matchId: 'match-1',
  reviewerId: 'reviewer-1',
  revieweeId: 'reviewee-1',
  rating: 5,
  content: 'Great service!',
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
    title: 'Web Project',
    completedAt: '2024-03-10T10:00:00.000Z',
  },
};

const mockStats: ReviewStats = {
  avgRating: 4.5,
  fiveStarCount: 10,
  fourStarCount: 5,
  threeStarCount: 2,
  twoStarCount: 1,
  oneStarCount: 0,
  responseRate: 80,
};

const mockPagination = { page: 1, limit: 20, total: 0, hasMore: false };

const mockGetReceivedReviews = reviewApi.getReceivedReviews as jest.Mock;
const mockGetGivenReviews = reviewApi.getGivenReviews as jest.Mock;
const mockGetReviewStats = reviewApi.getReviewStats as jest.Mock;

const renderWithNavigation = (component: React.ReactElement) => (
  <NavigationContainer>{component}</NavigationContainer>
);

describe('ReviewListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetReviewStats.mockResolvedValue({ data: { data: mockStats } } as ApiResponse<ReviewStats>);
  });

  it('renders screen title', async () => {
    mockGetReceivedReviews.mockResolvedValue({
      data: { data: { reviews: [], pagination: mockPagination } },
    } as ApiResponse<{ reviews: Review[]; pagination: typeof mockPagination }>);

    render(renderWithNavigation(<ReviewListScreen />));

    expect(screen.getByText('我的评价')).toBeTruthy();
  });

  it('renders received reviews tab by default', async () => {
    mockGetReceivedReviews.mockResolvedValue({
      data: { data: { reviews: [mockReview], pagination: { ...mockPagination, total: 1 } } },
    } as ApiResponse<{ reviews: Review[]; pagination: typeof mockPagination }>);

    render(renderWithNavigation(<ReviewListScreen />));

    await waitFor(() => {
      expect(screen.getByText('收到的评价')).toBeTruthy();
    });
  });

  it('switches to given reviews tab on press', async () => {
    mockGetReceivedReviews.mockResolvedValue({
      data: { data: { reviews: [], pagination: mockPagination } },
    } as ApiResponse<{ reviews: Review[]; pagination: typeof mockPagination }>);
    mockGetGivenReviews.mockResolvedValue({
      data: { data: { reviews: [mockReview], pagination: { ...mockPagination, total: 1 } } },
    } as ApiResponse<{ reviews: Review[]; pagination: typeof mockPagination }>);

    render(renderWithNavigation(<ReviewListScreen />));

    await waitFor(() => {
      expect(screen.getByText('收到的评价')).toBeTruthy();
    });

    const givenTab = screen.getByTestId('tab-given');
    fireEvent.press(givenTab);

    await waitFor(() => {
      expect(screen.getByText('发出的评价')).toBeTruthy();
    });
  });

  it('renders review cards when reviews exist', async () => {
    mockGetReceivedReviews.mockResolvedValue({
      data: { data: { reviews: [mockReview], pagination: { ...mockPagination, total: 1 } } },
    } as ApiResponse<{ reviews: Review[]; pagination: typeof mockPagination }>);

    render(renderWithNavigation(<ReviewListScreen />));

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeTruthy();
    });
  });

  it('renders empty state when no reviews received', async () => {
    mockGetReceivedReviews.mockResolvedValue({
      data: { data: { reviews: [], pagination: mockPagination } },
    } as ApiResponse<{ reviews: Review[]; pagination: typeof mockPagination }>);

    render(renderWithNavigation(<ReviewListScreen />));

    await waitFor(() => {
      expect(screen.getByText('暂无收到的评价')).toBeTruthy();
    });
  });

  it('renders empty state when no reviews given', async () => {
    mockGetReceivedReviews.mockResolvedValue({
      data: { data: { reviews: [mockReview], pagination: { ...mockPagination, total: 1 } } },
    } as ApiResponse<{ reviews: Review[]; pagination: typeof mockPagination }>);
    mockGetGivenReviews.mockResolvedValue({
      data: { data: { reviews: [], pagination: mockPagination } },
    } as ApiResponse<{ reviews: Review[]; pagination: typeof mockPagination }>);

    render(renderWithNavigation(<ReviewListScreen />));

    await waitFor(() => {
      expect(screen.getByText('收到的评价')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('tab-given'));

    await waitFor(() => {
      expect(screen.getByText('暂无发出的评价')).toBeTruthy();
    });
  });

  it('shows error banner on fetch failure', async () => {
    mockGetReceivedReviews.mockRejectedValue(new Error('Network error'));
    mockGetReviewStats.mockRejectedValue(new Error('Network error'));

    render(renderWithNavigation(<ReviewListScreen />));

    await waitFor(() => {
      expect(screen.getByText('加载评价失败，请稍后重试')).toBeTruthy();
    });
  });

  it('calls fetchStats on mount', async () => {
    mockGetReceivedReviews.mockResolvedValue({
      data: { data: { reviews: [], pagination: mockPagination } },
    } as ApiResponse<{ reviews: Review[]; pagination: typeof mockPagination }>);

    render(renderWithNavigation(<ReviewListScreen />));

    await waitFor(() => {
      expect(mockGetReviewStats).toHaveBeenCalled();
    });
  });
});
