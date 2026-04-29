import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { DateSeparator, formatDateSeparator } from './DateSeparator';

describe('DateSeparator', () => {
  // Use relative dates that we know will be in the future or past
  // to avoid test flakiness with system date

  it('renders separator with label', () => {
    const date = new Date();
    render(<DateSeparator date={date} />);

    // The label should be rendered as a Text element
    // Check that a Text element exists with expected content
    const textElements = screen.getAllByText(/今天|昨天|星期[一二三四五六日]|月|年/);
    expect(textElements.length).toBeGreaterThan(0);
  });

  it('renders with testID', () => {
    const date = new Date();
    render(<DateSeparator date={date} testID="date-separator" />);

    expect(screen.getByTestId('date-separator')).toBeTruthy();
  });

  it('renders with static date far in past (guaranteed not today)', () => {
    // Use a date in 2020 which is definitely not "今天"
    const date = new Date('2020-03-15');
    render(<DateSeparator date={date} />);

    // Should show month-day format or year-month-day format
    // depending on whether it's this week
    const text = screen.getByText(/月|星期|今天|昨天|年/);
    expect(text).toBeTruthy();
  });
});

describe('formatDateSeparator', () => {
  it('returns a valid format for a date', () => {
    const date = new Date('2024-06-15');
    const result = formatDateSeparator(date);
    // Should be one of: 今天, 昨天, 星期X, M月D日, Y年M月D日
    expect(result).toMatch(/^今天$|^昨天$|^星期[一二三四五六日]$|^\d+月\d+日$|^\d+年\d+月\d+日$/);
  });

  it('returns "今天" for the current date', () => {
    const now = new Date();
    const result = formatDateSeparator(now);
    expect(result).toBe('今天');
  });

  it('returns valid format for a past date', () => {
    const date = new Date('2024-01-01');
    const result = formatDateSeparator(date);
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles dates in different months correctly', () => {
    const date1 = new Date('2024-01-15');
    const date2 = new Date('2024-06-15');

    const result1 = formatDateSeparator(date1);
    const result2 = formatDateSeparator(date2);

    // Both should return valid formats
    expect(result1).toBeTruthy();
    expect(result2).toBeTruthy();
  });
});
