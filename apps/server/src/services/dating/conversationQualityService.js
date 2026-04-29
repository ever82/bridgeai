import { logger } from '../../utils/logger';
// 内存缓存：房间质量评估记录
const assessmentCache = new Map();
/**
 * 综合评估对话质量
 */
export async function assessConversation(roomId, messages, round) {
    logger.info(`[conversationQuality] 开始评估对话质量 roomId=${roomId} round=${round}`);
    const [fluency, topicDepth, engagement, coherence, personaConsistency, issues] = await Promise.all([
        calculateFluency(messages),
        evaluateTopicDepth(messages, []),
        analyzeEngagement(messages, '', ''),
        calculateCoherence(messages),
        evaluatePersonaConsistency(messages),
        detectIssues(messages, round),
    ]);
    // 综合质量分：加权平均
    const overall = Math.round((fluency * 0.2 +
        topicDepth * 0.2 +
        engagement * 0.25 +
        coherence * 0.2 +
        personaConsistency * 0.15) *
        100) / 100;
    const metrics = {
        fluency,
        topicDepth,
        engagement,
        coherence,
        personaConsistency,
        overall,
    };
    // 根据指标生成建议
    const suggestions = generateSuggestions(metrics, issues);
    const assessment = {
        roomId,
        round,
        metrics,
        issues,
        suggestions,
        timestamp: new Date(),
    };
    // 缓存评估结果
    const history = assessmentCache.get(roomId) || [];
    history.push(assessment);
    assessmentCache.set(roomId, history);
    logger.info(`[conversationQuality] 评估完成 roomId=${roomId} overall=${overall}`);
    return assessment;
}
/**
 * 计算对话流畅度
 * 基于消息长度变化、响应速度、语言连贯性
 */
export async function calculateFluency(messages) {
    if (messages.length < 2)
        return 0.5;
    let score = 0.5;
    const contents = messages.map(m => m.content);
    // 检查消息长度是否适中（过短或过长都扣分）
    const avgLength = contents.reduce((sum, c) => sum + c.length, 0) / contents.length;
    if (avgLength >= 20 && avgLength <= 500) {
        score += 0.15;
    }
    else if (avgLength < 10 || avgLength > 1000) {
        score -= 0.1;
    }
    // 检查是否有明显的问答交替模式
    let turnPattern = 0;
    for (let i = 1; i < messages.length; i++) {
        if (messages[i].role !== messages[i - 1].role) {
            turnPattern++;
        }
    }
    const turnRatio = turnPattern / (messages.length - 1);
    score += turnRatio * 0.2;
    // 检查内容是否包含明显的停顿词或重复
    const pauseWords = ['嗯', '啊', '呃', '那个', '然后然后', '。。', '...'];
    let pauseCount = 0;
    contents.forEach(c => {
        pauseWords.forEach(w => {
            pauseCount += (c.match(new RegExp(w, 'g')) || []).length;
        });
    });
    const pauseRate = pauseCount / contents.length;
    score -= Math.min(pauseRate * 0.3, 0.2);
    // 使用 LLM 辅助评估（懒加载）
    try {
        const { llmService } = await import('../ai/llmService').catch(() => ({ llmService: null }));
        if (llmService && messages.length >= 4) {
            const prompt = `请评估以下对话的流畅度，只返回0-1之间的数字：\n${contents.slice(-6).join('\n')}`;
            const result = await llmService.complete(prompt, { maxTokens: 10 });
            const llmScore = parseFloat(result.trim());
            if (!isNaN(llmScore) && llmScore >= 0 && llmScore <= 1) {
                score = score * 0.6 + llmScore * 0.4;
            }
        }
    }
    catch {
        // LLM 不可用时不影响基础评分
    }
    return Math.max(0, Math.min(1, Math.round(score * 100) / 100));
}
/**
 * 评估话题深度
 * 基于关键词密度、话题延展性、观点表达
 */
