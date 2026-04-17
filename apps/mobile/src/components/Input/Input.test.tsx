import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';

import { Input } from './Input';

describe('Input', () => {
  const mockOnChangeText = jest.fn();

  beforeEach(() => {
    mockOnChangeText.mockClear();
  });

  it('renders correctly with default props', () => {
    render(<Input value="" onChangeText={mockOnChangeText} />);
    expect(screen.getByDisplayValue('')).toBeTruthy();
  });

  it('displays label when provided', () => {
    render(<Input value="" onChangeText={mockOnChangeText} label="Email" />);
    expect(screen.getByText('Email')).toBeTruthy();
  });

  it('displays placeholder when provided', () => {
    render(
      <Input
        value=""
        onChangeText={mockOnChangeText}
        placeholder="Enter email"
      />
    );
    expect(screen.getByPlaceholderText('Enter email')).toBeTruthy();
  });

  it('calls onChangeText when text changes', () => {
    render(<Input value="" onChangeText={mockOnChangeText} />);
    const input = screen.getByDisplayValue('');
    fireEvent.changeText(input, 'test@example.com');
    expect(mockOnChangeText).toHaveBeenCalledWith('test@example.com');
  });

  it('displays error message when in error state', () => {
    render(
      <Input
        value=""
        onChangeText={mockOnChangeText}
        state="error"
        errorMessage="Invalid email"
      />
    );
    expect(screen.getByText('Invalid email')).toBeTruthy();
  });

  it('displays helper text when provided', () => {
    render(
      <Input
        value=""
        onChangeText={mockOnChangeText}
        helperText="We will never share your email"
      />
    );
    expect(screen.getByText('We will never share your email')).toBeTruthy();
  });

  it('displays character count when enabled', () => {
    render(
      <Input
        value="Hello"
        onChangeText={mockOnChangeText}
        maxLength={100}
        showCharacterCount
      />
    );
    expect(screen.getByText('5/100')).toBeTruthy();
  });

  it('renders with prefix', () => {
    render(
      <Input
        value=""
        onChangeText={mockOnChangeText}
        prefix={<span testID="prefix">@</span>}
      />
    );
    expect(screen.getByTestId('prefix')).toBeTruthy();
  });

  it('renders with suffix', () => {
    render(
      <Input
        value=""
        onChangeText={mockOnChangeText}
        suffix={<span testID="suffix">.com</span>}
      />
    );
    expect(screen.getByTestId('suffix')).toBeTruthy();
  });

  it('clears text when clear button is pressed', () => {
    render(
      <Input
        value="test"
        onChangeText={mockOnChangeText}
        clearable
      />
    );
    const clearButton = screen.getByText('×');
    fireEvent.press(clearButton);
    expect(mockOnChangeText).toHaveBeenCalledWith('');
  });

  it('does not show clear button when value is empty', () => {
    render(
      <Input
        value=""
        onChangeText={mockOnChangeText}
        clearable
      />
    );
    expect(screen.queryByText('×')).toBeNull();
  });

  it('renders password input correctly', () => {
    render(
      <Input
        value="secret"
        onChangeText={mockOnChangeText}
        type="password"
      />
    );
    expect(screen.getByDisplayValue('secret')).toBeTruthy();
  });

  it('renders email input correctly', () => {
    render(
      <Input
        value="test@example.com"
        onChangeText={mockOnChangeText}
        type="email"
      />
    );
    expect(screen.getByDisplayValue('test@example.com')).toBeTruthy();
  });

  it('renders number input correctly', () => {
    render(
      <Input
        value="123"
        onChangeText={mockOnChangeText}
        type="number"
      />
    );
    expect(screen.getByDisplayValue('123')).toBeTruthy();
  });

  it('renders phone input correctly', () => {
    render(
      <Input
        value="13800138000"
        onChangeText={mockOnChangeText}
        type="phone"
      />
    );
    expect(screen.getByDisplayValue('13800138000')).toBeTruthy();
  });

  it('is disabled when state is disabled', () => {
    render(
      <Input
        value=""
        onChangeText={mockOnChangeText}
        state="disabled"
      />
    );
    const input = screen.getByDisplayValue('');
    expect(input.props.editable).toBe(false);
  });

  it('is readonly when state is readonly', () => {
    render(
      <Input
        value="readonly value"
        onChangeText={mockOnChangeText}
        state="readonly"
      />
    );
    const input = screen.getByDisplayValue('readonly value');
    expect(input.props.editable).toBe(false);
  });
});
