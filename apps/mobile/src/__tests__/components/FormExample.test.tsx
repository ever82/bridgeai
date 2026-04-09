import React from 'react';
import { render, fireEvent } from '../utils/test-utils';
import { LoginForm } from '../../components/LoginForm';

describe('LoginForm (Form Component Example)', () => {
  const mockSubmit = jest.fn();

  beforeEach(() => {
    mockSubmit.mockClear();
  });

  it('renders form fields', () => {
    const { getByTestId } = render(<LoginForm onSubmit={mockSubmit} />);

    expect(getByTestId('email-input')).toBeTruthy();
    expect(getByTestId('password-input')).toBeTruthy();
    expect(getByTestId('submit-button')).toBeTruthy();
  });

  it('updates input values on change', () => {
    const { getByTestId } = render(<LoginForm onSubmit={mockSubmit} />);

    const emailInput = getByTestId('email-input');
    const passwordInput = getByTestId('password-input');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');

    expect(emailInput.props.value).toBe('test@example.com');
    expect(passwordInput.props.value).toBe('password123');
  });

  it('shows validation errors for empty fields', () => {
    const { getByTestId, queryByTestId } = render(<LoginForm onSubmit={mockSubmit} />);

    fireEvent.press(getByTestId('submit-button'));

    expect(queryByTestId('email-error')).toBeTruthy();
    expect(queryByTestId('password-error')).toBeTruthy();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('shows error for invalid email format', () => {
    const { getByTestId, queryByTestId } = render(<LoginForm onSubmit={mockSubmit} />);

    fireEvent.changeText(getByTestId('email-input'), 'invalid-email');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    fireEvent.press(getByTestId('submit-button'));

    expect(queryByTestId('email-error')).toBeTruthy();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('shows error for short password', () => {
    const { getByTestId, queryByTestId } = render(<LoginForm onSubmit={mockSubmit} />);

    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('password-input'), '123');
    fireEvent.press(getByTestId('submit-button'));

    expect(queryByTestId('password-error')).toBeTruthy();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('submits form with valid data', () => {
    const { getByTestId, queryByTestId } = render(<LoginForm onSubmit={mockSubmit} />);

    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    fireEvent.press(getByTestId('submit-button'));

    expect(queryByTestId('email-error')).toBeNull();
    expect(queryByTestId('password-error')).toBeNull();
    expect(mockSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('disables inputs when loading', () => {
    const { getByTestId } = render(<LoginForm onSubmit={mockSubmit} loading />);

    expect(getByTestId('email-input').props.editable).toBe(false);
    expect(getByTestId('password-input').props.editable).toBe(false);
    expect(getByTestId('submit-button').props.accessibilityState?.disabled).toBe(true);
  });
});