export async function evaluateTopicDepth(messages, topics) {
    if (messages.length === 0)
        return 0.5;
    const contents = messages.map(m => m.content).join(' ');
    let score = 0.5;
    // 检查是否有深度词汇（观点、感受、原因等）
    const depthMarkers = [
        '因为',
        '所以',
        '我觉得',
        '我认为',
        '感受',
        '经历',
        '想法',
        '看法',
        '为什么',
        '怎么样',
        '意义',
        '价值',
        '梦想',
        '目标',
        '喜欢',
        '讨厌',
    ];
    const depthCount = depthMarkers.reduce((count, marker) => {
        return count + (contents.split(marker).length - 1);
    }, 0);
    score += Math.min((depthCount / messages.length) * 0.1, 0.2);
    // 检查话题延展性（是否有新话题引入）
    const topicIndicators = ['你呢', '你觉得', '说到', '提到', '想起', '记得'];
    const topicShiftCount = topicIndicators.reduce((count, indicator) => {
        return count + (contents.split(indicator).length - 1);
    }, 0);
    score += Math.min((topicShiftCount / messages.length) * 0.05, 0.1);
    // 检查是否有具体细节（数字、地点、时间等）
    const detailPattern = /\d+|年|月|日|地方|城市|学校|工作|家/;
    const detailCount = contents.split(detailPattern).length - 1;
    score += Math.min((detailCount / messages.length) * 0.05, 0.1);
    // 如果提供了话题列表，检查覆盖度
    if (topics.length > 0) {
        const coveredTopics = topics.filter(t => contents.includes(t));
        score += (coveredTopics.length / topics.length) * 0.1;
    }
    return Math.max(0, Math.min(1, Math.round(score * 100) / 100));
}
/**
 * 分析参与度
 * 基于双方消息数量、回复率、内容充实度
 */
export async function analyzeEngagement(messages, agentAId, agentBId) {
    if (messages.length < 2)
        return 0.5;
    let score = 0.5;
    // 统计双方消息数
    const agentAMessages = messages.filter(m => m.agentId === agentAId || m.role === 'user');
    const agentBMessages = messages.filter(m => m.agentId === agentBId || m.role === 'assistant');
    const totalMessages = messages.length;
    const aRatio = agentAMessages.length / totalMessages;
    const bRatio = agentBMessages.length / totalMessages;
    // 参与度均衡性（双方发言比例接近 1:1 得分高）
    const balance = 1 - Math.abs(aRatio - bRatio);
    score += balance * 0.25;
    // 检查回复率（是否有消息被忽略）
    let replyCount = 0;
    for (let i = 1; i < messages.length; i++) {
        const prev = messages[i - 1];
        const curr = messages[i];
        // 如果当前消息与上一条来自不同角色，视为回复
        if (prev.role !== curr.role) {
            replyCount++;
        }
    }
    const replyRate = replyCount / (messages.length - 1);
    score += replyRate * 0.15;
    // 内容充实度（平均消息长度）
    const avgLength = messages.reduce((sum, m) => sum + m.content.length, 0) / totalMessages;
    if (avgLength >= 30) {
        score += 0.1;
    }
    // 检查提问频率（提问表示积极参与）
    const questionPattern = /[?？]|吗|呢|什么|怎么|为什么|多少|哪里/;
    const questionCount = messages.filter(m => questionPattern.test(m.content)).length;
    score += Math.min((questionCount / totalMessages) * 0.2, 0.15);
    return Math.max(0, Math.min(1, Math.round(score * 100) / 100));
}
/**
 * 计算对话连贯性
 * 基于上下文关联、指代一致性
 */
async function calculateCoherence(messages) {
    if (messages.length < 2)
        return 0.5;
    let score = 0.5;
    const contents = messages.map(m => m.content);
    // 检查指代词一致性
    const pronouns = ['我', '你', '他', '她', '我们', '他们'];
    let pronounConsistency = 0;
    for (let i = 1; i < contents.length; i++) {
        const prevPronouns = pronouns.filter(p => contents[i - 1].includes(p));
        const currPronouns = pronouns.filter(p => contents[i].includes(p));
        const overlap = prevPronouns.filter(p => currPronouns.includes(p));
        if (overlap.length > 0 || prevPronouns.length === 0) {
            pronounConsistency++;
        }
    }
    score += (pronounConsistency / (contents.length - 1)) * 0.2;
    // 检查话题延续性（相邻消息是否有共同词汇）
    let topicContinuation = 0;
    for (let i = 1; i < contents.length; i++) {
        const prevWords = new Set(contents[i - 1].split(/\s+/));
        const currWords = contents[i].split(/\s+/);
        const commonWords = currWords.filter(w => prevWords.has(w) && w.length >= 2);
        if (commonWords.length >= 2) {
            topicContinuation++;
        }
    }
    score += (topicContinuation / (contents.length - 1)) * 0.2;
    // 检查是否有突兀的话题跳转
    const abruptTransitions = ['对了', '话说', '突然想到', '换个话题'];
    let abruptCount = 0;
    for (let i = 1; i < contents.length; i++) {
        if (abruptTransitions.some(t => contents[i].startsWith(t))) {
            abruptCount++;
        }
    }
    score -= Math.min((abruptCount / contents.length) * 0.2, 0.15);
    return Math.max(0, Math.min(1, Math.round(score * 100) / 100));
}
/**
 * 评估人设一致性
 * 基于角色特征、语言风格的一致性
 */
