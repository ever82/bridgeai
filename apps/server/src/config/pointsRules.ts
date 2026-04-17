/**
 * 积分规则配置
 * 定义积分获取、消耗规则，每日/每周上限，积分价值换算等
 */

import { SceneCode } from '@bridgeai/shared';

// 积分规则类型
export type RuleType = 'earn' | 'spend';

// 积分规则配置接口
export interface PointsRule {
  id: string;
  type: RuleType;
  code: string;
  name: string;
  description: string;
  points: number; // 正数为获得，负数为消耗
  dailyLimit?: number; // 每日上限次数
  weeklyLimit?: number; // 每周上限次数
  cooldownMinutes?: number; // 冷却时间（分钟）
  enabled: boolean;
  scene?: SceneCode;
}

// 每日/每周获取限制配置
export interface PointsLimitConfig {
  dailyEarnLimit: number; // 每日获取上限
  weeklyEarnLimit: number; // 每周获取上限
  dailySpendLimit: number; // 每日消耗上限
  weeklySpendLimit: number; // 每周消耗上限
}

// 积分价值换算配置
export interface PointsValueConfig {
  rmbToPointsRate: number; // 人民币兑换积分比例（1元 = X积分）
  pointsToRmbRate: number; // 积分兑换人民币比例（1积分 = X元）
  minRechargeAmount: number; // 最小充值金额（元）
  minWithdrawAmount: number; // 最小提现金额（元）
}

// 转账配置
export interface TransferConfig {
  enabled: boolean;
  minAmount: number; // 最小转账金额
  maxAmount: number; // 最大转账金额
  feeRate: number; // 手续费率（0-1）
  feeMin: number; // 最低手续费
  feeMax: number; // 最高手续费
  dailyLimit: number; // 每日转账上限次数
}

// 冻结配置
export interface FreezeConfig {
  defaultExpireHours: number; // 默认过期时间（小时）
  maxFreezeAmount: number; // 最大冻结金额比例（相对于余额）
}

// 默认积分限制配置
export const DEFAULT_LIMITS: PointsLimitConfig = {
  dailyEarnLimit: 1000,
  weeklyEarnLimit: 5000,
  dailySpendLimit: 2000,
  weeklySpendLimit: 10000,
};

// 默认积分价值配置
export const DEFAULT_VALUE_CONFIG: PointsValueConfig = {
  rmbToPointsRate: 100, // 1元 = 100积分
  pointsToRmbRate: 0.01, // 1积分 = 0.01元
  minRechargeAmount: 1, // 最小充值1元
  minWithdrawAmount: 10, // 最小提现10元
};

// 默认转账配置
export const DEFAULT_TRANSFER_CONFIG: TransferConfig = {
  enabled: true,
  minAmount: 10,
  maxAmount: 10000,
  feeRate: 0.01, // 1%手续费
  feeMin: 1,
  feeMax: 100,
  dailyLimit: 10,
};

// 默认冻结配置
export const DEFAULT_FREEZE_CONFIG: FreezeConfig = {
  defaultExpireHours: 72, // 72小时
  maxFreezeAmount: 0.9, // 最多冻结90%余额
};

