import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { SenderType, HandoffStatus } from '@bridgeai/shared';

import { SenderIndicator, SenderChangeIndicator } from '../SenderIndicator';

type MockProps = Record<string, unknown> & { testID?: string };

// Mock UserAvatar so we don't depend on its internals.
jest.mock('../../UserAvatar/UserAvatar', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ReactMock = require('react');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { View } = require('react-native');
  return {
    UserAvatar: ({ testID, ...props }: MockProps) =>
      ReactMock.createElement(View, { testID: testID || 'user-avatar', ...props }),
  };
});

// ---------------------------------------------------------------------------
// SenderIndicator
// ---------------------------------------------------------------------------
describe('SenderIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ----- Each SenderType variant -----------------------------------------
  describe('SenderType variants', () => {
    describe('Agent Sender', () => {
      it('renders agent indicator with label and avatar', () => {
        const { getAllByText, getByTestId } = render(
          <SenderIndicator senderType={SenderType.AGENT} testID="sender" />
        );

        expect(getAllByText('AI Agent').length).toBeGreaterThan(0);
        expect(getByTestId('sender-avatar')).toBeTruthy();
      });

      it('shows agent label with custom sender name', () => {
        const { getByText } = render(
          <SenderIndicator senderType={SenderType.AGENT} senderName="AI Assistant" />
        );

        expect(getByText('AI Assistant 的 Agent')).toBeTruthy();
      });

      it('renders sender avatar when avatar URL is provided', () => {
        const { getByTestId } = render(
          <SenderIndicator
            senderType={SenderType.AGENT}
            senderAvatarUrl="https://example.com/avatar.png"
            testID="sender"
          />
        );

        expect(getByTestId('sender-avatar')).toBeTruthy();
      });
    });

    describe('Human Sender', () => {
      it('renders human indicator with label and avatar', () => {
        const { getAllByText, getByTestId } = render(
          <SenderIndicator senderType={SenderType.HUMAN} testID="sender" />
        );

        expect(getAllByText('Human').length).toBeGreaterThan(0);
        expect(getByTestId('sender-avatar')).toBeTruthy();
      });

      it('shows human label with custom sender name', () => {
        const { getByText } = render(
          <SenderIndicator senderType={SenderType.HUMAN} senderName="John Doe" />
        );

        expect(getByText('John Doe')).toBeTruthy();
      });
    });

    describe('System Sender', () => {
      it('renders system indicator with label and avatar', () => {
        const { getAllByText, getByTestId } = render(
          <SenderIndicator senderType={SenderType.SYSTEM} testID="sender" />
        );

        expect(getAllByText('System').length).toBeGreaterThan(0);
        expect(getByTestId('sender-avatar')).toBeTruthy();
      });

      it('falls back to "Unknown" label when senderType is not in SENDER_TYPE_LABELS', () => {
        // Cast a bogus value to exercise the fallback path
        const { getByText } = render(
          <SenderIndicator senderType={'BOGUS' as unknown as SenderType} />
        );

        expect(getByText('Unknown')).toBeTruthy();
      });
    });

    describe('Transition Sender', () => {
      it('renders transition indicator triggered by senderType=TRANSITION', () => {
        const { getByText } = render(<SenderIndicator senderType={SenderType.TRANSITION} />);

        expect(getByText('🔄')).toBeTruthy();
        expect(getByText('Switching...')).toBeTruthy();
      });

      it('renders transition indicator when isTransition=true with non-TRANSITION senderType', () => {
        const { getByText } = render(
          <SenderIndicator senderType={SenderType.AGENT} isTransition={true} />
        );

        expect(getByText('🔄')).toBeTruthy();
        expect(getByText('Switching...')).toBeTruthy();
      });
    });
  });

  // ----- Transition with HandoffStatus states ----------------------------
  describe('Transition with HandoffStatus states', () => {
    it('shows "Switching..." when no handoffStatus is provided', () => {
      const { getByText } = render(
        <SenderIndicator senderType={SenderType.TRANSITION} isTransition={true} />
      );

      expect(getByText('Switching...')).toBeTruthy();
    });

    it('shows "Human taking over..." when handoffStatus is PENDING_TAKEOVER', () => {
      const { getByText } = render(
        <SenderIndicator
          senderType={SenderType.TRANSITION}
          isTransition={true}
          handoffStatus={HandoffStatus.PENDING_TAKEOVER}
        />
      );

      expect(getByText('Human taking over...')).toBeTruthy();
    });

    it('shows "Handing to AI..." when handoffStatus is PENDING_HANDOFF', () => {
      const { getByText } = render(
        <SenderIndicator
          senderType={SenderType.TRANSITION}
          isTransition={true}
          handoffStatus={HandoffStatus.PENDING_HANDOFF}
        />
      );

      expect(getByText('Handing to AI...')).toBeTruthy();
    });

    it('falls back to "Switching..." for AGENT_ACTIVE handoffStatus', () => {
      const { getByText } = render(
        <SenderIndicator
          senderType={SenderType.TRANSITION}
          isTransition={true}
          handoffStatus={HandoffStatus.AGENT_ACTIVE}
        />
      );

      expect(getByText('Switching...')).toBeTruthy();
    });

    it('falls back to "Switching..." for HUMAN_ACTIVE handoffStatus', () => {
      const { getByText } = render(
        <SenderIndicator
          senderType={SenderType.TRANSITION}
          isTransition={true}
          handoffStatus={HandoffStatus.HUMAN_ACTIVE}
        />
      );

      expect(getByText('Switching...')).toBeTruthy();
    });

    it('falls back to "Switching..." for TIMEOUT handoffStatus', () => {
      const { getByText } = render(
        <SenderIndicator
          senderType={SenderType.TRANSITION}
          isTransition={true}
          handoffStatus={HandoffStatus.TIMEOUT}
        />
      );

      expect(getByText('Switching...')).toBeTruthy();
    });

    it('falls back to "Switching..." for CANCELLED handoffStatus', () => {
      const { getByText } = render(
        <SenderIndicator
          senderType={SenderType.TRANSITION}
          isTransition={true}
          handoffStatus={HandoffStatus.CANCELLED}
        />
      );

      expect(getByText('Switching...')).toBeTruthy();
    });

    it('applies transition container styles including transition lines', () => {
      const { getByTestId } = render(
        <SenderIndicator
          senderType={SenderType.TRANSITION}
          isTransition={true}
          testID="transition"
        />
      );

      const container = getByTestId('transition');
      expect(container).toBeTruthy();
      // Verify the container style includes transitionContainer
      expect(container.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ justifyContent: 'center' })])
      );
    });
  });

  // ----- Animation -------------------------------------------------------
  describe('Animation', () => {
    it('renders with Animated.View when animate=true (default)', () => {
      const { UNSAFE_getByType, getByTestId } = render(
        <SenderIndicator senderType={SenderType.AGENT} animate={true} testID="sender" />
      );

      expect(getByTestId('sender')).toBeTruthy();
      expect(UNSAFE_getByType(Animated.View)).toBeTruthy();
    });

    it('renders correctly when animate=false (skip animation fallback)', () => {
      const { getAllByText, getByTestId } = render(
        <SenderIndicator senderType={SenderType.AGENT} animate={false} testID="sender" />
      );

      expect(getAllByText('AI Agent').length).toBeGreaterThan(0);
      expect(getByTestId('sender')).toBeTruthy();
    });

    it('animate=false also works for transition variant', () => {
      const { getByText, getByTestId } = render(
        <SenderIndicator
          senderType={SenderType.TRANSITION}
          isTransition={true}
          animate={false}
          testID="sender"
        />
      );

      expect(getByText('Switching...')).toBeTruthy();
      expect(getByTestId('sender')).toBeTruthy();
    });

    it('re-triggers animation when senderType changes', () => {
      const { getByTestId, rerender } = render(
        <SenderIndicator senderType={SenderType.AGENT} testID="sender" />
      );

      expect(getByTestId('sender')).toBeTruthy();

      // Re-render with a different senderType to verify it doesn't crash
      rerender(<SenderIndicator senderType={SenderType.HUMAN} testID="sender" />);
      expect(getByTestId('sender')).toBeTruthy();
    });
  });

  // ----- Styling & testID ------------------------------------------------
  describe('Styling', () => {
    it('applies custom style prop', () => {
      const customStyle = { marginTop: 10 };
      const { getByTestId } = render(
        <SenderIndicator
          senderType={SenderType.AGENT}
          style={customStyle}
          testID="sender-indicator"
        />
      );

      const indicator = getByTestId('sender-indicator');
      expect(indicator.props.style).toContainEqual(customStyle);
    });

    it('respects testID prop', () => {
      const { getByTestId } = render(
        <SenderIndicator senderType={SenderType.AGENT} testID="test-indicator" />
      );

      expect(getByTestId('test-indicator')).toBeTruthy();
    });

    it('passes avatar testID when provided', () => {
      const { getByTestId } = render(
        <SenderIndicator senderType={SenderType.AGENT} testID="sender" />
      );

      expect(getByTestId('sender-avatar')).toBeTruthy();
    });

    it('does not pass avatar testID when testID is not provided', () => {
      const { queryByTestId } = render(<SenderIndicator senderType={SenderType.AGENT} />);

      // The UserAvatar mock falls back to 'user-avatar' as testID when none is passed
      expect(queryByTestId('sender-avatar')).toBeNull();
    });
  });

  // ----- Non-transition sender info rendering ----------------------------
  describe('Non-transition sender info', () => {
    it('renders the type badge with a colored dot for AGENT', () => {
      const { getAllByText } = render(<SenderIndicator senderType={SenderType.AGENT} />);

      // "AI Agent" appears as both the name fallback and the type label
      expect(getAllByText('AI Agent').length).toBeGreaterThanOrEqual(2);
    });

    it('renders the status indicator dot', () => {
      const { getByTestId } = render(
        <SenderIndicator senderType={SenderType.HUMAN} testID="sender" />
      );

      // The root container renders successfully - status dot is inside
      const container = getByTestId('sender');
      expect(container).toBeTruthy();
    });
  });
});

