/**
 * Mutual Consent Model
 * 双向同意状态管理数据模型
 *
 * 管理约会引荐中的双方同意状态，支持以下特性：
 * - 独立决策存储（双方各自决策）
 * - 时效控制（超时自动过期）
 * - 决策变更（有效期内可改）
 * - 最终结果计算（双方都同意才成功）
 */

export enum ConsentStatus {
  PENDING = 'pending',     // 等待决策
  ACCEPTED = 'accepted',   // 已同意
  REJECTED = 'rejected',   // 已拒绝
  EXPIRED = 'expired',     // 已过期
}

export enum ReferralResult {
  PENDING = 'pending',           // 等待中
  MUTUAL_ACCEPT = 'mutual_accept',   // 双方同意
  SINGLE_ACCEPT = 'single_accept',   // 单方同意
  MUTUAL_REJECT = 'mutual_reject',   // 双方拒绝
  SINGLE_REJECT = 'single_reject',   // 单方拒绝
  EXPIRED = 'expired',             // 超时过期
}

export interface UserConsent {
  userId: string;
  status: ConsentStatus;
  decidedAt: Date | null;
  reason?: string;          // 拒绝原因（可选）
  changedCount: number;     // 决策变更次数
}

export interface MutualConsent {
  id: string;
  referralId: string;       // 关联的引荐记录ID
  userAId: string;          // 用户A ID
  userBId: string;          // 用户B ID

  // 双方独立决策
  userAConsent: UserConsent;
  userBConsent: UserConsent;

  // 时效控制
  createdAt: Date;
  expiresAt: Date;          // 决策截止时间
  timeoutHours: number;     // 超时时间（小时）

  // 结果
  result: ReferralResult;
  resultCalculatedAt: Date | null;

  // 元数据
  contextSummary?: string;  // 对话摘要
  matchScore?: number;      // 匹配评分
}

export interface ConsentDecision {
  userId: string;
  decision: 'accept' | 'reject';
  reason?: string;
}

export interface ConsentTimeoutConfig {
  defaultTimeoutHours: number;
  reminderBeforeHours: number[];  // 提醒时间点
  maxChangeCount: number;         // 最大变更次数
}

export const DEFAULT_CONSENT_CONFIG: ConsentTimeoutConfig = {
  defaultTimeoutHours: 72,        // 默认72小时
  reminderBeforeHours: [24, 4],   // 到期前24小时和4小时提醒
  maxChangeCount: 3,              // 最多变更3次
};

/**
 * 创建新的双向同意记录
 */
export function createMutualConsent(
  referralId: string,
  userAId: string,
  userBId: string,
  config: Partial<ConsentTimeoutConfig> = {}
): MutualConsent {
  const timeoutConfig = { ...DEFAULT_CONSENT_CONFIG, ...config };
  const now = new Date();
  const expiresAt = new Date(now.getTime() + timeoutConfig.defaultTimeoutHours * 60 * 60 * 1000);

  return {
    id: generateConsentId(),
    referralId,
    userAId,
    userBId,
    userAConsent: {
      userId: userAId,
      status: ConsentStatus.PENDING,
      decidedAt: null,
      changedCount: 0,
    },
    userBConsent: {
      userId: userBId,
      status: ConsentStatus.PENDING,
      decidedAt: null,
      changedCount: 0,
    },
    createdAt: now,
    expiresAt,
    timeoutHours: timeoutConfig.defaultTimeoutHours,
    result: ReferralResult.PENDING,
    resultCalculatedAt: null,
  };
}

/**
 * 更新用户决策
 */
