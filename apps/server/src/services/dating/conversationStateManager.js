/**
 * Conversation State Manager
 * 对话状态管理服务
 *
 * 管理约会对话的生命周期和状态转换，包括：
 * - 创建初始对话状态
 * - 阶段转换（intro → exploring → deepening → closing → completed）
 * - 轮次计数与限制
 * - 超时与过期处理
 * - 状态持久化
 */
import { logger } from '../../utils/logger';
// 内存状态缓存（作为快速回退，持久化由数据库负责）
const stateCache = new Map();
// 阶段转换规则：定义哪些阶段可以转换到哪些阶段
const VALID_TRANSITIONS = {
    intro: ['exploring', 'completed'],
    exploring: ['deepening', 'closing', 'completed'],
    deepening: ['closing', 'completed'],
    closing: ['completed'],
    completed: [],
};
// 默认配置常量
const DEFAULT_MAX_ROUNDS = 20;
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000; // 30分钟
const INTRO_TO_EXPLORING_MIN_ROUNDS = 2;
const INTRO_TO_EXPLORING_MAX_ROUNDS = 3;
const DEEPENING_TO_CLOSING_APPROACH_THRESHOLD = 0.75; // 接近最大轮次的比例
const DEEPENING_TO_CLOSING_QUALITY_THRESHOLD = 0.8; // 高质量分数阈值
/**
 * 创建初始对话状态
 */
export function createInitialState(roomId, config) {
    const state = {
        roomId,
        status: 'pending',
        phase: 'intro',
        currentRound: 0,
        maxRounds: config?.maxRounds ?? DEFAULT_MAX_ROUNDS,
        startTime: null,
        lastActivityTime: null,
        timeoutMs: config?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        phaseHistory: [],
        metadata: config?.metadata ?? {},
    };
    logger.info('Created initial conversation state', { roomId, maxRounds: state.maxRounds });
    return state;
}
/**
 * 验证阶段转换是否合法
 */
export function validateTransition(from, to) {
    if (from === to)
        return true;
    const allowed = VALID_TRANSITIONS[from] ?? [];
    return allowed.includes(to);
}
/**
 * 执行阶段转换
 */
export function transitionPhase(state, newPhase, trigger) {
    // 检查转换是否合法
    if (!validateTransition(state.phase, newPhase)) {
        const error = `Invalid phase transition: ${state.phase} → ${newPhase}`;
        logger.warn(error, { roomId: state.roomId });
        return {
            success: false,
            previousState: { ...state },
            newState: { ...state },
            error,
        };
    }
    const previousState = { ...state };
    const now = new Date();
    // 记录阶段转换历史
    const transition = {
        from: state.phase,
        to: newPhase,
        round: state.currentRound,
        timestamp: now,
        trigger,
    };
    const updatedState = {
        ...state,
        phase: newPhase,
        lastActivityTime: now,
        phaseHistory: [...state.phaseHistory, transition],
    };
    // 如果进入 completed 阶段，同步更新状态
    if (newPhase === 'completed') {
        updatedState.status = 'completed';
    }
    // 缓存更新后的状态
    stateCache.set(state.roomId, updatedState);
    logger.info('Phase transitioned', {
        roomId: state.roomId,
        from: state.phase,
        to: newPhase,
        round: state.currentRound,
        trigger,
    });
    return {
        success: true,
        previousState,
        newState: updatedState,
    };
}
/**
 * 推进到下一轮
 */
export function advanceRound(state) {
    const now = new Date();
    const updatedState = {
        ...state,
        currentRound: state.currentRound + 1,
        lastActivityTime: now,
    };
    // 首次推进时设置开始时间并激活状态
    if (state.currentRound === 0) {
        updatedState.startTime = now;
        updatedState.status = 'active';
    }
    stateCache.set(state.roomId, updatedState);
    logger.debug('Round advanced', {
        roomId: state.roomId,
        round: updatedState.currentRound,
        maxRounds: updatedState.maxRounds,
    });
    return updatedState;
}
/**
 * 根据当前状态判断是否应该自动转换阶段
 * 返回建议的新阶段，若无需转换则返回 null
 */