// 积分获取规则配置
export const EARN_RULES: Record<string, PointsRule> = {
  // 签到相关
  CHECKIN: {
    id: 'earn_checkin',
    type: 'earn',
    code: 'CHECKIN',
    name: '每日签到',
    description: '每日登录签到获得积分',
    points: 10,
    dailyLimit: 1,
    cooldownMinutes: 0,
    enabled: true,
  },
  CHECKIN_CONTINUOUS: {
    id: 'earn_checkin_continuous',
    type: 'earn',
    code: 'CHECKIN_CONTINUOUS',
    name: '连续签到',
    description: '连续签到获得额外积分奖励',
    points: 20,
    dailyLimit: 1,
    cooldownMinutes: 0,
    enabled: true,
  },

  // 任务相关
  TASK_COMPLETE: {
    id: 'earn_task_complete',
    type: 'earn',
    code: 'TASK_COMPLETE',
    name: '完成任务',
    description: '完成系统任务获得积分',
    points: 50,
    dailyLimit: 5,
    cooldownMinutes: 0,
    enabled: true,
  },
  TASK_DAILY: {
    id: 'earn_task_daily',
    type: 'earn',
    code: 'TASK_DAILY',
    name: '每日任务',
    description: '完成每日任务获得积分',
    points: 30,
    dailyLimit: 3,
    cooldownMinutes: 0,
    enabled: true,
  },

  // 分享相关
  SHARE_APP: {
    id: 'earn_share_app',
    type: 'earn',
    code: 'SHARE_APP',
    name: '分享应用',
    description: '分享应用到社交平台',
    points: 20,
    dailyLimit: 3,
    cooldownMinutes: 60,
    enabled: true,
  },
  INVITE_FRIEND: {
    id: 'earn_invite_friend',
    type: 'earn',
    code: 'INVITE_FRIEND',
    name: '邀请好友',
    description: '成功邀请新用户注册',
    points: 100,
    dailyLimit: 10,
    cooldownMinutes: 0,
    enabled: true,
  },

  // 内容相关
  CREATE_PROFILE: {
    id: 'earn_create_profile',
    type: 'earn',
    code: 'CREATE_PROFILE',
    name: '完善资料',
    description: '首次完善个人资料',
    points: 50,
    dailyLimit: 1,
    cooldownMinutes: 0,
    enabled: true,
  },
  UPLOAD_AVATAR: {
    id: 'earn_upload_avatar',
    type: 'earn',
    code: 'UPLOAD_AVATAR',
    name: '上传头像',
    description: '首次上传头像',
    points: 30,
    dailyLimit: 1,
    cooldownMinutes: 0,
    enabled: true,
  },
  BIND_PHONE: {
    id: 'earn_bind_phone',
    type: 'earn',
    code: 'BIND_PHONE',
    name: '绑定手机',
    description: '首次绑定手机号',
    points: 50,
    dailyLimit: 1,
    cooldownMinutes: 0,
    enabled: true,
  },
  BIND_EMAIL: {
    id: 'earn_bind_email',
    type: 'earn',
    code: 'BIND_EMAIL',
    name: '绑定邮箱',
    description: '首次绑定邮箱',
    points: 30,
    dailyLimit: 1,
    cooldownMinutes: 0,
    enabled: true,
  },

  // 互动相关
  RECEIVE_LIKE: {
    id: 'earn_receive_like',
    type: 'earn',
    code: 'RECEIVE_LIKE',
    name: '收到点赞',
    description: '收到其他用户点赞',
    points: 5,
    dailyLimit: 50,
    cooldownMinutes: 0,
    enabled: true,
  },
  RECEIVE_FOLLOW: {
    id: 'earn_receive_follow',
    type: 'earn',
    code: 'RECEIVE_FOLLOW',
    name: '被关注',
    description: '获得新粉丝关注',
    points: 10,
    dailyLimit: 20,
    cooldownMinutes: 0,
    enabled: true,
  },

  // 充值
  RECHARGE: {
    id: 'earn_recharge',
    type: 'earn',
    code: 'RECHARGE',
    name: '充值',
    description: '通过充值获得积分',
    points: 0, // 根据充值金额动态计算
    dailyLimit: undefined, // 无限制
    cooldownMinutes: 0,
    enabled: true,
  },

  // 退款
  REFUND: {
    id: 'earn_refund',
    type: 'earn',
    code: 'REFUND',
    name: '退款',
    description: '交易退款返还积分',
    points: 0, // 根据退款金额动态计算
    dailyLimit: undefined,
    cooldownMinutes: 0,
    enabled: true,
  },

  // 解冻返还
  UNFROZEN: {
    id: 'earn_unfrozen',
    type: 'earn',
    code: 'UNFROZEN',
    name: '解冻返还',
    description: '冻结积分解冻返还',
    points: 0, // 根据实际解冻金额
    dailyLimit: undefined,
    cooldownMinutes: 0,
    enabled: true,
  },

  // 转入
  TRANSFER_IN: {
    id: 'earn_transfer_in',
    type: 'earn',
    code: 'TRANSFER_IN',
    name: '转入',
    description: '从其他账户转入积分',
    points: 0, // 根据实际转入金额
    dailyLimit: undefined,
    cooldownMinutes: 0,
    enabled: true,
  },
};