export function updateUserDecision(
  consent: MutualConsent,
  userId: string,
  decision: 'accept' | 'reject',
  reason?: string
): MutualConsent {
  const now = new Date();

  // 检查是否过期
  if (now > consent.expiresAt) {
    throw new ConsentExpiredError('Consent has expired');
  }

  const isUserA = userId === consent.userAId;
  const userConsent = isUserA ? consent.userAConsent : consent.userBConsent;

  // 检查变更次数
  if (userConsent.status !== ConsentStatus.PENDING &&
      userConsent.changedCount >= DEFAULT_CONSENT_CONFIG.maxChangeCount) {
    throw new ConsentChangeLimitError('Maximum change count exceeded');
  }

  // 更新决策
  const newStatus = decision === 'accept' ? ConsentStatus.ACCEPTED : ConsentStatus.REJECTED;
  const updatedConsent: MutualConsent = {
    ...consent,
    [isUserA ? 'userAConsent' : 'userBConsent']: {
      ...userConsent,
      status: newStatus,
      decidedAt: now,
      reason: decision === 'reject' ? reason : undefined,
      changedCount: userConsent.status !== ConsentStatus.PENDING
        ? userConsent.changedCount + 1
        : userConsent.changedCount,
    },
  };

  // 重新计算结果
  return calculateResult(updatedConsent);
}

/**
 * 计算引荐结果
 */
export function calculateResult(consent: MutualConsent): MutualConsent {
  const { userAConsent, userBConsent } = consent;

  // 如果任一方还在等待，结果保持pending
  if (userAConsent.status === ConsentStatus.PENDING ||
      userBConsent.status === ConsentStatus.PENDING) {
    return consent;
  }

  let result: ReferralResult;

  if (userAConsent.status === ConsentStatus.ACCEPTED &&
      userBConsent.status === ConsentStatus.ACCEPTED) {
    result = ReferralResult.MUTUAL_ACCEPT;
  } else if (userAConsent.status === ConsentStatus.REJECTED &&
             userBConsent.status === ConsentStatus.REJECTED) {
    result = ReferralResult.MUTUAL_REJECT;
  } else if (userAConsent.status === ConsentStatus.ACCEPTED ||
             userBConsent.status === ConsentStatus.ACCEPTED) {
    result = ReferralResult.SINGLE_ACCEPT;
  } else {
    result = ReferralResult.SINGLE_REJECT;
  }

  return {
    ...consent,
    result,
    resultCalculatedAt: new Date(),
  };
}

/**
 * 处理超时过期
 */
export function expireConsent(consent: MutualConsent): MutualConsent {
  const now = new Date();

  if (now <= consent.expiresAt) {
    return consent;
  }

  const updatedConsent = { ...consent };

  // 将未决策方标记为过期
  if (consent.userAConsent.status === ConsentStatus.PENDING) {
    updatedConsent.userAConsent = {
      ...consent.userAConsent,
      status: ConsentStatus.EXPIRED,
    };
  }

  if (consent.userBConsent.status === ConsentStatus.PENDING) {
    updatedConsent.userBConsent = {
      ...consent.userBConsent,
      status: ConsentStatus.EXPIRED,
    };
  }

  return {
    ...updatedConsent,
    result: ReferralResult.EXPIRED,
    resultCalculatedAt: now,
  };
}

/**
 * 获取对方用户ID
 */
export function getOtherUserId(consent: MutualConsent, userId: string): string {
  return userId === consent.userAId ? consent.userBId : consent.userAId;
}

/**
 * 检查是否双方都已决策
 */
export function isBothDecided(consent: MutualConsent): boolean {
  return consent.userAConsent.status !== ConsentStatus.PENDING &&
         consent.userBConsent.status !== ConsentStatus.PENDING;
}

/**
 * 检查是否双方同意
 */
export function isMutualAccept(consent: MutualConsent): boolean {
  return consent.result === ReferralResult.MUTUAL_ACCEPT;
}

/**
 * 生成唯一ID
 */
function generateConsentId(): string {
  return `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 错误类
 */
export class ConsentExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConsentExpiredError';
  }
}

export class ConsentChangeLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConsentChangeLimitError';
  }
}

export default MutualConsent;
