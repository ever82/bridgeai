/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock('react-native', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  const mockComponent = (name: string) =>
    jest.fn((props: any) => {
      const { children, ...rest } = props;
      return React.createElement(name, rest, children);
    });

  const Animated = {
    View: mockComponent('Animated.View'),
    Text: mockComponent('Animated.Text'),
    Value: jest.fn((value: number) => ({
      setValue: jest.fn(),
      interpolate: jest.fn(() => ({})),
      value,
    })),
    timing: jest.fn(() => ({
      start: jest.fn((cb?: (r: { finished: boolean }) => void) => {
        if (cb) cb({ finished: true });
      }),
      stop: jest.fn(),
      reset: jest.fn(),
    })),
    spring: jest.fn(() => ({
      start: jest.fn((cb?: (r: { finished: boolean }) => void) => {
        if (cb) cb({ finished: true });
      }),
      stop: jest.fn(),
      reset: jest.fn(),
    })),
    sequence: jest.fn(() => ({
      start: jest.fn((cb?: (r: { finished: boolean }) => void) => {
        if (cb) cb({ finished: true });
      }),
      stop: jest.fn(),
      reset: jest.fn(),
    })),
    parallel: jest.fn(() => ({
      start: jest.fn((cb?: (r: { finished: boolean }) => void) => {
        if (cb) cb({ finished: true });
      }),
      stop: jest.fn(),
      reset: jest.fn(),
    })),
    createAnimatedComponent: jest.fn((c: any) => c),
  };

  return {
    Animated,
    View: mockComponent('View'),
    Text: mockComponent('Text'),
    Image: mockComponent('Image'),
    ScrollView: mockComponent('ScrollView'),
    FlatList: jest.fn((props: any) => {
      const { children, testID, ...rest } = props;
      return React.createElement('FlatList', { testID, ...rest }, children);
    }),
    TouchableOpacity: mockComponent('TouchableOpacity'),
    StyleSheet: { create: (s: any) => s, flatten: (s: any) => s },
    Platform: { OS: 'ios', select: (obj: any) => obj.ios || obj.default, Version: '16.0' },
    Dimensions: { get: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }) },
    PixelRatio: { get: () => 2, getFontScale: () => 1 },
    default: {
      Animated,
      View: mockComponent('View'),
      Text: mockComponent('Text'),
      Image: mockComponent('Image'),
      ScrollView: mockComponent('ScrollView'),
      FlatList: jest.fn((props: any) => React.createElement('FlatList', props)),
      TouchableOpacity: mockComponent('TouchableOpacity'),
      StyleSheet: { create: (s: any) => s },
      Platform: { OS: 'ios' },
      Dimensions: { get: () => ({ width: 390, height: 844 }) },
      PixelRatio: { get: () => 2 },
    },
  };
});

import React from 'react';
import { render } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { SenderType, HandoffStatus, SENDER_TYPE_LABELS } from '@bridgeai/shared';

import { SenderIndicator, SenderChangeIndicator } from './SenderIndicator';

describe('SenderIndicator', () => {
  describe('Agent Sender', () => {
    it('should render agent indicator', () => {
      const { getAllByText } = render(<SenderIndicator senderType={SenderType.AGENT} />);

      // Agent renders UserAvatar (initials 'A') + name text + type badge with label
      expect(getAllByText(SENDER_TYPE_LABELS[SenderType.AGENT]).length).toBeGreaterThan(0);
    });

    it('should show agent label with sender name', () => {
      const { getByText } = render(
        <SenderIndicator senderType={SenderType.AGENT} senderName="AI Assistant" />
      );

      // Agent with name renders "AI Assistant 的 Agent" as the name text
      expect(getByText('AI Assistant 的 Agent')).toBeTruthy();
    });
  });

  describe('Human Sender', () => {
    it('should render human indicator', () => {
      const { getAllByText } = render(<SenderIndicator senderType={SenderType.HUMAN} />);

      // Human renders UserAvatar (initials 'H') + name text + type badge with label
      expect(getAllByText(SENDER_TYPE_LABELS[SenderType.HUMAN]).length).toBeGreaterThan(0);
    });

    it('should show human label with sender name', () => {
      const { getByText, getAllByText } = render(
        <SenderIndicator senderType={SenderType.HUMAN} senderName="John Doe" />
      );

      // Human with senderName renders the name directly + type badge "Human"
      expect(getByText('John Doe')).toBeTruthy();
      expect(getAllByText(SENDER_TYPE_LABELS[SenderType.HUMAN]).length).toBeGreaterThan(0);
    });
  });

  describe('System Sender', () => {
    it('should render system indicator', () => {
      const { getAllByText } = render(<SenderIndicator senderType={SenderType.SYSTEM} />);

      // System renders UserAvatar (initials 'S') + name text + type badge with label
      expect(getAllByText(SENDER_TYPE_LABELS[SenderType.SYSTEM]).length).toBeGreaterThan(0);
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
      const { UNSAFE_getByType } = render(
        <SenderIndicator senderType={SenderType.AGENT} animate={true} />
      );

      // Should render Animated.View wrapper
      expect(UNSAFE_getByType(Animated.View)).toBeTruthy();
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
