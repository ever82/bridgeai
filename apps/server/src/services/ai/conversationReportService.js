/**
 * Conversation Report Service
 * 会话报告生成服务 (ISSUE-DATE003 c4)
 *
 * 功能:
 * - 生成会话摘要
 * - 重新评估匹配兼容性分数
 * - 识别共同兴趣亮点
 * - 生成对话建议和提示
 * - 创建结构化报告
 */
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';
/**
 * 会话报告服务
 */
export class ConversationReportService {
    version = '1.0.0';
    reports = new Map();
    /**
     * 生成会话报告
     * 整合会话数据、质量评估生成完整报告
     */
    async generateReport(roomId, sessionData, qualityAssessments) {
        const startTime = Date.now();
        logger.info('开始生成会话报告', { roomId });
        try {
            // 1. 生成会话摘要
            const summary = await this.generateSummary(sessionData.messages);
            // 2. 提取话题数据
            const topics = this.extractTopics(sessionData.messages);
            // 3. 提取亮点
            const highlights = this.extractHighlights(sessionData.messages, topics);
            // 4. 提取共同兴趣
            const sharedInterests = this.extractSharedInterests(sessionData.messages);
            // 5. 计算质量指标
            const qualityMetrics = this.calculateQualityMetrics(qualityAssessments);
            // 6. 计算会话时长和轮数
            const duration = sessionData.endTime
                ? sessionData.endTime.getTime() - sessionData.startTime.getTime()
                : Date.now() - sessionData.startTime.getTime();
            const totalRounds = sessionData.messages.length;
            // 7. 评估兼容性分数
            const compatibilityScore = await this.evaluateCompatibility({ id: sessionData.agentAId, userId: sessionData.userIdA, interests: [] }, { id: sessionData.agentBId, userId: sessionData.userIdB, interests: [] }, {
                messages: sessionData.messages,
                topics,
                highlights,
                sharedInterests,
                qualityMetrics,
            });
            // 8. 计算分数变化
            const previousMatchScore = sessionData.matchScore ?? compatibilityScore;
            const scoreChange = compatibilityScore - previousMatchScore;
            // 9. 生成建议
            const suggestions = this.generateSuggestions({
                summary,
                compatibilityScore,
                previousMatchScore,
                scoreChange,
                sharedInterests,
                highlights,
                topics,
                qualityMetrics,
                duration,
                totalRounds,
            });
            // 构建报告
            const report = {
                id: `report-${uuidv4()}`,
                roomId,
                agentAId: sessionData.agentAId,
                agentBId: sessionData.agentBId,
                userIdA: sessionData.userIdA,
                userIdB: sessionData.userIdB,
                summary,
                compatibilityScore,
                previousMatchScore,
                scoreChange,
                sharedInterests,
                highlights,
                topics,
                suggestions,
                duration,
                totalRounds,
                qualityMetrics,
                createdAt: new Date(),
            };
            // 保存报告
            this.reports.set(report.id, report);
            await this.persistReport(report);
            logger.info('会话报告生成完成', {
                reportId: report.id,
                roomId,
                compatibilityScore,
                scoreChange,
                latencyMs: Date.now() - startTime,
            });
            return report;
        }
        catch (error) {
            logger.error('会话报告生成失败', {
                roomId,
                error: error?.message,
            });
            throw error;
        }
    }
    /**
     * 生成会话摘要
     * 使用LLM分析对话内容生成简洁摘要
     */
    async generateSummary(messages) {
        if (messages.length === 0) {
            return '会话内容为空';
        }
        // 构建消息摘要
        const messageTexts = messages
            .slice(-20) // 只取最近20条消息控制token
            .map(m => `[${m.senderId}]: ${m.content}`)
            .join('\n');
        // 尝试使用LLM生成摘要
        const { llmService } = await import('./llmService').catch(() => ({ llmService: null }));
        if (llmService) {
            try {
                const prompt = `请为以下约会对话生成一段简洁的中文摘要（100字以内），概括主要话题和互动氛围：

${messageTexts}

摘要格式：概括对话主题、参与者的互动感受和氛围。`;
                const response = await llmService.generateText(prompt, {
                    temperature: 0.3,
                    maxTokens: 200,
                });
                return response.text.trim() || '对话顺利进行，双方互动良好';
            }
            catch (error) {
                logger.warn('LLM摘要生成失败，使用默认摘要', { error: error?.message });
            }
        }
        // 回退策略：基于消息统计生成简单摘要
        return this.generateFallbackSummary(messages);
    }
    /**
     * 生成默认摘要（基于消息统计）
     */
    generateFallbackSummary(messages) {
        const messageCount = messages.length;
        const uniqueSenders = new Set(messages.map(m => m.senderId)).size;
        const avgLength = messages.reduce((sum, m) => sum + m.content.length, 0) / messageCount;
        const duration = messages.length > 1
            ? Math.round((messages[messages.length - 1].timestamp.getTime() - messages[0].timestamp.getTime()) /
                60000)
            : 0;
        return `本次会话共${messageCount}条消息，${uniqueSenders}位参与者，平均消息长度${Math.round(avgLength)}字，持续时间约${duration}分钟。对话内容涉及多个话题，互动氛围良好。`;
    }
    /**
     * 评估兼容性分数
     * 根据对话内容、话题深度、共同兴趣等因素重新评估匹配分数
     */
    async evaluateCompatibility(profileA, profileB, conversationData) {
        // 基础分数：50
        let score = 50;
        // 1. 共同兴趣加分 (最高15分)
        const interestScore = Math.min(15, conversationData.sharedInterests.length * 3);
        score += interestScore;
        // 2. 话题深度加分 (最高15分)
        const avgDepth = conversationData.topics.reduce((sum, t) => sum + t.depth, 0) /
            Math.max(1, conversationData.topics.length);
        const depthScore = Math.round(avgDepth * 15);
        score += depthScore;
        // 3. 质量指标加分 (最高20分)
        const { fluency, engagement, depth } = conversationData.qualityMetrics;
        const qualityScore = Math.round(((fluency + engagement + depth) / 3) * 20);
        score += qualityScore;
        // 4. 亮点互动加分 (最高10分)
        const highlightScore = Math.min(10, conversationData.highlights.length * 2);
        score += highlightScore;
        // 5. 消息数量调整 (体现互动积极性)
        if (conversationData.messages.length > 20) {
            score += 5;
        }
        else if (conversationData.messages.length < 5) {
            score -= 5;
        }
        // 限制分数范围 0-100
        return Math.max(0, Math.min(100, Math.round(score)));
    }
    /**
     * 提取话题信息
     */
    extractTopics(messages) {
        const topicMap = new Map();
        for (const message of messages) {
            // 简单的话题关键词检测
            const topics = this.detectTopics(message.content);
            for (const topic of topics) {
                const existing = topicMap.get(topic);
                if (existing) {
                    existing.rounds += 1;
                    existing.engagement += 1;
                }
                else {
                    topicMap.set(topic, {
                        rounds: 1,
                        depth: this.estimateTopicDepth(message.content),
                        engagement: 1,
                    });
                }
            }
        }
        return Array.from(topicMap.entries()).map(([name, data]) => ({
            name,
            rounds: data.rounds,
            depth: data.depth,
            engagement: data.engagement,
        }));
    }
    /**
     * 简单话题检测
     */
    detectTopics(content) {
        const topics = [];
        const lowerContent = content.toLowerCase();
        // 常见话题关键词
        const topicKeywords = {
            兴趣爱好: ['兴趣', '爱好', '喜欢', '运动', '音乐', '电影', '旅行'],
            工作职业: ['工作', '职业', '公司', '职业发展', '职业规划'],
            生活方式: ['生活', '习惯', '作息', '运动', '健身', '饮食'],
            美食餐饮: ['美食', '吃饭', '餐厅', '烹饪', '厨房', '菜'],
            旅行探索: ['旅行', '旅游', '去过', '城市', '景点', '度假'],
            电影娱乐: ['电影', '剧', '综艺', '音乐', '演唱会', '表演'],
            读书学习: ['书', '读书', '学习', '课程', '知识', '学校'],
            家庭关系: ['家人', '父母', '亲戚', '家庭', '孩子', '教育'],
            感情观念: ['感情', '恋爱', '爱情', '约会', '婚姻', '未来'],
            音乐艺术: ['音乐', '画画', '艺术', '乐器', '舞蹈', '摄影'],
        };
        for (const [topic, keywords] of Object.entries(topicKeywords)) {
            if (keywords.some(kw => lowerContent.includes(kw))) {
                topics.push(topic);
            }
        }
        return topics;
    }
    /**
     * 估算话题深度
     */
    estimateTopicDepth(content) {
        // 根据消息长度和问题类型估算深度
        const lengthScore = Math.min(1, content.length / 200);
        // 是否包含深度问题的标志
        const hasDeepQuestions = /[吗?？]/.test(content) &&
            (content.includes('为什么') || content.includes('怎么') || content.includes('如何'));
        const questionScore = hasDeepQuestions ? 0.5 : 0;
        return Math.min(1, lengthScore + questionScore);
    }
    /**
     * 提取会话亮点
     */
    extractHighlights(messages, topics) {
        const highlights = [];
        for (const topic of topics) {
            // 查找该话题最相关的高质量消息
            const relevantMessages = messages.filter(m => this.detectTopics(m.content).includes(topic.name));
            if (relevantMessages.length >= 2) {
                // 共同兴趣类型
                highlights.push({
                    topic: topic.name,
                    content: relevantMessages
                        .slice(0, 2)
                        .map(m => m.content)
                        .join(' | '),
                    round: relevantMessages[0].round,
                    type: 'shared_interest',
                });
            }
            if (relevantMessages.length >= 3 && topic.depth > 0.5) {
                // 深度连接类型
                highlights.push({
                    topic: topic.name,
                    content: relevantMessages
                        .slice(0, 3)
                        .map(m => m.content)
                        .join(' | '),
                    round: relevantMessages[0].round,
                    type: 'deep_connection',
                });
            }
        }
        return highlights;
    }
    /**
     * 提取共同兴趣
     */
    extractSharedInterests(messages) {
        const allTopics = this.extractTopics(messages);
        // 至少出现2次且有多方参与的话题视为共同兴趣
        return allTopics.filter(t => t.rounds >= 2 && t.engagement >= 2).map(t => t.name);
    }
    /**
     * 计算质量指标
     */
    calculateQualityMetrics(assessments) {
        if (assessments.length === 0) {
            return { fluency: 0.5, engagement: 0.5, depth: 0.5 };
        }
        const sum = assessments.reduce((acc, a) => ({
            fluency: acc.fluency + a.fluency,
            engagement: acc.engagement + a.engagement,
            depth: acc.depth + a.depth,
        }), { fluency: 0, engagement: 0, depth: 0 });
        return {
            fluency: Math.round((sum.fluency / assessments.length) * 100) / 100,
            engagement: Math.round((sum.engagement / assessments.length) * 100) / 100,
            depth: Math.round((sum.depth / assessments.length) * 100) / 100,
        };
    }
    /**
     * 生成对话建议
     */
    generateSuggestions(report) {
        const suggestions = [];
        if (!report.qualityMetrics) {
            return ['建议增加互动频率'];
        }
        // 流畅度建议
        if (report.qualityMetrics.fluency < 0.6) {
            suggestions.push('建议在对话中更加自然流畅，避免长时间停顿');
        }
        else {
            suggestions.push('继续保持自然的对话节奏');
        }
        // 参与度建议
        if (report.qualityMetrics.engagement < 0.6) {
            suggestions.push('建议增加提问频率，更多地回应对方的话题');
        }
        else {
            suggestions.push('互动参与度良好，可继续深入现有话题');
        }
        // 深度建议
        if (report.qualityMetrics.depth < 0.5) {
            suggestions.push('建议在话题讨论中更加深入，分享更多个人想法');
        }
        else {
            suggestions.push('话题探讨有一定深度，可尝试触及更多生活细节');
        }
        // 共同兴趣建议
        if (report.sharedInterests && report.sharedInterests.length > 0) {
            suggestions.push(`双方都对 ${report.sharedInterests[0]} 感兴趣，可以进一步探讨`);
        }
        // 分数变化建议
        if (report.scoreChange && report.scoreChange > 5) {
            suggestions.push('兼容性评估提升明显，建议继续保持当前互动方式');
        }
        else if (report.scoreChange && report.scoreChange < -5) {
            suggestions.push('兼容性评估有所下降，建议多关注对方的需求和感受');
        }
        // 时长建议
        if (report.duration && report.duration < 300000) {
            // 少于5分钟
            suggestions.push('建议增加每次对话的时长，让彼此更好地了解');
        }
        return suggestions;
    }
    /**
     * 获取报告
     */
    async getReport(reportId) {
        // 先从内存获取
        const cached = this.reports.get(reportId);
        if (cached) {
            return cached;
        }
        // 从数据库加载
        return await this.loadReport(reportId);
    }
    /**
     * 根据用户ID获取报告列表
     */
    async getReportsByUser(userId) {
        const userReports = [];
        for (const report of this.reports.values()) {
            if (report.userIdA === userId || report.userIdB === userId) {
                userReports.push(report);
            }
        }
        // 按创建时间倒序排列
        return userReports.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    /**
     * 持久化报告
     */
    async persistReport(report) {
        // 在生产环境中应保存到数据库
        // 此处暂时保存在内存中
        this.reports.set(report.id, report);
        logger.debug('报告已持久化', { reportId: report.id });
    }
    /**
     * 从数据库加载报告
     */
    async loadReport(_reportId) {
        // 在生产环境中应从数据库加载
        // 此处暂时返回null
        return null;
    }
    /**
     * 获取服务版本
     */
    getVersion() {
        return this.version;
    }
}
// 导出单例实例
export const conversationReportService = new ConversationReportService();
//# sourceMappingURL=conversationReportService.js.map