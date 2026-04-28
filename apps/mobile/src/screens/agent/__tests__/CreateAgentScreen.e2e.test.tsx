/**
 * CreateAgentScreen E2E Tests
 * Tests complete user flows from start to finish
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Alert } from 'react-native';

import { CreateAgentScreen } from '../CreateAgentScreen';

// Mock the agentsApi for complete flow testing
const mockCreateAgent = jest.fn().mockResolvedValue({
  data: {
    data: {
      id: 'new-agent-id',
      userId: 'user-1',
      type: 'VISIONSHARE',
      name: 'My Test Agent',
      description: 'Test description',
      status: 'DRAFT',
      config: { scene: { range: '同城' }, ai: {} },
      latitude: null,
      longitude: null,
      isActive: false,
      isPublic: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
});

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('../../../services/api/agents', () => ({
  agentsApi: {
    createAgent: (...args: unknown[]) => mockCreateAgent(...args),
  },
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

// Mock Alert
const mockAlert = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

describe('CreateAgentScreen E2E Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockAlert.mockRestore();
  });

  describe('Complete Agent Creation Flow', () => {
    it('complete flow: step 1 -> step 2 -> step 3 -> step 4 -> step 5 -> submit', async () => {
      render(
        <NavigationContainer>
          <CreateAgentScreen />
        </NavigationContainer>
      );

      // Step 1: Basic Information
      expect(screen.getByText('Step 1: Basic Information')).toBeTruthy();
      expect(screen.getByText('Agent Name *')).toBeTruthy();

      // Fill in agent name
      const nameInput = screen.getByPlaceholderText('Enter agent name');
      fireEvent.changeText(nameInput, 'My Test Agent');

      // Add description
      const descInput = screen.getByPlaceholderText('Describe what this agent does...');
      fireEvent.changeText(descInput, 'Test description');

      // Toggle visibility to private
      const privateOption = screen.getByTestId('visibility-private');
      fireEvent.press(privateOption);

      // Navigate to step 2
      fireEvent.press(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText('Step 2: Select Agent Type')).toBeTruthy();
      });

      // Step 2: Select Agent Type
      expect(screen.getByText('Vision Share')).toBeTruthy();
      expect(screen.getByText('Agent Date')).toBeTruthy();
      expect(screen.getByText('Agent Job')).toBeTruthy();
      expect(screen.getByText('Agent Ad')).toBeTruthy();

      // Select VisionShare type
      fireEvent.press(screen.getByText('Vision Share'));

      // Navigate to step 3
      fireEvent.press(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText('Step 3: Scene Configuration')).toBeTruthy();
      });

      // Step 3: Scene Configuration (VisionShare config)
      expect(screen.getByText('VisionShare 配置')).toBeTruthy();
      expect(screen.getByText('需求范围')).toBeTruthy();

      // Select range option
      fireEvent.press(screen.getByText('同城'));

      // Navigate to step 4
      fireEvent.press(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText('Step 4: AI Behavior Settings')).toBeTruthy();
      });

      // Step 4: AI Behavior Settings
      expect(screen.getByText('LLM 模型')).toBeTruthy();
      expect(screen.getByText('创造性 (温度)')).toBeTruthy();
      expect(screen.getByText('回复风格')).toBeTruthy();

      // Navigate to step 5
      fireEvent.press(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText('Step 5: Preview & Test')).toBeTruthy();
      });

      // Step 5: Preview
      expect(screen.getByText('My Test Agent')).toBeTruthy();

      // Submit agent
      const submitButton = screen.getByTestId('create-agent-submit');
      fireEvent.press(submitButton);

      // Should call createAgent API
      await waitFor(() => {
        expect(mockCreateAgent).toHaveBeenCalledWith({
          type: 'VISIONSHARE',
          name: 'My Test Agent',
          description: 'Test description',
          avatar: undefined,
          config: {
            scene: { range: '同城' },
            ai: {},
          },
          isPublic: false,
        });
      });

      // Should show success alert
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalled();
      });
    });

    it('validates required fields at each step', async () => {
      render(
        <NavigationContainer>
          <CreateAgentScreen />
        </NavigationContainer>
      );

      // Try to proceed without entering name
      fireEvent.press(screen.getByText('Next'));

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Error', 'Please enter an agent name');
      });

      // Enter name but skip type selection
      fireEvent.changeText(screen.getByPlaceholderText('Enter agent name'), 'Test Agent');
      fireEvent.press(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText('Step 2: Select Agent Type')).toBeTruthy();
      });

      // Try to proceed without selecting type
      fireEvent.press(screen.getByText('Next'));

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Error', 'Please select an agent type');
      });
    });

    it('handles back navigation correctly', async () => {
      render(
        <NavigationContainer>
          <CreateAgentScreen />
        </NavigationContainer>
      );

      // Go forward to step 2
      fireEvent.changeText(screen.getByPlaceholderText('Enter agent name'), 'Test Agent');
      fireEvent.press(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText('Step 2: Select Agent Type')).toBeTruthy();
      });

      // Go back to step 1
      fireEvent.press(screen.getByText('Back'));

      await waitFor(() => {
        expect(screen.getByText('Step 1: Basic Information')).toBeTruthy();
      });

      // Name should still be there
      expect(screen.getByDisplayValue('Test Agent')).toBeTruthy();
    });

    it('cancels creation from step 1', async () => {
      render(
        <NavigationContainer>
          <CreateAgentScreen />
        </NavigationContainer>
      );

      fireEvent.press(screen.getByText('Cancel'));

      expect(mockGoBack).toHaveBeenCalled();
    });

    it('handles API error during submission', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockCreateAgent.mockRejectedValueOnce(new Error('Server error'));

      render(
        <NavigationContainer>
          <CreateAgentScreen />
        </NavigationContainer>
      );

      // Navigate to submission
      fireEvent.changeText(screen.getByPlaceholderText('Enter agent name'), 'Test Agent');
      fireEvent.press(screen.getByText('Next'));

      await waitFor(() => {
        fireEvent.press(screen.getByText('Vision Share'));
      });

      fireEvent.press(screen.getByText('Next'));
      await waitFor(() => {
        fireEvent.press(screen.getByText('同城'));
      });

      fireEvent.press(screen.getByText('Next'));
      await waitFor(() => {
        fireEvent.press(screen.getByText('Next'));
      });

      await waitFor(() => {
        fireEvent.press(screen.getByTestId('create-agent-submit'));
      });

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Error', 'Server error');
      });

      consoleSpy.mockRestore();
    });

    it('supports all four agent types', async () => {
      const agentTypes = [
        { name: 'Vision Share', type: 'VISIONSHARE' },
        { name: 'Agent Date', type: 'AGENTDATE' },
        { name: 'Agent Job', type: 'AGENTJOB' },
        { name: 'Agent Ad', type: 'AGENTAD' },
      ];

      for (const agentType of agentTypes) {
        jest.clearAllMocks();

        render(
          <NavigationContainer>
            <CreateAgentScreen />
          </NavigationContainer>
        );

        // Navigate to type selection
        fireEvent.changeText(
          screen.getByPlaceholderText('Enter agent name'),
          `Test ${agentType.name}`
        );
        fireEvent.press(screen.getByText('Next'));

        await waitFor(() => {
          expect(screen.getByText('Step 2: Select Agent Type')).toBeTruthy();
        });

        // Select type
        fireEvent.press(screen.getByText(agentType.name));

        // Verify selection
        await waitFor(() => {
          const checkmarks = screen.queryAllByText('✓');
          expect(checkmarks.length).toBeGreaterThan(0);
        });
      }
    });

    it('shows progress indicator updating correctly', async () => {
      render(
        <NavigationContainer>
          <CreateAgentScreen />
        </NavigationContainer>
      );

      const progressBar = screen.getByTestId('create-agent-step-indicator');
      expect(progressBar).toBeTruthy();

      // Step 1 -> 2
      fireEvent.changeText(screen.getByPlaceholderText('Enter agent name'), 'Test');
      fireEvent.press(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText('Step 2: Select Agent Type')).toBeTruthy();
      });

      // Step 2 -> 3
      fireEvent.press(screen.getByText('Vision Share'));
      fireEvent.press(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText('Step 3: Scene Configuration')).toBeTruthy();
      });
    });
  });

  describe('AI Configuration Flow', () => {
    it('configures AI model selection', async () => {
      render(
        <NavigationContainer>
          <CreateAgentScreen />
        </NavigationContainer>
      );

      // Navigate to AI config step
      fireEvent.changeText(screen.getByPlaceholderText('Enter agent name'), 'AI Test');
      fireEvent.press(screen.getByText('Next'));
      await waitFor(() => fireEvent.press(screen.getByText('Vision Share')));
      fireEvent.press(screen.getByText('Next'));
      await waitFor(() => fireEvent.press(screen.getByText('同城')));
      fireEvent.press(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText('Step 4: AI Behavior Settings')).toBeTruthy();
      });

      // Select GPT-4 model
      fireEvent.press(screen.getByText('GPT-4'));

      // Toggle auto-reply
      const autoReplySwitch = screen.getByRole('switch');
      fireEvent(autoReplySwitch, 'valueChange', false);

      // Verify we can proceed
      fireEvent.press(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText('Step 5: Preview & Test')).toBeTruthy();
      });
    });

    it('expands and collapses advanced settings', async () => {
      render(
        <NavigationContainer>
          <CreateAgentScreen />
        </NavigationContainer>
      );

      // Navigate to AI config step
      fireEvent.changeText(screen.getByPlaceholderText('Enter agent name'), 'Advanced Test');
      fireEvent.press(screen.getByText('Next'));
      await waitFor(() => fireEvent.press(screen.getByText('Vision Share')));
      fireEvent.press(screen.getByText('Next'));
      await waitFor(() => fireEvent.press(screen.getByText('同城')));
      fireEvent.press(screen.getByText('Next'));

      await waitFor(() => {
        expect(screen.getByText('Step 4: AI Behavior Settings')).toBeTruthy();
      });

      // Advanced settings should be hidden initially
      expect(screen.queryByText('最大回复长度')).toBeNull();

      // Expand advanced settings
      fireEvent.press(screen.getByText('显示高级设置'));

      await waitFor(() => {
        expect(screen.getByText('最大回复长度')).toBeTruthy();
        expect(screen.getByText('系统提示词')).toBeTruthy();
      });
    });
  });

  describe('Preview & Submit Flow', () => {
    it('displays agent preview with all configurations', async () => {
      render(
        <NavigationContainer>
          <CreateAgentScreen />
        </NavigationContainer>
      );

      // Complete setup
      fireEvent.changeText(screen.getByPlaceholderText('Enter agent name'), 'Preview Test Agent');
      fireEvent.press(screen.getByText('Next'));
      await waitFor(() => fireEvent.press(screen.getByText('Vision Share')));
      fireEvent.press(screen.getByText('Next'));
      await waitFor(() => fireEvent.press(screen.getByText('同城')));
      fireEvent.press(screen.getByText('Next'));
      await waitFor(() => fireEvent.press(screen.getByText('Next')));

      await waitFor(() => {
        expect(screen.getByText('Step 5: Preview & Test')).toBeTruthy();
        expect(screen.getByText('Preview Test Agent')).toBeTruthy();
      });
    });

    it('allows editing from preview', async () => {
      render(
        <NavigationContainer>
          <CreateAgentScreen />
        </NavigationContainer>
      );

      // Navigate to preview
      fireEvent.changeText(screen.getByPlaceholderText('Enter agent name'), 'Edit Test');
      fireEvent.press(screen.getByText('Next'));
      await waitFor(() => fireEvent.press(screen.getByText('Vision Share')));
      fireEvent.press(screen.getByText('Next'));
      await waitFor(() => fireEvent.press(screen.getByText('同城')));
      fireEvent.press(screen.getByText('Next'));
      await waitFor(() => fireEvent.press(screen.getByText('Next')));

      await waitFor(() => {
        expect(screen.getByText('Step 5: Preview & Test')).toBeTruthy();
      });

      // Go back to step 4
      fireEvent.press(screen.getByText('Back'));

      await waitFor(() => {
        expect(screen.getByText('Step 4: AI Behavior Settings')).toBeTruthy();
      });
    });
  });

  describe('Character Limits', () => {
    it('enforces name character limit', async () => {
      render(
        <NavigationContainer>
          <CreateAgentScreen />
        </NavigationContainer>
      );

      // Enter a very long name
      const longName = 'A'.repeat(101);
      fireEvent.changeText(screen.getByPlaceholderText('Enter agent name'), longName);

      // Should show character count
      expect(screen.getByText('101/100')).toBeTruthy();

      // Try to proceed
      fireEvent.press(screen.getByText('Next'));

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Error',
          'Agent name must be less than 100 characters'
        );
      });
    });
  });
});
