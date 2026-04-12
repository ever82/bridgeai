/**
 * TypingIndicator Component Tests
 */
import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { TypingIndicator, useTypingDetector } from '../../components/TypingIndicator';
import { socketClient } from '../../services/socketClient';

// Mock socket client
jest.mock('../../services/socketClient', () => ({
  socketClient: {
    setTyping: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
  },
}));

describe('TypingIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders null when no one is typing', () => {
    const { container } = render(
      <TypingIndicator roomId="room123" currentUserId="user123" />
    );
    expect(container.children).toHaveLength(0);
  });

  it('shows typing indicator when other user is typing', () => {
    const mockOn = socketClient.on as jest.Mock;
    let typingHandler: Function | null = null;

    mockOn.mockImplementation((event, handler) => {
      if (event === 'user:typing') {
        typingHandler = handler;
      }
    });

    const { getByText } = render(
      <TypingIndicator roomId="room123" currentUserId="user123" />
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
    let typingHandler: Function | null = null;

    mockOn.mockImplementation((event, handler) => {
      if (event === 'user:typing') {
        typingHandler = handler;
      }
    });

    const { container } = render(
      <TypingIndicator roomId="room123" currentUserId="user123" />
    );

    // Simulate current user typing
    if (typingHandler) {
      typingHandler({
        userId: 'user123',
        roomId: 'room123',
        isTyping: true,
        timestamp: new Date().toISOString(),
      });
    }

    expect(container.children).toHaveLength(0);
  });

  it('shows multiple users typing', () => {
    const mockOn = socketClient.on as jest.Mock;
    let typingHandler: Function | null = null;

    mockOn.mockImplementation((event, handler) => {
      if (event === 'user:typing') {
        typingHandler = handler;
      }
    });

    const { getByText } = render(
      <TypingIndicator roomId="room123" currentUserId="user123" />
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
    let typingHandler: Function | null = null;

    mockOn.mockImplementation((event, handler) => {
      if (event === 'user:typing') {
        typingHandler = handler;
      }
    });

    const { getByText, queryByText } = render(
      <TypingIndicator roomId="room123" currentUserId="user123" />
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
      return <>{isTyping ? 'Typing' : 'Not Typing'}</>;
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
          <>{isTyping ? 'Typing' : 'Not Typing'}</>
          <button onClick={() => handleTextChange('Hello')}>
            Type
          </button>
        </>
      );
    };

    const { getByText } = render(<TestComponent />);
    fireEvent.click(getByText('Type'));
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
        <button onClick={() => handleTextChange('Hello')}>
          Type
        </button>
      );
    };

    const { getByText } = render(<TestComponent />);
    fireEvent.click(getByText('Type'));
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
          <button onClick={() => handleTextChange('Hello')}>Type</button>
          <button onClick={stopTyping}>Stop</button>
        </>
      );
    };

    const { getByText } = render(<TestComponent />);
    fireEvent.click(getByText('Type'));
    fireEvent.click(getByText('Stop'));

    expect(socketClient.setTyping).toHaveBeenCalledWith('room123', false);
    expect(onTypingStop).toHaveBeenCalled();
  });
});
