import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';

import { LastSeen, formatRelativeTime, formatExactTime } from './LastSeen';

describe('LastSeen', () => {
  jest.useFakeTimers();

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('formatRelativeTime', () => {
    it('returns "刚刚" for times less than 60 seconds ago', () => {
      const now = Date.now();
      expect(formatRelativeTime(now - 30000)).toBe('刚刚');
    });

    it('returns minutes ago for times less than 60 minutes ago', () => {
      const now = Date.now();
      expect(formatRelativeTime(now - 5 * 60 * 1000)).toBe('5分钟前');
    });

    it('returns hours ago for times less than 24 hours ago', () => {
      const now = Date.now();
      expect(formatRelativeTime(now - 3 * 60 * 60 * 1000)).toBe('3小时前');
    });

    it('returns days ago for times less than 7 days ago', () => {
      const now = Date.now();
      expect(formatRelativeTime(now - 3 * 24 * 60 * 60 * 1000)).toBe('3天前');
    });

    it('returns weeks ago for times less than 4 weeks ago', () => {
      const now = Date.now();
      expect(formatRelativeTime(now - 2 * 7 * 24 * 60 * 60 * 1000)).toBe('2周前');
    });

    it('returns months ago for times less than 12 months ago', () => {
      const now = Date.now();
      expect(formatRelativeTime(now - 3 * 30 * 24 * 60 * 60 * 1000)).toBe('3个月前');
    });

    it('returns years ago for times more than 12 months ago', () => {
      const now = Date.now();
      expect(formatRelativeTime(now - 2 * 365 * 24 * 60 * 60 * 1000)).toBe('2年前');
    });
  });

  describe('formatExactTime', () => {
    it('returns "今天" for today\'s date', () => {
      const now = new Date();
      const result = formatExactTime(now);
      expect(result).toContain('今天');
    });

    it('returns "昨天" for yesterday\'s date', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const result = formatExactTime(yesterday);
      expect(result).toContain('昨天');
    });

    it('returns date with month and day for older dates', () => {
      const oldDate = new Date('2024-01-15T10:30:00');
      const result = formatExactTime(oldDate);
      expect(result).toContain('1月15日');
    });
  });

  describe('LastSeen component', () => {
    it('renders online status', () => {
      render(<LastSeen timestamp={Date.now()} isOnline testID="last-seen" />);
      expect(screen.getByText('在线')).toBeTruthy();
      expect(screen.getByTestId('last-seen-indicator')).toBeTruthy();
    });

    it('renders relative time when not online', () => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      render(<LastSeen timestamp={fiveMinutesAgo} testID="last-seen" />);
      expect(screen.getByText('5分钟前')).toBeTruthy();
    });

    it('renders exact time when format is exact', () => {
      const today = new Date();
      render(<LastSeen timestamp={today} format="exact" testID="last-seen" />);
      expect(screen.getByText(/今天/)).toBeTruthy();
    });

    it('renders both formats when format is both', () => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      render(<LastSeen timestamp={fiveMinutesAgo} format="both" testID="last-seen" />);
      const text = screen.getByText(/5分钟前/);
      expect(text).toBeTruthy();
    });

    it('updates time at specified interval', async () => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      render(
        <LastSeen
          timestamp={fiveMinutesAgo}
          updateInterval={60000}
          testID="last-seen"
        />
      );

      jest.advanceTimersByTime(60000);
      // Component should have updated
      expect(screen.getByText('5分钟前')).toBeTruthy();
    });

    it('applies custom style prop', () => {
      const customStyle = { marginTop: 10 };
      render(<LastSeen timestamp={Date.now()} style={customStyle} testID="last-seen" />);
      const container = screen.getByTestId('last-seen');
      expect(container.props.style).toMatchObject(customStyle);
    });

    it('applies custom textStyle prop', () => {
      const customTextStyle = { fontSize: 16 };
      render(
        <LastSeen
          timestamp={Date.now()}
          textStyle={customTextStyle}
          testID="last-seen"
        />
      );
      const text = screen.getByText(/刚刚|在线/);
      expect(text.props.style).toMatchObject(customTextStyle);
    });

    it('has correct accessibility label', () => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      render(<LastSeen timestamp={fiveMinutesAgo} testID="last-seen" />);
      expect(screen.getByLabelText(/最后在线/)).toBeTruthy();
    });

    it('has correct accessibility label when online', () => {
      render(<LastSeen timestamp={Date.now()} isOnline testID="last-seen" />);
      expect(screen.getByLabelText('当前在线')).toBeTruthy();
    });
  });
});
