import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { render, fireEvent } from '../utils/test-utils';

// Example Form Component for testing
interface FormData {
  email: string;
  password: string;
}

interface LoginFormProps {
  onSubmit: (data: FormData) => void;
  loading?: boolean;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, loading = false }) => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [errors, setErrors] = React.useState<Partial<FormData>>({});

  const validate = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSubmit({ email, password });
    }
  };

  return (
    <View testID="login-form">
      <View>
        <TextInput
          testID="email-input"
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!loading}
        />
        {errors.email && <Text testID="email-error">{errors.email}</Text>}
      </View>

      <View>
        <TextInput
          testID="password-input"
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />
        {errors.password && <Text testID="password-error">{errors.password}</Text>}
      </View>

      <TouchableOpacity
        testID="submit-button"
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text>{loading ? 'Loading...' : 'Login'}</Text>
      </TouchableOpacity>
    </View>
  );
};

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
