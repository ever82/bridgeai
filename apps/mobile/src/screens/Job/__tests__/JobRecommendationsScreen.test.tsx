/**
 * JobRecommendationsScreen Tests
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

import { JobRecommendationsScreen } from '../JobRecommendationsScreen';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

// Mock @bridgeai/shared
jest.mock('@bridgeai/shared', () => ({
  JOB_TYPE_LABELS: {
    FULL_TIME: '全职',
    PART_TIME: '兼职',
    CONTRACT: '合同',
    INTERNSHIP: '实习',
    FREELANCE: '自由职业',
  },
  EXPERIENCE_LEVEL_LABELS: {
    ENTRY: '应届生/1年以下',
    JUNIOR: '1-3年',
    MID: '3-5年',
    SENIOR: '5-10年',
    EXPERT: '10年以上',
  },
  SALARY_PERIOD_LABELS: { MONTHLY: '月', YEARLY: '年', HOURLY: '小时', DAILY: '天' },
  JobType: {
    FULL_TIME: 'FULL_TIME',
    PART_TIME: 'PART_TIME',
    CONTRACT: 'CONTRACT',
    INTERNSHIP: 'INTERNSHIP',
    FREELANCE: 'FREELANCE',
  },
  ExperienceLevel: {
    ENTRY: 'ENTRY',
    JUNIOR: 'JUNIOR',
    MID: 'MID',
    SENIOR: 'SENIOR',
    EXPERT: 'EXPERT',
  },
  SalaryPeriod: { MONTHLY: 'MONTHLY', YEARLY: 'YEARLY', HOURLY: 'HOURLY', DAILY: 'DAILY' },
}));

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
  getJobRecommendations: jest.fn().mockResolvedValue({
    data: [
      {
        id: 'rec-1',
        jobId: 'job-rec-1',
        job: {
          id: 'job-rec-1',
          title: '高级前端工程师',
          department: '阿里巴巴',
          location: { city: '杭州', isRemote: false },
          salary: {
            min: 30000,
            max: 50000,
            period: 'MONTHLY',
            currency: 'CNY',
            isNegotiable: true,
          },
          type: 'FULL_TIME',
          requirements: {
            skills: ['React', 'TypeScript', 'Node.js', 'Webpack', 'CSS3'],
            experienceLevel: 'SENIOR',
            educationLevel: 'BACHELOR',
          },
          isUrgent: true,
        },
        matchScore: 92,
        matchFactors: {
          skills: 95,
          experience: 90,
          location: 85,
          salary: 95,
          education: 80,
          culture: 75,
        },
        reasons: ['您的React技能与职位要求高度匹配', '您的前端架构经验符合高级职位要求'],
        isInterested: null,
        createdAt: '2024-01-01',
      },
      {
        id: 'rec-2',
        jobId: 'job-rec-2',
        job: {
          id: 'job-rec-2',
          title: '全栈开发工程师',
          department: '字节跳动',
          location: { city: '北京', isRemote: false },
          salary: {
            min: 25000,
            max: 40000,
            period: 'MONTHLY',
            currency: 'CNY',
            isNegotiable: true,
          },
          type: 'FULL_TIME',
          requirements: {
            skills: ['React', 'Node.js', 'TypeScript', 'MySQL', 'Redis'],
            experienceLevel: 'MID',
            educationLevel: 'BACHELOR',
          },
          isUrgent: false,
        },
        matchScore: 78,
        matchFactors: {
          skills: 85,
          experience: 80,
          location: 70,
          salary: 85,
          education: 80,
          culture: 75,
        },
        reasons: ['您的全栈开发经验与该职位匹配', 'Node.js和React技能符合职位要求'],
        isInterested: null,
        createdAt: '2024-01-01',
      },
      {
        id: 'rec-3',
        jobId: 'job-rec-3',
        job: {
          id: 'job-rec-3',
          title: 'React Native开发工程师',
          department: '腾讯',
          location: { city: '深圳', isRemote: false },
          salary: {
            min: 20000,
            max: 35000,
            period: 'MONTHLY',
            currency: 'CNY',
            isNegotiable: true,
          },
          type: 'FULL_TIME',
          requirements: {
            skills: ['React Native', 'TypeScript', 'iOS', 'Android', 'Redux'],
            experienceLevel: 'JUNIOR',
            educationLevel: 'BACHELOR',
          },
          isUrgent: false,
        },
        matchScore: 65,
        matchFactors: {
          skills: 70,
          experience: 60,
          location: 65,
          salary: 70,
          education: 80,
          culture: 75,
        },
        reasons: ['您的React经验可迁移至React Native', '移动端开发经验是加分项'],
        isInterested: null,
        createdAt: '2024-01-01',
      },
    ],
    pagination: { page: 1, limit: 20, total: 3, totalPages: 1, hasNext: false, hasPrev: false },
  }),
}));

const renderScreen = async () => {
  const result = render(<JobRecommendationsScreen />);
  await waitFor(() => {
    expect(result.getByText('职位推荐')).toBeTruthy();
  });
  return result;
};

describe('JobRecommendationsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the header title', async () => {
    const { getByText } = await renderScreen();
    expect(getByText('职位推荐')).toBeTruthy();
  });

  it('renders filter tabs with counts', async () => {
    const { getByText } = await renderScreen();
    expect(getByText('全部推荐 (3)')).toBeTruthy();
    expect(getByText('高度匹配 (1)')).toBeTruthy();
    expect(getByText('较匹配 (2)')).toBeTruthy();
    expect(getByText('已收藏 (0)')).toBeTruthy();
  });

  it('displays job recommendation cards', async () => {
    const { getByText } = await renderScreen();
    expect(getByText('高级前端工程师')).toBeTruthy();
    expect(getByText('阿里巴巴')).toBeTruthy();
    expect(getByText('全栈开发工程师')).toBeTruthy();
    expect(getByText('字节跳动')).toBeTruthy();
    expect(getByText('React Native开发工程师')).toBeTruthy();
    expect(getByText('腾讯')).toBeTruthy();
  });

  it('displays match scores', async () => {
    const { getByText } = await renderScreen();
    expect(getByText('92')).toBeTruthy();
    expect(getByText('78')).toBeTruthy();
    expect(getByText('65')).toBeTruthy();
  });

  it('displays match reasons', async () => {
    const { getByText } = await renderScreen();
    expect(getByText('您的React技能与职位要求高度匹配')).toBeTruthy();
    expect(getByText('您的全栈开发经验与该职位匹配')).toBeTruthy();
  });

  it('displays skill badges', async () => {
    const { getAllByText } = await renderScreen();
    expect(getAllByText('React').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('TypeScript').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('Node.js').length).toBeGreaterThanOrEqual(1);
  });

  it('displays action buttons', async () => {
    const { getAllByText } = await renderScreen();
    const skipButtons = getAllByText('跳过');
    const interestedButtons = getAllByText('感兴趣');
    expect(skipButtons.length).toBe(3);
    expect(interestedButtons.length).toBe(3);
  });

  it('filters to high match when filter tab is pressed', async () => {
    const { getByText, queryByText } = await renderScreen();
    fireEvent.press(getByText('高度匹配 (1)'));
    expect(getByText('92')).toBeTruthy();
    expect(queryByText('全栈开发工程师')).toBeNull();
    expect(queryByText('React Native开发工程师')).toBeNull();
  });

  it('shows empty state when saved filter has no results', async () => {
    const { getByText } = await renderScreen();
    fireEvent.press(getByText('已收藏 (0)'));
    expect(getByText('暂无推荐职位')).toBeTruthy();
  });

  it('toggles match details when pressed', async () => {
    const { getAllByText, getByText } = await renderScreen();
    const toggleButtons = getAllByText('查看匹配详情');
    expect(toggleButtons.length).toBe(3);
    fireEvent.press(toggleButtons[0]);
    expect(getByText('技能匹配')).toBeTruthy();
    expect(getByText('经验匹配')).toBeTruthy();
    expect(getByText('地点匹配')).toBeTruthy();
    expect(getByText('薪资匹配')).toBeTruthy();
  });
});
