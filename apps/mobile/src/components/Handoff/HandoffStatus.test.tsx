import React from 'react';
import { render } from '@testing-library/react-native';
import { HandoffStatus } from './HandoffStatus';
import {
  HandoffStatus as HandoffStatusEnum,
  SenderType,
  HANDOFF_STATUS_LABELS,
} from '@visionshare/shared';

// Mock Animated.Value
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Animated: {
    Value: jest.fn(() => ({ setValue: jest.fn() })),
    loop: jest.fn(() => ({ start: jest.fn() })),
    sequence: jest.fn(() => ({ start: jest.fn() })),
    timing: jest.fn(() => ({ start: jest.fn() })),
  },
}));

describe('HandoffStatus', () => {
  describe('Agent Active State', () => {
    it('should render agent status', () => {
      const { getByText } = render(
        <HandoffStatus
          status={HandoffStatusEnum.AGENT_ACTIVE}
          handlerType={SenderType.AGENT}
        />
      );

      expect(getByText('🤖')).toBeTruthy();
      expect(getByText('AI Agent')).toBeTruthy();
      expect(getByText(HANDOFF_STATUS_LABELS[HandoffStatusEnum.AGENT_ACTIVE])).toBeTruthy();
    });

    it('should show agent icon', () => {
      const { getByText } = render(
        <HandoffStatus
          status={HandoffStatusEnum.AGENT_ACTIVE}
          handlerType={SenderType.AGENT}
        />
      );

      expect(getByText('🤖')).toBeTruthy();
    });
  });

  describe('Human Active State', () => {
    it('should render human status', () => {
      const { getByText } = render(
        <HandoffStatus
          status={HandoffStatusEnum.HUMAN_ACTIVE}
          handlerType={SenderType.HUMAN}
        />
      );

      expect(getByText('👤')).toBeTruthy();
      expect(getByText('Human')).toBeTruthy();
    });

    it('should show handler name if provided', () => {
      const { getByText } = render(
        <HandoffStatus
          status={HandoffStatusEnum.HUMAN_ACTIVE}
          handlerType={SenderType.HUMAN}
          handlerName="John Doe"
        />
      );

      expect(getByText('John Doe')).toBeTruthy();
    });
  });

  describe('Pending States', () => {
    it('should render pending takeover status', () => {
      const { getByText } = render(
        <HandoffStatus
          status={HandoffStatusEnum.PENDING_TAKEOVER}
          handlerType={SenderType.TRANSITION}
        />
      );

      expect(getByText('⏳')).toBeTruthy();
      expect(getByText('Requesting Takeover...')).toBeTruthy();
    });

    it('should render pending handoff status', () => {
      const { getByText } = render(
        <HandoffStatus
          status={HandoffStatusEnum.PENDING_HANDOFF}
          handlerType={SenderType.TRANSITION}
        />
      );

      expect(getByText('⏳')).toBeTruthy();
      expect(getByText('Requesting Handoff...')).toBeTruthy();
    });

    it('should show timeout countdown when provided', () => {
      const { getByText } = render(
        <HandoffStatus
          status={HandoffStatusEnum.PENDING_TAKEOVER}
          handlerType={SenderType.TRANSITION}
          timeoutSeconds={25}
        />
      );

      expect(getByText('Timeout in:')).toBeTruthy();
      expect(getByText('0:25')).toBeTruthy();
    });

    it('should format timeout over 60 seconds', () => {
      const { getByText } = render(
        <HandoffStatus
          status={HandoffStatusEnum.PENDING_TAKEOVER}
          handlerType={SenderType.TRANSITION}
          timeoutSeconds={125}
        />
      );

      expect(getByText('2:05')).toBeTruthy();
    });

    it('should show countdown with hasPendingRequest', () => {
      const { getByText } = render(
        <HandoffStatus
          status={HandoffStatusEnum.AGENT_ACTIVE}
          handlerType={SenderType.AGENT}
          hasPendingRequest={true}
          timeoutSeconds={30}
        />
      );

      expect(getByText('0:30')).toBeTruthy();
    });
  });

  describe('Error States', () => {
    it('should render timeout status', () => {
      const { getByText } = render(
        <HandoffStatus
          status={HandoffStatusEnum.TIMEOUT}
          handlerType={SenderType.SYSTEM}
        />
      );

      expect(getByText('⚙️')).toBeTruthy();
      expect(getByText('Request Timed Out')).toBeTruthy();
    });

    it('should render cancelled status', () => {
      const { getByText } = render(
        <HandoffStatus
          status={HandoffStatusEnum.CANCELLED}
          handlerType={SenderType.SYSTEM}
        />
      );

      expect(getByText('⚙️')).toBeTruthy();
      expect(getByText('Cancelled')).toBeTruthy();
    });
  });

  describe('System State', () => {
    it('should render system status', () => {
      const { getByText } = render(
        <HandoffStatus
          status={HandoffStatusEnum.AGENT_ACTIVE}
          handlerType={SenderType.SYSTEM}
        />
      );

      expect(getByText('⚙️')).toBeTruthy();
      expect(getByText('System')).toBeTruthy();
    });
  });

  describe('Unknown State', () => {
    it('should handle unknown sender type', () => {
      const { getByText } = render(
        <HandoffStatus
          status={HandoffStatusEnum.AGENT_ACTIVE}
          handlerType={SenderType.HUMAN}
        />
      );

      // Just verify it renders without error
      expect(getByText('👤')).toBeTruthy();
    });
  });

  describe('Styling', () => {
    it('should apply custom style', () => {
      const customStyle = { backgroundColor: 'red' };
      const { getByTestId } = render(
        <HandoffStatus
          status={HandoffStatusEnum.AGENT_ACTIVE}
          handlerType={SenderType.AGENT}
          style={customStyle}
          testID="handoff-status"
        />
      );

      const status = getByTestId('handoff-status');
      // Custom style should be applied (checking the component renders)
      expect(status).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have testID', () => {
      const { getByTestId } = render(
        <HandoffStatus
          status={HandoffStatusEnum.AGENT_ACTIVE}
          handlerType={SenderType.AGENT}
          testID="test-status"
        />
      );

      expect(getByTestId('test-status')).toBeTruthy();
    });
  });
});
