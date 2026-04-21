"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMessage = exports.serializeMessage = exports.isVersionCompatible = exports.createAgentMessage = exports.validateAgentMessage = exports.AgentProtocolErrorCode = exports.MessagePriority = exports.AgentMessageType = exports.PROTOCOL_VERSION = void 0;
// Shared types and utilities
__exportStar(require("./types"), exports);
__exportStar(require("./schemas"), exports);
__exportStar(require("./utils"), exports);
__exportStar(require("./env"), exports);
__exportStar(require("./config/scenes"), exports);
// Re-export from agentMessage, but exclude AgentType to avoid conflict with types/agent.ts
var agentMessage_1 = require("./protocols/agentMessage");
Object.defineProperty(exports, "PROTOCOL_VERSION", { enumerable: true, get: function () { return agentMessage_1.PROTOCOL_VERSION; } });
Object.defineProperty(exports, "AgentMessageType", { enumerable: true, get: function () { return agentMessage_1.AgentMessageType; } });
Object.defineProperty(exports, "MessagePriority", { enumerable: true, get: function () { return agentMessage_1.MessagePriority; } });
Object.defineProperty(exports, "AgentProtocolErrorCode", { enumerable: true, get: function () { return agentMessage_1.AgentProtocolErrorCode; } });
Object.defineProperty(exports, "validateAgentMessage", { enumerable: true, get: function () { return agentMessage_1.validateAgentMessage; } });
Object.defineProperty(exports, "createAgentMessage", { enumerable: true, get: function () { return agentMessage_1.createAgentMessage; } });
Object.defineProperty(exports, "isVersionCompatible", { enumerable: true, get: function () { return agentMessage_1.isVersionCompatible; } });
Object.defineProperty(exports, "serializeMessage", { enumerable: true, get: function () { return agentMessage_1.serializeMessage; } });
Object.defineProperty(exports, "parseMessage", { enumerable: true, get: function () { return agentMessage_1.parseMessage; } });
//# sourceMappingURL=index.js.map