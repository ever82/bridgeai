import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import { ChatInput } from '../ChatInput';

describe('ChatInput', () => {
  const mockOnSend = jest.fn();
  const mockOnAttachmentPress = jest.fn();

  beforeEach(() => {
    mockOnSend.mockClear();
    mockOnAttachmentPress.mockClear();
  });

  it('renders text input with placeholder', () => {
    render(<ChatInput onSend={mockOnSend} placeholder="Type a message..." />);
    expect(screen.getByPlaceholderText('Type a message...')).toBeTruthy();
  });

  it('renders text input with default placeholder', () => {
    render(<ChatInput onSend={mockOnSend} />);
    expect(screen.getByPlaceholderText('输入消息...')).toBeTruthy();
  });

  it('send button is disabled when input is empty', () => {
    render(<ChatInput onSend={mockOnSend} />);
    const sendButton = screen.getByTestId('send-button');
    expect(sendButton.props.accessibilityState.disabled).toBe(true);
  });

  it('send button calls onSend with trimmed text and clears input', () => {
    render(<ChatInput onSend={mockOnSend} />);
    const input = screen.getByPlaceholderText('输入消息...');
    fireEvent.changeText(input, '  Hello World  ');

    const sendButton = screen.getByTestId('send-button');
    fireEvent.press(sendButton);

    expect(mockOnSend).toHaveBeenCalledTimes(1);
    expect(mockOnSend).toHaveBeenCalledWith('Hello World');
    expect(screen.getByPlaceholderText('输入消息...').props.value).toBe('');
  });

  it('send button is disabled when disabled prop is true even with text', () => {
    render(<ChatInput onSend={mockOnSend} disabled />);
    const input = screen.getByPlaceholderText('输入消息...');
    fireEvent.changeText(input, 'some text');

    const sendButton = screen.getByTestId('send-button');
    expect(sendButton.props.accessibilityState.disabled).toBe(true);

    fireEvent.press(sendButton);
    expect(mockOnSend).not.toHaveBeenCalled();
  });

  it('emoji picker toggles on emoji button press', () => {
    render(<ChatInput onSend={mockOnSend} />);
    const emojiButton = screen.getByTestId('emoji-button');

    // Initially no emoji picker
    expect(screen.queryByTestId('flat-list-item-😊-0')).toBeNull();

    // Open emoji picker
    fireEvent.press(emojiButton);
    expect(screen.getByTestId('flat-list-item-😊-0')).toBeTruthy();

    // Close emoji picker
    fireEvent.press(emojiButton);
    expect(screen.queryByTestId('flat-list-item-😊-0')).toBeNull();
  });

  it('attachment button renders when onAttachmentPress is provided', () => {
    render(<ChatInput onSend={mockOnSend} onAttachmentPress={mockOnAttachmentPress} />);
    expect(screen.getByTestId('attachment-button')).toBeTruthy();
  });

  it('attachment button does NOT render when onAttachmentPress is not provided', () => {
    render(<ChatInput onSend={mockOnSend} />);
    expect(screen.queryByTestId('attachment-button')).toBeNull();
  });

  it('has maxLength=2000 on TextInput', () => {
    render(<ChatInput onSend={mockOnSend} />);
    const input = screen.getByPlaceholderText('输入消息...');
    expect(input.props.maxLength).toBe(2000);
  });

  it('TextInput is multiline', () => {
    render(<ChatInput onSend={mockOnSend} />);
    const input = screen.getByPlaceholderText('输入消息...');
    expect(input.props.multiline).toBe(true);
  });
});
