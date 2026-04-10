/**
 * AgentListScreen Tests
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { AgentListScreen } from '../AgentListScreen';
import { NavigationContainer } from '@react-navigation/native';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: jest.fn(),
  }),
}));

describe('AgentListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    render(
      <NavigationContainer>
        <AgentListScreen />
      </NavigationContainer>
    );

    expect(screen.getByText('My Agents')).toBeTruthy();
  });

  it('displays empty state when no agents', async () => {
    render(
      <NavigationContainer>
        <AgentListScreen />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(screen.getByText('No Agents Yet')).toBeTruthy();
      expect(screen.getByText('Create your first agent to get started with AI-powered matching')).toBeTruthy();
    });
  });

  it('navigates to CreateAgent screen when create button is pressed', async () => {
    render(
      <NavigationContainer>
        <AgentListScreen />
      </NavigationContainer>
    );

    const createButton = await screen.findByText('Create Agent');
    fireEvent.press(createButton);

    expect(mockNavigate).toHaveBeenCalledWith('CreateAgent');
  });
});
