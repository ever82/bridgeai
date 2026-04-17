import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';

import { TypingIndicator } from './TypingIndicator';

describe('TypingIndicator', () => {
  jest.useFakeTimers();

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('renders correctly with default props', () => {
    render(<TypingIndicator testID="typing" />);
    expect(screen.getByTestId('typing')).toBeTruthy();
    expect(screen.getByTestId('typing-dot-1')).toBeTruthy();
    expect(screen.getByTestId('typing-dot-2')).toBeTruthy();
    expect(screen.getByTestId('typing-dot-3')).toBeTruthy();
  });

  it('renders typing text by default', () => {
    render(<TypingIndicator testID="typing" />);
    expect(screen.getByText('正在输入...')).toBeTruthy();
  });

  it('renders thinking text when type is thinking', () => {
    render(<TypingIndicator type="thinking" testID="typing" />);
    expect(screen.getByText('正在思考...')).toBeTruthy();
  });

  it('renders with user name for typing', () => {
    render(<TypingIndicator userName="小明" testID="typing" />);
    expect(screen.getByText('小明 正在输入...')).toBeTruthy();
  });

  it('renders with user name for thinking', () => {
    render(<TypingIndicator type="thinking" userName="AI助手" testID="typing" />);
    expect(screen.getByText('AI助手 正在思考...')).toBeTruthy();
  });

  it('returns null when not visible', () => {
    const { container } = render(<TypingIndicator visible={false} testID="typing" />);
    expect(container.children.length).toBe(0);
  });

  it('calls onTimeout after specified timeout', () => {
    const mockOnTimeout = jest.fn();
    render(
      <TypingIndicator
        timeout={5000}
        onTimeout={mockOnTimeout}
        testID="typing"
      />
    );

    jest.advanceTimersByTime(5000);
    expect(mockOnTimeout).toHaveBeenCalledTimes(1);
  });

  it('has correct accessibility label for typing', () => {
    render(<TypingIndicator testID="typing" />);
    expect(screen.getByLabelText('对方正在输入')).toBeTruthy();
  });

  it('has correct accessibility label for thinking', () => {
    render(<TypingIndicator type="thinking" testID="typing" />);
    expect(screen.getByLabelText('对方正在思考中')).toBeTruthy();
  });

  it('applies custom style prop', () => {
    const customStyle = { marginTop: 10 };
    render(<TypingIndicator style={customStyle} testID="typing" />);
    const typing = screen.getByTestId('typing');
    expect(typing.props.style).toMatchObject(customStyle);
  });

  it('clears timeout on unmount', () => {
    const mockOnTimeout = jest.fn();
    const { unmount } = render(
      <TypingIndicator
        timeout={5000}
        onTimeout={mockOnTimeout}
        testID="typing"
      />
    );

    unmount();
    jest.advanceTimersByTime(5000);
    expect(mockOnTimeout).not.toHaveBeenCalled();
  });
});
