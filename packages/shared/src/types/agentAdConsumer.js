"use strict";
/**
 * AgentAd Consumer Demand Profile Types
 * 消费者需求画像类型定义
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsumerDemandStatus = exports.DEMAND_URGENCY_LABELS = exports.DemandUrgency = exports.MERCHANT_TYPE_LABELS = exports.MerchantType = exports.BUDGET_DISCLOSURE_LABELS = exports.BudgetDisclosure = exports.AGENTAD_ROLE_DESCRIPTIONS = exports.AGENTAD_ROLE_LABELS = exports.AgentAdRole = void 0;
// ============================================
// Role Types
// ============================================
var AgentAdRole;
(function (AgentAdRole) {
    AgentAdRole["CONSUMER"] = "CONSUMER";
    AgentAdRole["MERCHANT"] = "MERCHANT";
})(AgentAdRole || (exports.AgentAdRole = AgentAdRole = {}));
exports.AGENTAD_ROLE_LABELS = {
    [AgentAdRole.CONSUMER]: '消费者',
    [AgentAdRole.MERCHANT]: '商家',
};
exports.AGENTAD_ROLE_DESCRIPTIONS = {
    [AgentAdRole.CONSUMER]: '有购买需求的用户，配置消费画像寻找匹配商家',
    [AgentAdRole.MERCHANT]: '提供商品或服务的商家，发布广告寻找潜在客户',
};
// ============================================
// Budget Types
// ============================================
var BudgetDisclosure;
(function (BudgetDisclosure) {
    BudgetDisclosure["PUBLIC"] = "PUBLIC";
    BudgetDisclosure["PRIVATE"] = "PRIVATE";
    BudgetDisclosure["RANGE_ONLY"] = "RANGE_ONLY";
})(BudgetDisclosure || (exports.BudgetDisclosure = BudgetDisclosure = {}));
exports.BUDGET_DISCLOSURE_LABELS = {
    [BudgetDisclosure.PUBLIC]: '公开预算',
    [BudgetDisclosure.PRIVATE]: '保密预算',
    [BudgetDisclosure.RANGE_ONLY]: '仅显示范围',
};
// ============================================
// Merchant Preferences
// ============================================
var MerchantType;
(function (MerchantType) {
    MerchantType["CHAIN"] = "CHAIN";
    MerchantType["LOCAL"] = "LOCAL";
    MerchantType["INDIVIDUAL"] = "INDIVIDUAL";
    MerchantType["ONLINE_ONLY"] = "ONLINE_ONLY";
    MerchantType["PREMIUM"] = "PREMIUM";
    MerchantType["BUDGET"] = "BUDGET";
})(MerchantType || (exports.MerchantType = MerchantType = {}));
exports.MERCHANT_TYPE_LABELS = {
    [MerchantType.CHAIN]: '连锁品牌',
    [MerchantType.LOCAL]: '本地商家',
    [MerchantType.INDIVIDUAL]: '个人商家',
    [MerchantType.ONLINE_ONLY]: '纯线上商家',
    [MerchantType.PREMIUM]: '高端商家',
    [MerchantType.BUDGET]: '平价商家',
};
// ============================================
// Timeline & Urgency
// ============================================
var DemandUrgency;
(function (DemandUrgency) {
    DemandUrgency["URGENT"] = "URGENT";
    DemandUrgency["HIGH"] = "HIGH";
    DemandUrgency["MEDIUM"] = "MEDIUM";
    DemandUrgency["LOW"] = "LOW";
    DemandUrgency["FLEXIBLE"] = "FLEXIBLE";
})(DemandUrgency || (exports.DemandUrgency = DemandUrgency = {}));
exports.DEMAND_URGENCY_LABELS = {
    [DemandUrgency.URGENT]: '急需（24小时内）',
    [DemandUrgency.HIGH]: '高（3天内）',
    [DemandUrgency.MEDIUM]: '中等（1周内）',
    [DemandUrgency.LOW]: '低（1个月内）',
    [DemandUrgency.FLEXIBLE]: '灵活时间',
};
var ConsumerDemandStatus;
(function (ConsumerDemandStatus) {
    ConsumerDemandStatus["DRAFT"] = "DRAFT";
    ConsumerDemandStatus["PENDING_REVIEW"] = "PENDING_REVIEW";
    ConsumerDemandStatus["ACTIVE"] = "ACTIVE";
    ConsumerDemandStatus["PAUSED"] = "PAUSED";
    ConsumerDemandStatus["EXPIRED"] = "EXPIRED";
})(ConsumerDemandStatus || (exports.ConsumerDemandStatus = ConsumerDemandStatus = {}));
//# sourceMappingURL=agentAdConsumer.js.map