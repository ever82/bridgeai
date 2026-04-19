/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { render, screen } from '@testing-library/react-native';

// Mock theme
jest.mock('../../../theme', () => ({
  theme: {
    colors: {
      background: '#fff',
      text: '#000',
      textSecondary: '#8E8E93',
      textTertiary: '#C7C7CC',
      textInverse: '#fff',
      primary: '#007AFF',
      primaryDark: '#0056CC',
      primaryLight: '#4DA3FF',
      success: '#34C759',
      warning: '#FF9500',
      error: '#FF3B30',
      info: '#5AC8FA',
      border: '#E5E5EA',
      backgroundSecondary: '#F2F2F7',
      backgroundTertiary: '#E5E5EA',
      overlay: 'rgba(0,0,0,0.5)',
    },
    spacing: { xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, '2xl': 32, '0': 0 },
    fonts: {
      sizes: { xs: 12, sm: 14, base: 16, md: 18, lg: 20, xl: 24, '2xl': 30 },
      weights: { normal: '400', medium: '500', semibold: '600', bold: '700' },
    },
    borderRadius: { sm: 4, md: 8, lg: 12, full: 9999 },
    shadows: { sm: {}, md: {}, lg: {} },
    borders: { none: 0, thin: 1 },
  },
}));

jest.mock('../../../components/ScreenContainer/ScreenContainer', () => ({
  ScreenContainer: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('../../../components/Header/Header', () => ({
  Header: ({ title, rightElement }: { title: string; rightElement?: React.ReactNode }) => {
    const RN = require('react-native');
    return (
      <RN.View>
        <RN.Text>{title}</RN.Text>
        {rightElement}
      </RN.View>
    );
  },
}));
jest.mock('../../../components/EmptyState/EmptyState', () => ({
  EmptyState: ({ title, icon }: { title: string; icon?: string }) => {
    const RN = require('react-native');
    return (
      <>
        {icon && <RN.Text testID="empty-icon">{icon}</RN.Text>}
        <RN.Text testID="empty-title">{title}</RN.Text>
      </>
    );
  },
}));
jest.mock('../../../components/UserAvatar/UserAvatar', () => ({
  UserAvatar: ({ name }: { name: string }) => {
    const RN = require('react-native');
    return <RN.Text>{name}</RN.Text>;
  },
}));
jest.mock('../DeleteConfirmDialog', () => ({
  DeleteConfirmDialog: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0 }),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: jest.fn(),
    canGoBack: jest.fn(() => true),
  }),
}));

jest.mock('../../../stores/messageStore', () => ({
  useMessageStore: jest.fn(() => ({
    conversations: [],
    notifications: [],
    refreshing: false,
    isSelectionMode: false,
    selectedIds: [],
    unreadCount: 0,
    refreshConversations: jest.fn(),
    loadMoreConversations: jest.fn(),
    fetchNotifications: jest.fn(),
    markConversationRead: jest.fn(),
    markMultipleRead: jest.fn(),
    deleteConversation: jest.fn(),
    deleteMultiple: jest.fn(),
    pinConversation: jest.fn(),
    toggleSelectionMode: jest.fn(),
    toggleSelection: jest.fn(),
    selectAll: jest.fn(),
    clearSelection: jest.fn(),
  })),
}));

import { MessagesListScreen } from '../MessagesListScreen';

describe('MessagesListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders header title', () => {
    render(<MessagesListScreen />);
    expect(screen.getByText('消息中心')).toBeTruthy();
  });

  it('renders empty state when no conversations', () => {
    render(<MessagesListScreen />);
    expect(screen.getByText('还没有聊天消息')).toBeTruthy();
  });
});
