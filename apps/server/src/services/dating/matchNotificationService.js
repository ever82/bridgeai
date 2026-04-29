/**
 * Match Notification Service
 * 约会匹配推送通知服务 - 每日推荐推送、个性化内容、频率控制、时间偏好
 */
import { logger } from '../../utils/logger';
// ============================================
// 类型定义
// ============================================
export var MatchNotificationType;
(function (MatchNotificationType) {
    MatchNotificationType["DAILY_RECOMMENDATION"] = "daily_recommendation";
    MatchNotificationType["NEW_MATCH"] = "new_match";
    MatchNotificationType["MATCH_REMINDER"] = "match_reminder";
    MatchNotificationType["FEEDBACK_REQUEST"] = "feedback_request";
})(MatchNotificationType || (MatchNotificationType = {}));
// ============================================
// 存储
// ============================================
const notificationStore = new Map();
const preferenceStore = new Map();
const sentCountToday = new Map();
const DEFAULT_PREFERENCES = {
    enabled: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    preferredTime: '10:00',
    maxDailyNotifications: 3,
    frequency: 'daily_digest',
};
// ============================================
// 频率控制
// ============================================
/**
 * 检查是否可以发送通知（频率控制）
 */
function canSendNotification(userId) {
    const prefs = preferenceStore.get(userId) ?? DEFAULT_PREFERENCES;
    if (!prefs.enabled)
        return false;
    const now = new Date();
    // 免打扰时间检查
    if (prefs.quietHoursStart && prefs.quietHoursEnd) {
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const [startH, startM] = prefs.quietHoursStart.split(':').map(Number);
        const [endH, endM] = prefs.quietHoursEnd.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        if (startMinutes <= endMinutes) {
            // 同一天内的时间段 (如 08:00-22:00)
            if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
                // 在免打扰时间内
                return false;
            }
        }
        else {
            // 跨午夜的时间段 (如 22:00-08:00)
            if (currentMinutes >= startMinutes || currentMinutes < endMinutes) {
                return false;
            }
        }
    }
    // 每日上限检查
    const counter = sentCountToday.get(userId);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    if (!counter || counter.resetAt < todayStart) {
        sentCountToday.set(userId, { count: 0, resetAt: todayStart });
        return true;
    }
    return counter.count < prefs.maxDailyNotifications;
}
/**
 * 记录已发送通知
 */
function recordSent(userId) {
    const counter = sentCountToday.get(userId);
    if (counter) {
        counter.count++;
    }
}
// ============================================
// 推送内容生成
// ============================================
/**
 * 生成个性化每日推荐推送内容
 */
function generateDailyRecommendationContent(matchCount, topMatch) {
    if (matchCount === 0) {
        return {
            title: '今日推荐',
            body: '今天暂无新的推荐，我们正在为你寻找更合适的对象。完善资料可以提高匹配度哦！',
        };
    }
    const highlights = topMatch?.highlights ?? [];
    const highlightText = highlights.length > 0 ? highlights.slice(0, 2).join('、') : '高匹配度对象';
    const scoreText = topMatch ? `匹配度${topMatch.totalScore}%` : '';
    return {
        title: `今日为你推荐${matchCount}位对象`,
        body: `${highlightText}${scoreText ? '，' + scoreText : ''}，快来看看吧！`,
    };
}
/**
 * 生成新匹配推送内容
 */
function generateNewMatchContent(match) {
    const highlights = match.highlights.slice(0, 2).join('、');
    return {
        title: '发现高匹配对象！',
        body: `匹配度${match.totalScore}%，${highlights || '快来看看吧'}`,
    };
}
/**
 * 生成反馈请求推送内容
 */
function generateFeedbackContent() {
    const messages = [
        '昨天的推荐还满意吗？你的反馈能帮助我们推荐更精准的对象。',
        '你对最近的推荐有什么想法？告诉我们，让匹配更懂你！',
        '花1分钟反馈，让推荐更精准。',
    ];
    return {
        title: '推荐反馈',
        body: messages[Math.floor(Math.random() * messages.length)],
    };
}
// ============================================
// 核心发送逻辑
// ============================================
/**
 * 发送每日推荐推送通知
 */
