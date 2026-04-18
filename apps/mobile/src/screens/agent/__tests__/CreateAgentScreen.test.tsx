/**
 * CreateAgentScreen Tests
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Alert } from 'react-native';

import { CreateAgentScreen } from '../CreateAgentScreen';

// Mock navigation
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: mockGoBack,
  }),
}));

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

describe('CreateAgentScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders step 1 correctly', () => {
    render(
      <NavigationContainer>
        <CreateAgentScreen />
      </NavigationContainer>
    );

    expect(screen.getByText('Step 1: Basic Information')).toBeTruthy();
    expect(screen.getByText('Agent Name *')).toBeTruthy();
    expect(screen.getByPlaceholderText('Enter agent name')).toBeTruthy();
  });

  it('shows error when name is empty', () => {
    render(
      <NavigationContainer>
        <CreateAgentScreen />
      </NavigationContainer>
    );

    const nextButton = screen.getByText('Next');
    fireEvent.press(nextButton);

    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter an agent name');
  });

  it('proceeds to step 2 when name is valid', () => {
    render(
      <NavigationContainer>
        <CreateAgentScreen />
      </NavigationContainer>
    );

    const nameInput = screen.getByPlaceholderText('Enter agent name');
    fireEvent.changeText(nameInput, 'My Test Agent');

    const nextButton = screen.getByText('Next');
    fireEvent.press(nextButton);

    expect(screen.getByText('Step 2: Select Agent Type')).toBeTruthy();
  });

  it('displays all agent types in step 2', () => {
    render(
      <NavigationContainer>
        <CreateAgentScreen />
      </NavigationContainer>
    );

    // Go to step 2
    const nameInput = screen.getByPlaceholderText('Enter agent name');
    fireEvent.changeText(nameInput, 'My Test Agent');
    const nextButton = screen.getByText('Next');
    fireEvent.press(nextButton);

    // Check agent types are displayed
    expect(screen.getByText('Vision Share')).toBeTruthy();
    expect(screen.getByText('Agent Date')).toBeTruthy();
    expect(screen.getByText('Agent Job')).toBeTruthy();
    expect(screen.getByText('Agent Ad')).toBeTruthy();
  });

  it('allows selecting an agent type', () => {
    render(
      <NavigationContainer>
        <CreateAgentScreen />
      </NavigationContainer>
    );

    // Go to step 2
    const nameInput = screen.getByPlaceholderText('Enter agent name');
    fireEvent.changeText(nameInput, 'My Test Agent');
    fireEvent.press(screen.getByText('Next'));

    // Select an agent type
    const visionShareType = screen.getByText('Vision Share');
    fireEvent.press(visionShareType);

    // Check that it's selected (has checkmark)
    expect(screen.getByText('✓')).toBeTruthy();
  });

  it('can go back to previous step', () => {
    render(
      <NavigationContainer>
        <CreateAgentScreen />
      </NavigationContainer>
    );

    // Go to step 2
    const nameInput = screen.getByPlaceholderText('Enter agent name');
    fireEvent.changeText(nameInput, 'My Test Agent');
    fireEvent.press(screen.getByText('Next'));

    // Go back
    const backButton = screen.getByText('Back');
    fireEvent.press(backButton);

    // Should be back at step 1
    expect(screen.getByText('Step 1: Basic Information')).toBeTruthy();
  });

  it('can cancel from step 1', () => {
    render(
      <NavigationContainer>
        <CreateAgentScreen />
      </NavigationContainer>
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.press(cancelButton);

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('proceeds to scene config step after selecting type', () => {
    render(
      <NavigationContainer>
        <CreateAgentScreen />
      </NavigationContainer>
    );

    // Step 1: Enter name
    fireEvent.changeText(screen.getByPlaceholderText('Enter agent name'), 'My Test Agent');
    fireEvent.press(screen.getByText('Next'));

    // Step 2: Select type
    fireEvent.press(screen.getByText('Vision Share'));
    fireEvent.press(screen.getByText('Next'));

    // Step 3: Scene Config
    expect(screen.getByText('Step 3: Scene Configuration')).toBeTruthy();
  });

  it('proceeds to AI config step', () => {
    render(
      <NavigationContainer>
        <CreateAgentScreen />
      </NavigationContainer>
    );

    // Step 1: Enter name
    fireEvent.changeText(screen.getByPlaceholderText('Enter agent name'), 'My Test Agent');
    fireEvent.press(screen.getByText('Next'));

    // Step 2: Select type
    fireEvent.press(screen.getByText('Vision Share'));
    fireEvent.press(screen.getByText('Next'));

    // Step 3: Scene Config - select a range option first
    fireEvent.press(screen.getByText('同城'));
    fireEvent.press(screen.getByText('Next'));

    // Step 4: AI Config
    expect(screen.getByText('Step 4: AI Behavior Settings')).toBeTruthy();
  });
});
