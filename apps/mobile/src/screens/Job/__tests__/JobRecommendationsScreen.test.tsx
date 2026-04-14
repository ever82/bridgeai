/**
 * JobRecommendationsScreen Tests
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { JobRecommendationsScreen } from '../JobRecommendationsScreen';

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
  return render(<JobRecommendationsScreen />);
};

describe('JobRecommendationsScreen', () => {
  it('renders the header title', () => {
    const { getByText } = renderScreen();
    expect(getByText('职位推荐')).toBeTruthy();
  });

  it('renders filter tabs with counts', () => {
    const { getByText } = renderScreen();
    expect(getByText('全部推荐 (3)')).toBeTruthy();
    expect(getByText('高度匹配 (1)')).toBeTruthy();
    expect(getByText('较匹配 (1)')).toBeTruthy();
    expect(getByText('已收藏 (0)')).toBeTruthy();
  });

  it('displays job recommendation cards', () => {
    const { getByText } = renderScreen();
    expect(getByText('高级前端工程师')).toBeTruthy();
    expect(getByText('阿里巴巴')).toBeTruthy();
    expect(getByText('全栈开发工程师')).toBeTruthy();
    expect(getByText('字节跳动')).toBeTruthy();
    expect(getByText('React Native开发工程师')).toBeTruthy();
    expect(getByText('腾讯')).toBeTruthy();
  });

  it('displays match scores', () => {
    const { getByText } = renderScreen();
    expect(getByText('92')).toBeTruthy();
    expect(getByText('78')).toBeTruthy();
    expect(getByText('65')).toBeTruthy();
  });

  it('displays match reasons', () => {
    const { getByText } = renderScreen();
    expect(getByText('您的React技能与职位要求高度匹配')).toBeTruthy();
    expect(getByText('您的全栈开发经验与该职位匹配')).toBeTruthy();
  });

  it('displays skill badges', () => {
    const { getByText } = renderScreen();
    expect(getByText('React')).toBeTruthy();
    expect(getByText('TypeScript')).toBeTruthy();
    expect(getByText('Node.js')).toBeTruthy();
  });

  it('displays action buttons', () => {
    const { getAllByText } = renderScreen();
    const skipButtons = getAllByText('跳过');
    const interestedButtons = getAllByText('感兴趣');
    expect(skipButtons.length).toBe(3);
    expect(interestedButtons.length).toBe(3);
  });

  it('filters to high match when filter tab is pressed', () => {
    const { getByText, queryByText } = renderScreen();
    fireEvent.press(getByText('高度匹配 (1)'));
    expect(getByText('92')).toBeTruthy();
    expect(queryByText('全栈开发工程师')).toBeNull();
    expect(queryByText('React Native开发工程师')).toBeNull();
  });

  it('shows empty state when saved filter has no results', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('已收藏 (0)'));
    expect(getByText('暂无推荐职位')).toBeTruthy();
  });

  it('toggles match details when pressed', () => {
    const { getAllByText, getByText } = renderScreen();
    const toggleButtons = getAllByText('查看匹配详情');
    expect(toggleButtons.length).toBe(3);
    fireEvent.press(toggleButtons[0]);
    expect(getByText('技能匹配')).toBeTruthy();
    expect(getByText('经验匹配')).toBeTruthy();
    expect(getByText('地点匹配')).toBeTruthy();
    expect(getByText('薪资匹配')).toBeTruthy();
  });
});