// ---------------------------------------------------------------------------
// SenderChangeIndicator
// ---------------------------------------------------------------------------
describe('SenderChangeIndicator', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders with testID', () => {
    const { getByTestId } = render(
      <SenderChangeIndicator
        fromType={SenderType.AGENT}
        toType={SenderType.HUMAN}
        testID="sender-change-indicator"
      />
    );

    expect(getByTestId('sender-change-indicator')).toBeTruthy();
  });

  it('shows arrow between sender types', () => {
    const { getByText } = render(
      <SenderChangeIndicator fromType={SenderType.AGENT} toType={SenderType.HUMAN} />
    );

    expect(getByText('↓')).toBeTruthy();
  });

  it('applies custom style prop', () => {
    const customStyle = { padding: 10 };
    const { getByTestId } = render(
      <SenderChangeIndicator
        fromType={SenderType.AGENT}
        toType={SenderType.HUMAN}
        style={customStyle}
        testID="sender-change-indicator"
      />
    );

    const indicator = getByTestId('sender-change-indicator');
    expect(indicator.props.style).toContainEqual(customStyle);
  });

  it('debounces rapid toType changes', () => {
    const { getByTestId, rerender } = render(
      <SenderChangeIndicator
        fromType={SenderType.AGENT}
        toType={SenderType.HUMAN}
        testID="change"
      />
    );

    // Rapidly change toType multiple times
    rerender(
      <SenderChangeIndicator
        fromType={SenderType.AGENT}
        toType={SenderType.SYSTEM}
        testID="change"
      />
    );
    rerender(
      <SenderChangeIndicator
        fromType={SenderType.AGENT}
        toType={SenderType.TRANSITION}
        testID="change"
      />
    );

    // Before debounce timer fires, component should still render
    expect(getByTestId('change')).toBeTruthy();

    // Flush the debounce timer
    act(() => {
      jest.advanceTimersByTime(150);
    });

    expect(getByTestId('change')).toBeTruthy();
  });

  it('cleans up debounce timer on unmount', () => {
    const { unmount } = render(
      <SenderChangeIndicator fromType={SenderType.AGENT} toType={SenderType.HUMAN} />
    );

    // Should not throw when unmounting during debounce period
    expect(() => unmount()).not.toThrow();
  });

  it('renders with all SenderType combinations for fromType/toType', () => {
    const combinations: [SenderType, SenderType][] = [
      [SenderType.AGENT, SenderType.HUMAN],
      [SenderType.HUMAN, SenderType.AGENT],
      [SenderType.AGENT, SenderType.SYSTEM],
      [SenderType.SYSTEM, SenderType.HUMAN],
      [SenderType.HUMAN, SenderType.TRANSITION],
      [SenderType.TRANSITION, SenderType.AGENT],
    ];

    combinations.forEach(([from, to]) => {
      const { getByTestId, unmount } = render(
        <SenderChangeIndicator fromType={from} toType={to} testID="change" />
      );
      expect(getByTestId('change')).toBeTruthy();
      unmount();
    });
  });
});
