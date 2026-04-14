/**
 * Handoff Types Tests
 */
import {
  HandoffStatus,
  HandoffRequestStatus,
  SenderType,
  HandoffSocketEvents,
  HandoffErrorCode,
  HANDOFF_STATUS_LABELS,
  SENDER_TYPE_LABELS,
  SENDER_TYPE_COLORS,
  DEFAULT_HANDOFF_CONFIG,
  canSendMessages,
  isHandoffPending,
  canRequestTakeover,
  canRequestHandoff,
  createInitialHandoffState,
} from '../handoff';

describe('Handoff Types', () => {
  describe('Enums', () => {
    it('should have correct HandoffStatus values', () => {
      expect(HandoffStatus.AGENT_ACTIVE).toBe('AGENT_ACTIVE');
      expect(HandoffStatus.HUMAN_ACTIVE).toBe('HUMAN_ACTIVE');
      expect(HandoffStatus.PENDING_TAKEOVER).toBe('PENDING_TAKEOVER');
      expect(HandoffStatus.PENDING_HANDOFF).toBe('PENDING_HANDOFF');
      expect(HandoffStatus.TIMEOUT).toBe('TIMEOUT');
      expect(HandoffStatus.CANCELLED).toBe('CANCELLED');
    });

    it('should have correct HandoffRequestStatus values', () => {
      expect(HandoffRequestStatus.PENDING).toBe('PENDING');
      expect(HandoffRequestStatus.ACCEPTED).toBe('ACCEPTED');
      expect(HandoffRequestStatus.REJECTED).toBe('REJECTED');
      expect(HandoffRequestStatus.TIMEOUT).toBe('TIMEOUT');
      expect(HandoffRequestStatus.CANCELLED).toBe('CANCELLED');
    });

    it('should have correct SenderType values', () => {
      expect(SenderType.AGENT).toBe('AGENT');
      expect(SenderType.HUMAN).toBe('HUMAN');
      expect(SenderType.SYSTEM).toBe('SYSTEM');
      expect(SenderType.TRANSITION).toBe('TRANSITION');
    });

    it('should have correct socket events', () => {
      expect(HandoffSocketEvents.REQUEST_TAKEOVER).toBe('handoff:request_takeover');
      expect(HandoffSocketEvents.REQUEST_HANDOFF).toBe('handoff:request_handoff');
      expect(HandoffSocketEvents.CONFIRM_HANDOFF).toBe('handoff:confirm');
      expect(HandoffSocketEvents.REJECT_HANDOFF).toBe('handoff:reject');
      expect(HandoffSocketEvents.CANCEL_HANDOFF).toBe('handoff:cancel');
      expect(HandoffSocketEvents.HANDOFF_REQUESTED).toBe('handoff:requested');
      expect(HandoffSocketEvents.HANDOFF_CONFIRMED).toBe('handoff:confirmed');
      expect(HandoffSocketEvents.HANDOFF_REJECTED).toBe('handoff:rejected');
      expect(HandoffSocketEvents.HANDOFF_TIMEOUT).toBe('handoff:timeout');
      expect(HandoffSocketEvents.HANDOFF_CANCELLED).toBe('handoff:cancelled');
      expect(HandoffSocketEvents.HANDOFF_STATUS_CHANGED).toBe('handoff:status_changed');
      expect(HandoffSocketEvents.HANDOFF_ERROR).toBe('handoff:error');
    });

    it('should have correct error codes', () => {
      expect(HandoffErrorCode.UNAUTHORIZED).toBe('UNAUTHORIZED');
      expect(HandoffErrorCode.RATE_LIMITED).toBe('RATE_LIMITED');
      expect(HandoffErrorCode.INVALID_STATUS).toBe('INVALID_STATUS');
      expect(HandoffErrorCode.REQUEST_NOT_FOUND).toBe('REQUEST_NOT_FOUND');
      expect(HandoffErrorCode.TIMEOUT).toBe('TIMEOUT');
      expect(HandoffErrorCode.ALREADY_PENDING).toBe('ALREADY_PENDING');
      expect(HandoffErrorCode.FORCE_TAKEOVER_DISABLED).toBe('FORCE_TAKEOVER_DISABLED');
    });
  });

  describe('Labels', () => {
    it('should have labels for all HandoffStatus values', () => {
      Object.values(HandoffStatus).forEach((status) => {
        expect(HANDOFF_STATUS_LABELS[status]).toBeDefined();
        expect(typeof HANDOFF_STATUS_LABELS[status]).toBe('string');
      });
    });

    it('should have labels for all SenderType values', () => {
      Object.values(SenderType).forEach((type) => {
        expect(SENDER_TYPE_LABELS[type]).toBeDefined();
        expect(typeof SENDER_TYPE_LABELS[type]).toBe('string');
      });
    });

    it('should have colors for all SenderType values', () => {
      Object.values(SenderType).forEach((type) => {
        expect(SENDER_TYPE_COLORS[type]).toBeDefined();
        expect(typeof SENDER_TYPE_COLORS[type]).toBe('string');
        expect(SENDER_TYPE_COLORS[type]).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });
  });

  describe('Default Config', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_HANDOFF_CONFIG.requestTimeoutSeconds).toBe(30);
      expect(DEFAULT_HANDOFF_CONFIG.minHandoffIntervalSeconds).toBe(5);
      expect(DEFAULT_HANDOFF_CONFIG.maxHandoffsPerHour).toBe(60);
      expect(DEFAULT_HANDOFF_CONFIG.allowForcedTakeover).toBe(true);
      expect(DEFAULT_HANDOFF_CONFIG.allowedRoles).toContain('admin');
      expect(DEFAULT_HANDOFF_CONFIG.allowedRoles).toContain('user');
    });
  });

  describe('canSendMessages', () => {
    it('should return true for AGENT_ACTIVE', () => {
      expect(canSendMessages(HandoffStatus.AGENT_ACTIVE)).toBe(true);
    });

    it('should return true for HUMAN_ACTIVE', () => {
      expect(canSendMessages(HandoffStatus.HUMAN_ACTIVE)).toBe(true);
    });

    it('should return false for pending states', () => {
      expect(canSendMessages(HandoffStatus.PENDING_TAKEOVER)).toBe(false);
      expect(canSendMessages(HandoffStatus.PENDING_HANDOFF)).toBe(false);
    });

    it('should return false for error states', () => {
      expect(canSendMessages(HandoffStatus.TIMEOUT)).toBe(false);
      expect(canSendMessages(HandoffStatus.CANCELLED)).toBe(false);
    });
  });

  describe('isHandoffPending', () => {
    it('should return true for PENDING_TAKEOVER', () => {
      expect(isHandoffPending(HandoffStatus.PENDING_TAKEOVER)).toBe(true);
    });

    it('should return true for PENDING_HANDOFF', () => {
      expect(isHandoffPending(HandoffStatus.PENDING_HANDOFF)).toBe(true);
    });

    it('should return false for active states', () => {
      expect(isHandoffPending(HandoffStatus.AGENT_ACTIVE)).toBe(false);
      expect(isHandoffPending(HandoffStatus.HUMAN_ACTIVE)).toBe(false);
    });

    it('should return false for error states', () => {
      expect(isHandoffPending(HandoffStatus.TIMEOUT)).toBe(false);
      expect(isHandoffPending(HandoffStatus.CANCELLED)).toBe(false);
    });
  });

  describe('canRequestTakeover', () => {
    it('should return true when allowed', () => {
      expect(
        canRequestTakeover(HandoffStatus.AGENT_ACTIVE, 'user', ['user', 'admin'])
      ).toBe(true);
    });

    it('should return false when role not allowed', () => {
      expect(
        canRequestTakeover(HandoffStatus.AGENT_ACTIVE, 'guest', ['user', 'admin'])
      ).toBe(false);
    });

    it('should return false when already in human mode', () => {
      expect(
        canRequestTakeover(HandoffStatus.HUMAN_ACTIVE, 'user', ['user'])
      ).toBe(false);
    });

    it('should return false when pending', () => {
      expect(
        canRequestTakeover(HandoffStatus.PENDING_TAKEOVER, 'user', ['user'])
      ).toBe(false);
    });
  });

  describe('canRequestHandoff', () => {
    it('should return true when allowed', () => {
      expect(
        canRequestHandoff(HandoffStatus.HUMAN_ACTIVE, 'user', ['user', 'admin'])
      ).toBe(true);
    });

    it('should return false when role not allowed', () => {
      expect(
        canRequestHandoff(HandoffStatus.HUMAN_ACTIVE, 'guest', ['user', 'admin'])
      ).toBe(false);
    });

    it('should return false when in agent mode', () => {
      expect(
        canRequestHandoff(HandoffStatus.AGENT_ACTIVE, 'user', ['user'])
      ).toBe(false);
    });

    it('should return false when pending', () => {
      expect(
        canRequestHandoff(HandoffStatus.PENDING_HANDOFF, 'user', ['user'])
      ).toBe(false);
    });
  });

  describe('createInitialHandoffState', () => {
    it('should create initial state with AGENT_ACTIVE', () => {
      const state = createInitialHandoffState('conv-1');

      expect(state.conversationId).toBe('conv-1');
      expect(state.currentStatus).toBe(HandoffStatus.AGENT_ACTIVE);
      expect(state.previousStatus).toBe(HandoffStatus.AGENT_ACTIVE);
      expect(state.currentHandler).toBeNull();
      expect(state.currentHandlerType).toBe(SenderType.AGENT);
      expect(state.activeRequest).toBeNull();
      expect(state.lastHandoffAt).toBeNull();
      expect(state.handoffHistory).toEqual([]);
    });
  });
});
