/**
 * Conversation Safety Service
 * 会话安全服务 (ISSUE-DATE003 c6)
 *
 * 功能:
 * - 敏感话题检测
 * - 不当内容过滤
 * - 异常中断处理
 * - 紧急终止机制
 * - 纠纷举报管理
 */
import { logger } from '../../utils/logger';
import { DEFAULT_SENSITIVE_WORDS } from '../../config/sensitiveWords';
import { prisma } from '../../db/client';
// 默认安全配置
const safetyConfig = {
    enableContentFilter: true,
    enableSensitiveTopicDetection: true,
    enablePersonalInfoProtection: true,
    autoTerminateThreshold: 'critical',
};
// 敏感话题关键词库
const SENSITIVE_TOPICS = {
    // 政治敏感话题
    politics: ['政治', '领导', '政府', '政党', '选举', '示威', '抗议'],
    // 暴力相关
    violence: ['打架', '暴力', '伤害', '武器', '枪', '刀', '报复'],
    // 金钱敏感
    money: ['借钱', '汇款', '转账', '中奖', '奖金', '投资回报'],
    // 隐私相关
    privacy: ['地址', '电话', '身份证', '密码', '账户', '银行'],
    // 宗教信仰
    religion: ['佛', '上帝', '基督', '宗教', '信仰', '寺庙', '教堂'],
};
/**
 * 不当内容模式库
 * 从集中敏感词配置构建，按 category 分组为正则模式
 */
const INAPPROPRIATE_PATTERNS = (() => {
    // 按 category 分组，每个 category 合并为一个正则
    const categoryMap = new Map();
    for (const w of DEFAULT_SENSITIVE_WORDS) {
        const existing = categoryMap.get(w.category) || [];
        existing.push(w.word);
        categoryMap.set(w.category, existing);
    }
    // 为每个 category 创建一条正则
    const patterns = [];
    for (const [, words] of categoryMap) {
        const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        patterns.push(new RegExp(escaped.join('|'), 'i'));
    }
    return patterns;
})();
/**
 * 个人隐私信息模式
 */
const PERSONAL_INFO_PATTERNS = [
    // 手机号
    /1[3-9]\d{9}/g,
    // 微信号
    /微[信号码]?\s*[:：]?\s*[a-zA-Z0-9_@]+/gi,
    // 邮箱
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    // 详细地址
    /[省市区县路街号栋楼].*[路街号栋楼]/g,
    // 身份证号
    /\d{17}[\dXx]/g,
    // 银行卡号
    /\d{16,19}/g,
];
/**
 * 检查消息安全性
 * 综合检测敏感话题、不当内容和隐私信息
 */
export async function checkMessageSafety(roomId, messageId, content, senderId) {
    const startTime = Date.now();
    logger.debug('开始消息安全检查', { roomId, messageId, senderId });
    const flags = [];
    let level = 'safe';
    let action = 'allow';
    // 1. 敏感话题检测
    if (safetyConfig.enableSensitiveTopicDetection) {
        const sensitiveFlags = await detectSensitiveTopics(content);
        flags.push(...sensitiveFlags);
    }
    // 2. 不当内容过滤
    if (safetyConfig.enableContentFilter) {
        const { filtered, flags: inappropriateFlags } = await filterInappropriateContent(content);
        flags.push(...inappropriateFlags);
        // 如果过滤后内容变化，说明有内容被过滤
        if (filtered !== content) {
            logger.info('内容被过滤', { roomId, messageId });
        }
    }
    // 3. 个人隐私信息检测
    if (safetyConfig.enablePersonalInfoProtection) {
        const personalFlags = detectPersonalInfo(content);
        flags.push(...personalFlags);
    }
    // 4. 确定安全等级和处置动作
    if (flags.length > 0) {
        level = determineHighestSeverity(flags);
        action = determineAction(level);
        // 危险或严重级别需要记录并可能终止会话
        if (level === 'danger' || level === 'critical') {
            logger.warn('检测到危险内容', {
                roomId,
                messageId,
                senderId,
                level,
                flags: flags.map(f => f.type),
            });
        }
    }
    const result = {
        roomId,
        messageId,
        level,
        flags,
        action,
        timestamp: new Date(),
    };
    logger.debug('消息安全检查完成', {
        roomId,
        messageId,
        level,
        action,
        latencyMs: Date.now() - startTime,
    });
    return result;
}
/**
 * 检测敏感话题
 * 分析消息是否涉及敏感话题
 */
export async function detectSensitiveTopics(content) {
    const flags = [];
    const lowerContent = content.toLowerCase();
    for (const [topic, keywords] of Object.entries(SENSITIVE_TOPICS)) {
        const matchedKeywords = keywords.filter(kw => lowerContent.includes(kw.toLowerCase()));
        if (matchedKeywords.length > 0) {
            // 根据话题类型确定严重程度
            let severity = 'warning';
            if (topic === 'politics' || topic === 'violence') {
                severity = 'danger';
            }
            else if (topic === 'money' || topic === 'privacy') {
                severity = 'warning';
            }
            else if (topic === 'religion') {
                severity = 'warning';
            }
            flags.push({
                type: 'sensitive_topic',
                severity,
                description: `检测到敏感话题: ${topic}，关键词: ${matchedKeywords.join(', ')}`,
                confidence: Math.min(0.9, 0.5 + matchedKeywords.length * 0.1),
            });
        }
    }
    return flags;
}
/**
 * 过滤不当内容
 * 检测并替换不当言论
 */
