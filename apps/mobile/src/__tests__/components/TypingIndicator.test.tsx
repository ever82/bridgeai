/**
 * TypingIndicator Component Tests
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TouchableOpacity, Text } from 'react-native';

// Mock Animated to prevent infinite recursion in animate() loop
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
// Animated is already mocked via __mocks__/react-native.ts

import {
  SocketTypingIndicator as TypingStatusIndicator,
  useTypingDetector,
} from '../../components/TypingIndicator';
import { socketClient } from '../../services/socketClient';

// Mock socket client
jest.mock('../../services/socketClient', () => ({
  socketClient: {
    setTyping: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  },
}));

describe('TypingStatusIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders null when no one is typing', () => {
    const { toJSON } = render(<TypingStatusIndicator roomId="room123" currentUserId="user123" />);
    expect(toJSON()).toBeNull();
  });

  it('shows typing indicator when other user is typing', () => {
    const mockOn = socketClient.on as jest.Mock;
    let typingHandler: ((...args: unknown[]) => void) | null = null;

    mockOn.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
      if (event === 'user:typing') {
        typingHandler = handler;
      }
    });

    const { getByText } = render(
      <TypingStatusIndicator roomId="room123" currentUserId="user123" />
    );

    // Simulate another user typing
    if (typingHandler) {
      typingHandler({
        userId: 'user456',
        roomId: 'room123',
        isTyping: true,
        timestamp: new Date().toISOString(),
      });
    }

    expect(getByText('正在输入...')).toBeTruthy();
  });

  it('does not show current user typing', () => {
    const mockOn = socketClient.on as jest.Mock;
    let typingHandler: ((...args: unknown[]) => void) | null = null;

    mockOn.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
      if (event === 'user:typing') {
        typingHandler = handler;
      }
    });

    const { toJSON } = render(<TypingStatusIndicator roomId="room123" currentUserId="user123" />);

    // Simulate current user typing
    if (typingHandler) {
      typingHandler({
        userId: 'user123',
        roomId: 'room123',
        isTyping: true,
        timestamp: new Date().toISOString(),
      });
    }

    expect(toJSON()).toBeNull();
  });

  it('shows multiple users typing', () => {
    const mockOn = socketClient.on as jest.Mock;
    let typingHandler: ((...args: unknown[]) => void) | null = null;

    mockOn.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
      if (event === 'user:typing') {
        typingHandler = handler;
      }
    });

    const { getByText } = render(
      <TypingStatusIndicator roomId="room123" currentUserId="user123" />
    );

    // Simulate two users typing
    if (typingHandler) {
      typingHandler({
        userId: 'user456',
        roomId: 'room123',
        isTyping: true,
        timestamp: new Date().toISOString(),
      });
      typingHandler({
        userId: 'user789',
        roomId: 'room123',
        isTyping: true,
        timestamp: new Date().toISOString(),
      });
    }

    expect(getByText('2人正在输入...')).toBeTruthy();
  });

  it('removes typing indicator after timeout', () => {
    const mockOn = socketClient.on as jest.Mock;
    let typingHandler: ((...args: unknown[]) => void) | null = null;

    mockOn.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
      if (event === 'user:typing') {
        typingHandler = handler;
      }
    });

    const { getByText, queryByText } = render(
      <TypingStatusIndicator roomId="room123" currentUserId="user123" />
    );

    // Simulate user typing
    if (typingHandler) {
      typingHandler({
        userId: 'user456',
        roomId: 'room123',
        isTyping: true,
        timestamp: new Date().toISOString(),
      });
    }

    expect(getByText('正在输入...')).toBeTruthy();

    // Fast forward past timeout (3 seconds + buffer)
    jest.advanceTimersByTime(3500);

    expect(queryByText('正在输入...')).toBeNull();
  });
});

describe('useTypingDetector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns isTyping as false initially', () => {
    const TestComponent = () => {
      const { isTyping } = useTypingDetector({
        roomId: 'room123',
        currentUserId: 'user123',
      });
      return <Text testID="status">{isTyping ? 'Typing' : 'Not Typing'}</Text>;
    };

    const { getByText } = render(<TestComponent />);
    expect(getByText('Not Typing')).toBeTruthy();
  });

  it('sets typing to true when text changes', () => {
    const TestComponent = () => {
      const { isTyping, handleTextChange } = useTypingDetector({
        roomId: 'room123',
        currentUserId: 'user123',
      });
      return (
        <>
          <Text testID="status">{isTyping ? 'Typing' : 'Not Typing'}</Text>
          <TouchableOpacity testID="type-btn" onPress={() => handleTextChange('Hello')}>
            <Text>Type</Text>
          </TouchableOpacity>
        </>
      );
    };

    const { getByText } = render(<TestComponent />);
    fireEvent.press(getByText('Type'));
    expect(socketClient.setTyping).toHaveBeenCalledWith('room123', true);
  });

  it('calls onTypingStart when typing starts', () => {
    const onTypingStart = jest.fn();

    const TestComponent = () => {
      const { handleTextChange } = useTypingDetector({
        roomId: 'room123',
        currentUserId: 'user123',
        onTypingStart,
      });
      return (
        <TouchableOpacity testID="type-btn" onPress={() => handleTextChange('Hello')}>
          <Text>Type</Text>
        </TouchableOpacity>
      );
    };

    const { getByText } = render(<TestComponent />);
    fireEvent.press(getByText('Type'));
    expect(onTypingStart).toHaveBeenCalled();
  });

  it('stops typing after timeout', () => {
    const onTypingStop = jest.fn();

    const TestComponent = () => {
      const { handleTextChange, stopTyping } = useTypingDetector({
        roomId: 'room123',
        currentUserId: 'user123',
        onTypingStop,
      });
      return (
        <>
          <TouchableOpacity testID="type-btn" onPress={() => handleTextChange('Hello')}>
            <Text>Type</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="stop-btn" onPress={stopTyping}>
            <Text>Stop</Text>
          </TouchableOpacity>
        </>
      );
    };

    const { getByText } = render(<TestComponent />);
    fireEvent.press(getByText('Type'));
    fireEvent.press(getByText('Stop'));

    expect(socketClient.setTyping).toHaveBeenCalledWith('room123', false);
    expect(onTypingStop).toHaveBeenCalled();
  });
});
