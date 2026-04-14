/**
 * MessageStatus Component Tests
 */
import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { MessageStatus, GroupReadStatus, ReadReceiptBadge } from '../../components/Chat/MessageStatus';
import { socketClient } from '../../services/socketClient';

// Mock socket client
jest.mock('../../services/socketClient', () => ({
  socketClient: {
    markAsRead: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  },
}));

describe('MessageStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with default props', () => {
    const { getByText } = render(
      <MessageStatus
        messageId="msg123"
        roomId="room123"
        currentUserId="user123"
        status="sent"
      />
    );
    expect(getByText('✓')).toBeTruthy();
  });

  it('shows read status', () => {
    const { getByText } = render(
      <MessageStatus
        messageId="msg123"
        roomId="room123"
        currentUserId="user123"
        status="read"
        readBy={[{ userId: 'user456', messageId: 'msg123', readAt: new Date().toISOString() }]}
      />
    );
    expect(getByText('✓✓')).toBeTruthy();
  });

  it('shows read count', () => {
    const { getByText } = render(
      <MessageStatus
        messageId="msg123"
        roomId="room123"
        currentUserId="user123"
        status="read"
        readBy={[
          { userId: 'user456', messageId: 'msg123', readAt: new Date().toISOString() },
          { userId: 'user789', messageId: 'msg123', readAt: new Date().toISOString() },
        ]}
        showReadCount
      />
    );
    expect(getByText('2人已读')).toBeTruthy();
  });

  it('shows "all read" when everyone has read', () => {
    const { getByText } = render(
      <MessageStatus
        messageId="msg123"
        roomId="room123"
        currentUserId="user123"
        status="read"
        readBy={[
          { userId: 'user456', messageId: 'msg123', readAt: new Date().toISOString() },
          { userId: 'user789', messageId: 'msg123', readAt: new Date().toISOString() },
        ]}
        totalMembers={3}
        showReadCount
      />
    );
    expect(getByText('全部已读')).toBeTruthy();
  });

  it('marks message as read on mount', () => {
    render(
      <MessageStatus
        messageId="msg123"
        roomId="room123"
        currentUserId="user123"
        status="delivered"
      />
    );
    expect(socketClient.markAsRead).toHaveBeenCalledWith('room123', ['msg123']);
  });

  it('handles read receipt updates', async () => {
    const mockOn = socketClient.on as jest.Mock;
    let receiptHandler: Function | null = null;

    mockOn.mockImplementation((event, handler) => {
      if (event === 'chat:read_receipt') {
        receiptHandler = handler;
      }
    });

    const onReadReceiptReceived = jest.fn();

    render(
      <MessageStatus
        messageId="msg123"
        roomId="room123"
        currentUserId="user123"
        status="delivered"
        onReadReceiptReceived={onReadReceiptReceived}
      />
    );

    // Simulate read receipt
    if (receiptHandler) {
      receiptHandler({
        userId: 'user456',
        roomId: 'room123',
        messageIds: ['msg123'],
        timestamp: new Date().toISOString(),
      });
    }

    await waitFor(() => {
      expect(onReadReceiptReceived).toHaveBeenCalled();
    });
  });

  it('opens modal when pressed', () => {
    const { getByText, queryByText } = render(
      <MessageStatus
        messageId="msg123"
        roomId="room123"
        currentUserId="user123"
        status="read"
        readBy={[
          { userId: 'user456', messageId: 'msg123', readAt: new Date().toISOString() },
        ]}
      />
    );

    fireEvent.press(getByText('✓✓'));
    expect(queryByText('已读成员')).toBeTruthy();
  });

  it('does not open modal when no one has read', () => {
    const { getByText, queryByText } = render(
      <MessageStatus
        messageId="msg123"
        roomId="room123"
        currentUserId="user123"
        status="sent"
      />
    );

    fireEvent.press(getByText('✓'));
    expect(queryByText('已读成员')).toBeNull();
  });
});

describe('GroupReadStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByText } = render(
      <GroupReadStatus
        roomId="room123"
        messageIds={['msg1', 'msg2']}
        currentUserId="user123"
        totalMembers={5}
      />
    );
    expect(getByText('阅读率: 0.0%')).toBeTruthy();
  });

  it('calculates read rate correctly', async () => {
    const mockOn = socketClient.on as jest.Mock;
    let receiptHandler: Function | null = null;

    mockOn.mockImplementation((event, handler) => {
      if (event === 'chat:read_receipt') {
        receiptHandler = handler;
      }
    });

    const { getByText } = render(
      <GroupReadStatus
        roomId="room123"
        messageIds={['msg1', 'msg2']}
        currentUserId="user123"
        totalMembers={5}
      />
    );

    // Simulate read receipts (2 messages read by 3 users each = 6 reads)
    if (receiptHandler) {
      receiptHandler({
        userId: 'user456',
        roomId: 'room123',
        messageIds: ['msg1', 'msg2'],
        timestamp: new Date().toISOString(),
      });
      receiptHandler({
        userId: 'user789',
        roomId: 'room123',
        messageIds: ['msg1', 'msg2'],
        timestamp: new Date().toISOString(),
      });
      receiptHandler({
        userId: 'userabc',
        roomId: 'room123',
        messageIds: ['msg1', 'msg2'],
        timestamp: new Date().toISOString(),
      });
    }

    await waitFor(() => {
      // 6 reads out of 8 possible (2 messages * 4 other members) = 75%
      expect(getByText('阅读率: 75.0%')).toBeTruthy();
    });
  });
});

describe('ReadReceiptBadge', () => {
  it('renders correctly with partial reads', () => {
    const { getByText } = render(<ReadReceiptBadge count={2} total={5} />);
    expect(getByText('2/5')).toBeTruthy();
  });

  it('renders checkmark when all read', () => {
    const { getByText } = render(<ReadReceiptBadge count={5} total={5} />);
    expect(getByText('✓')).toBeTruthy();
  });
});