export async function filterInappropriateContent(content) {
    let filtered = content;
    const flags = [];
    // 检测不当内容模式
    for (const pattern of INAPPROPRIATE_PATTERNS) {
        if (pattern.test(content)) {
            const match = content.match(pattern);
            flags.push({
                type: 'inappropriate_content',
                severity: 'danger',
                description: `检测到不当内容: ${match?.[0] || '未知'}`,
                confidence: 0.85,
            });
            // 替换不当内容为星号
            filtered = filtered.replace(pattern, '***');
        }
    }
    return { filtered, flags };
}
/**
 * 检测个人隐私信息
 */
function detectPersonalInfo(content) {
    const flags = [];
    for (const pattern of PERSONAL_INFO_PATTERNS) {
        const matches = content.match(pattern);
        if (matches) {
            flags.push({
                type: 'personal_info',
                severity: 'warning',
                description: `检测到潜在个人隐私信息: ${pattern.toString()}`,
                confidence: 0.9,
            });
        }
    }
    return flags;
}
/**
 * 确定最高严重程度
 */
function determineHighestSeverity(flags) {
    const severityOrder = ['safe', 'warning', 'danger', 'critical'];
    let highest = 'safe';
    for (const flag of flags) {
        const currentIndex = severityOrder.indexOf(flag.severity);
        const highestIndex = severityOrder.indexOf(highest);
        if (currentIndex > highestIndex) {
            highest = flag.severity;
        }
    }
    return highest;
}
/**
 * 根据安全等级确定处置动作
 */
function determineAction(level) {
    switch (level) {
        case 'safe':
            return 'allow';
        case 'warning':
            return 'warn';
        case 'danger':
            return 'block';
        case 'critical':
            return 'terminate';
        default:
            return 'allow';
    }
}
/**
 * 处理异常中断
 * 记录并处理会话异常中断情况
 */
export async function handleAbnormalInterruption(roomId, reason) {
    logger.warn('检测到会话异常中断', { roomId, reason });
    // 记录异常中断事件
    logger.info('会话异常中断事件', {
        roomId,
        reason,
        timestamp: new Date().toISOString(),
    });
    // 通知相关人员（在生产环境中实现）
    // await notifyParticipants(roomId, 'abnormal_interruption', { reason });
}
/**
 * 紧急终止会话
 * 用于处理严重安全事件的强制终止
 */
export async function emergencyTerminate(roomId, initiatorId, reason) {
    logger.warn('执行紧急会话终止', { roomId, initiatorId, reason });
    // 执行终止操作
    // 在生产环境中应该:
    // 1. 通知双方用户
    // 2. 保存会话记录
    // 3. 更新数据库状态
    // 4. 记录审计日志
    const terminationEvent = {
        roomId,
        initiatorId,
        reason,
        terminatedAt: new Date().toISOString(),
        action: 'emergency_terminate',
    };
    logger.info('会话已紧急终止', terminationEvent);
    // 记录到纠纷系统（用于后续审查）
    await createDisputeReport(roomId, initiatorId, `紧急终止: ${reason}`, [
        `termination_event:${JSON.stringify(terminationEvent)}`,
    ]);
}
/**
 * 创建纠纷举报
 * 用户可以对会话中的不当行为进行举报
 * 持久化到数据库 Report 表
 */
export async function createDisputeReport(roomId, reporterId, reason, evidence) {
    logger.info('创建纠纷举报', { roomId, reporterId, reason });
    // 尝试从匹配记录中获取被举报用户（roomId 即 matchId）
    let reportedUserId = 'unknown';
    try {
        const match = await prisma.match.findUnique({
            where: { id: roomId },
            include: {
                demand: { include: { agent: { select: { userId: true } } } },
                supply: { include: { agent: { select: { userId: true } } } },
            },
        });
        if (match) {
            const demandUserId = match.demand?.agent?.userId;
            const supplyUserId = match.supply?.agent?.userId;
            if (reporterId === demandUserId) {
                reportedUserId = supplyUserId || 'unknown';
            }
            else if (reporterId === supplyUserId) {
                reportedUserId = demandUserId || 'unknown';
            }
        }
    }
    catch {
        // If match lookup fails, proceed with 'unknown'
    }
    // 持久化到数据库
    const report = await prisma.report.create({
        data: {
            reporterId,
            targetType: 'CONTENT',
            targetId: roomId,
            reason: 'INAPPROPRIATE',
            description: reason,
            evidence: evidence,
        },
    });
    logger.info('纠纷举报已创建', {
        disputeId: report.id,
        roomId,
        reporterId,
        reportedUserId,
    });
    return {
        id: report.id,
        roomId,
        reporterId,
        reportedUserId,
        reason,
        evidence,
        status: report.status.toLowerCase(),
        createdAt: report.createdAt,
    };
}
/**
 * 获取安全配置
 */
export async function getSafetyConfig() {
    return { ...safetyConfig };
}
// 默认导出（函数式导出，符合现有模式）
export default {
    checkMessageSafety,
    detectSensitiveTopics,
    filterInappropriateContent,
    handleAbnormalInterruption,
    emergencyTerminate,
    createDisputeReport,
    getSafetyConfig,
};
//# sourceMappingURL=conversationSafetyService.js.map