import React from 'react';
import { render } from '@testing-library/react-native';
import {
  SenderType,
  HandoffStatus,
  SENDER_TYPE_LABELS,
} from '@bridgeai/shared';

import { SenderIndicator, SenderChangeIndicator } from './SenderIndicator';

// Mock Animated
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Animated: {
    Value: jest.fn(() => ({ setValue: jest.fn() })),
    parallel: jest.fn(() => ({ start: jest.fn() })),
    sequence: jest.fn(() => ({ start: jest.fn() })),
    spring: jest.fn(() => ({ start: jest.fn() })),
    timing: jest.fn(() => ({ start: jest.fn() })),
  },
}));

describe('SenderIndicator', () => {
  describe('Agent Sender', () => {
    it('should render agent indicator', () => {
      const { getByText } = render(
        <SenderIndicator
          senderType={SenderType.AGENT}
        />
      );

      expect(getByText('🤖')).toBeTruthy();
      expect(getByText(SENDER_TYPE_LABELS[SenderType.AGENT])).toBeTruthy();
    });

    it('should show agent label with sender name', () => {
      const { getByText } = render(
        <SenderIndicator
          senderType={SenderType.AGENT}
          senderName="AI Assistant"
        />
      );

      expect(getByText('AI Assistant')).toBeTruthy();
    });
  });

  describe('Human Sender', () => {
    it('should render human indicator', () => {
      const { getByText } = render(
        <SenderIndicator
          senderType={SenderType.HUMAN}
        />
      );

      expect(getByText('👤')).toBeTruthy();
      expect(getByText(SENDER_TYPE_LABELS[SenderType.HUMAN])).toBeTruthy();
    });

    it('should show human label with sender name', () => {
      const { getByText } = render(
        <SenderIndicator
          senderType={SenderType.HUMAN}
          senderName="John Doe"
        />
      );

      expect(getByText('John Doe')).toBeTruthy();
    });
  });

  describe('System Sender', () => {
    it('should render system indicator', () => {
      const { getByText } = render(
        <SenderIndicator
          senderType={SenderType.SYSTEM}
        />
      );

      expect(getByText('⚙️')).toBeTruthy();
      expect(getByText(SENDER_TYPE_LABELS[SenderType.SYSTEM])).toBeTruthy();
    });
  });

  describe('Transition Sender', () => {
    it('should render transition indicator', () => {
      const { getByText } = render(
        <SenderIndicator
          senderType={SenderType.TRANSITION}
          isTransition={true}
        />
      );

      expect(getByText('🔄')).toBeTruthy();
      expect(getByText('Switching...')).toBeTruthy();
    });

    it('should show takeover message when pending takeover', () => {
      const { getByText } = render(
        <SenderIndicator
          senderType={SenderType.TRANSITION}
          isTransition={true}
          handoffStatus={HandoffStatus.PENDING_TAKEOVER}
        />
      );

      expect(getByText('Human taking over...')).toBeTruthy();
    });

    it('should show handoff message when pending handoff', () => {
      const { getByText } = render(
        <SenderIndicator
          senderType={SenderType.TRANSITION}
          isTransition={true}
          handoffStatus={HandoffStatus.PENDING_HANDOFF}
        />
      );

      expect(getByText('Handing to AI...')).toBeTruthy();
    });
  });

  describe('Animation', () => {
    it('should animate by default', () => {
      const { UNSAFE_getByType } = render(
        <SenderIndicator
          senderType={SenderType.AGENT}
          animate={true}
        />
      );

      // Should render Animated.View wrapper
      expect(UNSAFE_getByType(require('react-native').Animated.View)).toBeTruthy();
    });
  });

  describe('Styling', () => {
    it('should apply custom style', () => {
      const customStyle = { marginTop: 10 };
      const { getByTestId } = render(
        <SenderIndicator
          senderType={SenderType.AGENT}
          style={customStyle}
          testID="sender-indicator"
        />
      );

      const indicator = getByTestId('sender-indicator');
      expect(indicator).toBeTruthy();
    });

    it('should have testID', () => {
      const { getByTestId } = render(
        <SenderIndicator
          senderType={SenderType.AGENT}
          testID="test-indicator"
        />
      );

      expect(getByTestId('test-indicator')).toBeTruthy();
    });
  });
});

describe('SenderChangeIndicator', () => {
  it('should render change indicator', () => {
    const { UNSAFE_getByType } = render(
      <SenderChangeIndicator
        fromType={SenderType.AGENT}
        toType={SenderType.HUMAN}
      />
    );

    expect(UNSAFE_getByType(require('react-native').Animated.View)).toBeTruthy();
  });

  it('should show arrow between sender types', () => {
    const { getByText } = render(
      <SenderChangeIndicator
        fromType={SenderType.AGENT}
        toType={SenderType.HUMAN}
      />
    );

    expect(getByText('↓')).toBeTruthy();
  });

  it('should apply custom style', () => {
    const customStyle = { padding: 10 };
    const { UNSAFE_getByType } = render(
      <SenderChangeIndicator
        fromType={SenderType.AGENT}
        toType={SenderType.HUMAN}
        style={customStyle}
      />
    );

    expect(UNSAFE_getByType(require('react-native').Animated.View)).toBeTruthy();
  });
});
