"use strict";
/**
 * Scene Types and Configuration
 * 场景类型和配置
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCENE_DESCRIPTIONS = exports.SCENE_DISPLAY_NAMES = exports.SCENE_IDS = void 0;
exports.SCENE_IDS = ['visionshare', 'agentdate', 'agentjob', 'agentad'];
// Scene display names
exports.SCENE_DISPLAY_NAMES = {
    visionshare: { zh: '视觉分享', en: 'VisionShare' },
    agentdate: { zh: 'Agent约会', en: 'AgentDate' },
    agentjob: { zh: 'Agent求职', en: 'AgentJob' },
    agentad: { zh: 'Agent广告', en: 'AgentAd' },
};
// Scene descriptions
exports.SCENE_DESCRIPTIONS = {
    visionshare: {
        zh: '分享摄影、艺术作品、设计作品等视觉内容的场景',
        en: 'Share photography, artwork, design and other visual content',
    },
    agentdate: {
        zh: '寻找约会对象、建立社交连接的场景',
        en: 'Find dates and build social connections',
    },
    agentjob: {
        zh: '求职招聘、展示职业能力的场景',
        en: 'Job seeking and recruitment',
    },
    agentad: {
        zh: '发布广告、推广产品和服务的场景',
        en: 'Post advertisements and promote products',
    },
};
//# sourceMappingURL=scene.js.map