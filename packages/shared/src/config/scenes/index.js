"use strict";
/**
 * Scene Configurations
 * 场景配置导出
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sceneRegistry = exports.agentAdConfig = exports.agentJobConfig = exports.agentDateConfig = exports.visionShareConfig = void 0;
exports.getSceneConfig = getSceneConfig;
exports.getAllSceneConfigs = getAllSceneConfigs;
exports.getActiveSceneConfigs = getActiveSceneConfigs;
exports.getSceneInfo = getSceneInfo;
exports.getAllSceneInfos = getAllSceneInfos;
exports.hasScene = hasScene;
exports.registerScene = registerScene;
exports.unregisterScene = unregisterScene;
const visionShare_1 = require("./visionShare");
Object.defineProperty(exports, "visionShareConfig", { enumerable: true, get: function () { return visionShare_1.visionShareConfig; } });
const agentDate_1 = require("./agentDate");
Object.defineProperty(exports, "agentDateConfig", { enumerable: true, get: function () { return agentDate_1.agentDateConfig; } });
const agentJob_1 = require("./agentJob");
Object.defineProperty(exports, "agentJobConfig", { enumerable: true, get: function () { return agentJob_1.agentJobConfig; } });
const agentAd_1 = require("./agentAd");
Object.defineProperty(exports, "agentAdConfig", { enumerable: true, get: function () { return agentAd_1.agentAdConfig; } });
exports.sceneRegistry = new Map([
    ['visionshare', visionShare_1.visionShareConfig],
    ['agentdate', agentDate_1.agentDateConfig],
    ['agentjob', agentJob_1.agentJobConfig],
    ['agentad', agentAd_1.agentAdConfig],
]);
/**
 * Get scene configuration by ID
 */
function getSceneConfig(sceneId) {
    return exports.sceneRegistry.get(sceneId);
}
/**
 * Get all scene configurations
 */
function getAllSceneConfigs() {
    return Array.from(exports.sceneRegistry.values());
}
/**
 * Get active scene configurations
 */
function getActiveSceneConfigs() {
    return Array.from(exports.sceneRegistry.values()).filter(s => s.metadata.isActive);
}
/**
 * Get scene info (lightweight metadata)
 */
function getSceneInfo(sceneId) {
    const config = exports.sceneRegistry.get(sceneId);
    if (!config)
        return null;
    return {
        id: config.id,
        name: config.metadata.name,
        description: config.metadata.description,
        icon: config.metadata.icon,
        color: config.metadata.color,
        isActive: config.metadata.isActive,
        fieldCount: config.fields.length,
        capabilityCount: config.capabilities.length,
    };
}
/**
 * Get all scene infos
 */
function getAllSceneInfos() {
    return getAllSceneConfigs()
        .map(c => getSceneInfo(c.id))
        .filter(Boolean);
}
/**
 * Check if scene exists
 */
function hasScene(sceneId) {
    return exports.sceneRegistry.has(sceneId);
}
/**
 * Register a new scene configuration
 */
function registerScene(config) {
    exports.sceneRegistry.set(config.id, config);
}
/**
 * Unregister a scene configuration
 */
function unregisterScene(sceneId) {
    return exports.sceneRegistry.delete(sceneId);
}
//# sourceMappingURL=index.js.map