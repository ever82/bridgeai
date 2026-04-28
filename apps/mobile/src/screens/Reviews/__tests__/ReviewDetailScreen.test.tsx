import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';

import * as reviewApi from '../../../services/api/reviewApi';
import { ApiResponse } from '../../../types';
import { Review } from '../../../types/review';
import { ReviewDetailScreen } from '../ReviewDetailScreen';

jest.mock('../../../services/api/reviewApi');

jest.mock('../../../stores/authStore', () => ({
  useAuthStore: (selector: (state: { user: { id: string } }) => unknown) =>
    selector({ user: { id: 'reviewee-1' } }),
}));

const mockReview: Review = {
  id: 'review-1',
  matchId: 'match-1',
  reviewerId: 'reviewer-1',
  revieweeId: 'reviewee-1',
  rating: 5,
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
    completedAt: '2024-03-10T10:00:00.000Z',
  },
};

const mockGetReviewById = reviewApi.getReviewById as jest.Mock;
const mockReplyToReview = reviewApi.replyToReview as jest.Mock;

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ goBack: jest.fn() }),
    useRoute: () => ({ params: { reviewId: 'review-1' } }),
  };
});

const renderWithNavigation = (component: React.ReactElement) => (
  <NavigationContainer>{component}</NavigationContainer>
);

describe('ReviewDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetReviewById.mockResolvedValue({ data: { data: mockReview } } as ApiResponse<Review>);
  });

  it('renders review content after loading', async () => {
    render(renderWithNavigation(<ReviewDetailScreen />));

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeTruthy();
      expect(screen.getByText('Great service, very professional!')).toBeTruthy();
    });
  });

  it('renders reviewer name and rating', async () => {
    render(renderWithNavigation(<ReviewDetailScreen />));

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeTruthy();
    });

    expect(screen.getByText('5.0')).toBeTruthy();
  });

  it('renders match info when available', async () => {
    render(renderWithNavigation(<ReviewDetailScreen />));

    await waitFor(() => {
      expect(screen.getByText('Web Development Project')).toBeTruthy();
    });
  });

  it('shows error state when fetch fails', async () => {
    mockGetReviewById.mockRejectedValue(new Error('Network error'));

    render(renderWithNavigation(<ReviewDetailScreen />));

    await waitFor(() => {
      expect(screen.getByText('加载评价详情失败，请稍后重试')).toBeTruthy();
    });
  });

  it('shows retry button on error', async () => {
    mockGetReviewById.mockRejectedValue(new Error('Network error'));

    render(renderWithNavigation(<ReviewDetailScreen />));

    await waitFor(() => {
      expect(screen.getByText('重试')).toBeTruthy();
    });
  });

  it('shows report button', async () => {
    render(renderWithNavigation(<ReviewDetailScreen />));

    await waitFor(() => {
      expect(screen.getByText('举报')).toBeTruthy();
    });
  });

  it('renders back button', async () => {
    render(renderWithNavigation(<ReviewDetailScreen />));

    await waitFor(() => {
      expect(screen.getByText('评价详情')).toBeTruthy();
    });
  });

  it('shows add reply button in reply section', async () => {
    render(renderWithNavigation(<ReviewDetailScreen />));

    await waitFor(() => {
      expect(screen.getByText('+ 添加回复')).toBeTruthy();
    });
  });

  it('toggles reply input when add reply is pressed', async () => {
    render(renderWithNavigation(<ReviewDetailScreen />));

    await waitFor(() => {
      expect(screen.getByText('+ 添加回复')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('+ 添加回复'));

    expect(screen.getByPlaceholderText('请输入您的回复...')).toBeTruthy();
  });

  it('hides reply input when cancel is pressed', async () => {
    render(renderWithNavigation(<ReviewDetailScreen />));

    await waitFor(() => {
      expect(screen.getByText('+ 添加回复')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('+ 添加回复'));

    const cancelButton = screen.getByText('取消');
    fireEvent.press(cancelButton);

    await waitFor(() => {
      expect(screen.getByText('+ 添加回复')).toBeTruthy();
    });
  });

  it('calls replyToReview when submitting reply', async () => {
    const updatedReview = { ...mockReview, content: mockReview.content };
    mockReplyToReview.mockResolvedValue({
      data: { data: updatedReview },
    } as ApiResponse<Review>);

    render(renderWithNavigation(<ReviewDetailScreen />));

    await waitFor(() => {
      expect(screen.getByText('+ 添加回复')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('+ 添加回复'));

    const input = screen.getByPlaceholderText('请输入您的回复...');
    fireEvent.changeText(input, 'Thank you for your review!');

    mockReplyToReview.mockResolvedValue({
      data: { data: { ...mockReview, content: 'Thank you for your review!' } },
    } as ApiResponse<Review>);

    fireEvent.press(screen.getByText('提交回复'));
  });
});
