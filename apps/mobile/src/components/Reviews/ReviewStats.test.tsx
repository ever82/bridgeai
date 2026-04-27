import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { ReviewStats as ReviewStatsData } from '../../types/review';

import { ReviewStats } from './ReviewStats';

const createStats = (overrides: Partial<ReviewStatsData> = {}): ReviewStatsData => ({
  avgRating: 4.2,
  fiveStarCount: 10,
  fourStarCount: 8,
  threeStarCount: 4,
  twoStarCount: 2,
  oneStarCount: 1,
  responseRate: 80,
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
      render(<ReviewStats stats={createStats({ avgRating: 4.567 })} testID="review-stats" />);
      expect(screen.getByText('4.6')).toBeTruthy();
    });

    it('renders average score of zero', () => {
      render(<ReviewStats stats={createStats({ avgRating: 0 })} testID="review-stats" />);
      expect(screen.getByText('0.0')).toBeTruthy();
    });

    it('renders average score of 5.0', () => {
      render(<ReviewStats stats={createStats({ avgRating: 5.0 })} testID="review-stats" />);
      expect(screen.getByText('5.0')).toBeTruthy();
    });

    it('renders total reviews count', () => {
      // 10+20+15+3+2 = 50 total
      render(
        <ReviewStats
          stats={createStats({
            fiveStarCount: 10,
            fourStarCount: 20,
            threeStarCount: 15,
            twoStarCount: 3,
            oneStarCount: 2,
          })}
          testID="review-stats"
        />
      );
      expect(screen.getByText('共 50 条评价')).toBeTruthy();
    });

    it('renders zero total reviews', () => {
      render(
        <ReviewStats
          stats={createStats({
            fiveStarCount: 0,
            fourStarCount: 0,
            threeStarCount: 0,
            twoStarCount: 0,
            oneStarCount: 0,
          })}
          testID="review-stats"
        />
      );
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
            fiveStarCount: 0,
            fourStarCount: 5,
            threeStarCount: 3,
            twoStarCount: 2,
            oneStarCount: 0,
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
            fiveStarCount: 1,
            fourStarCount: 1,
            threeStarCount: 1,
            twoStarCount: 0,
            oneStarCount: 0,
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
            avgRating: 0,
            fiveStarCount: 0,
            fourStarCount: 0,
            threeStarCount: 0,
            twoStarCount: 0,
            oneStarCount: 0,
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
            fiveStarCount: 0,
            fourStarCount: 0,
            threeStarCount: 0,
            twoStarCount: 0,
            oneStarCount: 1,
          })}
          testID="review-stats"
        />
      );
      expect(screen.getByText('共 1 条评价')).toBeTruthy();
      expect(screen.getByText('1 (100%)')).toBeTruthy();
    });
  });
});
