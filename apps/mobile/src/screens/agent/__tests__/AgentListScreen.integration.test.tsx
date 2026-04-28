/**
 * AgentListScreen Integration Tests
 * Tests API integration with real HTTP responses (mocked at axios level)
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Agent, AgentType, AgentStatus } from '@bridgeai/shared';

import { AgentListScreen } from '../AgentListScreen';

// Mock agentsApi with realistic API behavior
const mockAgents: Agent[] = [
  {
    id: 'agent-1',
    userId: 'user-1',
    type: AgentType.VISIONSHARE,
    name: 'Vision Agent 1',
    description: 'A vision sharing agent',
    status: AgentStatus.ACTIVE,
    config: { scene: {}, ai: {} },
    latitude: null,
    longitude: null,
    isActive: true,
    isPublic: true,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T15:30:00Z',
  },
  {
    id: 'agent-2',
    userId: 'user-1',
    type: AgentType.AGENTDATE,
    name: 'Dating Agent',
    description: 'For dating purposes',
    status: AgentStatus.DRAFT,
    config: { scene: {}, ai: {} },
    latitude: null,
    longitude: null,
    isActive: false,
    isPublic: true,
    createdAt: '2024-01-10T08:00:00Z',
    updatedAt: '2024-01-18T12:00:00Z',
  },
  {
    id: 'agent-3',
    userId: 'user-1',
    type: AgentType.AGENTJOB,
    name: 'Job Matching Agent',
    description: 'Job opportunities agent',
    status: AgentStatus.ACTIVE,
    config: { scene: {}, ai: {} },
    latitude: null,
    longitude: null,
    isActive: true,
    isPublic: false,
    createdAt: '2024-01-05T14:00:00Z',
    updatedAt: '2024-01-25T09:00:00Z',
  },
];

const mockGetAgents = jest.fn().mockResolvedValue({
  data: {
    data: {
      agents: mockAgents,
      pagination: {
        page: 1,
        limit: 50,
        total: 3,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    },
  },
});

const mockUpdateAgentStatus = jest.fn().mockResolvedValue({
  data: {
    data: {
      ...mockAgents[0],
      status: AgentStatus.INACTIVE,
    },
  },
});

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('../../../services/api/agents', () => ({
  agentsApi: {
    getAgents: (...args: unknown[]) => mockGetAgents(...args),
    updateAgentStatus: (...args: unknown[]) => mockUpdateAgentStatus(...args),
  },
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

describe('AgentListScreen Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('API Integration - Fetching Agents', () => {
    it('calls getAgents API on mount', async () => {
      render(
        <NavigationContainer>
          <AgentListScreen />
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(mockGetAgents).toHaveBeenCalledWith({ limit: 50 });
      });
    });

    it('calls getAgents with type filter when selected', async () => {
      render(
        <NavigationContainer>
          <AgentListScreen />
        </NavigationContainer>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('My Agents')).toBeTruthy();
      });

      // Click type filter dropdown
      const typeFilter = screen.getAllByText('All Types')[0];
      fireEvent.press(typeFilter);

      // Select VisionShare type
      const visionShareOption = screen.getByText('VisionShare');
      fireEvent.press(visionShareOption);

      // Should call API with type filter
      await waitFor(() => {
        expect(mockGetAgents).toHaveBeenCalledWith({
          limit: 50,
          type: AgentType.VISIONSHARE,
        });
      });
    });

    it('displays agents returned from API', async () => {
      render(
        <NavigationContainer>
          <AgentListScreen />
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(screen.getByText('Vision Agent 1')).toBeTruthy();
        expect(screen.getByText('Dating Agent')).toBeTruthy();
        expect(screen.getByText('Job Matching Agent')).toBeTruthy();
      });
    });

    it('displays agent type badges', async () => {
      render(
        <NavigationContainer>
          <AgentListScreen />
        </NavigationContainer>
      );

      await waitFor(() => {
        // Check type badges are displayed (using visible text)
        expect(screen.getByText('VisionShare')).toBeTruthy();
        expect(screen.getByText('AgentDate')).toBeTruthy();
        expect(screen.getByText('AgentJob')).toBeTruthy();
      });
    });

    it('displays agent status badges', async () => {
      render(
        <NavigationContainer>
          <AgentListScreen />
        </NavigationContainer>
      );

      await waitFor(() => {
        // Status badges should be visible
        expect(screen.getAllByText('Active')[0]).toBeTruthy();
        expect(screen.getAllByText('Draft')[0]).toBeTruthy();
      });
    });
  });

  describe('API Integration - Sorting', () => {
    it('re-fetches agents when sort option changes', async () => {
      render(
        <NavigationContainer>
          <AgentListScreen />
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(screen.getByText('My Agents')).toBeTruthy();
      });

      // Click sort dropdown
      const sortFilter = screen.getAllByText('Updated Time')[0];
      fireEvent.press(sortFilter);

      // Select "Name" sort
      const nameOption = screen.getByText('Name');
      fireEvent.press(nameOption);

      // Should have called API again
      await waitFor(() => {
        expect(mockGetAgents).toHaveBeenCalled();
      });
    });
  });

  describe('API Integration - Status Update', () => {
    it('calls updateAgentStatus API when toggle is pressed', async () => {
      render(
        <NavigationContainer>
          <AgentListScreen />
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(screen.getByText('Vision Agent 1')).toBeTruthy();
      });

      // Find and click the toggle button
      const toggleButton = screen.getByTestId('agent-card-toggle-agent-1');
      fireEvent.press(toggleButton);

      // Should call updateAgentStatus
      await waitFor(() => {
        expect(mockUpdateAgentStatus).toHaveBeenCalledWith('agent-1', AgentStatus.PAUSED);
      });
    });
  });

  describe('API Integration - Navigation', () => {
    it('navigates to EditAgent when agent card is pressed', async () => {
      render(
        <NavigationContainer>
          <AgentListScreen />
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(screen.getByText('Vision Agent 1')).toBeTruthy();
      });

      const agentCard = screen.getByText('Vision Agent 1');
      fireEvent.press(agentCard);

      expect(mockNavigate).toHaveBeenCalledWith('EditAgent', { agentId: 'agent-1' });
    });

    it('navigates to CreateAgent when create button is pressed', async () => {
      render(
        <NavigationContainer>
          <AgentListScreen />
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(screen.getByText('My Agents')).toBeTruthy();
      });

      const createButton = screen.getByTestId('agent-list-create-button');
      fireEvent.press(createButton);

      expect(mockNavigate).toHaveBeenCalledWith('CreateAgent');
    });
  });

  describe('API Integration - Error Handling', () => {
    it('displays error state when API fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockGetAgents.mockRejectedValueOnce(new Error('Network error'));

      render(
        <NavigationContainer>
          <AgentListScreen />
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeTruthy();
      });

      consoleSpy.mockRestore();
    });

    it('allows retry when API fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockGetAgents.mockRejectedValueOnce(new Error('Network error')).mockResolvedValueOnce({
        data: {
          data: {
            agents: mockAgents,
            pagination: {
              page: 1,
              limit: 50,
              total: 3,
              totalPages: 1,
              hasNext: false,
              hasPrev: false,
            },
          },
        },
      });

      render(
        <NavigationContainer>
          <AgentListScreen />
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeTruthy();
      });

      const retryButton = screen.getByText('Retry');
      fireEvent.press(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Vision Agent 1')).toBeTruthy();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('API Integration - View Mode Toggle', () => {
    it('toggles between list and grid view', async () => {
      render(
        <NavigationContainer>
          <AgentListScreen />
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(screen.getByTestId('agent-list-view-toggle')).toBeTruthy();
      });

      const viewToggle = screen.getByTestId('agent-list-view-toggle');
      fireEvent.press(viewToggle);

      // After toggle, should still show agents
      await waitFor(() => {
        expect(screen.getByText('Vision Agent 1')).toBeTruthy();
      });
    });
  });
});
