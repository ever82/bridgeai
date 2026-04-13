/**
 * OnlineStatus Component Tests
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { OnlineStatus, OnlineStatusBadge } from '../../components/OnlineStatus';
import { socketClient } from '../../services/socketClient';

// Mock socket client
jest.mock('../../services/socketClient', () => ({
  socketClient: {
    subscribeToUser: jest.fn(),
    unsubscribeFromUser: jest.fn(),
    getPresence: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  },
}));

describe('OnlineStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with default props', () => {
    const { getByText } = render(<OnlineStatus userId="user123" />);
    expect(getByText('离线')).toBeTruthy();
  });

  it('fetches initial presence on mount', async () => {
    (socketClient.getPresence as jest.Mock).mockResolvedValue([
      { userId: 'user123', online: true },
    ]);

    render(<OnlineStatus userId="user123" />);

    await waitFor(() => {
      expect(socketClient.getPresence).toHaveBeenCalledWith(['user123']);
    });
  });

  it('subscribes to user events on mount', () => {
    render(<OnlineStatus userId="user123" />);
    expect(socketClient.subscribeToUser).toHaveBeenCalledWith('user123');
  });

  it('unsubscribes from user events on unmount', () => {
    const { unmount } = render(<OnlineStatus userId="user123" />);
    unmount();
    expect(socketClient.unsubscribeFromUser).toHaveBeenCalledWith('user123');
  });

  it('displays online status when user is online', async () => {
    (socketClient.getPresence as jest.Mock).mockResolvedValue([
      { userId: 'user123', online: true },
    ]);

    const { getByText } = render(<OnlineStatus userId="user123" />);

    await waitFor(() => {
      expect(getByText('在线')).toBeTruthy();
    });
  });

  it('calls onStatusChange when status changes', async () => {
    const onStatusChange = jest.fn();
    const mockOn = socketClient.on as jest.Mock;

    mockOn.mockImplementation((event, handler) => {
      if (event === 'user:status_update') {
        setTimeout(() => {
          handler({ userId: 'user123', status: 'online', timestamp: new Date().toISOString() });
        }, 10);
      }
    });

    render(<OnlineStatus userId="user123" onStatusChange={onStatusChange} />);

    await waitFor(() => {
      expect(onStatusChange).toHaveBeenCalledWith('online');
    });
  });

  it('hides label when showLabel is false', () => {
    const { queryByText } = render(<OnlineStatus userId="user123" showLabel={false} />);
    expect(queryByText('离线')).toBeNull();
  });

  it('shows last seen when user is offline', async () => {
    const lastSeen = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
    (socketClient.getPresence as jest.Mock).mockResolvedValue([
      { userId: 'user123', online: false, lastSeenAt: lastSeen },
    ]);

    const { getByText } = render(<OnlineStatus userId="user123" />);

    await waitFor(() => {
      expect(getByText(/小时前/)).toBeTruthy();
    });
  });
});

describe('OnlineStatusBadge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { container } = render(<OnlineStatusBadge userId="user123" />);
    expect(container).toBeTruthy();
  });

  it('subscribes and unsubscribes correctly', () => {
    const { unmount } = render(<OnlineStatusBadge userId="user123" />);
    expect(socketClient.subscribeToUser).toHaveBeenCalledWith('user123');
    unmount();
    expect(socketClient.unsubscribeFromUser).toHaveBeenCalledWith('user123');
  });
});
