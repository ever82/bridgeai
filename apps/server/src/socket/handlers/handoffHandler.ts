/**
 * Handoff Socket Event Handlers
 *
 * Handles human-agent conversation switching via socket events.
 */
import type { Namespace } from 'socket.io';
import {
  HandoffStatus,
  HandoffRequestStatus,
  SenderType,
  HandoffSocketEvents,
  HandoffErrorCode,
  type HandoffRequest,
  type HandoffState,
  type HandoffAuditLog,
  DEFAULT_HANDOFF_CONFIG,
} from '@bridgeai/shared';

import type { AuthenticatedSocket } from '../middleware/auth';

// In-memory store for handoff states (in production, use Redis)
const handoffStates = new Map<string, HandoffState>();
const handoffRequests = new Map<string, HandoffRequest>();
const handoffAuditLogs: HandoffAuditLog[] = [];
const userHandoffTimestamps = new Map<string, number[]>();

/**
 * Register handoff event handlers
 */
export function registerHandoffHandlers(socket: AuthenticatedSocket, nsp: Namespace): void {
  const userId = socket.user?.id;
  const userRole = socket.user?.roles?.[0] || 'user';

  if (!userId) {
    console.error('[Handoff] User not authenticated');
    return;
  }

  // Request takeover (human takes over from agent)
  socket.on(
    HandoffSocketEvents.REQUEST_TAKEOVER,
    async (data: { conversationId: string; reason?: string; force?: boolean }, callback) => {
      try {
        const { conversationId, reason, force = false } = data;

        // Check permissions
        if (!DEFAULT_HANDOFF_CONFIG.allowedRoles.includes(userRole)) {
          callback?.({
            success: false,
            error: {
              code: HandoffErrorCode.UNAUTHORIZED,
              message: 'Not authorized to request takeover',
            },
          });
          return;
        }

        // Get or create handoff state
        let state = handoffStates.get(conversationId);
        if (!state) {
          state = {
            conversationId,
            currentStatus: HandoffStatus.AGENT_ACTIVE,
            previousStatus: HandoffStatus.AGENT_ACTIVE,
            currentHandler: null,
            currentHandlerType: SenderType.AGENT,
            activeRequest: null,
            lastHandoffAt: null,
            handoffHistory: [],
          };
          handoffStates.set(conversationId, state);
        }

        // Check if already pending
        if (state.currentStatus === HandoffStatus.PENDING_TAKEOVER) {
          callback?.({
            success: false,
            error: {
              code: HandoffErrorCode.ALREADY_PENDING,
              message: 'Takeover request already pending',
            },
          });
          return;
        }

        // Check if already in human mode
        if (state.currentStatus === HandoffStatus.HUMAN_ACTIVE) {
          callback?.({
            success: false,
            error: { code: HandoffErrorCode.INVALID_STATUS, message: 'Already in human mode' },
          });
          return;
        }

        // Rate limiting check
        if (!checkRateLimit(userId)) {
          callback?.({
            success: false,
            error: { code: HandoffErrorCode.RATE_LIMITED, message: 'Too many handoff requests' },
          });
          return;
        }

        // Create handoff request
        const requestId = generateRequestId();
        const request: HandoffRequest = {
          id: requestId,
          conversationId,
          requestType: 'takeover',
          requestedBy: userId,
          requestedAt: new Date().toISOString(),
          status: HandoffRequestStatus.PENDING,
          timeoutAt: new Date(
            Date.now() + DEFAULT_HANDOFF_CONFIG.requestTimeoutSeconds * 1000
          ).toISOString(),
          reason,
        };

        handoffRequests.set(requestId, request);
        state.activeRequest = request;
        state.previousStatus = state.currentStatus;
        state.currentStatus = HandoffStatus.PENDING_TAKEOVER;

        // Log audit
        logAudit({
          id: generateAuditId(),
          conversationId,
          action: force ? 'FORCE_TAKEOVER' : 'REQUEST_TAKEOVER',
          performedBy: userId,
          performedAt: new Date().toISOString(),
          metadata: { requestId, reason, force },
        });

        // If forced takeover, immediately confirm
        if (force && DEFAULT_HANDOFF_CONFIG.allowForcedTakeover) {
          await completeTakeover(conversationId, requestId, userId, nsp);
          callback?.({
            success: true,
            data: { requestId, status: HandoffStatus.HUMAN_ACTIVE, forced: true },
          });
          return;
        }

        // If forced takeover not allowed
        if (force && !DEFAULT_HANDOFF_CONFIG.allowForcedTakeover) {
          callback?.({
            success: false,
            error: {
              code: HandoffErrorCode.FORCE_TAKEOVER_DISABLED,
              message: 'Forced takeover is disabled',
            },
          });
          return;
        }

        // Broadcast request to conversation room
        nsp.to(conversationId).emit(HandoffSocketEvents.HANDOFF_REQUESTED, {
          requestId,
          type: 'takeover',
          requestedBy: userId,
          requestedAt: request.requestedAt,
          timeoutAt: request.timeoutAt,
          reason,
        });

        // Set timeout
        setTimeout(() => {
          handleTimeout(requestId, conversationId, nsp);
        }, DEFAULT_HANDOFF_CONFIG.requestTimeoutSeconds * 1000);

        callback?.({
          success: true,
          data: {
            requestId,
            status: HandoffStatus.PENDING_TAKEOVER,
            timeoutSeconds: DEFAULT_HANDOFF_CONFIG.requestTimeoutSeconds,
          },
        });
      } catch (error) {
        console.error('[Handoff] Request takeover error:', error);
        callback?.({
          success: false,
          error: { code: HandoffErrorCode.UNAUTHORIZED, message: 'Failed to request takeover' },
        });
      }
    }
  );

  // Request handoff (human hands back to agent)
  socket.on(
    HandoffSocketEvents.REQUEST_HANDOFF,
    async (data: { conversationId: string; reason?: string }, callback) => {
      try {
        const { conversationId, reason } = data;

        // Check permissions
        if (!DEFAULT_HANDOFF_CONFIG.allowedRoles.includes(userRole)) {
          callback?.({
            success: false,
            error: {
              code: HandoffErrorCode.UNAUTHORIZED,
              message: 'Not authorized to request handoff',
            },
          });
          return;
        }

        // Get handoff state
        const state = handoffStates.get(conversationId);
        if (!state) {
          callback?.({
            success: false,
            error: { code: HandoffErrorCode.INVALID_STATUS, message: 'Conversation not found' },
          });
          return;
        }

        // Check if already pending
        if (state.currentStatus === HandoffStatus.PENDING_HANDOFF) {
          callback?.({
            success: false,
            error: {
              code: HandoffErrorCode.ALREADY_PENDING,
              message: 'Handoff request already pending',
            },
          });
          return;
        }

        // Check if in human mode
        if (state.currentStatus !== HandoffStatus.HUMAN_ACTIVE) {
          callback?.({
            success: false,
            error: { code: HandoffErrorCode.INVALID_STATUS, message: 'Not in human mode' },
          });
          return;
        }

        // Create handoff request
        const requestId = generateRequestId();
        const request: HandoffRequest = {
          id: requestId,
          conversationId,
          requestType: 'handoff',
          requestedBy: userId,
          requestedAt: new Date().toISOString(),
          status: HandoffRequestStatus.PENDING,
          timeoutAt: new Date(
            Date.now() + DEFAULT_HANDOFF_CONFIG.requestTimeoutSeconds * 1000
          ).toISOString(),
          reason,
        };

        handoffRequests.set(requestId, request);
        state.activeRequest = request;
        state.previousStatus = state.currentStatus;
        state.currentStatus = HandoffStatus.PENDING_HANDOFF;

        // Log audit
        logAudit({
          id: generateAuditId(),
          conversationId,
          action: 'REQUEST_HANDOFF',
          performedBy: userId,
          performedAt: new Date().toISOString(),
          metadata: { requestId, reason },
        });

        // Broadcast request to conversation room
        nsp.to(conversationId).emit(HandoffSocketEvents.HANDOFF_REQUESTED, {
          requestId,
          type: 'handoff',
          requestedBy: userId,
          requestedAt: request.requestedAt,
          timeoutAt: request.timeoutAt,
          reason,
        });

        // Set timeout
        setTimeout(() => {
          handleTimeout(requestId, conversationId, nsp);
        }, DEFAULT_HANDOFF_CONFIG.requestTimeoutSeconds * 1000);

        callback?.({
          success: true,
          data: {
            requestId,
            status: HandoffStatus.PENDING_HANDOFF,
            timeoutSeconds: DEFAULT_HANDOFF_CONFIG.requestTimeoutSeconds,
          },
        });
      } catch (error) {
        console.error('[Handoff] Request handoff error:', error);
        callback?.({
          success: false,
          error: { code: HandoffErrorCode.UNAUTHORIZED, message: 'Failed to request handoff' },
        });
      }
    }
  );

  // Confirm handoff request
  socket.on(HandoffSocketEvents.CONFIRM_HANDOFF, async (data: { requestId: string }, callback) => {
    try {
      const { requestId } = data;
      const request = handoffRequests.get(requestId);

      if (!request) {
        callback?.({
          success: false,
          error: { code: HandoffErrorCode.REQUEST_NOT_FOUND, message: 'Request not found' },
        });
        return;
      }

      const state = handoffStates.get(request.conversationId);
      if (!state) {
        callback?.({
          success: false,
          error: { code: HandoffErrorCode.INVALID_STATUS, message: 'Conversation not found' },
        });
        return;
      }

      // Check if request is still pending
      if (request.status !== HandoffRequestStatus.PENDING) {
        callback?.({
          success: false,
          error: { code: HandoffErrorCode.INVALID_STATUS, message: 'Request is not pending' },
        });
        return;
      }

      // Update request status
      request.status = HandoffRequestStatus.ACCEPTED;

      // Complete the handoff
      if (request.requestType === 'takeover') {
        await completeTakeover(request.conversationId, requestId, userId, nsp);
      } else {
        await completeHandoff(request.conversationId, requestId, nsp);
      }

      callback?.({
        success: true,
        data: { requestId, status: state.currentStatus },
      });
    } catch (error) {
      console.error('[Handoff] Confirm handoff error:', error);
      callback?.({
        success: false,
        error: { code: HandoffErrorCode.UNAUTHORIZED, message: 'Failed to confirm handoff' },
      });
    }
  });

  // Reject handoff request
  socket.on(
    HandoffSocketEvents.REJECT_HANDOFF,
    async (data: { requestId: string; reason?: string }, callback) => {
      try {
        const { requestId, reason } = data;
        const request = handoffRequests.get(requestId);

        if (!request) {
          callback?.({
            success: false,
            error: { code: HandoffErrorCode.REQUEST_NOT_FOUND, message: 'Request not found' },
          });
          return;
        }

        const state = handoffStates.get(request.conversationId);
        if (!state) {
          callback?.({
            success: false,
            error: { code: HandoffErrorCode.INVALID_STATUS, message: 'Conversation not found' },
          });
          return;
        }

        // Check if request is still pending
        if (request.status !== HandoffRequestStatus.PENDING) {
          callback?.({
            success: false,
            error: { code: HandoffErrorCode.INVALID_STATUS, message: 'Request is not pending' },
          });
          return;
        }

        // Update request status
        request.status = HandoffRequestStatus.REJECTED;

        // Revert to previous status
        state.currentStatus = state.previousStatus;
        state.activeRequest = null;

        // Log audit
        logAudit({
          id: generateAuditId(),
          conversationId: request.conversationId,
          action: 'REJECT',
          performedBy: userId,
          performedAt: new Date().toISOString(),
          metadata: { requestId, reason },
        });

        // Broadcast rejection
        nsp.to(request.conversationId).emit(HandoffSocketEvents.HANDOFF_REJECTED, {
          requestId,
          rejectedBy: userId,
          rejectedAt: new Date().toISOString(),
          reason,
        });

        callback?.({
          success: true,
          data: { requestId, status: state.currentStatus },
        });
      } catch (error) {
        console.error('[Handoff] Reject handoff error:', error);
        callback?.({
          success: false,
          error: { code: HandoffErrorCode.UNAUTHORIZED, message: 'Failed to reject handoff' },
        });
      }
    }
  );

  // Cancel handoff request
  socket.on(HandoffSocketEvents.CANCEL_HANDOFF, async (data: { requestId: string }, callback) => {
    try {
      const { requestId } = data;
      const request = handoffRequests.get(requestId);

      if (!request) {
        callback?.({
          success: false,
          error: { code: HandoffErrorCode.REQUEST_NOT_FOUND, message: 'Request not found' },
        });
        return;
      }

      // Only requester can cancel
      if (request.requestedBy !== userId) {
        callback?.({
          success: false,
          error: { code: HandoffErrorCode.UNAUTHORIZED, message: 'Only requester can cancel' },
        });
        return;
      }

      const state = handoffStates.get(request.conversationId);
      if (!state) {
        callback?.({
          success: false,
          error: { code: HandoffErrorCode.INVALID_STATUS, message: 'Conversation not found' },
        });
        return;
      }

      // Check if request is still pending
      if (request.status !== HandoffRequestStatus.PENDING) {
        callback?.({
          success: false,
          error: { code: HandoffErrorCode.INVALID_STATUS, message: 'Request is not pending' },
        });
        return;
      }

      // Update request status
      request.status = HandoffRequestStatus.CANCELLED;

      // Revert to previous status
      state.currentStatus = state.previousStatus;
      state.activeRequest = null;

      // Log audit
      logAudit({
        id: generateAuditId(),
        conversationId: request.conversationId,
        action: 'CANCEL',
        performedBy: userId,
        performedAt: new Date().toISOString(),
        metadata: { requestId },
      });

      // Broadcast cancellation
      nsp.to(request.conversationId).emit(HandoffSocketEvents.HANDOFF_CANCELLED, {
        requestId,
        cancelledBy: userId,
        cancelledAt: new Date().toISOString(),
      });

      callback?.({
        success: true,
        data: { requestId, status: state.currentStatus },
      });
    } catch (error) {
      console.error('[Handoff] Cancel handoff error:', error);
      callback?.({
        success: false,
        error: { code: HandoffErrorCode.UNAUTHORIZED, message: 'Failed to cancel handoff' },
      });
    }
  });

  // Get handoff status
  socket.on('handoff:get_status', (data: { conversationId: string }, callback) => {
    const state = handoffStates.get(data.conversationId);
    if (state) {
      callback?.({
        success: true,
        data: {
          status: state.currentStatus,
          handler: state.currentHandler,
          handlerType: state.currentHandlerType,
          activeRequest: state.activeRequest,
        },
      });
    } else {
      callback?.({
        success: true,
        data: {
          status: HandoffStatus.AGENT_ACTIVE,
          handler: null,
          handlerType: SenderType.AGENT,
          activeRequest: null,
        },
      });
    }
  });
}

