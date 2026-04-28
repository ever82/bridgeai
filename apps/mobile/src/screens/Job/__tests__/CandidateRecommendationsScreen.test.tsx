/**
 * CandidateRecommendationsScreen Tests
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

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

// Mock jobMatchingApi - inline data to avoid TDZ issues with jest.mock hoisting
jest.mock('../../../services/api/jobMatchingApi', () => ({
  getCandidateRecommendations: jest.fn().mockResolvedValue({
    data: [
      {
        id: 'rec-1',
        jobId: 'job-1',
        candidate: {
          id: 'cand-1',
          userId: 'u-1',
          name: '张明',
          title: '高级前端工程师',
          summary: '资深前端工程师',
          location: '杭州',
          experienceYears: 5,
          educationLevel: '本科',
          skills: ['React', 'TypeScript', 'Next.js', 'GraphQL', 'Webpack', 'Jest'],
          expectedSalary: { min: 30000, max: 45000, currency: 'CNY' },
          isOpenToWork: true,
          agentGeneratedSummary:
            '该候选人拥有丰富的前端架构经验，React技能扎实，有带领小团队的经验，符合贵司高级工程师职位要求。',
        },
        matchScore: 95,
        matchFactors: {
          skills: 98,
          experience: 95,
          education: 85,
          salary: 90,
          location: 95,
          culture: 80,
        },
        reasons: ['React技能与职位要求高度匹配', '5年经验符合高级职位要求'],
        status: 'new',
        createdAt: '2024-01-01',
      },
      {
        id: 'rec-2',
        jobId: 'job-1',
        candidate: {
          id: 'cand-2',
          userId: 'u-2',
          name: '李华',
          title: '前端开发工程师',
          summary: '前端开发',
          location: '杭州',
          experienceYears: 3,
          educationLevel: '硕士',
          skills: ['React', 'Vue.js', 'TypeScript', 'Node.js', 'CSS3'],
          expectedSalary: { min: 25000, max: 35000, currency: 'CNY' },
          isOpenToWork: true,
          agentGeneratedSummary:
            '技术基础扎实，学习能力强，虽然经验相对较少，但潜力巨大，薪资期望合理。',
        },
        matchScore: 82,
        matchFactors: {
          skills: 85,
          experience: 75,
          education: 95,
          salary: 95,
          location: 90,
          culture: 80,
        },
        reasons: ['React技能符合职位要求', '硕士学历，学习能力强'],
        status: 'viewed',
        createdAt: '2024-01-01',
      },
      {
        id: 'rec-3',
        jobId: 'job-1',
        candidate: {
          id: 'cand-3',
          userId: 'u-3',
          name: '王芳',
          title: '资深前端工程师',
          summary: '资深工程师',
          location: '上海',
          experienceYears: 7,
          educationLevel: '本科',
          skills: ['React', 'Angular', 'TypeScript', 'Node.js', 'Docker', 'AWS'],
          expectedSalary: { min: 40000, max: 55000, currency: 'CNY' },
          isOpenToWork: false,
          agentGeneratedSummary: '经验丰富，技术全面，但薪资期望较高，可能需要考虑远程工作选项。',
        },
        matchScore: 68,
        matchFactors: {
          skills: 80,
          experience: 95,
          education: 80,
          salary: 60,
          location: 50,
          culture: 70,
        },
        reasons: ['7年经验，技术全面', '有团队管理经验'],
        status: 'shortlisted',
        createdAt: '2024-01-01',
      },
    ],
    pagination: { page: 1, limit: 20, total: 3, totalPages: 1, hasNext: false, hasPrev: false },
  }),
}));

const renderScreen = async () => {
  const result = render(<CandidateRecommendationsScreen />);
  await waitFor(() => {
    expect(result.getByText('候选人推荐')).toBeTruthy();
  });
  return result;
};

describe('CandidateRecommendationsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the header title', async () => {
    const { getByText } = await renderScreen();
    expect(getByText('候选人推荐')).toBeTruthy();
  });

  it('renders job selector', async () => {
    const { getAllByText } = await renderScreen();
    // '高级前端工程师' appears in both job selector and candidate title
    expect(getAllByText('高级前端工程师').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('全栈开发工程师').length).toBeGreaterThanOrEqual(1);
  });

  it('renders filter tabs with counts', async () => {
    const { getByText } = await renderScreen();
    expect(getByText('全部 (3)')).toBeTruthy();
    expect(getByText('新推荐 (1)')).toBeTruthy();
    expect(getByText('已收藏 (1)')).toBeTruthy();
    expect(getByText('已联系 (0)')).toBeTruthy();
  });

  it('displays candidate cards', async () => {
    const { getByText } = await renderScreen();
    expect(getByText('张明')).toBeTruthy();
    expect(getByText('李华')).toBeTruthy();
    expect(getByText('王芳')).toBeTruthy();
  });

  it('displays candidate titles and experience', async () => {
    const { getAllByText } = await renderScreen();
    expect(getAllByText('高级前端工程师').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('5年经验').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('本科').length).toBeGreaterThanOrEqual(1);
  });

  it('displays match scores', async () => {
    const { getByText } = await renderScreen();
    expect(getByText('95')).toBeTruthy();
    expect(getByText('82')).toBeTruthy();
    expect(getByText('68')).toBeTruthy();
  });

  it('displays AI summaries', async () => {
    const { getAllByText } = await renderScreen();
    expect(getAllByText('AI评价').length).toBeGreaterThanOrEqual(1);
  });

  it('displays match reasons', async () => {
    const { getByText } = await renderScreen();
    expect(getByText('React技能与职位要求高度匹配')).toBeTruthy();
  });

  it('displays skill tags', async () => {
    const { getAllByText } = await renderScreen();
    expect(getAllByText('React').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('TypeScript').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('Next.js').length).toBeGreaterThanOrEqual(1);
  });

  it('displays action buttons', async () => {
    const { getAllByText } = await renderScreen();
    const notFitButtons = getAllByText('不适合');
    const shortlistButtons = getAllByText('收藏');
    const contactButtons = getAllByText('联系');
    expect(notFitButtons.length).toBe(3);
    expect(shortlistButtons.length).toBe(3);
    expect(contactButtons.length).toBe(3);
  });

  it('filters to new recommendations when filter tab is pressed', async () => {
    const { getByText, queryByText } = await renderScreen();
    fireEvent.press(getByText('新推荐 (1)'));
    expect(getByText('张明')).toBeTruthy();
    expect(queryByText('李华')).toBeNull();
    expect(queryByText('王芳')).toBeNull();
  });

  it('toggles match details when pressed', async () => {
    const { getAllByText, getByText } = await renderScreen();
    const toggleButtons = getAllByText('查看匹配详情');
    fireEvent.press(toggleButtons[0]);
    expect(getByText('技能')).toBeTruthy();
    expect(getByText('经验')).toBeTruthy();
    expect(getByText('学历')).toBeTruthy();
  });
});
