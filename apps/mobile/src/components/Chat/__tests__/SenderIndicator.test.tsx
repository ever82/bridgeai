import React from 'react';
import { render } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { SenderType, HandoffStatus } from '@bridgeai/shared';

import { SenderIndicator, SenderChangeIndicator } from '../SenderIndicator';

describe('SenderIndicator', () => {
  describe('Agent Sender', () => {
    it('should render agent indicator', () => {
      const { getAllByText, getByTestId } = render(
        <SenderIndicator senderType={SenderType.AGENT} testID="sender" />
      );

      expect(getAllByText('AI Agent').length).toBeGreaterThan(0);
      expect(getByTestId('sender-avatar')).toBeTruthy();
    });

    it('should show agent label with sender name', () => {
      const { getByText } = render(
        <SenderIndicator senderType={SenderType.AGENT} senderName="AI Assistant" />
      );

      expect(getByText('AI Assistant 的 Agent')).toBeTruthy();
    });
  });

  describe('Human Sender', () => {
    it('should render human indicator', () => {
      const { getAllByText, getByTestId } = render(
        <SenderIndicator senderType={SenderType.HUMAN} testID="sender" />
      );

      expect(getAllByText('Human').length).toBeGreaterThan(0);
      expect(getByTestId('sender-avatar')).toBeTruthy();
    });

    it('should show human label with sender name', () => {
      const { getByText } = render(
        <SenderIndicator senderType={SenderType.HUMAN} senderName="John Doe" />
      );

      expect(getByText('John Doe')).toBeTruthy();
    });
  });

  describe('System Sender', () => {
    it('should render system indicator', () => {
      const { getAllByText, getByTestId } = render(
        <SenderIndicator senderType={SenderType.SYSTEM} testID="sender" />
      );

      expect(getAllByText('System').length).toBeGreaterThan(0);
      expect(getByTestId('sender-avatar')).toBeTruthy();
    });
  });

  describe('Transition Sender', () => {
    it('should render transition indicator', () => {
      const { getByText } = render(
        <SenderIndicator senderType={SenderType.TRANSITION} isTransition={true} />
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
      const { UNSAFE_getByType, getByTestId } = render(
        <SenderIndicator senderType={SenderType.AGENT} animate={true} testID="sender" />
      );

      expect(getByTestId('sender')).toBeTruthy();
      expect(UNSAFE_getByType(Animated.View)).toBeTruthy();
    });

    it('should skip animation when animate is false', () => {
      const { getAllByText, getByTestId } = render(
        <SenderIndicator senderType={SenderType.AGENT} animate={false} testID="sender" />
      );

      expect(getAllByText('AI Agent').length).toBeGreaterThan(0);
      expect(getByTestId('sender')).toBeTruthy();
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
        <SenderIndicator senderType={SenderType.AGENT} testID="test-indicator" />
      );

      expect(getByTestId('test-indicator')).toBeTruthy();
    });
  });
});

describe('SenderChangeIndicator', () => {
  it('should render change indicator', () => {
    const { getByTestId } = render(
      <SenderChangeIndicator
        fromType={SenderType.AGENT}
        toType={SenderType.HUMAN}
        testID="sender-change-indicator"
      />
    );

    expect(getByTestId('sender-change-indicator')).toBeTruthy();
  });

  it('should show arrow between sender types', () => {
    const { getByText } = render(
      <SenderChangeIndicator fromType={SenderType.AGENT} toType={SenderType.HUMAN} />
    );

    expect(getByText('↓')).toBeTruthy();
  });

  it('should apply custom style', () => {
    const customStyle = { padding: 10 };
    const { getByTestId } = render(
      <SenderChangeIndicator
        fromType={SenderType.AGENT}
        toType={SenderType.HUMAN}
        style={customStyle}
        testID="sender-change-indicator"
      />
    );

    expect(getByTestId('sender-change-indicator')).toBeTruthy();
  });
});
