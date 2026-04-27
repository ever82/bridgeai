import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { ReviewStats } from './ReviewStats';

// Shape that ReviewStats component actually consumes
// (not matching types/review.ts ReviewStats type due to component/type mismatch)
interface StatsShape {
  averageScore: number;
  totalReviews: number;
  distribution: Array<{ score: number; count: number }>;
}

const createStats = (overrides: Partial<StatsShape> = {}): StatsShape => ({
  averageScore: 4.2,
  totalReviews: 25,
  distribution: [
    { score: 5, count: 10 },
    { score: 4, count: 8 },
    { score: 3, count: 4 },
    { score: 2, count: 2 },
    { score: 1, count: 1 },
  ],
  ...overrides,
});

describe('ReviewStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with testID', () => {
      render(<ReviewStats stats={createStats()} testID="review-stats" />);
      expect(screen.getByTestId('review-stats')).toBeTruthy();
    });

    it('renders average score formatted to one decimal', () => {
      render(<ReviewStats stats={createStats({ averageScore: 4.567 })} testID="review-stats" />);
      expect(screen.getByText('4.6')).toBeTruthy();
    });

    it('renders average score of zero', () => {
      render(<ReviewStats stats={createStats({ averageScore: 0 })} testID="review-stats" />);
      expect(screen.getByText('0.0')).toBeTruthy();
    });

    it('renders average score of 5.0', () => {
      render(<ReviewStats stats={createStats({ averageScore: 5.0 })} testID="review-stats" />);
      expect(screen.getByText('5.0')).toBeTruthy();
    });

    it('renders total reviews count', () => {
      render(<ReviewStats stats={createStats({ totalReviews: 100 })} testID="review-stats" />);
      expect(screen.getByText('共 100 条评价')).toBeTruthy();
    });

    it('renders zero total reviews', () => {
      render(<ReviewStats stats={createStats({ totalReviews: 0 })} testID="review-stats" />);
      expect(screen.getByText('共 0 条评价')).toBeTruthy();
    });
  });

  describe('Distribution bars', () => {
    it('renders distribution labels (星 labels)', () => {
      render(<ReviewStats stats={createStats()} testID="review-stats" />);
      expect(screen.getByText('5星')).toBeTruthy();
      expect(screen.getByText('4星')).toBeTruthy();
      expect(screen.getByText('3星')).toBeTruthy();
      expect(screen.getByText('2星')).toBeTruthy();
      expect(screen.getByText('1星')).toBeTruthy();
    });

    it('renders count and percentage for each distribution row', () => {
      render(<ReviewStats stats={createStats()} testID="review-stats" />);
      // 5-star: count=10, total=25, percentage=40%
      expect(screen.getByText('10 (40%)')).toBeTruthy();
    });

    it('renders zero count correctly', () => {
      render(
        <ReviewStats
          stats={createStats({
            totalReviews: 10,
            distribution: [
              { score: 5, count: 0 },
              { score: 4, count: 5 },
              { score: 3, count: 3 },
              { score: 2, count: 2 },
              { score: 1, count: 0 },
            ],
          })}
          testID="review-stats"
        />
      );
      const zeroElements = screen.getAllByText('0 (0%)');
      expect(zeroElements.length).toBe(2);
    });

    it('renders correct percentage for partial counts', () => {
      render(
        <ReviewStats
          stats={createStats({
            totalReviews: 3,
            distribution: [
              { score: 5, count: 1 },
              { score: 4, count: 1 },
              { score: 3, count: 1 },
              { score: 2, count: 0 },
              { score: 1, count: 0 },
            ],
          })}
          testID="review-stats"
        />
      );
      // 1/3 = 33.33% -> rounded to 33%
      const elements = screen.getAllByText('1 (33%)');
      expect(elements.length).toBe(3);
    });
  });

  describe('Custom style', () => {
    it('applies custom style prop', () => {
      const customStyle = { marginTop: 20 };
      render(<ReviewStats stats={createStats()} style={customStyle} testID="review-stats" />);
      expect(screen.getByTestId('review-stats')).toBeTruthy();
    });
  });

  describe('Edge cases', () => {
    it('handles distribution with all zeros', () => {
      render(
        <ReviewStats
          stats={createStats({
            averageScore: 0,
            totalReviews: 0,
            distribution: [
              { score: 5, count: 0 },
              { score: 4, count: 0 },
              { score: 3, count: 0 },
              { score: 2, count: 0 },
              { score: 1, count: 0 },
            ],
          })}
          testID="review-stats"
        />
      );
      expect(screen.getByText('0.0')).toBeTruthy();
      expect(screen.getByText('共 0 条评价')).toBeTruthy();
    });

    it('handles single star distribution', () => {
      render(
        <ReviewStats
          stats={createStats({
            totalReviews: 1,
            distribution: [
              { score: 5, count: 0 },
              { score: 4, count: 0 },
              { score: 3, count: 0 },
              { score: 2, count: 0 },
              { score: 1, count: 1 },
            ],
          })}
          testID="review-stats"
        />
      );
      expect(screen.getByText('共 1 条评价')).toBeTruthy();
      expect(screen.getByText('1 (100%)')).toBeTruthy();
    });
  });
});