// 积分消耗规则配置
export const SPEND_RULES: Record<string, PointsRule> = {
  // 查看内容
  VIEW_PHOTO: {
    id: 'spend_view_photo',
    type: 'spend',
    code: 'VIEW_PHOTO',
    name: '查看照片',
    description: '查看用户私密照片',
    points: -20,
    dailyLimit: undefined,
    cooldownMinutes: 0,
    enabled: true,
    scene: SceneCode.VISION_SHARE,
  },
  VIEW_PROFILE: {
    id: 'spend_view_profile',
    type: 'spend',
    code: 'VIEW_PROFILE',
    name: '查看详细资料',
    description: '查看用户详细资料',
    points: -10,
    dailyLimit: undefined,
    cooldownMinutes: 0,
    enabled: true,
  },

  // 匹配相关
  INITIATE_MATCH: {
    id: 'spend_initiate_match',
    type: 'spend',
    code: 'INITIATE_MATCH',
    name: '发起匹配',
    description: '主动发起匹配请求',
    points: -50,
    dailyLimit: 10,
    cooldownMinutes: 0,
    enabled: true,
    scene: SceneCode.AGENT_DATE,
  },
  SUPER_LIKE: {
    id: 'spend_super_like',
    type: 'spend',
    code: 'SUPER_LIKE',
    name: '超级喜欢',
    description: '使用超级喜欢功能',
    points: -100,
    dailyLimit: 5,
    cooldownMinutes: 0,
    enabled: true,
  },

  // 聊天相关
  SEND_MESSAGE_PREMIUM: {
    id: 'spend_send_message_premium',
    type: 'spend',
    code: 'SEND_MESSAGE_PREMIUM',
    name: '发送高级消息',
    description: '发送特殊格式消息',
    points: -5,
    dailyLimit: 100,
    cooldownMinutes: 0,
    enabled: true,
  },

  // 打赏
  TIP_USER: {
    id: 'spend_tip_user',
    type: 'spend',
    code: 'TIP_USER',
    name: '打赏用户',
    description: '向其他用户打赏积分',
    points: 0, // 动态金额
    dailyLimit: 20,
    cooldownMinutes: 0,
    enabled: true,
  },

  // 购买服务
  BUY_SERVICE: {
    id: 'spend_buy_service',
    type: 'spend',
    code: 'BUY_SERVICE',
    name: '购买服务',
    description: '购买平台服务',
    points: 0, // 根据服务价格
    dailyLimit: undefined,
    cooldownMinutes: 0,
    enabled: true,
  },
  BOOST_PROFILE: {
    id: 'spend_boost_profile',
    type: 'spend',
    code: 'BOOST_PROFILE',
    name: '资料推广',
    description: '推广个人资料增加曝光',
    points: -200,
    dailyLimit: 3,
    cooldownMinutes: 0,
    enabled: true,
  },

  // 扣除（惩罚）
  DEDUCT_VIOLATION: {
    id: 'spend_deduct_violation',
    type: 'spend',
    code: 'DEDUCT_VIOLATION',
    name: '违规扣除',
    description: '因违规被扣除积分',
    points: 0, // 根据违规程度
    dailyLimit: undefined,
    cooldownMinutes: 0,
    enabled: true,
  },

  // 冻结
  FREEZE: {
    id: 'spend_freeze',
    type: 'spend',
    code: 'FREEZE',
    name: '冻结',
    description: '积分被冻结用于交易担保',
    points: 0, // 根据实际冻结金额
    dailyLimit: undefined,
    cooldownMinutes: 0,
    enabled: true,
  },

  // 转出
  TRANSFER_OUT: {
    id: 'spend_transfer_out',
    type: 'spend',
    code: 'TRANSFER_OUT',
    name: '转出',
    description: '向其他账户转出积分',
    points: 0, // 根据实际转出金额
    dailyLimit: undefined,
    cooldownMinutes: 0,
    enabled: true,
  },
};

