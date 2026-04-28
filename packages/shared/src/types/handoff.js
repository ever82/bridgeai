"use strict";
/**
 * Human Handoff Types
 *
 * Types for managing human-agent conversation switching.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SENDER_TYPE_COLORS = exports.SENDER_TYPE_LABELS = exports.HANDOFF_STATUS_LABELS = exports.DEFAULT_HANDOFF_CONFIG = exports.HandoffErrorCode = exports.HandoffSocketEvents = exports.SenderType = exports.HandoffRequestStatus = exports.HandoffStatus = void 0;
exports.canSendMessages = canSendMessages;
exports.isHandoffPending = isHandoffPending;
exports.canRequestTakeover = canRequestTakeover;
exports.canRequestHandoff = canRequestHandoff;
exports.createInitialHandoffState = createInitialHandoffState;
/**
 * Handoff status states
 */
var HandoffStatus;
(function (HandoffStatus) {
    /** Agent is handling the conversation */
    HandoffStatus["AGENT_ACTIVE"] = "AGENT_ACTIVE";
    /** Human has taken over the conversation */
    HandoffStatus["HUMAN_ACTIVE"] = "HUMAN_ACTIVE";
    /** Pending handoff request (waiting for confirmation) */
    HandoffStatus["PENDING_TAKEOVER"] = "PENDING_TAKEOVER";
    /** Pending handback request (waiting for confirmation) */
    HandoffStatus["PENDING_HANDOFF"] = "PENDING_HANDOFF";
    /** Handoff request timed out */
    HandoffStatus["TIMEOUT"] = "TIMEOUT";
    /** Handoff was cancelled */
    HandoffStatus["CANCELLED"] = "CANCELLED";
})(HandoffStatus || (exports.HandoffStatus = HandoffStatus = {}));
/**
 * Handoff request status
 */
var HandoffRequestStatus;
(function (HandoffRequestStatus) {
    HandoffRequestStatus["PENDING"] = "PENDING";
    HandoffRequestStatus["ACCEPTED"] = "ACCEPTED";
    HandoffRequestStatus["REJECTED"] = "REJECTED";
    HandoffRequestStatus["TIMEOUT"] = "TIMEOUT";
    HandoffRequestStatus["CANCELLED"] = "CANCELLED";
})(HandoffRequestStatus || (exports.HandoffRequestStatus = HandoffRequestStatus = {}));
/**
 * Sender type for messages
 */
var SenderType;
(function (SenderType) {
    SenderType["AGENT"] = "AGENT";
    SenderType["HUMAN"] = "HUMAN";
    SenderType["SYSTEM"] = "SYSTEM";
    SenderType["TRANSITION"] = "TRANSITION";
})(SenderType || (exports.SenderType = SenderType = {}));
/**
 * Socket events for handoff
 */
var HandoffSocketEvents;
(function (HandoffSocketEvents) {
    // Client -> Server
    HandoffSocketEvents["REQUEST_TAKEOVER"] = "handoff:request_takeover";
    HandoffSocketEvents["REQUEST_HANDOFF"] = "handoff:request_handoff";
    HandoffSocketEvents["CONFIRM_HANDOFF"] = "handoff:confirm";
    HandoffSocketEvents["REJECT_HANDOFF"] = "handoff:reject";
    HandoffSocketEvents["CANCEL_HANDOFF"] = "handoff:cancel";
    // Server -> Client
    HandoffSocketEvents["HANDOFF_REQUESTED"] = "handoff:requested";
    HandoffSocketEvents["HANDOFF_CONFIRMED"] = "handoff:confirmed";
    HandoffSocketEvents["HANDOFF_REJECTED"] = "handoff:rejected";
    HandoffSocketEvents["HANDOFF_TIMEOUT"] = "handoff:timeout";
    HandoffSocketEvents["HANDOFF_CANCELLED"] = "handoff:cancelled";
    HandoffSocketEvents["HANDOFF_STATUS_CHANGED"] = "handoff:status_changed";
    HandoffSocketEvents["HANDOFF_ERROR"] = "handoff:error";
})(HandoffSocketEvents || (exports.HandoffSocketEvents = HandoffSocketEvents = {}));
/**
 * Handoff error codes
 */
