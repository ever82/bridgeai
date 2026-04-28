"use strict";
/**
 * Agent types shared between client and server
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VALID_STATUS_TRANSITIONS = exports.AGENT_STATUS_COLORS = exports.AGENT_TYPE_COLORS = exports.AGENT_STATUS_LABELS = exports.AGENT_TYPE_LABELS = exports.AgentStatus = exports.AgentType = void 0;
var AgentType;
(function (AgentType) {
    AgentType["VISIONSHARE"] = "VISIONSHARE";
    AgentType["AGENTDATE"] = "AGENTDATE";
    AgentType["AGENTJOB"] = "AGENTJOB";
    AgentType["AGENTAD"] = "AGENTAD";
    AgentType["DEMAND"] = "DEMAND";
    AgentType["SUPPLY"] = "SUPPLY";
})(AgentType || (exports.AgentType = AgentType = {}));
var AgentStatus;
(function (AgentStatus) {
    AgentStatus["DRAFT"] = "DRAFT";
    AgentStatus["ACTIVE"] = "ACTIVE";
    AgentStatus["PAUSED"] = "PAUSED";
    AgentStatus["ARCHIVED"] = "ARCHIVED";
})(AgentStatus || (exports.AgentStatus = AgentStatus = {}));
// Agent type display names
exports.AGENT_TYPE_LABELS = {
    [AgentType.VISIONSHARE]: 'Vision Share',
    [AgentType.AGENTDATE]: 'Agent Date',
    [AgentType.AGENTJOB]: 'Agent Job',
    [AgentType.AGENTAD]: 'Agent Ad',
    [AgentType.DEMAND]: 'Demand',
    [AgentType.SUPPLY]: 'Supply',
};
// Agent status display names
exports.AGENT_STATUS_LABELS = {
    [AgentStatus.DRAFT]: 'Draft',
    [AgentStatus.ACTIVE]: 'Active',
    [AgentStatus.PAUSED]: 'Paused',
    [AgentStatus.ARCHIVED]: 'Archived',
};
// Agent type colors for UI
exports.AGENT_TYPE_COLORS = {
    [AgentType.VISIONSHARE]: '#4CAF50',
    [AgentType.AGENTDATE]: '#E91E63',
    [AgentType.AGENTJOB]: '#2196F3',
    [AgentType.AGENTAD]: '#FF9800',
    [AgentType.DEMAND]: '#9C27B0',
    [AgentType.SUPPLY]: '#00BCD4',
};
// Agent status colors for UI
exports.AGENT_STATUS_COLORS = {
    [AgentStatus.DRAFT]: '#9E9E9E',
    [AgentStatus.ACTIVE]: '#4CAF50',
    [AgentStatus.PAUSED]: '#FFC107',
    [AgentStatus.ARCHIVED]: '#757575',
};
// Valid status transitions for UI
exports.VALID_STATUS_TRANSITIONS = {
    [AgentStatus.DRAFT]: [AgentStatus.ACTIVE, AgentStatus.ARCHIVED],
    [AgentStatus.ACTIVE]: [AgentStatus.PAUSED, AgentStatus.ARCHIVED],
    [AgentStatus.PAUSED]: [AgentStatus.ACTIVE, AgentStatus.ARCHIVED],
    [AgentStatus.ARCHIVED]: [],
};
//# sourceMappingURL=agent.js.map