// 合并所有规则
export const ALL_POINTS_RULES: Record<string, PointsRule> = {
  ...EARN_RULES,
  ...SPEND_RULES,
};

// 运行时规则配置（可动态修改）
let runtimeLimits: PointsLimitConfig = { ...DEFAULT_LIMITS };
let runtimeValueConfig: PointsValueConfig = { ...DEFAULT_VALUE_CONFIG };
let runtimeTransferConfig: TransferConfig = { ...DEFAULT_TRANSFER_CONFIG };
let runtimeFreezeConfig: FreezeConfig = { ...DEFAULT_FREEZE_CONFIG };

/**
 * 获取积分限制配置
 */
export function getPointsLimitConfig(): PointsLimitConfig {
  return { ...runtimeLimits };
}

/**
 * 更新积分限制配置
 */
export function updatePointsLimitConfig(config: Partial<PointsLimitConfig>): void {
  runtimeLimits = { ...runtimeLimits, ...config };
}

/**
 * 获取积分价值配置
 */
export function getPointsValueConfig(): PointsValueConfig {
  return { ...runtimeValueConfig };
}

/**
 * 更新积分价值配置
 */
export function updatePointsValueConfig(config: Partial<PointsValueConfig>): void {
  runtimeValueConfig = { ...runtimeValueConfig, ...config };
}

/**
 * 获取转账配置
 */
export function getTransferConfig(): TransferConfig {
  return { ...runtimeTransferConfig };
}

/**
 * 更新转账配置
 */
export function updateTransferConfig(config: Partial<TransferConfig>): void {
  runtimeTransferConfig = { ...runtimeTransferConfig, ...config };
}

/**
 * 获取冻结配置
 */
export function getFreezeConfig(): FreezeConfig {
  return { ...runtimeFreezeConfig };
}

/**
 * 更新冻结配置
 */
export function updateFreezeConfig(config: Partial<FreezeConfig>): void {
  runtimeFreezeConfig = { ...runtimeFreezeConfig, ...config };
}

/**
 * 根据规则代码获取规则
 */
export function getRuleByCode(code: string): PointsRule | undefined {
  return ALL_POINTS_RULES[code];
}

/**
 * 获取所有获取规则
 */
export function getEarnRules(): PointsRule[] {
  return Object.values(EARN_RULES).filter(rule => rule.enabled);
}

/**
 * 获取所有消耗规则
 */
export function getSpendRules(): PointsRule[] {
  return Object.values(SPEND_RULES).filter(rule => rule.enabled);
}

/**
 * 获取场景相关的消耗规则
 */
export function getSpendRulesByScene(scene: SceneCode): PointsRule[] {
  return Object.values(SPEND_RULES).filter(
    rule => rule.enabled && rule.scene === scene
  );
}

/**
 * 计算充值获得的积分
 */
export function calculateRechargePoints(rmbAmount: number): number {
  const config = getPointsValueConfig();
  return Math.floor(rmbAmount * config.rmbToPointsRate);
}

/**
 * 计算积分对应的人民币价值
 */
export function calculatePointsRmbValue(points: number): number {
  const config = getPointsValueConfig();
  return Math.round(points * config.pointsToRmbRate * 100) / 100;
}

/**
 * 计算转账手续费
 */
export function calculateTransferFee(amount: number): number {
  const config = getTransferConfig();
  if (!config.enabled) {
    throw new Error('Transfer is disabled');
  }
  const fee = Math.round(amount * config.feeRate);
  return Math.max(config.feeMin, Math.min(fee, config.feeMax));
}

/**
 * 重置配置为默认值（用于测试）
 */
export function resetPointsConfig(): void {
  runtimeLimits = { ...DEFAULT_LIMITS };
  runtimeValueConfig = { ...DEFAULT_VALUE_CONFIG };
  runtimeTransferConfig = { ...DEFAULT_TRANSFER_CONFIG };
  runtimeFreezeConfig = { ...DEFAULT_FREEZE_CONFIG };
}
