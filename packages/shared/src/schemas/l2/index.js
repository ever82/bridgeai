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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.L2_SCHEMAS = exports.agentAdConsumerL2Schema = exports.agentAdL2Schema = exports.agentJobL2Schema = exports.agentDateL2Schema = exports.visionShareL2Schema = void 0;
exports.getL2Schema = getL2Schema;
exports.getAllL2Schemas = getAllL2Schemas;
exports.getL2SchemaIds = getL2SchemaIds;
// L2 Schema Definitions
__exportStar(require("./types"), exports);
var visionShare_1 = require("./visionShare");
Object.defineProperty(exports, "visionShareL2Schema", { enumerable: true, get: function () { return __importDefault(visionShare_1).default; } });
var agentDate_1 = require("./agentDate");
Object.defineProperty(exports, "agentDateL2Schema", { enumerable: true, get: function () { return __importDefault(agentDate_1).default; } });
var agentJob_1 = require("./agentJob");
Object.defineProperty(exports, "agentJobL2Schema", { enumerable: true, get: function () { return __importDefault(agentJob_1).default; } });
var agentAd_1 = require("./agentAd");
Object.defineProperty(exports, "agentAdL2Schema", { enumerable: true, get: function () { return __importDefault(agentAd_1).default; } });
var agentAdConsumer_1 = require("./agentAdConsumer");
Object.defineProperty(exports, "agentAdConsumerL2Schema", { enumerable: true, get: function () { return __importDefault(agentAdConsumer_1).default; } });
const visionShare_2 = __importDefault(require("./visionShare"));
const agentDate_2 = __importDefault(require("./agentDate"));
const agentJob_2 = __importDefault(require("./agentJob"));
const agentAd_2 = __importDefault(require("./agentAd"));
const agentAdConsumer_2 = __importDefault(require("./agentAdConsumer"));
// Schema registry
exports.L2_SCHEMAS = {
    VISIONSHARE: visionShare_2.default,
    AGENTDATE: agentDate_2.default,
    AGENTJOB: agentJob_2.default,
    AGENTAD: agentAd_2.default,
    AGENTAD_CONSUMER: agentAdConsumer_2.default,
};
// Get schema by scene code
function getL2Schema(scene, role) {
    // Normalize scene to uppercase for lookup
    const normalizedScene = scene?.toUpperCase();
    // For AgentAd with CONSUMER role, use consumer schema
    if (normalizedScene === 'AGENTAD' && role === 'CONSUMER') {
        return agentAdConsumer_2.default;
    }
    return exports.L2_SCHEMAS[normalizedScene];
}
// Get all schemas
function getAllL2Schemas() {
    return Object.values(exports.L2_SCHEMAS);
}
// Get schema IDs
function getL2SchemaIds() {
    return Object.keys(exports.L2_SCHEMAS);
}
//# sourceMappingURL=index.js.map