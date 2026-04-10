import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { EditProfileScreen } from '../EditProfileScreen';
import { useAuthStore } from '../../stores/authStore';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../services/api';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../stores/authStore', () => ({
  useAuthStore: jest.fn(),
}));

jest.mock('../../services/api', () => ({
  api: {
    put: jest.fn(),
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0 }),
}));

jest.mock('../../theme', () => ({
  theme: {
    colors: {
      background: '#fff',
      text: '#000',
      textSecondary: '#666',
      textTertiary: '#999',
      primary: '#007AFF',
      border: '#E5E5E5',
      backgroundSecondary: '#F5F5F5',
    },
    spacing: {
      xs: 4,
      sm: 8,
      base: 16,
      lg: 24,
      xl: 32,
      '2xl': 48,
    },
    fonts: {
      sizes: {
        xs: 10,
        sm: 12,
        base: 14,
        md: 16,
        lg: 18,
        xl: 20,
        '2xl': 24,
        '3xl': 30,
      },
      weights: {
        regular: '400',
        semibold: '600',
        bold: '700',
      },
    },
    borderRadius: {
      md: 8,
    },
  },
}));

describe('EditProfileScreen', () => {
  const mockNavigate = jest.fn();
  const mockSetUser = jest.fn();
  const mockGoBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({
      goBack: mockGoBack,
    });
  });

  it('renders correctly with user data', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      displayName: 'Test User',
      name: 'Test Name',
      bio: 'Test bio',
      website: 'https://example.com',
      location: 'Test City',
    };

    (useAuthStore as jest.Mock).mockReturnValue({
      user: mockUser,
      setUser: mockSetUser,
    });

    const { getByText, getByPlaceholderText } = render(<EditProfileScreen />);

    expect(getByText('编辑资料')).toBeTruthy();
    expect(getByPlaceholderText('输入显示名称')).toBeTruthy();
    expect(getByText('更换头像')).toBeTruthy();
  });

  it('updates form fields when user types', () => {
    const mockUser = {
      id: 'user-1',
      displayName: 'Test User',
      name: '',
      bio: '',
      website: '',
      location: '',
    };

    (useAuthStore as jest.Mock).mockReturnValue({
      user: mockUser,
      setUser: mockSetUser,
    });

    const { getByPlaceholderText } = render(<EditProfileScreen />);

    const displayNameInput = getByPlaceholderText('输入显示名称');
    fireEvent.changeText(displayNameInput, 'New Display Name');

    expect(displayNameInput.props.value).toBe('New Display Name');
  });

  it('saves profile when save button is pressed', async () => {
    const mockUser = {
      id: 'user-1',
      displayName: 'Test User',
      name: 'Test Name',
      bio: 'Test bio',
      website: 'https://example.com',
      location: 'Test City',
    };

    (useAuthStore as jest.Mock).mockReturnValue({
      user: mockUser,
      setUser: mockSetUser,
    });

    (api.put as jest.Mock).mockResolvedValue({
      data: { data: mockUser },
    });

    const { getByText } = render(<EditProfileScreen />);

    const saveButton = getByText('保存');
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/api/v1/users/me', {
        displayName: 'Test User',
        name: 'Test Name',
        bio: 'Test bio',
        website: 'https://example.com',
        location: 'Test City',
      });
    });
  });

  it('shows error when display name is empty', () => {
    const mockUser = {
      id: 'user-1',
      displayName: '',
      name: '',
      bio: '',
      website: '',
      location: '',
    };

    (useAuthStore as jest.Mock).mockReturnValue({
      user: mockUser,
      setUser: mockSetUser,
    });

    const { getByText } = render(<EditProfileScreen />);

    const saveButton = getByText('保存');
    fireEvent.press(saveButton);

    // Should show alert for empty display name
    expect(api.put).not.toHaveBeenCalled();
  });

  it('navigates back when cancel button is pressed', () => {
    const mockUser = {
      id: 'user-1',
      displayName: 'Test User',
      name: '',
      bio: '',
      website: '',
      location: '',
    };

    (useAuthStore as jest.Mock).mockReturnValue({
      user: mockUser,
      setUser: mockSetUser,
    });

    const { getByText } = render(<EditProfileScreen />);

    const cancelButton = getByText('取消');
    fireEvent.press(cancelButton);

    expect(mockGoBack).toHaveBeenCalled();
  });
});