export function checkPhaseTransition(state, _messageContent, qualityScore) {
    const { phase, currentRound, maxRounds } = state;
    // intro → exploring: 经过 2-3 轮后自动转换
    if (phase === 'intro') {
        if (currentRound >= INTRO_TO_EXPLORING_MAX_ROUNDS) {
            return 'exploring';
        }
        if (currentRound >= INTRO_TO_EXPLORING_MIN_ROUNDS) {
            // 在最小和最大之间，可以转换（由调用方决定是否执行）
            return 'exploring';
        }
    }
    // exploring → deepening: 当话题深入时（此处用轮次作为代理指标，也可结合 messageContent 分析）
    if (phase === 'exploring') {
        // 简单启发式：经过一定轮次后认为话题已深入
        if (currentRound >= Math.floor(maxRounds * 0.3)) {
            return 'deepening';
        }
    }
    // deepening → closing: 接近最大轮次或质量分数很高
    if (phase === 'deepening') {
        const isApproachingEnd = currentRound >= Math.floor(maxRounds * DEEPENING_TO_CLOSING_APPROACH_THRESHOLD);
        const isHighQuality = qualityScore !== undefined && qualityScore >= DEEPENING_TO_CLOSING_QUALITY_THRESHOLD;
        if (isApproachingEnd || isHighQuality) {
            return 'closing';
        }
    }
    // closing → completed: 所有轮次完成或显式关闭
    if (phase === 'closing') {
        if (currentRound >= maxRounds) {
            return 'completed';
        }
    }
    return null;
}
/**
 * 检查对话是否已完成
 */
export function isConversationComplete(state) {
    return state.phase === 'completed' || state.status === 'completed';
}
/**
 * 获取状态摘要
 */
export function getStateSummary(state) {
    const now = new Date();
    const elapsedMs = state.startTime ? now.getTime() - state.startTime.getTime() : 0;
    const idleMs = state.lastActivityTime ? now.getTime() - state.lastActivityTime.getTime() : 0;
    const isTimedOut = idleMs > state.timeoutMs;
    return {
        roomId: state.roomId,
        status: state.status,
        phase: state.phase,
        currentRound: state.currentRound,
        maxRounds: state.maxRounds,
        roundsRemaining: Math.max(0, state.maxRounds - state.currentRound),
        elapsedSeconds: Math.floor(elapsedMs / 1000),
        idleSeconds: Math.floor(idleMs / 1000),
        isTimedOut,
        phaseTransitionCount: state.phaseHistory.length,
        currentPhaseDurationSeconds: state.phaseHistory.length > 0
            ? Math.floor((now.getTime() -
                state.phaseHistory[state.phaseHistory.length - 1].timestamp.getTime()) /
                1000)
            : Math.floor(elapsedMs / 1000),
    };
}
/**
 * 检查并处理超时
 */
export async function checkTimeout(state) {
    if (isConversationComplete(state)) {
        return null;
    }
    const now = new Date();
    const idleMs = state.lastActivityTime ? now.getTime() - state.lastActivityTime.getTime() : 0;
    if (idleMs > state.timeoutMs) {
        logger.warn('Conversation timed out', { roomId: state.roomId, idleMs });
        // 超时后直接标记为过期
        if (state.phase !== 'completed') {
            const updatedState = {
                ...state,
                status: 'expired',
                lastActivityTime: now,
            };
            stateCache.set(state.roomId, updatedState);
            // 尝试持久化超时状态
            try {
                const { prisma } = await import('../../db/client').catch(() => ({ prisma: null }));
                if (prisma) {
                    await prisma.chatRoom.updateMany({
                        where: { id: state.roomId },
                        data: { status: 'expired', updatedAt: now },
                    });
                }
            }
            catch (err) {
                logger.error('Failed to persist timeout state', {
                    roomId: state.roomId,
                    error: err.message,
                });
            }
            return {
                success: true,
                previousState: { ...state },
                newState: updatedState,
                error: 'Conversation expired due to timeout',
            };
        }
    }
    return null;
}
/**
 * 持久化状态到数据库
 */
