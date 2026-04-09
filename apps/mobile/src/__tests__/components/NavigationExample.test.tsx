import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { render, fireEvent } from '../utils/test-utils';
import { useNavigation, useRoute } from '@react-navigation/native';
import { DetailScreen } from '../../screens/DetailScreen';

// Mock the navigation hooks
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));

describe('DetailScreen (Navigation Component Example)', () => {
  const mockNavigate = jest.fn();
  const mockGoBack = jest.fn();
  const mockSetOptions = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useNavigation as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: mockSetOptions,
    });
  });

  it('renders with default params', () => {
    (useRoute as jest.Mock).mockReturnValue({
      params: {},
    });

    const { getByTestId } = render(<DetailScreen />);

    expect(getByTestId('detail-screen')).toBeTruthy();
    expect(getByTestId('item-id').props.children).toBe('No ID');
  });

  it('renders with route params', () => {
    (useRoute as jest.Mock).mockReturnValue({
      params: {
        itemId: '123',
        title: 'Test Item',
      },
    });

    const { getByTestId } = render(<DetailScreen />);

    expect(getByTestId('item-id').props.children).toBe('123');
    expect(mockSetOptions).toHaveBeenCalledWith({ title: 'Test Item' });
  });

  it('navigates to edit screen', () => {
    (useRoute as jest.Mock).mockReturnValue({
      params: {
        itemId: '123',
      },
    });

    const { getByTestId } = render(<DetailScreen />);

    fireEvent.press(getByTestId('navigate-button'));

    expect(mockNavigate).toHaveBeenCalledWith('EditScreen', { itemId: '123' });
  });

  it('goes back when back button pressed', () => {
    (useRoute as jest.Mock).mockReturnValue({
      params: {},
    });

    const { getByTestId } = render(<DetailScreen />);

    fireEvent.press(getByTestId('go-back-button'));

    expect(mockGoBack).toHaveBeenCalled();
  });
});
