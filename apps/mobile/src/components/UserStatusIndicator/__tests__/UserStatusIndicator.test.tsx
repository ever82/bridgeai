import React from 'react';
import { render } from '@testing-library/react-native';

import { UserStatusIndicator } from '../UserStatusIndicator';

// Use string literals since babel may not emit TS enums at runtime
const SenderType = {
  AGENT: 'AGENT' as const,
  HUMAN: 'HUMAN' as const,
  SYSTEM: 'SYSTEM' as const,
  TRANSITION: 'TRANSITION' as const,
};

const HandoffStatus = {
  AGENT_ACTIVE: 'AGENT_ACTIVE' as const,
  HUMAN_ACTIVE: 'HUMAN_ACTIVE' as const,
  PENDING_TAKEOVER: 'PENDING_TAKEOVER' as const,
  PENDING_HANDOFF: 'PENDING_HANDOFF' as const,
  TIMEOUT: 'TIMEOUT' as const,
  CANCELLED: 'CANCELLED' as const,
};

// Mock socketClient
const mockOn = jest.fn();
const mockOff = jest.fn();
const mockSubscribeToUser = jest.fn();
const mockUnsubscribeFromUser = jest.fn();
const mockGetPresence = jest.fn().mockResolvedValue([]);

jest.mock('../../../services/socketClient', () => ({
  socketClient: {
    on: (...args: unknown[]) => mockOn(...args),
    off: (...args: unknown[]) => mockOff(...args),
    subscribeToUser: (...args: unknown[]) => mockSubscribeToUser(...args),
    unsubscribeFromUser: (...args: unknown[]) => mockUnsubscribeFromUser(...args),
    getPresence: (...args: unknown[]) => mockGetPresence(...args),
  },
}));

describe('UserStatusIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Agent identity', () => {
    it('renders agent identity badge', () => {
      const { getByText, getByTestId } = render(
        <UserStatusIndicator
          userId="user-1"
          senderType={SenderType.AGENT}
          displayName="AI助手"
          testID="status"
        />,
      );

      expect(getByText('🤖')).toBeTruthy();
      expect(getByText('AI助手')).toBeTruthy();
      expect(getByTestId('status-identity')).toBeTruthy();
    });
  });

  describe('Human identity', () => {
    it('renders human identity badge', () => {
      const { getByText, getByTestId } = render(
        <UserStatusIndicator
          userId="user-2"
          senderType={SenderType.HUMAN}
          displayName="张三"
          testID="status"
        />,
      );

      expect(getByText('👤')).toBeTruthy();
      expect(getByText('张三')).toBeTruthy();
      expect(getByTestId('status-identity')).toBeTruthy();
    });
  });

  describe('Presence', () => {
    it('shows presence dot', () => {
      const { getByTestId } = render(
        <UserStatusIndicator
          userId="user-1"
          senderType={SenderType.AGENT}
          showPresence
          testID="status"
        />,
      );

      expect(getByTestId('status-presence')).toBeTruthy();
    });

    it('subscribes to user presence on mount', () => {
      render(
        <UserStatusIndicator
          userId="user-1"
          senderType={SenderType.AGENT}
          showPresence
        />,
      );

      expect(mockSubscribeToUser).toHaveBeenCalledWith('user-1');
      expect(mockGetPresence).toHaveBeenCalledWith(['user-1']);
    });

    it('unsubscribes on unmount', () => {
      const { unmount } = render(
        <UserStatusIndicator
          userId="user-1"
          senderType={SenderType.AGENT}
          showPresence
        />,
      );

      unmount();
      expect(mockUnsubscribeFromUser).toHaveBeenCalledWith('user-1');
    });
  });

  describe('Handoff status', () => {
    it('shows agent active handoff label', () => {
      const { getByText } = render(
        <UserStatusIndicator
          userId="user-1"
          senderType={SenderType.AGENT}
          handoffStatus={HandoffStatus.AGENT_ACTIVE}
          showHandoffStatus
        />,
      );

      expect(getByText('AI处理中')).toBeTruthy();
    });

    it('shows human active handoff label', () => {
      const { getByText } = render(
        <UserStatusIndicator
          userId="user-1"
          senderType={SenderType.HUMAN}
          handoffStatus={HandoffStatus.HUMAN_ACTIVE}
          showHandoffStatus
        />,
      );

      expect(getByText('人工服务中')).toBeTruthy();
    });

    it('shows pending takeover label', () => {
      const { getByText } = render(
        <UserStatusIndicator
          userId="user-1"
          senderType={SenderType.AGENT}
          handoffStatus={HandoffStatus.PENDING_TAKEOVER}
          showHandoffStatus
        />,
      );

      expect(getByText('正在转接人工...')).toBeTruthy();
    });
  });

  describe('Variants', () => {
    it('renders minimal variant', () => {
      const { getByTestId } = render(
        <UserStatusIndicator
          userId="user-1"
          senderType={SenderType.AGENT}
          variant="minimal"
          testID="status"
        />,
      );

      expect(getByTestId('status')).toBeTruthy();
      expect(getByTestId('status-presence')).toBeTruthy();
      expect(getByTestId('status-identity')).toBeTruthy();
    });

    it('renders compact variant with name', () => {
      const { getByText, getByTestId } = render(
        <UserStatusIndicator
          userId="user-1"
          senderType={SenderType.AGENT}
          displayName="AI助手"
          variant="compact"
          testID="status"
        />,
      );

      expect(getByText('AI助手')).toBeTruthy();
      expect(getByTestId('status-identity')).toBeTruthy();
    });

    it('renders full variant with all elements', () => {
      const { getByText, getByTestId } = render(
        <UserStatusIndicator
          userId="user-1"
          senderType={SenderType.HUMAN}
          displayName="李四"
          handoffStatus={HandoffStatus.HUMAN_ACTIVE}
          variant="full"
          testID="status"
        />,
      );

      expect(getByText('李四')).toBeTruthy();
      expect(getByText('人工服务中')).toBeTruthy();
      expect(getByTestId('status-identity')).toBeTruthy();
    });
  });

  describe('Visibility toggles', () => {
    it('hides presence when showPresence is false', () => {
      const { queryByTestId } = render(
        <UserStatusIndicator
          userId="user-1"
          senderType={SenderType.AGENT}
          showPresence={false}
          testID="status"
        />,
      );

      expect(queryByTestId('status-presence')).toBeNull();
    });

    it('hides identity badge when showIdentity is false', () => {
      const { queryByTestId } = render(
        <UserStatusIndicator
          userId="user-1"
          senderType={SenderType.AGENT}
          showIdentity={false}
          testID="status"
        />,
      );

      expect(queryByTestId('status-identity')).toBeNull();
    });
  });

  describe('Custom style', () => {
    it('applies custom style', () => {
      const customStyle = { marginTop: 10 };
      const { getByTestId } = render(
        <UserStatusIndicator
          userId="user-1"
          senderType={SenderType.AGENT}
          style={customStyle}
          testID="status"
        />,
      );

      expect(getByTestId('status')).toBeTruthy();
    });
  });
});