/**
 * Complete takeover (human takes over)
 */
async function completeTakeover(
  conversationId: string,
  requestId: string,
  userId: string,
  nsp: Namespace
): Promise<void> {
  const state = handoffStates.get(conversationId);
  if (!state) return;

  const previousStatus = state.currentStatus;
  const previousHandler = state.currentHandler;

  // Update state
  state.currentStatus = HandoffStatus.HUMAN_ACTIVE;
  state.currentHandler = userId;
  state.currentHandlerType = SenderType.HUMAN;
  state.lastHandoffAt = new Date().toISOString();
  state.activeRequest = null;

  // Add to history
  state.handoffHistory.push({
    id: generateHistoryId(),
    timestamp: new Date().toISOString(),
    fromStatus: previousStatus,
    toStatus: HandoffStatus.HUMAN_ACTIVE,
    fromHandler: previousHandler,
    toHandler: userId,
  });

  // Log audit
  logAudit({
    id: generateAuditId(),
    conversationId,
    action: 'CONFIRM_TAKEOVER',
    performedBy: userId,
    performedAt: new Date().toISOString(),
    metadata: { requestId },
  });

  // Broadcast status change
  nsp.to(conversationId).emit(HandoffSocketEvents.HANDOFF_CONFIRMED, {
    requestId,
    type: 'takeover',
    newStatus: HandoffStatus.HUMAN_ACTIVE,
    handler: userId,
    handlerType: SenderType.HUMAN,
    confirmedAt: new Date().toISOString(),
  });

  nsp.to(conversationId).emit(HandoffSocketEvents.HANDOFF_STATUS_CHANGED, {
    conversationId,
    previousStatus,
    newStatus: HandoffStatus.HUMAN_ACTIVE,
    handler: userId,
    handlerType: SenderType.HUMAN,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Complete handoff (human hands back to agent)
 */
async function completeHandoff(
  conversationId: string,
  requestId: string,
  nsp: Namespace
): Promise<void> {
  const state = handoffStates.get(conversationId);
  if (!state) return;

  const previousStatus = state.currentStatus;
  const previousHandler = state.currentHandler;

  // Update state
  state.currentStatus = HandoffStatus.AGENT_ACTIVE;
  state.currentHandler = null;
  state.currentHandlerType = SenderType.AGENT;
  state.lastHandoffAt = new Date().toISOString();
  state.activeRequest = null;

  // Add to history
  state.handoffHistory.push({
    id: generateHistoryId(),
    timestamp: new Date().toISOString(),
    fromStatus: previousStatus,
    toStatus: HandoffStatus.AGENT_ACTIVE,
    fromHandler: previousHandler,
    toHandler: null,
  });

  // Log audit
  logAudit({
    id: generateAuditId(),
    conversationId,
    action: 'CONFIRM_HANDOFF',
    performedBy: state.currentHandler || 'system',
    performedAt: new Date().toISOString(),
    metadata: { requestId },
  });

  // Broadcast status change
  nsp.to(conversationId).emit(HandoffSocketEvents.HANDOFF_CONFIRMED, {
    requestId,
    type: 'handoff',
    newStatus: HandoffStatus.AGENT_ACTIVE,
    handler: null,
    handlerType: SenderType.AGENT,
    confirmedAt: new Date().toISOString(),
  });

  nsp.to(conversationId).emit(HandoffSocketEvents.HANDOFF_STATUS_CHANGED, {
    conversationId,
    previousStatus,
    newStatus: HandoffStatus.AGENT_ACTIVE,
    handler: null,
    handlerType: SenderType.AGENT,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Handle handoff timeout
 */
function handleTimeout(requestId: string, conversationId: string, nsp: Namespace): void {
  const request = handoffRequests.get(requestId);
  const state = handoffStates.get(conversationId);

  if (!request || !state) return;

  // Only timeout pending requests
  if (request.status !== HandoffRequestStatus.PENDING) return;

  // Update request status
  request.status = HandoffRequestStatus.TIMEOUT;

  // Revert to previous status
  state.currentStatus = state.previousStatus;
  state.activeRequest = null;

  // Log audit
  logAudit({
    id: generateAuditId(),
    conversationId,
    action: 'TIMEOUT',
    performedBy: 'system',
    performedAt: new Date().toISOString(),
    metadata: { requestId },
  });

  // Broadcast timeout
  nsp.to(conversationId).emit(HandoffSocketEvents.HANDOFF_TIMEOUT, {
    requestId,
    conversationId,
    timedOutAt: new Date().toISOString(),
  });
}

/**
 * Check rate limit for handoff requests
 */
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;

  // Get user's handoff timestamps
  let timestamps = userHandoffTimestamps.get(userId) || [];

  // Filter to last hour
  timestamps = timestamps.filter(ts => ts > oneHourAgo);

  // Check if exceeds max per hour
  if (timestamps.length >= DEFAULT_HANDOFF_CONFIG.maxHandoffsPerHour) {
    return false;
  }

  // Check min interval
  if (timestamps.length > 0) {
    const lastTimestamp = timestamps[timestamps.length - 1];
    if (now - lastTimestamp < DEFAULT_HANDOFF_CONFIG.minHandoffIntervalSeconds * 1000) {
      return false;
    }
  }

  // Add current timestamp
  timestamps.push(now);
  userHandoffTimestamps.set(userId, timestamps);

  return true;
}

/**
 * Log audit entry
 */
function logAudit(entry: HandoffAuditLog): void {
  handoffAuditLogs.push(entry);
  // In production, persist to database
  console.log('[Handoff Audit]', entry);
}

/**
 * Generate unique IDs
 */
function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateAuditId(): string {
  return `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateHistoryId(): string {
  return `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get handoff state for a conversation
 */
export function getHandoffState(conversationId: string): HandoffState | undefined {
  return handoffStates.get(conversationId);
}

/**
 * Get handoff request by ID
 */
export function getHandoffRequest(requestId: string): HandoffRequest | undefined {
  return handoffRequests.get(requestId);
}

/**
 * Get audit logs for a conversation
 */
export function getHandoffAuditLogs(conversationId: string): HandoffAuditLog[] {
  return handoffAuditLogs.filter(log => log.conversationId === conversationId);
}

export default { registerHandoffHandlers, getHandoffState, getHandoffRequest, getHandoffAuditLogs };
