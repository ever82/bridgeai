"use strict";
/**
 * Conversation State Manager Tests
 * 对话状态管理服务测试
 */
Object.defineProperty(exports, "__esModule", { value: true });
jest.mock('../../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));
jest.mock('../../../db/client', () => ({
    prisma: null,
}));
const conversationStateManager_1 = require("../conversationStateManager");
describe('conversationStateManager', () => {
    describe('createInitialState', () => {
        it('should create with correct defaults', () => {
            const state = (0, conversationStateManager_1.createInitialState)('room-123');
            expect(state.roomId).toBe('room-123');
            expect(state.status).toBe('pending');
            expect(state.phase).toBe('intro');
            expect(state.currentRound).toBe(0);
            expect(state.maxRounds).toBe(20);
            expect(state.timeoutMs).toBe(30 * 60 * 1000);
            expect(state.startTime).toBeNull();
            expect(state.lastActivityTime).toBeNull();
            expect(state.phaseHistory).toEqual([]);
            expect(state.metadata).toEqual({});
        });
        it('should accept custom config', () => {
            const state = (0, conversationStateManager_1.createInitialState)('room-123', {
                maxRounds: 10,
                timeoutMs: 60000,
                metadata: { key: 'value' },
            });
            expect(state.maxRounds).toBe(10);
            expect(state.timeoutMs).toBe(60000);
            expect(state.metadata).toEqual({ key: 'value' });
        });
    });
    describe('validateTransition', () => {
        it('should allow same-phase transition', () => {
            expect((0, conversationStateManager_1.validateTransition)('intro', 'intro')).toBe(true);
            expect((0, conversationStateManager_1.validateTransition)('exploring', 'exploring')).toBe(true);
        });
        it('should allow valid transitions', () => {
            // intro -> exploring
            expect((0, conversationStateManager_1.validateTransition)('intro', 'exploring')).toBe(true);
            // intro -> completed (early completion)
            expect((0, conversationStateManager_1.validateTransition)('intro', 'completed')).toBe(true);
            // exploring -> deepening
            expect((0, conversationStateManager_1.validateTransition)('exploring', 'deepening')).toBe(true);
            // exploring -> closing
            expect((0, conversationStateManager_1.validateTransition)('exploring', 'closing')).toBe(true);
            // exploring -> completed
            expect((0, conversationStateManager_1.validateTransition)('exploring', 'completed')).toBe(true);
            // deepening -> closing
            expect((0, conversationStateManager_1.validateTransition)('deepening', 'closing')).toBe(true);
            // deepening -> completed
            expect((0, conversationStateManager_1.validateTransition)('deepening', 'completed')).toBe(true);
            // closing -> completed
            expect((0, conversationStateManager_1.validateTransition)('closing', 'completed')).toBe(true);
        });
        it('should reject invalid transitions', () => {
            // Cannot go backwards
            expect((0, conversationStateManager_1.validateTransition)('exploring', 'intro')).toBe(false);
            expect((0, conversationStateManager_1.validateTransition)('deepening', 'intro')).toBe(false);
            expect((0, conversationStateManager_1.validateTransition)('deepening', 'exploring')).toBe(false);
            expect((0, conversationStateManager_1.validateTransition)('closing', 'intro')).toBe(false);
            expect((0, conversationStateManager_1.validateTransition)('closing', 'exploring')).toBe(false);
            expect((0, conversationStateManager_1.validateTransition)('closing', 'deepening')).toBe(false);
            // Cannot transition from completed
            expect((0, conversationStateManager_1.validateTransition)('completed', 'intro')).toBe(false);
            expect((0, conversationStateManager_1.validateTransition)('completed', 'exploring')).toBe(false);
            // Cannot skip phases
            expect((0, conversationStateManager_1.validateTransition)('intro', 'deepening')).toBe(false);
            expect((0, conversationStateManager_1.validateTransition)('intro', 'closing')).toBe(false);
            expect((0, conversationStateManager_1.validateTransition)('exploring', 'completed')).toBe(true); // Valid
        });
    });
    describe('transitionPhase', () => {
        it('should allow valid phase transitions', () => {
            const state = (0, conversationStateManager_1.createInitialState)('room-123');
            const result = (0, conversationStateManager_1.transitionPhase)(state, 'exploring', 'auto');
            expect(result.success).toBe(true);
            expect(result.newState.phase).toBe('exploring');
            expect(result.previousState.phase).toBe('intro');
            expect(result.newState.phaseHistory.length).toBe(1);
            expect(result.newState.phaseHistory[0].from).toBe('intro');
            expect(result.newState.phaseHistory[0].to).toBe('exploring');
            expect(result.newState.phaseHistory[0].trigger).toBe('auto');
        });
        it('should reject invalid phase transitions', () => {
            const state = (0, conversationStateManager_1.createInitialState)('room-123');
            const result = (0, conversationStateManager_1.transitionPhase)(state, 'deepening', 'auto');
            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid phase transition');
            expect(result.newState.phase).toBe('intro'); // Unchanged
        });
        it('should set status to completed when transitioning to completed phase', () => {
            const state = (0, conversationStateManager_1.createInitialState)('room-123');
            state.phase = 'closing';
            const result = (0, conversationStateManager_1.transitionPhase)(state, 'completed', 'manual');
            expect(result.success).toBe(true);
            expect(result.newState.phase).toBe('completed');
            expect(result.newState.status).toBe('completed');
        });
        it('should record phase transition history with correct timestamps', () => {
            const state = (0, conversationStateManager_1.createInitialState)('room-123');
            const beforeTransition = new Date();
            const result = (0, conversationStateManager_1.transitionPhase)(state, 'exploring', 'manual');
            expect(result.newState.phaseHistory[0].timestamp.getTime()).toBeGreaterThanOrEqual(beforeTransition.getTime());
            expect(result.newState.lastActivityTime).toBeInstanceOf(Date);
        });
    });
    describe('advanceRound', () => {
        it('should increment round', () => {
            const state = (0, conversationStateManager_1.createInitialState)('room-123');
            const updated = (0, conversationStateManager_1.advanceRound)(state);
            expect(updated.currentRound).toBe(1);
            expect(updated.lastActivityTime).toBeInstanceOf(Date);
        });
        it('should set startTime and status to active on first advance', () => {
            const state = (0, conversationStateManager_1.createInitialState)('room-123');
            const updated = (0, conversationStateManager_1.advanceRound)(state);
            expect(updated.startTime).toBeInstanceOf(Date);
            expect(updated.status).toBe('active');
        });
        it('should not reset startTime on subsequent advances', () => {
            let state = (0, conversationStateManager_1.createInitialState)('room-123');
            state = (0, conversationStateManager_1.advanceRound)(state);
            const firstStartTime = state.startTime;
            state = (0, conversationStateManager_1.advanceRound)(state);
            expect(state.startTime?.getTime()).toBe(firstStartTime?.getTime());
            expect(state.currentRound).toBe(2);
        });
    });
    describe('isConversationComplete', () => {
        it('should detect completion when phase is completed', () => {
            const state = (0, conversationStateManager_1.createInitialState)('room-123');
            state.phase = 'completed';
            expect((0, conversationStateManager_1.isConversationComplete)(state)).toBe(true);
        });
        it('should detect completion when status is completed', () => {
            const state = (0, conversationStateManager_1.createInitialState)('room-123');
            state.status = 'completed';
            expect((0, conversationStateManager_1.isConversationComplete)(state)).toBe(true);
        });
        it('should return false for active conversations', () => {
            const state = (0, conversationStateManager_1.createInitialState)('room-123');
            state.status = 'active';
            state.phase = 'exploring';
            expect((0, conversationStateManager_1.isConversationComplete)(state)).toBe(false);
        });
        it('should return false for pending conversations', () => {
            const state = (0, conversationStateManager_1.createInitialState)('room-123');
            expect((0, conversationStateManager_1.isConversationComplete)(state)).toBe(false);
        });
    });
    describe('checkPhaseTransition', () => {
        it('should suggest exploring after minimum rounds in intro', () => {
            const state = (0, conversationStateManager_1.createInitialState)('room-123', { maxRounds: 10 });
            state.phase = 'intro';
            state.currentRound = 2;
            const suggested = (0, conversationStateManager_1.checkPhaseTransition)(state);
            expect(suggested).toBe('exploring');
        });
        it('should suggest exploring after maximum rounds in intro', () => {
            const state = (0, conversationStateManager_1.createInitialState)('room-123', { maxRounds: 10 });
            state.phase = 'intro';
            state.currentRound = 3;
            const suggested = (0, conversationStateManager_1.checkPhaseTransition)(state);
            expect(suggested).toBe('exploring');
        });
        it('should not suggest transition in early intro', () => {
            const state = (0, conversationStateManager_1.createInitialState)('room-123', { maxRounds: 10 });
            state.phase = 'intro';
            state.currentRound = 1;
            const suggested = (0, conversationStateManager_1.checkPhaseTransition)(state);
            expect(suggested).toBeNull();
        });
        it('should suggest deepening after threshold in exploring', () => {
            const state = (0, conversationStateManager_1.createInitialState)('room-123', { maxRounds: 10 });
            state.phase = 'exploring';
            state.currentRound = 4; // > 30% of maxRounds
            const suggested = (0, conversationStateManager_1.checkPhaseTransition)(state);
            expect(suggested).toBe('deepening');
        });
        it('should suggest closing when approaching max rounds', () => {
            const state = (0, conversationStateManager_1.createInitialState)('room-123', { maxRounds: 10 });
            state.phase = 'deepening';
            state.currentRound = 8; // > 75% of maxRounds
            const suggested = (0, conversationStateManager_1.checkPhaseTransition)(state);
            expect(suggested).toBe('closing');
        });
        it('should suggest closing when quality is high', () => {
            const state = (0, conversationStateManager_1.createInitialState)('room-123', { maxRounds: 10 });
            state.phase = 'deepening';
            state.currentRound = 3; // Not near max rounds, but high quality
            const suggested = (0, conversationStateManager_1.checkPhaseTransition)(state, undefined, 0.9);
            expect(suggested).toBe('closing');
        });
        it('should suggest completed when closing reaches max rounds', () => {
            const state = (0, conversationStateManager_1.createInitialState)('room-123', { maxRounds: 10 });
            state.phase = 'closing';
            state.currentRound = 10;
            const suggested = (0, conversationStateManager_1.checkPhaseTransition)(state);
            expect(suggested).toBe('completed');
        });
        it('should return null when no transition needed', () => {
            const state = (0, conversationStateManager_1.createInitialState)('room-123', { maxRounds: 10 });
            state.phase = 'intro';
            state.currentRound = 1;
            const suggested = (0, conversationStateManager_1.checkPhaseTransition)(state);
            expect(suggested).toBeNull();
        });
    });
    describe('terminateConversation', () => {
        it('should mark conversation as terminated', () => {
            const state = (0, conversationStateManager_1.createInitialState)('room-123');
            const result = (0, conversationStateManager_1.terminateConversation)(state, 'User requested');
            expect(result.success).toBe(true);
            expect(result.newState.status).toBe('terminated');
            expect(result.newState.metadata.terminatedAt).toBeDefined();
            expect(result.newState.metadata.terminateReason).toBe('User requested');
        });
        it('should use default reason when not provided', () => {
            const state = (0, conversationStateManager_1.createInitialState)('room-123');
            const result = (0, conversationStateManager_1.terminateConversation)(state);
            expect(result.newState.metadata.terminateReason).toBe('manual');
        });
    });
    describe('pauseConversation', () => {
        it('should set status to paused', () => {
            const state = (0, conversationStateManager_1.createInitialState)('room-123');
            state.status = 'active';
            const result = (0, conversationStateManager_1.pauseConversation)(state);
            expect(result.status).toBe('paused');
            expect(result.lastActivityTime).toBeInstanceOf(Date);
        });
    });
    describe('resumeConversation', () => {
        it('should set status back to active', () => {
            const state = (0, conversationStateManager_1.createInitialState)('room-123');
            state.status = 'paused';
            const result = (0, conversationStateManager_1.resumeConversation)(state);
            expect(result.status).toBe('active');
            expect(result.lastActivityTime).toBeInstanceOf(Date);
        });
    });
});
//# sourceMappingURL=conversationStateManager.test.js.map