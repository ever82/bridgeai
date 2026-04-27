import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Image, TouchableOpacity } from 'react-native';

import { MessageBubble } from '../MessageBubble';
import { ChatMessage, MessageAttachment } from '../../../types/chat';

type MockProps = Record<string, unknown> & { testID?: string };

// Mock child components that MessageBubble depends on.
// Note: jest.mock factories cannot reference out-of-scope variables, so React
// and View must be required lazily inside each factory.
/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock('../../UserAvatar/UserAvatar', () => {
  const ReactMock = require('react');
  const { View } = require('react-native');
  return {
    UserAvatar: ({ testID, ...props }: MockProps) =>
      ReactMock.createElement(View, { testID: testID || 'user-avatar', ...props }),
  };
});

jest.mock('../../IdentityBadge/IdentityBadge', () => {
  const ReactMock = require('react');
  const { View } = require('react-native');
  return {
    IdentityBadge: ({ testID, ...props }: MockProps) =>
      ReactMock.createElement(View, { testID: testID || 'identity-badge', ...props }),
  };
});

jest.mock('../MessageStatus', () => {
  const ReactMock = require('react');
  const { View } = require('react-native');
  return {
    MessageStatus: (props: MockProps) =>
      ReactMock.createElement(View, { testID: 'message-status', ...props }),
  };
});
/* eslint-enable @typescript-eslint/no-var-requires */

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'msg-1',
    chatRoomId: 'room-1',
    senderId: 'user-1',
    senderType: 'USER',
    content: 'Hello',
    type: 'TEXT',
    createdAt: '2024-01-01T12:00:00Z',
    ...overrides,
  };
}

function makeAttachment(overrides: Partial<MessageAttachment> = {}): MessageAttachment {
  return {
    id: 'att-1',
    type: 'image',
    url: 'https://example.com/image.png',
    name: 'image.png',
    size: 1024,
    ...overrides,
  };
}

