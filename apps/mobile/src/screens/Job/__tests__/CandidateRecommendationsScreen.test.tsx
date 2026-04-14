/**
 * CandidateRecommendationsScreen Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { CandidateRecommendationsScreen } from '../CandidateRecommendationsScreen';

// Mock Alert
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

// Mock safe area insets
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock theme
jest.mock('../../../theme', () => ({
  theme: {
    colors: {
      background: '#fff',
      text: '#000',
      textSecondary: '#666',
      textTertiary: '#999',
      primary: '#007AFF',
      border: '#E5E5E5',
      backgroundSecondary: '#F5F5F5',
      backgroundTertiary: '#E5E5EA',
      success: '#34C759',
      warning: '#FF9500',
      error: '#FF3B30',
      info: '#5AC8FA',
      textInverse: '#FFFFFF',
    },
    spacing: {
      xs: 4,
      sm: 8,
      base: 16,
      lg: 20,
      xl: 24,
      '2xl': 32,
      '3xl': 40,
      '5xl': 64,
    },
    fonts: {
      sizes: {
        xs: 12,
        sm: 14,
        base: 16,
        md: 18,
        lg: 20,
        xl: 24,
      },
      weights: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
    },
    borderRadius: {
      sm: 4,
      md: 8,
      lg: 12,
      full: 9999,
    },
  },
}));

const renderScreen = () => {
  return render(<CandidateRecommendationsScreen />);
};

describe('CandidateRecommendationsScreen', () => {
  it('renders the header title', () => {
    const { getByText } = renderScreen();
    expect(getByText('候选人推荐')).toBeTruthy();
  });

  it('renders job selector', () => {
    const { getByText } = renderScreen();
    expect(getByText('高级前端工程师')).toBeTruthy();
    expect(getByText('全栈开发工程师')).toBeTruthy();
  });

  it('renders filter tabs with counts', () => {
    const { getByText } = renderScreen();
    expect(getByText('全部 (3)')).toBeTruthy();
    expect(getByText('新推荐 (1)')).toBeTruthy();
    expect(getByText('已收藏 (1)')).toBeTruthy();
    expect(getByText('已联系 (0)')).toBeTruthy();
  });

  it('displays candidate cards', () => {
    const { getByText } = renderScreen();
    expect(getByText('张明')).toBeTruthy();
    expect(getByText('李华')).toBeTruthy();
    expect(getByText('王芳')).toBeTruthy();
  });

  it('displays candidate titles and experience', () => {
    const { getByText } = renderScreen();
    expect(getByText('高级前端工程师')).toBeTruthy();
    expect(getByText('5年经验')).toBeTruthy();
    expect(getByText('本科')).toBeTruthy();
  });

  it('displays match scores', () => {
    const { getByText } = renderScreen();
    expect(getByText('95')).toBeTruthy();
    expect(getByText('82')).toBeTruthy();
    expect(getByText('68')).toBeTruthy();
  });

  it('displays AI summaries', () => {
    const { getByText } = renderScreen();
    expect(getByText('AI评价')).toBeTruthy();
  });

  it('displays match reasons', () => {
    const { getByText } = renderScreen();
    expect(getByText('React技能与职位要求高度匹配')).toBeTruthy();
  });

  it('displays skill tags', () => {
    const { getByText } = renderScreen();
    expect(getByText('React')).toBeTruthy();
    expect(getByText('TypeScript')).toBeTruthy();
    expect(getByText('Next.js')).toBeTruthy();
  });

  it('displays action buttons', () => {
    const { getAllByText } = renderScreen();
    const notFitButtons = getAllByText('不适合');
    const shortlistButtons = getAllByText('收藏');
    const contactButtons = getAllByText('联系');
    expect(notFitButtons.length).toBe(3);
    expect(shortlistButtons.length).toBe(3);
    expect(contactButtons.length).toBe(3);
  });

  it('filters to new recommendations when filter tab is pressed', () => {
    const { getByText, queryByText } = renderScreen();
    fireEvent.press(getByText('新推荐 (1)'));
    expect(getByText('张明')).toBeTruthy();
    expect(queryByText('李华')).toBeNull();
    expect(queryByText('王芳')).toBeNull();
  });

  it('toggles match details when pressed', () => {
    const { getAllByText, getByText } = renderScreen();
    const toggleButtons = getAllByText('查看匹配详情');
    fireEvent.press(toggleButtons[0]);
    expect(getByText('技能')).toBeTruthy();
    expect(getByText('经验')).toBeTruthy();
    expect(getByText('学历')).toBeTruthy();
  });
});