export async function sendDailyRecommendationNotification(userId, matchScores) {
    if (!canSendNotification(userId)) {
        logger.info(`Skipping daily recommendation notification for user ${userId}: frequency limit or quiet hours`);
        return null;
    }
    const topMatch = matchScores.length > 0 ? matchScores[0] : undefined;
    const content = generateDailyRecommendationContent(matchScores.length, topMatch);
    const notification = {
        id: `notif_${Date.now()}_${userId}`,
        userId,
        type: MatchNotificationType.DAILY_RECOMMENDATION,
        payload: {
            type: MatchNotificationType.DAILY_RECOMMENDATION,
            title: content.title,
            body: content.body,
            data: {
                matchCount: matchScores.length,
                topMatchScore: topMatch?.totalScore,
                topMatchHighlights: topMatch?.highlights.slice(0, 3),
                topMatchProfileId: topMatch?.profileId,
            },
            priority: 'high',
        },
        sentAt: new Date(),
    };
    // 存储通知
    const existing = notificationStore.get(userId) ?? [];
    existing.push(notification);
    notificationStore.set(userId, existing);
    recordSent(userId);
    logger.info(`Sent daily recommendation notification to user ${userId}: ${matchScores.length} matches`);
    return notification;
}
/**
 * 发送新匹配通知
 */
export async function sendNewMatchNotification(userId, match) {
    if (!canSendNotification(userId))
        return null;
    const content = generateNewMatchContent(match);
    const notification = {
        id: `notif_${Date.now()}_${userId}`,
        userId,
        type: MatchNotificationType.NEW_MATCH,
        payload: {
            type: MatchNotificationType.NEW_MATCH,
            title: content.title,
            body: content.body,
            data: {
                profileId: match.profileId,
                score: match.totalScore,
                highlights: match.highlights,
            },
            priority: 'high',
        },
        sentAt: new Date(),
    };
    const existing = notificationStore.get(userId) ?? [];
    existing.push(notification);
    notificationStore.set(userId, existing);
    recordSent(userId);
    logger.info(`Sent new match notification to user ${userId}: score=${match.totalScore}`);
    return notification;
}
/**
 * 发送反馈请求通知
 */
export async function sendFeedbackRequestNotification(userId) {
    if (!canSendNotification(userId))
        return null;
    const content = generateFeedbackContent();
    const notification = {
        id: `notif_${Date.now()}_${userId}`,
        userId,
        type: MatchNotificationType.FEEDBACK_REQUEST,
        payload: {
            type: MatchNotificationType.FEEDBACK_REQUEST,
            title: content.title,
            body: content.body,
            priority: 'low',
        },
        sentAt: new Date(),
    };
    const existing = notificationStore.get(userId) ?? [];
    existing.push(notification);
    notificationStore.set(userId, existing);
    recordSent(userId);
    logger.info(`Sent feedback request notification to user ${userId}`);
    return notification;
}
// ============================================
// 偏好管理
// ============================================
/**
 * 获取用户通知偏好
 */
export function getNotificationPreferences(userId) {
    return preferenceStore.get(userId) ?? { ...DEFAULT_PREFERENCES };
}
/**
 * 更新用户通知偏好
 */
export function updateNotificationPreferences(userId, prefs) {
    const current = getNotificationPreferences(userId);
    const updated = { ...current, ...prefs };
    preferenceStore.set(userId, updated);
    logger.info(`Updated notification preferences for user ${userId}`);
    return updated;
}
// ============================================
// 查询
// ============================================
/**
 * 获取用户的通知列表
 */
export function getUserNotifications(userId, options) {
    const notifications = notificationStore.get(userId) ?? [];
    let filtered = notifications;
    if (options?.type) {
        filtered = filtered.filter(n => n.type === options.type);
    }
    if (options?.limit) {
        filtered = filtered.slice(-options.limit);
    }
    return filtered;
}
/**
 * 标记通知已读
 */
export function markNotificationRead(userId, notificationId) {
    const notifications = notificationStore.get(userId) ?? [];
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
        notification.readAt = new Date();
        return true;
    }
    return false;
}
export default {
    sendDailyRecommendationNotification,
    sendNewMatchNotification,
    sendFeedbackRequestNotification,
    getNotificationPreferences,
    updateNotificationPreferences,
    getUserNotifications,
    markNotificationRead,
};
//# sourceMappingURL=matchNotificationService.js.map