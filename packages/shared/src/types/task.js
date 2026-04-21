"use strict";
/**
 * Task Types for VisionShare
 * VisionShare场景任务类型定义
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PUBLISH_TIME_OPTIONS = exports.SORT_OPTIONS = exports.DISTANCE_RANGE_OPTIONS = exports.DEFAULT_TASK_FILTER = exports.TASK_PRIORITY_LABELS = exports.TASK_TYPE_LABELS = exports.TASK_STATUS_COLORS = exports.TASK_STATUS_LABELS = void 0;
exports.TASK_STATUS_LABELS = {
    pending: { zh: '待接单', en: 'Pending' },
    accepted: { zh: '已接单', en: 'Accepted' },
    in_progress: { zh: '进行中', en: 'In Progress' },
    completed: { zh: '已完成', en: 'Completed' },
    cancelled: { zh: '已取消', en: 'Cancelled' },
    disputed: { zh: '申诉中', en: 'Disputed' },
};
exports.TASK_STATUS_COLORS = {
    pending: '#8C8C8C',
    accepted: '#1890FF',
    in_progress: '#FAAD14',
    completed: '#52C41A',
    cancelled: '#FF4D4F',
    disputed: '#722ED1',
};
exports.TASK_TYPE_LABELS = {
    photography: { zh: '摄影', en: 'Photography' },
    video: { zh: '视频拍摄', en: 'Video Shooting' },
    design: { zh: '设计', en: 'Design' },
    artwork: { zh: '艺术作品', en: 'Artwork' },
    modeling: { zh: '模特', en: 'Modeling' },
    editing: { zh: '后期编辑', en: 'Editing' },
    other: { zh: '其他', en: 'Other' },
};
exports.TASK_PRIORITY_LABELS = {
    urgent: { zh: '紧急', en: 'Urgent', color: '#FF4D4F' },
    high: { zh: '高', en: 'High', color: '#FF7A45' },
    normal: { zh: '普通', en: 'Normal', color: '#FFA940' },
    low: { zh: '低', en: 'Low', color: '#73D13D' },
};
// ============================================
// Constants
// ============================================
exports.DEFAULT_TASK_FILTER = {
    distanceRange: 5,
    budgetMin: 0,
    budgetMax: 10000,
    types: [],
    publishTimeRange: 'week',
    sortBy: 'distance',
    sortOrder: 'asc',
    page: 1,
    limit: 20,
};
exports.DISTANCE_RANGE_OPTIONS = [
    { value: 1, label: '1km', labelZh: '1公里' },
    { value: 5, label: '5km', labelZh: '5公里' },
    { value: 10, label: '10km', labelZh: '10公里' },
    { value: 0, label: 'City', labelZh: '全城' },
];
exports.SORT_OPTIONS = [
    { value: 'distance', label: 'Distance', labelZh: '距离最近' },
    { value: 'time', label: 'Time', labelZh: '最新发布' },
    { value: 'budget', label: 'Budget', labelZh: '预算最高' },
    { value: 'match', label: 'Match', labelZh: '匹配度' },
];
exports.PUBLISH_TIME_OPTIONS = [
    { value: 'today', label: 'Today', labelZh: '今天' },
    { value: 'week', label: 'This Week', labelZh: '本周' },
    { value: 'month', label: 'This Month', labelZh: '本月' },
    { value: 'all', label: 'All Time', labelZh: '全部' },
];
// Note: calculateDistance function is exported from utils/geoUtils.ts
// Import it from there: import { calculateDistance } from '@bridgeai/shared';
//# sourceMappingURL=task.js.map