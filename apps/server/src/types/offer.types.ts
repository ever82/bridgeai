/**
 * Offer Types
 * Types and interfaces for offer management
 */

export enum OfferType {
  DISCOUNT = 'DISCOUNT',         // 折扣 (如8折)
  REDUCTION = 'REDUCTION',       // 满减 (如满100减20)
  GIFT = 'GIFT',                 // 赠品
  PACKAGE = 'PACKAGE',           // 套餐
  PERCENTAGE = 'PERCENTAGE',     // 百分比折扣
  FIXED_AMOUNT = 'FIXED_AMOUNT', // 固定金额优惠
}

export enum OfferStatus {
  DRAFT = 'DRAFT',           // 草稿
  PENDING = 'PENDING',       // 待审核
  ACTIVE = 'ACTIVE',         // 生效中
  PAUSED = 'PAUSED',         // 暂停
  EXPIRED = 'EXPIRED',       // 已过期
  SOLD_OUT = 'SOLD_OUT',     // 已售罄
  DISABLED = 'DISABLED',     // 已下架
}

export enum OfferPublishType {
  MANUAL = 'MANUAL',         // 手动发布
  SCHEDULED = 'SCHEDULED',   // 定时发布
  IMMEDIATE = 'IMMEDIATE',   // 立即发布
}

export interface TimeRange {
  start: string; // HH:mm format
  end: string;   // HH:mm format
}

export interface ApplicableScope {
  products?: string[];           // 适用商品ID列表
  excludedProducts?: string[];   // 排除商品ID列表
  timeRanges?: TimeRange[];      // 适用时段
  storeIds?: string[];           // 适用门店ID列表
  userGroups?: UserGroup[];      // 适用人群
}

export enum UserGroup {
  NEW_USER = 'NEW_USER',         // 新用户
  ALL_USERS = 'ALL_USERS',       // 所有用户
  VIP = 'VIP',                   // VIP用户
  MEMBER = 'MEMBER',             // 会员
}

export interface AIExtractionData {
  rawText: string;
  extractedFields: {
    type?: OfferType;
    discountValue?: number;
    minPurchaseAmount?: number;
    applicableScope?: ApplicableScope;
    validFrom?: string;
    validUntil?: string;
  };
}

export interface Offer {
  id: string;
  merchantId: string;
  title: string;
  description?: string;
  type: OfferType;
  discountValue?: number;         // 折扣值或减免金额
  minPurchaseAmount?: number;     // 最低消费金额
  maxDiscountAmount?: number;     // 最高减免金额
  applicableScope?: ApplicableScope;
  validFrom: Date;
  validUntil: Date;
  totalStock: number;
  dailyLimit?: number;
  remainingStock: number;
  stockAlertThreshold: number;
  status: OfferStatus;
  publishType: OfferPublishType;
  scheduledPublishAt?: Date;
  aiExtracted: boolean;
  aiExtractionData?: AIExtractionData;
  aiConfidence?: number;
  usageCount: number;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOfferInput {
  merchantId: string;
  title: string;
  description?: string;
  type: OfferType;
  discountValue?: number;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  applicableScope?: ApplicableScope;
  validFrom: Date;
  validUntil: Date;
  totalStock: number;
  dailyLimit?: number;
  stockAlertThreshold?: number;
  publishType?: OfferPublishType;
  scheduledPublishAt?: Date;
}

export interface UpdateOfferInput {
  title?: string;
  description?: string;
  type?: OfferType;
  discountValue?: number;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  applicableScope?: ApplicableScope;
  validFrom?: Date;
  validUntil?: Date;
  totalStock?: number;
  dailyLimit?: number;
  stockAlertThreshold?: number;
  status?: OfferStatus;
  publishType?: OfferPublishType;
  scheduledPublishAt?: Date;
}

export interface OfferFilterOptions {
  merchantId?: string;
  status?: OfferStatus;
  type?: OfferType;
  activeOnly?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'validUntil' | 'usageCount';
  sortOrder?: 'asc' | 'desc';
}

export interface OfferListResult {
  offers: Offer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface StockAlert {
  offerId: string;
  merchantId: string;
  title: string;
  remainingStock: number;
  threshold: number;
}

export interface OfferStatusTransition {
  from: OfferStatus;
  to: OfferStatus[];
}

// Valid status transitions
export const VALID_OFFER_STATUS_TRANSITIONS: OfferStatusTransition[] = [
  { from: OfferStatus.DRAFT, to: [OfferStatus.PENDING, OfferStatus.ACTIVE, OfferStatus.DISABLED] },
  { from: OfferStatus.PENDING, to: [OfferStatus.ACTIVE, OfferStatus.DISABLED, OfferStatus.DRAFT] },
  { from: OfferStatus.ACTIVE, to: [OfferStatus.PAUSED, OfferStatus.DISABLED, OfferStatus.EXPIRED, OfferStatus.SOLD_OUT] },
  { from: OfferStatus.PAUSED, to: [OfferStatus.ACTIVE, OfferStatus.DISABLED] },
  { from: OfferStatus.EXPIRED, to: [OfferStatus.DISABLED] },
  { from: OfferStatus.SOLD_OUT, to: [OfferStatus.DISABLED, OfferStatus.ACTIVE] },
  { from: OfferStatus.DISABLED, to: [OfferStatus.DRAFT] },
];