async function evaluatePersonaConsistency(messages) {
    if (messages.length < 2)
        return 0.5;
    let score = 0.5;
    // 按角色分组检查语言风格一致性
    const roleGroups = new Map();
    messages.forEach(m => {
        const key = m.agentId || m.role;
        const list = roleGroups.get(key) || [];
        list.push(m.content);
        roleGroups.set(key, list);
    });
    // 检查每个角色的语言风格是否一致
    let consistencySum = 0;
    let groupCount = 0;
    roleGroups.forEach(contents => {
        if (contents.length < 2)
            return;
        groupCount++;
        // 检查常用词汇的一致性
        const firstWords = new Set(contents[0].split(/\s+/).filter(w => w.length >= 2));
        let overlapSum = 0;
        for (let i = 1; i < contents.length; i++) {
            const words = contents[i].split(/\s+/).filter(w => w.length >= 2);
            const overlap = words.filter(w => firstWords.has(w)).length;
            overlapSum += overlap / Math.max(words.length, 1);
        }
        consistencySum += overlapSum / (contents.length - 1);
    });
    if (groupCount > 0) {
        score += (consistencySum / groupCount) * 0.3;
    }
    // 检查语气词使用的一致性
    const toneWords = ['呢', '吧', '啊', '哦', '呀', '啦'];
    roleGroups.forEach(contents => {
        if (contents.length < 2)
            return;
        const firstTones = toneWords.filter(t => contents[0].includes(t));
        let toneConsistency = 0;
        for (let i = 1; i < contents.length; i++) {
            const currentTones = toneWords.filter(t => contents[i].includes(t));
            const common = firstTones.filter(t => currentTones.includes(t));
            if (firstTones.length > 0) {
                toneConsistency += common.length / firstTones.length;
            }
            else if (currentTones.length === 0) {
                toneConsistency += 1;
            }
        }
        score += (toneConsistency / (contents.length - 1)) * 0.1;
    });
    return Math.max(0, Math.min(1, Math.round(score * 100) / 100));
}
/**
 * 检测对话问题
 */
export async function detectIssues(messages, round) {
    const issues = [];
    if (messages.length < 2)
        return issues;
    const contents = messages.map(m => m.content);
    const lastMessages = contents.slice(-4);
    // 检测低参与度：消息过短
    const shortMessages = messages.filter(m => m.content.length < 10);
    if (shortMessages.length >= 3) {
        issues.push({
            type: 'low_engagement',
            severity: 'medium',
            description: '近期多条消息内容过短，参与度可能不足',
            round,
        });
    }
    // 检测重复：连续消息内容相似
    for (let i = 1; i < lastMessages.length; i++) {
        const similarity = calculateSimilarity(lastMessages[i - 1], lastMessages[i]);
        if (similarity > 0.7) {
            issues.push({
                type: 'repetitive',
                severity: similarity > 0.9 ? 'high' : 'medium',
                description: '对话内容出现重复，建议引入新话题',
                round,
            });
            break;
        }
    }
    // 检测话题停滞：连续多轮没有新信息
    const avgLength = contents.reduce((sum, c) => sum + c.length, 0) / contents.length;
    if (avgLength < 15 && messages.length >= 6) {
        issues.push({
            type: 'stalled',
            severity: 'high',
            description: '对话陷入停滞，建议主动引导话题',
            round,
        });
    }
    // 检测不当内容
    const inappropriatePatterns = [
        /辱骂|脏话|攻击|歧视|侮辱/,
        /(?:微信|QQ|电话|手机号|加好友).*\d+/,
        /(?:转账|汇款|密码|验证码|银行卡)/,
    ];
    contents.forEach((content, idx) => {
        inappropriatePatterns.forEach(pattern => {
            if (pattern.test(content)) {
                issues.push({
                    type: 'inappropriate',
                    severity: 'high',
                    description: `检测到潜在不当内容（消息#${idx + 1}），请注意对话安全`,
                    round,
                });
            }
        });
    });
    // 检测离题：使用 LLM 判断（懒加载）
    try {
        const { llmService } = await import('../ai/llmService').catch(() => ({ llmService: null }));
        if (llmService && messages.length >= 6) {
            const prompt = `判断以下对话是否离题或缺乏重点，只返回"yes"或"no"：\n${lastMessages.join('\n')}`;
            const result = await llmService.complete(prompt, { maxTokens: 10 });
            if (result.trim().toLowerCase() === 'yes') {
                issues.push({
                    type: 'off_topic',
                    severity: 'low',
                    description: '对话可能偏离主题，建议适时回归核心话题',
                    round,
                });
            }
        }
    }
    catch {
        // LLM 不可用时跳过
    }
    return issues;
}
/**
 * 获取质量趋势
 */