export async function persistState(state) {
    try {
        const { prisma } = await import('../../db/client').catch(() => ({ prisma: null }));
        if (!prisma) {
            logger.warn('Prisma not available, state cached only', { roomId: state.roomId });
            return false;
        }
        // 更新数据库中的对话状态
        await prisma.chatRoom.updateMany({
            where: { id: state.roomId },
            data: {
                status: state.status,
                updatedAt: new Date(),
                metadata: {
                    phase: state.phase,
                    currentRound: state.currentRound,
                    maxRounds: state.maxRounds,
                    phaseHistory: state.phaseHistory,
                    ...state.metadata,
                },
            },
        });
        logger.debug('State persisted', {
            roomId: state.roomId,
            phase: state.phase,
            round: state.currentRound,
        });
        return true;
    }
    catch (err) {
        logger.error('Failed to persist state', {
            roomId: state.roomId,
            error: err.message,
        });
        return false;
    }
}
/**
 * 从缓存或数据库加载状态
 */
export async function loadState(roomId) {
    // 先查缓存
    const cached = stateCache.get(roomId);
    if (cached) {
        return cached;
    }
    // 尝试从数据库加载
    try {
        const { prisma } = await import('../../db/client').catch(() => ({ prisma: null }));
        if (!prisma)
            return null;
        const room = await prisma.chatRoom.findUnique({
            where: { id: roomId },
        });
        if (!room || !room.metadata)
            return null;
        const meta = room.metadata;
        const state = {
            roomId,
            status: room.status || 'pending',
            phase: meta.phase || 'intro',
            currentRound: meta.currentRound || 0,
            maxRounds: meta.maxRounds || DEFAULT_MAX_ROUNDS,
            startTime: room.createdAt || null,
            lastActivityTime: room.updatedAt || null,
            timeoutMs: meta.timeoutMs || DEFAULT_TIMEOUT_MS,
            phaseHistory: meta.phaseHistory || [],
            metadata: meta,
        };
        stateCache.set(roomId, state);
        return state;
    }
    catch (err) {
        logger.error('Failed to load state', { roomId, error: err.message });
        return null;
    }
}
/**
 * 终止对话
 */
export function terminateConversation(state, reason) {
    const previousState = { ...state };
    const now = new Date();
    const updatedState = {
        ...state,
        status: 'terminated',
        lastActivityTime: now,
        metadata: {
            ...state.metadata,
            terminatedAt: now.toISOString(),
            terminateReason: reason || 'manual',
        },
    };
    stateCache.set(state.roomId, updatedState);
    logger.info('Conversation terminated', { roomId: state.roomId, reason });
    return {
        success: true,
        previousState,
        newState: updatedState,
    };
}
/**
 * 暂停对话
 */
export function pauseConversation(state) {
    const updatedState = {
        ...state,
        status: 'paused',
        lastActivityTime: new Date(),
    };
    stateCache.set(state.roomId, updatedState);
    logger.info('Conversation paused', { roomId: state.roomId });
    return updatedState;
}
/**
 * 恢复对话
 */
export function resumeConversation(state) {
    const updatedState = {
        ...state,
        status: 'active',
        lastActivityTime: new Date(),
    };
    stateCache.set(state.roomId, updatedState);
    logger.info('Conversation resumed', { roomId: state.roomId });
    return updatedState;
}
export default {
    createInitialState,
    transitionPhase,
    advanceRound,
    checkPhaseTransition,
    isConversationComplete,
    getStateSummary,
    validateTransition,
    checkTimeout,
    persistState,
    loadState,
    terminateConversation,
    pauseConversation,
    resumeConversation,
};
//# sourceMappingURL=conversationStateManager.js.map