describe('MessageBubble', () => {
  const currentUserId = 'user-1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with testID', () => {
      const message = makeMessage();
      render(
        <MessageBubble message={message} currentUserId={currentUserId} testID="message-bubble" />
      );
      expect(screen.getByTestId('message-bubble')).toBeTruthy();
    });

    it('renders TEXT message with content', () => {
      const message = makeMessage({ content: 'Hello world' });
      render(<MessageBubble message={message} currentUserId={currentUserId} />);
      expect(screen.getByText('Hello world')).toBeTruthy();
    });

    it('renders IMAGE message with attachment', () => {
      const message = makeMessage({
        type: 'IMAGE',
        content: '',
        attachments: [makeAttachment()],
      });
      const { UNSAFE_getAllByType } = render(
        <MessageBubble message={message} currentUserId={currentUserId} />
      );
      const images = UNSAFE_getAllByType(Image);
      expect(images).toHaveLength(1);
    });

    it('renders IMAGE message with content caption', () => {
      const message = makeMessage({
        type: 'IMAGE',
        content: 'Check this out',
        attachments: [makeAttachment()],
      });
      render(<MessageBubble message={message} currentUserId={currentUserId} />);
      expect(screen.getByText('Check this out')).toBeTruthy();
    });

    it('renders FILE message with attachment name', () => {
      const message = makeMessage({
        type: 'FILE',
        content: '',
        attachments: [makeAttachment({ name: 'document.pdf', size: 2048 })],
      });
      render(<MessageBubble message={message} currentUserId={currentUserId} />);
      expect(screen.getByText('document.pdf')).toBeTruthy();
      // File size displayed: 2048 / 1024 = 2.0 KB
      expect(screen.getByText('2.0 KB')).toBeTruthy();
    });

    it('renders VIDEO message with attachment name', () => {
      const message = makeMessage({
        type: 'VIDEO',
        content: '',
        attachments: [makeAttachment({ name: 'video.mp4', size: 5120 })],
      });
      render(<MessageBubble message={message} currentUserId={currentUserId} />);
      expect(screen.getByText('video.mp4')).toBeTruthy();
      // File size displayed: 5120 / 1024 = 5.0 KB
      expect(screen.getByText('5.0 KB')).toBeTruthy();
    });

    it('renders time in footer', () => {
      const createdAt = '2024-01-01T14:30:00Z';
      const message = makeMessage({ createdAt });
      render(<MessageBubble message={message} currentUserId={currentUserId} />);
      // The component uses toLocaleTimeString which is locale/timezone
      // dependent; mirror it so the test runs everywhere.
      const expected = new Date(createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      expect(screen.getByText(expected)).toBeTruthy();
    });
  });

  describe('Own message (right-aligned)', () => {
    it('applies own wrapper style when senderId matches currentUserId', () => {
      const message = makeMessage({ senderId: 'user-1' });
      const { getByTestId } = render(
        <MessageBubble message={message} currentUserId="user-1" testID="message-bubble" />
      );
      const wrapper = getByTestId('message-bubble');
      // Own wrapper uses alignItems: flex-end
      expect(wrapper.props.style).toContainEqual(
        expect.objectContaining({ alignItems: 'flex-end' })
      );
    });

    it('shows MessageStatus for own messages', () => {
      const message = makeMessage({ senderId: 'user-1' });
      render(
        <MessageBubble
          message={message}
          currentUserId="user-1"
          testID="message-bubble"
          status="sent"
        />
      );
      expect(screen.getByTestId('message-status')).toBeTruthy();
    });

    it('does NOT show sender indicator for own messages even when showSenderIndicator=true', () => {
      const message = makeMessage({ senderId: 'user-1' });
      render(
        <MessageBubble
          message={message}
          currentUserId="user-1"
          showSenderIndicator={true}
          testID="message-bubble"
        />
      );
      // Own messages do not render the sender identity row (left side)
      // The wrapper should only have alignItems: flex-end
      const wrapper = screen.getByTestId('message-bubble');
      const hasStartAlignment = wrapper.props.style?.some(
        (s: Record<string, unknown> | undefined) =>
          s !== undefined && s !== null && s.alignItems === 'flex-start'
      );
      expect(hasStartAlignment).toBeFalsy();
    });

    it('renders own identity badge in bubble footer', () => {
      const message = makeMessage({ senderId: 'user-1', senderType: 'USER' });
      render(<MessageBubble message={message} currentUserId="user-1" testID="message-bubble" />);
      // Identity badge for own message is inside the TouchableOpacity bubble
      const badge = screen.getByTestId('message-bubble-identity-badge');
      expect(badge).toBeTruthy();
    });
  });

  describe('Other user message (left-aligned)', () => {
    it('applies other wrapper style when senderId does not match currentUserId', () => {
      const message = makeMessage({ senderId: 'user-2' });
      const { getByTestId } = render(
        <MessageBubble message={message} currentUserId="user-1" testID="message-bubble" />
      );
      const wrapper = getByTestId('message-bubble');
      // Other wrapper uses alignItems: flex-start
      expect(wrapper.props.style).toContainEqual(
        expect.objectContaining({ alignItems: 'flex-start' })
      );
    });

    it('shows sender indicator when showSenderIndicator=true', () => {
      const message = makeMessage({ senderId: 'user-2' });
      render(
        <MessageBubble
          message={message}
          currentUserId="user-1"
          showSenderIndicator={true}
          testID="message-bubble"
        />
      );
      expect(screen.getByTestId('message-bubble-avatar')).toBeTruthy();
      expect(screen.getByTestId('message-bubble-identity-badge')).toBeTruthy();
    });

    it('does NOT show sender indicator when showSenderIndicator=false (default)', () => {
      const message = makeMessage({ senderId: 'user-2' });
      render(
        <MessageBubble
          message={message}
          currentUserId="user-1"
          showSenderIndicator={false}
          testID="message-bubble"
        />
      );
      // Avatar and identity badge are inside senderIdentityRow which is only rendered when !own && showSenderIndicator
      expect(screen.queryByTestId('message-bubble-avatar')).toBeNull();
      expect(screen.queryByTestId('message-bubble-identity-badge')).toBeNull();
    });

    it('hides own identity badge for other user messages', () => {
      const message = makeMessage({ senderId: 'user-2' });
      render(<MessageBubble message={message} currentUserId="user-1" testID="message-bubble" />);
      // For non-own messages, ownIdentityRow is not rendered
      expect(screen.queryByTestId('message-bubble-identity-badge')).toBeNull();
    });

    it('does NOT show MessageStatus for other user messages', () => {
      const message = makeMessage({ senderId: 'user-2' });
      render(<MessageBubble message={message} currentUserId="user-1" testID="message-bubble" />);
      expect(screen.queryByTestId('message-status')).toBeNull();
    });
  });

  describe('Consecutive messages', () => {
    it('applies consecutive wrapper style when isConsecutive=true', () => {
      const message = makeMessage();
      const { getByTestId } = render(
        <MessageBubble
          message={message}
          currentUserId={currentUserId}
          isConsecutive={true}
          testID="message-bubble"
        />
      );
      const wrapper = getByTestId('message-bubble');
      expect(wrapper.props.style).toContainEqual(expect.objectContaining({ marginTop: 0 }));
    });

    it('does not apply consecutive style when isConsecutive=false', () => {
      const message = makeMessage();
      const { getByTestId } = render(
        <MessageBubble
          message={message}
          currentUserId={currentUserId}
          isConsecutive={false}
          testID="message-bubble"
        />
      );
      const wrapper = getByTestId('message-bubble');
      const hasZeroMarginTop = wrapper.props.style?.some(
        (s: Record<string, unknown> | undefined) =>
          s !== undefined && s !== null && s.marginTop === 0
      );
      expect(hasZeroMarginTop).toBeFalsy();
    });
  });

  describe('Interactions', () => {
    it('calls onPress when bubble is pressed', () => {
      const onPress = jest.fn();
      const message = makeMessage();
      const { UNSAFE_getAllByType } = render(
        <MessageBubble message={message} currentUserId={currentUserId} onPress={onPress} />
      );
      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      fireEvent.press(touchables[0]);
      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onPress).toHaveBeenCalledWith(message);
    });

    it('calls onLongPress when bubble is long pressed', () => {
      const onLongPress = jest.fn();
      const message = makeMessage();
      const { UNSAFE_getAllByType } = render(
        <MessageBubble message={message} currentUserId={currentUserId} onLongPress={onLongPress} />
      );
      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      fireEvent(touchables[0], 'onLongPress');
      expect(onLongPress).toHaveBeenCalledTimes(1);
      expect(onLongPress).toHaveBeenCalledWith(message);
    });

    it('calls onImagePress when image attachment is pressed', () => {
      const onImagePress = jest.fn();
      const attachment = makeAttachment();
      const message = makeMessage({
        type: 'IMAGE',
        content: '',
        attachments: [attachment],
      });
      const { UNSAFE_getAllByType } = render(
        <MessageBubble
          message={message}
          currentUserId={currentUserId}
          onImagePress={onImagePress}
        />
      );
      const images = UNSAFE_getAllByType(Image);
      // Image is wrapped in TouchableOpacity
      const imageTouchable = images[0].parent;
      fireEvent.press(imageTouchable);
      expect(onImagePress).toHaveBeenCalledWith(attachment);
    });

    it('does not call onPress when onPress is not provided', () => {
      const message = makeMessage();
      const { UNSAFE_getAllByType } = render(
        <MessageBubble message={message} currentUserId={currentUserId} />
      );
      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      // Should not throw
      expect(() => fireEvent.press(touchables[0])).not.toThrow();
    });
  });

  describe('Agent messages', () => {
    it('renders agent message with AGENT senderType', () => {
      const message = makeMessage({ senderType: 'AGENT', senderId: 'agent-1' });
      render(
        <MessageBubble
          message={message}
          currentUserId={currentUserId}
          showSenderIndicator={true}
          testID="message-bubble"
        />
      );
      // Should render sender indicator with avatar
      expect(screen.getByTestId('message-bubble-avatar')).toBeTruthy();
    });
  });

  describe('Custom style', () => {
    it('applies custom style prop', () => {
      const message = makeMessage();
      const customStyle = { backgroundColor: 'red' };
      const { getByTestId } = render(
        <MessageBubble
          message={message}
          currentUserId={currentUserId}
          style={customStyle}
          testID="message-bubble"
        />
      );
      const wrapper = getByTestId('message-bubble');
      expect(wrapper.props.style).toContainEqual(customStyle);
    });
  });
});
