"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Handoff Types Tests
 */
const handoff_1 = require("../handoff");
describe('Handoff Types', () => {
    describe('Enums', () => {
        it('should have correct HandoffStatus values', () => {
            expect(handoff_1.HandoffStatus.AGENT_ACTIVE).toBe('AGENT_ACTIVE');
            expect(handoff_1.HandoffStatus.HUMAN_ACTIVE).toBe('HUMAN_ACTIVE');
            expect(handoff_1.HandoffStatus.PENDING_TAKEOVER).toBe('PENDING_TAKEOVER');
            expect(handoff_1.HandoffStatus.PENDING_HANDOFF).toBe('PENDING_HANDOFF');
            expect(handoff_1.HandoffStatus.TIMEOUT).toBe('TIMEOUT');
            expect(handoff_1.HandoffStatus.CANCELLED).toBe('CANCELLED');
        });
        it('should have correct HandoffRequestStatus values', () => {
            expect(handoff_1.HandoffRequestStatus.PENDING).toBe('PENDING');
            expect(handoff_1.HandoffRequestStatus.ACCEPTED).toBe('ACCEPTED');
            expect(handoff_1.HandoffRequestStatus.REJECTED).toBe('REJECTED');
            expect(handoff_1.HandoffRequestStatus.TIMEOUT).toBe('TIMEOUT');
            expect(handoff_1.HandoffRequestStatus.CANCELLED).toBe('CANCELLED');
        });
        it('should have correct SenderType values', () => {
            expect(handoff_1.SenderType.AGENT).toBe('AGENT');
            expect(handoff_1.SenderType.HUMAN).toBe('HUMAN');
            expect(handoff_1.SenderType.SYSTEM).toBe('SYSTEM');
            expect(handoff_1.SenderType.TRANSITION).toBe('TRANSITION');
        });
        it('should have correct socket events', () => {
            expect(handoff_1.HandoffSocketEvents.REQUEST_TAKEOVER).toBe('handoff:request_takeover');
            expect(handoff_1.HandoffSocketEvents.REQUEST_HANDOFF).toBe('handoff:request_handoff');
            expect(handoff_1.HandoffSocketEvents.CONFIRM_HANDOFF).toBe('handoff:confirm');
            expect(handoff_1.HandoffSocketEvents.REJECT_HANDOFF).toBe('handoff:reject');
            expect(handoff_1.HandoffSocketEvents.CANCEL_HANDOFF).toBe('handoff:cancel');
            expect(handoff_1.HandoffSocketEvents.HANDOFF_REQUESTED).toBe('handoff:requested');
            expect(handoff_1.HandoffSocketEvents.HANDOFF_CONFIRMED).toBe('handoff:confirmed');
            expect(handoff_1.HandoffSocketEvents.HANDOFF_REJECTED).toBe('handoff:rejected');
            expect(handoff_1.HandoffSocketEvents.HANDOFF_TIMEOUT).toBe('handoff:timeout');
            expect(handoff_1.HandoffSocketEvents.HANDOFF_CANCELLED).toBe('handoff:cancelled');
            expect(handoff_1.HandoffSocketEvents.HANDOFF_STATUS_CHANGED).toBe('handoff:status_changed');
            expect(handoff_1.HandoffSocketEvents.HANDOFF_ERROR).toBe('handoff:error');
        });
        it('should have correct error codes', () => {
            expect(handoff_1.HandoffErrorCode.UNAUTHORIZED).toBe('UNAUTHORIZED');
            expect(handoff_1.HandoffErrorCode.RATE_LIMITED).toBe('RATE_LIMITED');
            expect(handoff_1.HandoffErrorCode.INVALID_STATUS).toBe('INVALID_STATUS');
            expect(handoff_1.HandoffErrorCode.REQUEST_NOT_FOUND).toBe('REQUEST_NOT_FOUND');
            expect(handoff_1.HandoffErrorCode.TIMEOUT).toBe('TIMEOUT');
            expect(handoff_1.HandoffErrorCode.ALREADY_PENDING).toBe('ALREADY_PENDING');
            expect(handoff_1.HandoffErrorCode.FORCE_TAKEOVER_DISABLED).toBe('FORCE_TAKEOVER_DISABLED');
        });
    });
    describe('Labels', () => {
        it('should have labels for all HandoffStatus values', () => {
            Object.values(handoff_1.HandoffStatus).forEach((status) => {
                expect(handoff_1.HANDOFF_STATUS_LABELS[status]).toBeDefined();
                expect(typeof handoff_1.HANDOFF_STATUS_LABELS[status]).toBe('string');
            });
        });
        it('should have labels for all SenderType values', () => {
            Object.values(handoff_1.SenderType).forEach((type) => {
                expect(handoff_1.SENDER_TYPE_LABELS[type]).toBeDefined();
                expect(typeof handoff_1.SENDER_TYPE_LABELS[type]).toBe('string');
            });
        });
        it('should have colors for all SenderType values', () => {
            Object.values(handoff_1.SenderType).forEach((type) => {
                expect(handoff_1.SENDER_TYPE_COLORS[type]).toBeDefined();
                expect(typeof handoff_1.SENDER_TYPE_COLORS[type]).toBe('string');
                expect(handoff_1.SENDER_TYPE_COLORS[type]).toMatch(/^#[0-9A-Fa-f]{6}$/);
            });
        });
    });
    describe('Default Config', () => {
        it('should have correct default values', () => {
            expect(handoff_1.DEFAULT_HANDOFF_CONFIG.requestTimeoutSeconds).toBe(30);
            expect(handoff_1.DEFAULT_HANDOFF_CONFIG.minHandoffIntervalSeconds).toBe(5);
            expect(handoff_1.DEFAULT_HANDOFF_CONFIG.maxHandoffsPerHour).toBe(60);
            expect(handoff_1.DEFAULT_HANDOFF_CONFIG.allowForcedTakeover).toBe(true);
            expect(handoff_1.DEFAULT_HANDOFF_CONFIG.allowedRoles).toContain('admin');
            expect(handoff_1.DEFAULT_HANDOFF_CONFIG.allowedRoles).toContain('user');
        });
    });
    describe('canSendMessages', () => {
        it('should return true for AGENT_ACTIVE', () => {
            expect((0, handoff_1.canSendMessages)(handoff_1.HandoffStatus.AGENT_ACTIVE)).toBe(true);
        });
        it('should return true for HUMAN_ACTIVE', () => {
            expect((0, handoff_1.canSendMessages)(handoff_1.HandoffStatus.HUMAN_ACTIVE)).toBe(true);
        });
        it('should return false for pending states', () => {
            expect((0, handoff_1.canSendMessages)(handoff_1.HandoffStatus.PENDING_TAKEOVER)).toBe(false);
            expect((0, handoff_1.canSendMessages)(handoff_1.HandoffStatus.PENDING_HANDOFF)).toBe(false);
        });
        it('should return false for error states', () => {
            expect((0, handoff_1.canSendMessages)(handoff_1.HandoffStatus.TIMEOUT)).toBe(false);
            expect((0, handoff_1.canSendMessages)(handoff_1.HandoffStatus.CANCELLED)).toBe(false);
        });
    });
    describe('isHandoffPending', () => {
        it('should return true for PENDING_TAKEOVER', () => {
            expect((0, handoff_1.isHandoffPending)(handoff_1.HandoffStatus.PENDING_TAKEOVER)).toBe(true);
        });
        it('should return true for PENDING_HANDOFF', () => {
            expect((0, handoff_1.isHandoffPending)(handoff_1.HandoffStatus.PENDING_HANDOFF)).toBe(true);
        });
        it('should return false for active states', () => {
            expect((0, handoff_1.isHandoffPending)(handoff_1.HandoffStatus.AGENT_ACTIVE)).toBe(false);
            expect((0, handoff_1.isHandoffPending)(handoff_1.HandoffStatus.HUMAN_ACTIVE)).toBe(false);
        });
        it('should return false for error states', () => {
            expect((0, handoff_1.isHandoffPending)(handoff_1.HandoffStatus.TIMEOUT)).toBe(false);
            expect((0, handoff_1.isHandoffPending)(handoff_1.HandoffStatus.CANCELLED)).toBe(false);
        });
    });
    describe('canRequestTakeover', () => {
        it('should return true when allowed', () => {
            expect((0, handoff_1.canRequestTakeover)(handoff_1.HandoffStatus.AGENT_ACTIVE, 'user', ['user', 'admin'])).toBe(true);
        });
        it('should return false when role not allowed', () => {
            expect((0, handoff_1.canRequestTakeover)(handoff_1.HandoffStatus.AGENT_ACTIVE, 'guest', ['user', 'admin'])).toBe(false);
        });
        it('should return false when already in human mode', () => {
            expect((0, handoff_1.canRequestTakeover)(handoff_1.HandoffStatus.HUMAN_ACTIVE, 'user', ['user'])).toBe(false);
        });
        it('should return false when pending', () => {
            expect((0, handoff_1.canRequestTakeover)(handoff_1.HandoffStatus.PENDING_TAKEOVER, 'user', ['user'])).toBe(false);
        });
    });
    describe('canRequestHandoff', () => {
        it('should return true when allowed', () => {
            expect((0, handoff_1.canRequestHandoff)(handoff_1.HandoffStatus.HUMAN_ACTIVE, 'user', ['user', 'admin'])).toBe(true);
        });
        it('should return false when role not allowed', () => {
            expect((0, handoff_1.canRequestHandoff)(handoff_1.HandoffStatus.HUMAN_ACTIVE, 'guest', ['user', 'admin'])).toBe(false);
        });
        it('should return false when in agent mode', () => {
            expect((0, handoff_1.canRequestHandoff)(handoff_1.HandoffStatus.AGENT_ACTIVE, 'user', ['user'])).toBe(false);
        });
        it('should return false when pending', () => {
            expect((0, handoff_1.canRequestHandoff)(handoff_1.HandoffStatus.PENDING_HANDOFF, 'user', ['user'])).toBe(false);
        });
    });
    describe('createInitialHandoffState', () => {
        it('should create initial state with AGENT_ACTIVE', () => {
            const state = (0, handoff_1.createInitialHandoffState)('conv-1');
            expect(state.conversationId).toBe('conv-1');
            expect(state.currentStatus).toBe(handoff_1.HandoffStatus.AGENT_ACTIVE);
            expect(state.previousStatus).toBe(handoff_1.HandoffStatus.AGENT_ACTIVE);
            expect(state.currentHandler).toBeNull();
            expect(state.currentHandlerType).toBe(handoff_1.SenderType.AGENT);
            expect(state.activeRequest).toBeNull();
            expect(state.lastHandoffAt).toBeNull();
            expect(state.handoffHistory).toEqual([]);
        });
    });
});
//# sourceMappingURL=handoff.test.js.map