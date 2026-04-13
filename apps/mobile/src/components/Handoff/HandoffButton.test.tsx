import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HandoffButton } from './HandoffButton';
import {
  HandoffStatus,
  SenderType,
} from '@visionshare/shared';

describe('HandoffButton', () => {
  const mockOnTakeover = jest.fn();
  const mockOnHandoff = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Agent Active State', () => {
    it('should render takeover button when agent is active', () => {
      const { getByText, getByTestId } = render(
        <HandoffButton
          status={HandoffStatus.AGENT_ACTIVE}
          handlerType={SenderType.AGENT}
          canTakeover={true}
          onTakeover={mockOnTakeover}
          testID="handoff-button"
        />
      );

      expect(getByText('Take Over')).toBeTruthy();
      expect(getByTestId('handoff-button')).toBeTruthy();
    });

    it('should call onTakeover when pressed in agent mode', () => {
      const { getByTestId } = render(
        <HandoffButton
          status={HandoffStatus.AGENT_ACTIVE}
          handlerType={SenderType.AGENT}
          canTakeover={true}
          onTakeover={mockOnTakeover}
          testID="handoff-button"
        />
      );

      fireEvent.press(getByTestId('handoff-button'));
      expect(mockOnTakeover).toHaveBeenCalled();
    });

    it('should show disabled state when cannot takeover', () => {
      const { getByText } = render(
        <HandoffButton
          status={HandoffStatus.AGENT_ACTIVE}
          handlerType={SenderType.AGENT}
          canTakeover={false}
          onTakeover={mockOnTakeover}
        />
      );

      expect(getByText('AI Agent Active')).toBeTruthy();
    });
  });

  describe('Human Active State', () => {
    it('should render handoff button when human is active', () => {
      const { getByText } = render(
        <HandoffButton
          status={HandoffStatus.HUMAN_ACTIVE}
          handlerType={SenderType.HUMAN}
          canHandoff={true}
          onHandoff={mockOnHandoff}
        />
      );

      expect(getByText('Hand to AI')).toBeTruthy();
    });

    it('should call onHandoff when pressed in human mode', () => {
      const { getByTestId } = render(
        <HandoffButton
          status={HandoffStatus.HUMAN_ACTIVE}
          handlerType={SenderType.HUMAN}
          canHandoff={true}
          onHandoff={mockOnHandoff}
          testID="handoff-button"
        />
      );

      fireEvent.press(getByTestId('handoff-button'));
      expect(mockOnHandoff).toHaveBeenCalled();
    });

    it('should show disabled state when cannot handoff', () => {
      const { getByText } = render(
        <HandoffButton
          status={HandoffStatus.HUMAN_ACTIVE}
          handlerType={SenderType.HUMAN}
          canHandoff={false}
          onHandoff={mockOnHandoff}
        />
      );

      expect(getByText('Human Support')).toBeTruthy();
    });
  });

  describe('Pending States', () => {
    it('should render cancel button for pending takeover', () => {
      const { getByText } = render(
        <HandoffButton
          status={HandoffStatus.PENDING_TAKEOVER}
          handlerType={SenderType.TRANSITION}
          onCancel={mockOnCancel}
        />
      );

      expect(getByText('Cancel Request')).toBeTruthy();
    });

    it('should render cancel button for pending handoff', () => {
      const { getByText } = render(
        <HandoffButton
          status={HandoffStatus.PENDING_HANDOFF}
          handlerType={SenderType.TRANSITION}
          onCancel={mockOnCancel}
        />
      );

      expect(getByText('Cancel Request')).toBeTruthy();
    });

    it('should call onCancel when cancel button pressed', () => {
      const { getByTestId } = render(
        <HandoffButton
          status={HandoffStatus.PENDING_TAKEOVER}
          handlerType={SenderType.TRANSITION}
          onCancel={mockOnCancel}
          testID="handoff-button"
        />
      );

      fireEvent.press(getByTestId('handoff-button'));
      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should show cancel button with hasPendingRequest', () => {
      const { getByText } = render(
        <HandoffButton
          status={HandoffStatus.AGENT_ACTIVE}
          handlerType={SenderType.AGENT}
          hasPendingRequest={true}
          onCancel={mockOnCancel}
        />
      );

      expect(getByText('Cancel Request')).toBeTruthy();
    });
  });

  describe('Error States', () => {
    it('should render retry button for timeout state', () => {
      const { getByText } = render(
        <HandoffButton
          status={HandoffStatus.TIMEOUT}
          handlerType={SenderType.SYSTEM}
          onTakeover={mockOnTakeover}
        />
      );

      expect(getByText('Retry')).toBeTruthy();
    });

    it('should render retry button for cancelled state', () => {
      const { getByText } = render(
        <HandoffButton
          status={HandoffStatus.CANCELLED}
          handlerType={SenderType.SYSTEM}
          onHandoff={mockOnHandoff}
        />
      );

      expect(getByText('Retry')).toBeTruthy();
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when loading', () => {
      const { getByTestId, UNSAFE_getByType } = render(
        <HandoffButton
          status={HandoffStatus.AGENT_ACTIVE}
          handlerType={SenderType.AGENT}
          loading={true}
          onTakeover={mockOnTakeover}
          testID="handoff-button"
        />
      );

      // ActivityIndicator should be present
      const activityIndicator = UNSAFE_getByType(require('react-native').ActivityIndicator);
      expect(activityIndicator).toBeTruthy();
    });

    it('should disable button when loading', () => {
      const { getByTestId } = render(
        <HandoffButton
          status={HandoffStatus.AGENT_ACTIVE}
          handlerType={SenderType.AGENT}
          loading={true}
          onTakeover={mockOnTakeover}
          testID="handoff-button"
        />
      );

      const button = getByTestId('handoff-button');
      expect(button.props.accessibilityState.disabled).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('should have correct accessibility role', () => {
      const { getByRole } = render(
        <HandoffButton
          status={HandoffStatus.AGENT_ACTIVE}
          handlerType={SenderType.AGENT}
          canTakeover={true}
          onTakeover={mockOnTakeover}
        />
      );

      expect(getByRole('button')).toBeTruthy();
    });

    it('should have correct accessibility label', () => {
      const { getByLabelText } = render(
        <HandoffButton
          status={HandoffStatus.AGENT_ACTIVE}
          handlerType={SenderType.AGENT}
          canTakeover={true}
          onTakeover={mockOnTakeover}
        />
      );

      expect(getByLabelText('Take Over')).toBeTruthy();
    });
  });
});