var HandoffErrorCode;
(function (HandoffErrorCode) {
    HandoffErrorCode["UNAUTHORIZED"] = "UNAUTHORIZED";
    HandoffErrorCode["RATE_LIMITED"] = "RATE_LIMITED";
    HandoffErrorCode["INVALID_STATUS"] = "INVALID_STATUS";
    HandoffErrorCode["REQUEST_NOT_FOUND"] = "REQUEST_NOT_FOUND";
    HandoffErrorCode["TIMEOUT"] = "TIMEOUT";
    HandoffErrorCode["ALREADY_PENDING"] = "ALREADY_PENDING";
    HandoffErrorCode["FORCE_TAKEOVER_DISABLED"] = "FORCE_TAKEOVER_DISABLED";
})(HandoffErrorCode || (exports.HandoffErrorCode = HandoffErrorCode = {}));
/**
 * Default handoff configuration
 */
exports.DEFAULT_HANDOFF_CONFIG = {
    requestTimeoutSeconds: 30,
    minHandoffIntervalSeconds: 5,
    maxHandoffsPerHour: 60,
    allowForcedTakeover: true,
    allowedRoles: ['admin', 'moderator', 'agent', 'user'],
};
/**
 * Handoff status display labels
 */
exports.HANDOFF_STATUS_LABELS = {
    [HandoffStatus.AGENT_ACTIVE]: 'AI Agent',
    [HandoffStatus.HUMAN_ACTIVE]: 'Human Support',
    [HandoffStatus.PENDING_TAKEOVER]: 'Requesting Takeover...',
    [HandoffStatus.PENDING_HANDOFF]: 'Requesting Handoff...',
    [HandoffStatus.TIMEOUT]: 'Request Timed Out',
    [HandoffStatus.CANCELLED]: 'Cancelled',
};
/**
 * Sender type display labels
 */
exports.SENDER_TYPE_LABELS = {
    [SenderType.AGENT]: 'AI Agent',
    [SenderType.HUMAN]: 'Human',
    [SenderType.SYSTEM]: 'System',
    [SenderType.TRANSITION]: 'Transition',
};
/**
 * Sender type colors for UI
 */
exports.SENDER_TYPE_COLORS = {
    [SenderType.AGENT]: '#4CAF50',
    [SenderType.HUMAN]: '#2196F3',
    [SenderType.SYSTEM]: '#757575',
    [SenderType.TRANSITION]: '#FF9800',
};
/**
 * Check if handoff status allows sending messages
 */
function canSendMessages(status) {
    return status === HandoffStatus.AGENT_ACTIVE || status === HandoffStatus.HUMAN_ACTIVE;
}
/**
 * Check if handoff is pending
 */
function isHandoffPending(status) {
    return status === HandoffStatus.PENDING_TAKEOVER || status === HandoffStatus.PENDING_HANDOFF;
}
/**
 * Check if user can request takeover
 */
function canRequestTakeover(currentStatus, userRole, allowedRoles) {
    if (!allowedRoles.includes(userRole)) {
        return false;
    }
    return currentStatus === HandoffStatus.AGENT_ACTIVE && !isHandoffPending(currentStatus);
}
/**
 * Check if user can request handoff
 */
function canRequestHandoff(currentStatus, userRole, allowedRoles) {
    if (!allowedRoles.includes(userRole)) {
        return false;
    }
    return currentStatus === HandoffStatus.HUMAN_ACTIVE && !isHandoffPending(currentStatus);
}
/**
 * Create initial handoff state
 */
function createInitialHandoffState(conversationId) {
    return {
        conversationId,
        currentStatus: HandoffStatus.AGENT_ACTIVE,
        previousStatus: HandoffStatus.AGENT_ACTIVE,
        currentHandler: null,
        currentHandlerType: SenderType.AGENT,
        activeRequest: null,
        lastHandoffAt: null,
        handoffHistory: [],
    };
}
//# sourceMappingURL=handoff.js.map