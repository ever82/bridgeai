/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('../../../theme', () => ({
  theme: {
    colors: {
      background: '#fff',
      text: '#000',
      textSecondary: '#8E8E93',
      textTertiary: '#C7C7CC',
      textInverse: '#fff',
      primary: '#007AFF',
      border: '#E5E5EA',
      backgroundSecondary: '#F2F2F7',
    },
    spacing: { xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, '2xl': 32, '0': 0 },
    fonts: {
      sizes: { xs: 12, sm: 14, base: 16, md: 18, lg: 20, xl: 24, '2xl': 30 },
      weights: { normal: '400', medium: '500', semibold: '600', bold: '700' },
    },
    borderRadius: { sm: 4, md: 8, lg: 12, full: 9999 },
  },
}));

jest.mock('../../../components/ScreenContainer/ScreenContainer', () => ({
  ScreenContainer: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('../../../components/Header/Header', () => ({
  Header: ({ title }: { title: string }) => {
    const RN = require('react-native');
    return <RN.Text>{title}</RN.Text>;
  },
}));
jest.mock('../../../components/EmptyState/EmptyState', () => ({
  EmptyState: ({ title }: { title: string }) => {
    const RN = require('react-native');
    return <RN.Text>{title}</RN.Text>;
  },
}));
jest.mock('../../../components/UserAvatar/UserAvatar', () => ({
  UserAvatar: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    canGoBack: jest.fn(() => true),
  }),
}));

jest.mock('../../../stores/messageStore', () => ({
  useMessageStore: jest.fn(() => ({
    searchResults: { contacts: [], messages: [] },
    recentSearches: ['小红', 'Nike'],
    isSearching: false,
    performSearch: jest.fn(),
    clearSearch: jest.fn(),
    addRecentSearch: jest.fn(),
    removeRecentSearch: jest.fn(),
  })),
}));

import { MessageSearchScreen } from '../MessageSearchScreen';

describe('MessageSearchScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders header title', () => {
    render(<MessageSearchScreen />);
    expect(screen.getByText('搜索消息')).toBeTruthy();
  });

  it('renders recent searches', () => {
    render(<MessageSearchScreen />);
    expect(screen.getByText('小红')).toBeTruthy();
    expect(screen.getByText('Nike')).toBeTruthy();
  });
});
