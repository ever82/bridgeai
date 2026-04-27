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

import { v4 as uuidv4 } from 'uuid';

import { logger } from '../../utils/logger';

/**
 * 安全等级类型
 */
export type SafetyLevel = 'safe' | 'warning' | 'danger' | 'critical';

/**
 * 安全检查结果接口
 */
export interface SafetyCheck {
  roomId: string;
  messageId: string;
  level: SafetyLevel;
  flags: SafetyFlag[];
  action: 'allow' | 'warn' | 'block' | 'terminate';
  timestamp: Date;
}

/**
 * 安全标志接口
 */
export interface SafetyFlag {
  type:
    | 'sensitive_topic'
    | 'inappropriate_content'
    | 'harassment'
    | 'personal_info'
    | 'offensive_language';
  severity: SafetyLevel;
  description: string;
  confidence: number;
}

/**
 * 纠纷举报接口
 */
export interface DisputeReport {
  id: string;
  roomId: string;
  reporterId: string;
  reportedUserId: string;
  reason: string;
  evidence: string[];
  status: 'pending' | 'reviewing' | 'resolved';
  createdAt: Date;
}

/**
 * 安全配置接口
 */
export interface SafetyConfig {
  enableContentFilter: boolean;
  enableSensitiveTopicDetection: boolean;
  enablePersonalInfoProtection: boolean;
  autoTerminateThreshold: SafetyLevel;
}

// 内存存储
const reports: Map<string, ConversationReport> = new Map();
const disputeStore: Map<string, DisputeReport> = new Map();

// 默认安全配置
const safetyConfig: SafetyConfig = {
  enableContentFilter: true,
  enableSensitiveTopicDetection: true,
  enablePersonalInfoProtection: true,
  autoTerminateThreshold: 'critical',
};

/**
 * 会话报告接口（用于纠纷记录）
 */
interface ConversationReport {
  id: string;
  roomId: string;
  agentAId: string;
  agentBId: string;
  userIdA: string;
  userIdB: string;
  messages: Array<{
    id: string;
    senderId: string;
    content: string;
    timestamp: Date;
  }>;
  status: string;
  createdAt: Date;
}

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
 */
const INAPPROPRIATE_PATTERNS = [
  // 色情低俗
  /色情|淫秽|黄色|裸体|性暗示/i,
  // 骚扰威胁
  /威胁|恐吓|骚扰|跟踪/i,
  // 欺诈相关
  /诈骗|骗子|假冒|钓鱼/i,
  // 歧视言论
  /歧视|偏见|种族主义/i,
];

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
export async function checkMessageSafety(
  roomId: string,
  messageId: string,
  content: string,
  senderId: string
): Promise<SafetyCheck> {
  const startTime = Date.now();
  logger.debug('开始消息安全检查', { roomId, messageId, senderId });

  const flags: SafetyFlag[] = [];
  let level: SafetyLevel = 'safe';
  let action: 'allow' | 'warn' | 'block' | 'terminate' = 'allow';

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

  const result: SafetyCheck = {
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
export async function detectSensitiveTopics(content: string): Promise<SafetyFlag[]> {
  const flags: SafetyFlag[] = [];
  const lowerContent = content.toLowerCase();

  for (const [topic, keywords] of Object.entries(SENSITIVE_TOPICS)) {
    const matchedKeywords = keywords.filter(kw => lowerContent.includes(kw.toLowerCase()));

    if (matchedKeywords.length > 0) {
      // 根据话题类型确定严重程度
      let severity: SafetyLevel = 'warning';

      if (topic === 'politics' || topic === 'violence') {
        severity = 'danger';
      } else if (topic === 'money' || topic === 'privacy') {
        severity = 'warning';
      } else if (topic === 'religion') {
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
export async function filterInappropriateContent(
  content: string
): Promise<{ filtered: string; flags: SafetyFlag[] }> {
  let filtered = content;
  const flags: SafetyFlag[] = [];

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
function detectPersonalInfo(content: string): SafetyFlag[] {
  const flags: SafetyFlag[] = [];

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
function determineHighestSeverity(flags: SafetyFlag[]): SafetyLevel {
  const severityOrder: SafetyLevel[] = ['safe', 'warning', 'danger', 'critical'];
  let highest: SafetyLevel = 'safe';

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
function determineAction(level: SafetyLevel): 'allow' | 'warn' | 'block' | 'terminate' {
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
export async function handleAbnormalInterruption(roomId: string, reason: string): Promise<void> {
  logger.warn('检测到会话异常中断', { roomId, reason });

  // 查找相关会话
  let conversation: ConversationReport | undefined;
  for (const report of reports.values()) {
    if (report.roomId === roomId) {
      conversation = report;
      break;
    }
  }

  // 记录异常中断事件
  logger.info('会话异常中断事件', {
    roomId,
    reason,
    conversationId: conversation?.id,
    participants: conversation ? [conversation.agentAId, conversation.agentBId] : [],
    timestamp: new Date().toISOString(),
  });

  // 通知相关人员（在生产环境中实现）
  // await notifyParticipants(roomId, 'abnormal_interruption', { reason });
}

/**
 * 紧急终止会话
 * 用于处理严重安全事件的强制终止
 */
export async function emergencyTerminate(
  roomId: string,
  initiatorId: string,
  reason: string
): Promise<void> {
  logger.warn('执行紧急会话终止', { roomId, initiatorId, reason });

  // 查找相关会话
  let conversation: ConversationReport | undefined;
  for (const report of reports.values()) {
    if (report.roomId === roomId) {
      conversation = report;
      break;
    }
  }

  if (!conversation) {
    logger.warn('未找到会话记录', { roomId });
  }

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
    conversationId: conversation?.id,
    participants: conversation ? [conversation.agentAId, conversation.agentBId] : [],
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
 */
export async function createDisputeReport(
  roomId: string,
  reporterId: string,
  reason: string,
  evidence: string[]
): Promise<DisputeReport> {
  logger.info('创建纠纷举报', { roomId, reporterId, reason });

  // 查找被举报用户
  let reportedUserId = 'unknown';

  // 尝试从会话记录中获取被举报用户
  for (const report of reports.values()) {
    if (report.roomId === roomId) {
      // 假设reporterId是其中一方
      if (report.userIdA !== reporterId && report.userIdB !== reporterId) {
        reportedUserId = report.userIdB;
      } else {
        reportedUserId = report.userIdA === reporterId ? report.userIdB : report.userIdA;
      }
      break;
    }
  }

  const report: DisputeReport = {
    id: `dispute-${uuidv4()}`,
    roomId,
    reporterId,
    reportedUserId,
    reason,
    evidence,
    status: 'pending',
    createdAt: new Date(),
  };

  disputeStore.set(report.id, report);

  logger.info('纠纷举报已创建', {
    disputeId: report.id,
    roomId,
    reporterId,
    reportedUserId,
  });

  return report;
}

/**
 * 获取安全配置
 */
export async function getSafetyConfig(): Promise<SafetyConfig> {
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
