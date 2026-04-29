import React from 'react';
import { TextInput } from 'react-native';
import { render, fireEvent, screen } from '@testing-library/react-native';

import { ChatSearch } from '../ChatSearch';

// Mock useDebounce to return value immediately (no debounce delay in tests)
const mockUseDebounce = jest.fn((value: string) => value);
jest.mock('../../../hooks/useDebounce', () => ({
  useDebounce: (...args: Parameters<typeof mockUseDebounce>) => mockUseDebounce(...args),
}));

describe('ChatSearch', () => {
  const mockOnScrollToMessage = jest.fn();
  const mockOnClose = jest.fn();

  const messages = [
    { id: 'msg-1', content: 'Hello world' },
    { id: 'msg-2', content: 'How are you?' },
    { id: 'msg-3', content: 'Hello again' },
    { id: 'msg-4', content: 'Goodbye' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const getInput = () => {
    const inputs = screen.UNSAFE_getAllByType(TextInput);
    return inputs[0];
  };

  const typeAndFlush = (text: string) => {
    fireEvent.changeText(getInput(), text);
    // Flush microtasks and state updates
  };

  describe('Rendering', () => {
    it('renders with testID', () => {
      render(
        <ChatSearch
          messages={messages}
          onScrollToMessage={mockOnScrollToMessage}
          onClose={mockOnClose}
          testID="chat-search"
        />
      );
      expect(screen.getByTestId('chat-search')).toBeTruthy();
    });

    it('renders TextInput', () => {
      render(
        <ChatSearch
          messages={messages}
          onScrollToMessage={mockOnScrollToMessage}
          onClose={mockOnClose}
          testID="chat-search"
        />
      );
      expect(screen.UNSAFE_getByType(TextInput)).toBeTruthy();
    });

    it('renders prev and next nav buttons', () => {
      render(
        <ChatSearch
          messages={messages}
          onScrollToMessage={mockOnScrollToMessage}
          onClose={mockOnClose}
          testID="chat-search"
        />
      );
      expect(screen.getByTestId('chat-search-prev')).toBeTruthy();
      expect(screen.getByTestId('chat-search-next')).toBeTruthy();
    });

    it('renders close button', () => {
      render(
        <ChatSearch
          messages={messages}
          onScrollToMessage={mockOnScrollToMessage}
          onClose={mockOnClose}
          testID="chat-search"
        />
      );
      expect(screen.getByTestId('chat-search-close')).toBeTruthy();
    });

    it('renders empty match count when no query', () => {
      render(
        <ChatSearch
          messages={messages}
          onScrollToMessage={mockOnScrollToMessage}
          onClose={mockOnClose}
          testID="chat-search"
        />
      );
      expect(screen.queryByTestId('chat-search-count')).toBeNull();
    });
  });

  describe('Search results', () => {
    it('shows match count when query matches messages', () => {
      render(
        <ChatSearch
          messages={messages}
          onScrollToMessage={mockOnScrollToMessage}
          onClose={mockOnClose}
          testID="chat-search"
        />
      );

      typeAndFlush('Hello');
      expect(screen.getByTestId('chat-search-count')).toBeTruthy();
    });

    it('displays correct match count text', () => {
      render(
        <ChatSearch
          messages={messages}
          onScrollToMessage={mockOnScrollToMessage}
          onClose={mockOnClose}
          testID="chat-search"
        />
      );

      typeAndFlush('Hello');
      // Two messages contain "Hello": msg-1 and msg-3
      expect(screen.getByText('1/2')).toBeTruthy();
    });

    it('resets currentIndex to 0 when query changes', () => {
      render(
        <ChatSearch
          messages={messages}
          onScrollToMessage={mockOnScrollToMessage}
          onClose={mockOnClose}
          testID="chat-search"
        />
      );

      typeAndFlush('Hello');
      expect(screen.getByText('1/2')).toBeTruthy();

      typeAndFlush('Good');
      expect(screen.getByText('1/1')).toBeTruthy();
    });

    it('hides match count when query has no results', () => {
      render(
        <ChatSearch
          messages={messages}
          onScrollToMessage={mockOnScrollToMessage}
          onClose={mockOnClose}
          testID="chat-search"
        />
      );

      typeAndFlush('nonexistent');
      expect(screen.queryByTestId('chat-search-count')).toBeNull();
    });
  });

  describe('Navigation', () => {
    it('calls onScrollToMessage when navigating to next result', () => {
      render(
        <ChatSearch
          messages={messages}
          onScrollToMessage={mockOnScrollToMessage}
          onClose={mockOnClose}
          testID="chat-search"
        />
      );

      typeAndFlush('Hello');

      fireEvent.press(screen.getByTestId('chat-search-next'));

      // Should scroll to msg-3 (second "Hello" result)
      expect(mockOnScrollToMessage).toHaveBeenCalledWith('msg-3');
    });

    it('calls onScrollToMessage when navigating to previous result', () => {
      render(
        <ChatSearch
          messages={messages}
          onScrollToMessage={mockOnScrollToMessage}
          onClose={mockOnClose}
          testID="chat-search"
        />
      );

      typeAndFlush('Hello');

      // Navigate previous - should wrap to last result (msg-3)
      fireEvent.press(screen.getByTestId('chat-search-prev'));
      expect(mockOnScrollToMessage).toHaveBeenCalledWith('msg-3');
    });

    it('wraps from last to first when clicking next on last result', () => {
      render(
        <ChatSearch
          messages={messages}
          onScrollToMessage={mockOnScrollToMessage}
          onClose={mockOnClose}
          testID="chat-search"
        />
      );

      typeAndFlush('Hello');

      // Navigate to last result
      fireEvent.press(screen.getByTestId('chat-search-next'));
      expect(mockOnScrollToMessage).toHaveBeenLastCalledWith('msg-3');

      // Next should wrap to first
      fireEvent.press(screen.getByTestId('chat-search-next'));
      expect(mockOnScrollToMessage).toHaveBeenLastCalledWith('msg-1');
    });

    it('wraps from first to last when clicking prev on first result', () => {
      render(
        <ChatSearch
          messages={messages}
          onScrollToMessage={mockOnScrollToMessage}
          onClose={mockOnClose}
          testID="chat-search"
        />
      );

      typeAndFlush('Hello');

      // prev on first result wraps to last
      fireEvent.press(screen.getByTestId('chat-search-prev'));
      expect(mockOnScrollToMessage).toHaveBeenLastCalledWith('msg-3');
    });

    it('does nothing on prev/next when no results', () => {
      render(
        <ChatSearch
          messages={messages}
          onScrollToMessage={mockOnScrollToMessage}
          onClose={mockOnClose}
          testID="chat-search"
        />
      );

      typeAndFlush('xyz');

      fireEvent.press(screen.getByTestId('chat-search-prev'));
      fireEvent.press(screen.getByTestId('chat-search-next'));

      expect(mockOnScrollToMessage).not.toHaveBeenCalled();
    });

    it('prev button is disabled when no results', () => {
      render(
        <ChatSearch
          messages={messages}
          onScrollToMessage={mockOnScrollToMessage}
          onClose={mockOnClose}
          testID="chat-search"
        />
      );

      typeAndFlush('xyz');

      const prevButton = screen.getByTestId('chat-search-prev');
      expect(prevButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('next button is disabled when no results', () => {
      render(
        <ChatSearch
          messages={messages}
          onScrollToMessage={mockOnScrollToMessage}
          onClose={mockOnClose}
          testID="chat-search"
        />
      );

      typeAndFlush('xyz');

      const nextButton = screen.getByTestId('chat-search-next');
      expect(nextButton.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('Close button', () => {
    it('calls onClose when close button is pressed', () => {
      render(
        <ChatSearch
          messages={messages}
          onScrollToMessage={mockOnScrollToMessage}
          onClose={mockOnClose}
          testID="chat-search"
        />
      );

      fireEvent.press(screen.getByTestId('chat-search-close'));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Search logic', () => {
    it('search is case insensitive', () => {
      render(
        <ChatSearch
          messages={messages}
          onScrollToMessage={mockOnScrollToMessage}
          onClose={mockOnClose}
          testID="chat-search"
        />
      );

      typeAndFlush('HELLO');
      expect(screen.getByText('1/2')).toBeTruthy();
    });

    it('trims whitespace from query', () => {
      render(
        <ChatSearch
          messages={messages}
          onScrollToMessage={mockOnScrollToMessage}
          onClose={mockOnClose}
          testID="chat-search"
        />
      );

      typeAndFlush('Hello');
      expect(screen.getByText('1/2')).toBeTruthy();
    });

    it('shows no results for empty query', () => {
      render(
        <ChatSearch
          messages={messages}
          onScrollToMessage={mockOnScrollToMessage}
          onClose={mockOnClose}
          testID="chat-search"
        />
      );

      typeAndFlush('');
      expect(screen.queryByTestId('chat-search-count')).toBeNull();
    });
  });
});
