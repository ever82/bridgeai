import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { FlatList } from 'react-native';

import { ChatMessage } from '../../../types/chat';
import { MessageList } from '../MessageList';

jest.mock('../MessageBubble', () => {
  const R = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  return {
    MessageBubble: (props: Record<string, unknown>) =>
      R.createElement(
        RN.View,
        { testID: 'message-bubble', ...props },
        R.createElement(
          RN.Text,
          null,
          (props as { message?: { content?: string } }).message?.content
        )
      ),
  };
});

jest.mock('../SenderIndicator', () => {
  const R = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  return {
    SenderChangeIndicator: (props: Record<string, unknown>) =>
      R.createElement(RN.View, { testID: 'sender-change', ...props }),
  };
});

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: '1',
    chatRoomId: 'room1',
    senderId: 'user1',
    senderType: 'USER',
    content: 'hi',
    type: 'TEXT',
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('MessageList', () => {
  const currentUserId = 'user1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders FlatList with messages (check testID)', () => {
    const messages = [makeMessage({ id: '1', content: 'hello' })];
    render(<MessageList messages={messages} currentUserId={currentUserId} testID="message-list" />);

    expect(screen.getByTestId('message-list')).toBeTruthy();
  });

  it('messages are reversed (newest first in data)', () => {
    const messages = [
      makeMessage({ id: '1', content: 'first' }),
      makeMessage({ id: '2', content: 'second' }),
      makeMessage({ id: '3', content: 'third' }),
    ];
    render(<MessageList messages={messages} currentUserId={currentUserId} testID="message-list" />);

    const bubbles = screen.getAllByTestId('message-bubble');
    // Reversed order: third, second, first
    expect(bubbles[0].props.message.content).toBe('third');
    expect(bubbles[1].props.message.content).toBe('second');
    expect(bubbles[2].props.message.content).toBe('first');
  });

  it('onEndReached triggers onLoadMore when hasMore=true', () => {
    const onLoadMore = jest.fn();
    const messages = [makeMessage({ id: '1' })];
    render(
      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        hasMore={true}
        onLoadMore={onLoadMore}
        testID="message-list"
      />
    );

    const flatList = screen.getByTestId('message-list');
    fireEvent(flatList, 'onEndReached');

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('onEndReached does NOT trigger onLoadMore when hasMore=false', () => {
    const onLoadMore = jest.fn();
    const messages = [makeMessage({ id: '1' })];
    render(
      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        hasMore={false}
        onLoadMore={onLoadMore}
        testID="message-list"
      />
    );

    const flatList = screen.getByTestId('message-list');
    fireEvent(flatList, 'onEndReached');

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('shows loading indicator when isLoading=true and hasMore=true', () => {
    const messages = [makeMessage({ id: '1' })];
    render(
      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        isLoading={true}
        hasMore={true}
        testID="message-list"
      />
    );

    const flatList = screen.UNSAFE_getByType(FlatList);
    expect(flatList.props.ListFooterComponent).toBeDefined();
  });

  it('passes onMessagePress through to MessageBubble', () => {
    const onMessagePress = jest.fn();
    const messages = [makeMessage({ id: '1', content: 'hello' })];
    render(
      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        onMessagePress={onMessagePress}
        testID="message-list"
      />
    );

    const bubble = screen.getByTestId('message-bubble');
    expect(bubble.props.onPress).toBe(onMessagePress);
  });

  it('passes onImagePress through to MessageBubble', () => {
    const onImagePress = jest.fn();
    const messages = [makeMessage({ id: '1', content: 'hello' })];
    render(
      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        onImagePress={onImagePress}
        testID="message-list"
      />
    );

    const bubble = screen.getByTestId('message-bubble');
    expect(bubble.props.onImagePress).toBe(onImagePress);
  });

  it('shows SenderChangeIndicator when sender changes between consecutive messages', () => {
    const messages = [
      makeMessage({ id: '1', senderId: 'user1', senderType: 'USER' }),
      makeMessage({ id: '2', senderId: 'agent1', senderType: 'AGENT' }),
    ];
    render(<MessageList messages={messages} currentUserId={currentUserId} testID="message-list" />);

    expect(screen.getByTestId('sender-change')).toBeTruthy();
  });

  it('does not show SenderChangeIndicator for consecutive messages from same sender', () => {
    const messages = [
      makeMessage({ id: '1', senderId: 'user1', senderType: 'USER' }),
      makeMessage({ id: '2', senderId: 'user1', senderType: 'USER' }),
    ];
    render(<MessageList messages={messages} currentUserId={currentUserId} testID="message-list" />);

    expect(screen.queryByTestId('sender-change')).toBeNull();
  });

  it('applies custom style', () => {
    const customStyle = { backgroundColor: 'red' };
    const messages = [makeMessage({ id: '1' })];
    render(
      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        style={customStyle}
        testID="message-list"
      />
    );

    const flatList = screen.UNSAFE_getByType(FlatList);
    expect(flatList.props.contentContainerStyle).toEqual(
      expect.arrayContaining([expect.objectContaining(customStyle)])
    );
  });
});
