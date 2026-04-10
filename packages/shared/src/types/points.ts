/**
 * 积分系统共享类型
 * 供前后端共享使用
 */

// 积分交易类型
export enum PointsTransactionType {
  EARN = 'earn',           // 获取积分（任务奖励、注册奖励等）
  SPEND = 'spend',         // 消耗积分（查看照片等）
  RECHARGE = 'recharge',   // 充值
  REFUND = 'refund',       // 退款
  FROZEN = 'frozen',       // 冻结
  UNFROZEN = 'unfrozen',   // 解冻
  DEDUCT = 'deduct',       // 扣除（惩罚）
  TRANSFER_IN = 'transfer_in',   // 转入
  TRANSFER_OUT = 'transfer_out', // 转出
}

// 冻结状态
export enum FreezeStatus {
  FROZEN = 'frozen',       // 冻结中
  USED = 'used',           // 已使用（完成交易）
  RELEASED = 'released',   // 已释放（取消交易）
  EXPIRED = 'expired',     // 已过期
}

// 场景代码
export enum SceneCode {
  VISION_SHARE = 'vision_share',
  AGENT_DATE = 'agent_date',
  AGENT_JOB = 'agent_job',
  AGENT_AD = 'agent_ad',
}

// 积分账户
export interface PointsAccount {
  id: string;
  userId: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  frozenAmount: number;
  version: number;
  createdAt: string;
  updatedAt: string;
}

// 积分交易记录
export interface PointsTransaction {
  id: string;
  accountId: string;
  userId: string;
  type: PointsTransactionType;
  amount: number;
  balanceAfter: number;
  description?: string;
  scene?: SceneCode;
  referenceId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// 积分冻结记录
export interface PointsFreeze {
  id: string;
  accountId: string;
  transactionId?: string;
  amount: number;
  reason: string;
  scene?: SceneCode;
  referenceId?: string;
  status: FreezeStatus;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

// 积分账户响应
export interface PointsAccountResponse {
  id: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  frozenAmount: number;
  availableBalance: number;
}

// 交易记录列表响应
export interface PointsTransactionListResponse {
  transactions: PointsTransaction[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// 冻结记录列表响应
export interface PointsFreezeListResponse {
  freezes: PointsFreeze[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// 积分交易请求（用于创建交易）
export interface CreatePointsTransactionRequest {
  type: PointsTransactionType;
  amount: number;
  description?: string;
  scene?: SceneCode;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}

// 积分冻结请求
export interface CreatePointsFreezeRequest {
  amount: number;
  reason: string;
  scene?: SceneCode;
  referenceId?: string;
  expiresAt?: string;
}

// 积分操作结果
export interface PointsOperationResult {
  success: boolean;
  account?: PointsAccount;
  transaction?: PointsTransaction;
  freeze?: PointsFreeze;
  error?: string;
}

// 积分交易类型显示信息
export interface PointsTransactionTypeInfo {
  type: PointsTransactionType;
  label: string;
  description: string;
  isIncome: boolean;
}

// 积分交易类型配置
export const POINTS_TRANSACTION_TYPE_CONFIG: Record<PointsTransactionType, PointsTransactionTypeInfo> = {
  [PointsTransactionType.EARN]: {
    type: PointsTransactionType.EARN,
    label: '获得积分',
    description: '通过完成任务或活动获得积分',
    isIncome: true,
  },
  [PointsTransactionType.SPEND]: {
    type: PointsTransactionType.SPEND,
    label: '消耗积分',
    description: '使用积分购买服务或查看内容',
    isIncome: false,
  },
  [PointsTransactionType.RECHARGE]: {
    type: PointsTransactionType.RECHARGE,
    label: '充值',
    description: '通过充值获得积分',
    isIncome: true,
  },
  [PointsTransactionType.REFUND]: {
    type: PointsTransactionType.REFUND,
    label: '退款',
    description: '交易退款返还积分',
    isIncome: true,
  },
  [PointsTransactionType.FROZEN]: {
    type: PointsTransactionType.FROZEN,
    label: '冻结',
    description: '积分被冻结用于交易担保',
    isIncome: false,
  },
  [PointsTransactionType.UNFROZEN]: {
    type: PointsTransactionType.UNFROZEN,
    label: '解冻',
    description: '冻结积分解冻返还',
    isIncome: true,
  },
  [PointsTransactionType.DEDUCT]: {
    type: PointsTransactionType.DEDUCT,
    label: '扣除',
    description: '因违规或惩罚扣除积分',
    isIncome: false,
  },
  [PointsTransactionType.TRANSFER_IN]: {
    type: PointsTransactionType.TRANSFER_IN,
    label: '转入',
    description: '从其他账户转入积分',
    isIncome: true,
  },
  [PointsTransactionType.TRANSFER_OUT]: {
    type: PointsTransactionType.TRANSFER_OUT,
    label: '转出',
    description: '向其他账户转出积分',
    isIncome: false,
  },
};

// 冻结状态显示信息
export interface FreezeStatusInfo {
  status: FreezeStatus;
  label: string;
  description: string;
}

// 冻结状态配置
export const FREEZE_STATUS_CONFIG: Record<FreezeStatus, FreezeStatusInfo> = {
  [FreezeStatus.FROZEN]: {
    status: FreezeStatus.FROZEN,
    label: '冻结中',
    description: '积分当前处于冻结状态',
  },
  [FreezeStatus.USED]: {
    status: FreezeStatus.USED,
    label: '已使用',
    description: '冻结积分已被使用完成交易',
  },
  [FreezeStatus.RELEASED]: {
    status: FreezeStatus.RELEASED,
    label: '已释放',
    description: '冻结积分已释放返还账户',
  },
  [FreezeStatus.EXPIRED]: {
    status: FreezeStatus.EXPIRED,
    label: '已过期',
    description: '冻结积分因过期自动释放',
  },
};
