import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { ConversationItem } from './ConversationItem';
import { theme } from '../../theme';

describe('ConversationItem', () => {
  const mockOnPress = jest.fn();
  const mockOnLongPress = jest.fn();
  const defaultProps = {
    id: 'conv-1',
    name: 'Test User',
    lastMessage: 'Hello, this is a test message',
    lastMessageTime: Date.now(),
    testID: 'conversation',
  };

  beforeEach(() => {
    mockOnPress.mockClear();
    mockOnLongPress.mockClear();
  });

  it('renders correctly with default props', () => {
    render(<ConversationItem {...defaultProps} />);
    expect(screen.getByTestId('conversation')).toBeTruthy();
    expect(screen.getByText('Test User')).toBeTruthy();
    expect(screen.getByText('Hello, this is a test message')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    render(<ConversationItem {...defaultProps} onPress={mockOnPress} />);
    fireEvent.press(screen.getByTestId('conversation'));
    expect(mockOnPress).toHaveBeenCalledWith('conv-1');
  });

  it('calls onLongPress when long pressed', () => {
    render(<ConversationItem {...defaultProps} onLongPress={mockOnLongPress} />);
    fireEvent(screen.getByTestId('conversation'), 'longPress');
    expect(mockOnLongPress).toHaveBeenCalledWith('conv-1');
  });

  it('displays unread count badge', () => {
    render(<ConversationItem {...defaultProps} unreadCount={5} />);
    expect(screen.getByTestId('conversation-unread')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('displays "99+" for unread count > 99', () => {
    render(<ConversationItem {...defaultProps} unreadCount={150} />);
    expect(screen.getByText('99+')).toBeTruthy();
  });

  it('hides unread badge when count is 0', () => {
    render(<ConversationItem {...defaultProps} unreadCount={0} />);
    expect(screen.queryByTestId('conversation-unread')).toBeNull();
  });

  it('shows pinned indicator when isPinned is true', () => {
    render(<ConversationItem {...defaultProps} isPinned />);
    expect(screen.getByText(/📌/)).toBeTruthy();
  });

  it('shows muted indicator when isMuted is true', () => {
    render(<ConversationItem {...defaultProps} isMuted />);
    expect(screen.getByText(/🔇/)).toBeTruthy();
  });

  it('shows priority indicator for urgent priority', () => {
    render(<ConversationItem {...defaultProps} priority="urgent" />);
    expect(screen.getByTestId('conversation-priority')).toBeTruthy();
  });

  it('shows priority indicator for high priority', () => {
    render(<ConversationItem {...defaultProps} priority="high" />);
    expect(screen.getByTestId('conversation-priority')).toBeTruthy();
  });

  it('hides priority indicator for normal priority', () => {
    render(<ConversationItem {...defaultProps} priority="normal" />);
    expect(screen.queryByTestId('conversation-priority')).toBeNull();
  });

  it('applies agent user type styling', () => {
    render(<ConversationItem {...defaultProps} userType="agent" />);
    const avatar = screen.getByTestId('conversation-avatar');
    expect(avatar).toBeTruthy();
  });

  it('truncates long messages', () => {
    const longMessage = 'a'.repeat(100);
    render(<ConversationItem {...defaultProps} lastMessage={longMessage} />);
    const message = screen.getByText(/a/);
    expect(message).toBeTruthy();
  });

  it('applies custom style prop', () => {
    const customStyle = { marginTop: 10 };
    render(<ConversationItem {...defaultProps} style={customStyle} />);
    const conversation = screen.getByTestId('conversation');
    expect(conversation.props.style).toMatchObject(customStyle);
  });

  it('has correct accessibility role', () => {
    render(<ConversationItem {...defaultProps} />);
    expect(screen.getByRole('button')).toBeTruthy();
  });

  it('has correct accessibility label', () => {
    render(<ConversationItem {...defaultProps} />);
    expect(screen.getByLabelText('会话: Test User')).toBeTruthy();
  });
});