export async function getQualityTrend(roomId) {
    const assessments = assessmentCache.get(roomId) || [];
    if (assessments.length === 0) {
        return {
            roomId,
            assessments: [],
            averageScore: 0,
            trendDirection: 'stable',
        };
    }
    // 计算平均分
    const averageScore = Math.round((assessments.reduce((sum, a) => sum + a.metrics.overall, 0) / assessments.length) * 100) / 100;
    // 判断趋势方向
    let trendDirection = 'stable';
    if (assessments.length >= 3) {
        const recent = assessments.slice(-3);
        const first = recent[0].metrics.overall;
        const last = recent[recent.length - 1].metrics.overall;
        const diff = last - first;
        if (diff > 0.1) {
            trendDirection = 'improving';
        }
        else if (diff < -0.1) {
            trendDirection = 'declining';
        }
    }
    return {
        roomId,
        assessments: [...assessments],
        averageScore,
        trendDirection,
    };
}
/**
 * 生成质量报告
 */
export async function generateQualityReport(roomId) {
    const assessments = assessmentCache.get(roomId) || [];
    logger.info(`[conversationQuality] 生成质量报告 roomId=${roomId} 共${assessments.length}条记录`);
    return [...assessments];
}
// 辅助函数：计算两段文本的相似度（简单实现）
function calculateSimilarity(a, b) {
    const wordsA = new Set(a.split(/\s+/).filter(w => w.length >= 2));
    const wordsB = b.split(/\s+/).filter(w => w.length >= 2);
    if (wordsA.size === 0 || wordsB.length === 0)
        return 0;
    const intersection = wordsB.filter(w => wordsA.has(w)).length;
    const union = new Set([...Array.from(wordsA), ...wordsB]).size;
    return union === 0 ? 0 : intersection / union;
}
// 辅助函数：根据指标生成建议
function generateSuggestions(metrics, issues) {
    const suggestions = [];
    if (metrics.fluency < 0.4) {
        suggestions.push('对话流畅度较低，建议减少停顿词，保持自然交流节奏');
    }
    if (metrics.topicDepth < 0.4) {
        suggestions.push('话题深度不足，可以尝试分享更多个人经历和感受');
    }
    if (metrics.engagement < 0.4) {
        suggestions.push('参与度较低，建议增加互动提问，保持双方均衡发言');
    }
    if (metrics.coherence < 0.4) {
        suggestions.push('对话连贯性有待提升，注意上下文关联和话题延续');
    }
    if (metrics.personaConsistency < 0.4) {
        suggestions.push('人设一致性不足，注意保持角色特征和语言风格的统一');
    }
    issues.forEach(issue => {
        switch (issue.type) {
            case 'repetitive':
                suggestions.push('避免重复相同内容，尝试从不同角度展开话题');
                break;
            case 'stalled':
                suggestions.push('对话陷入停滞，可以引入新话题或提出开放式问题');
                break;
            case 'off_topic':
                suggestions.push('注意把握对话方向，适时回归核心话题');
                break;
            case 'low_engagement':
                suggestions.push('提高回复质量，增加内容细节和情感表达');
                break;
        }
    });
    if (suggestions.length === 0 && metrics.overall >= 0.7) {
        suggestions.push('对话质量良好，继续保持当前交流节奏');
    }
    return suggestions;
}
export default {
    assessConversation,
    calculateFluency,
    evaluateTopicDepth,
    analyzeEngagement,
    detectIssues,
    getQualityTrend,
    generateQualityReport,
};
//# sourceMappingURL=conversationQualityService.js.map