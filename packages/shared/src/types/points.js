"use strict";
/**
 * 积分系统共享类型定义
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FreezeStatus = exports.PointsTransactionType = exports.SceneCode = void 0;
// 场景代码
var SceneCode;
(function (SceneCode) {
    SceneCode["VISION_SHARE"] = "vision_share";
    SceneCode["AGENT_DATE"] = "agent_date";
    SceneCode["AGENT_JOB"] = "agent_job";
    SceneCode["AGENT_AD"] = "agent_ad";
})(SceneCode || (exports.SceneCode = SceneCode = {}));
// 积分交易类型
var PointsTransactionType;
(function (PointsTransactionType) {
    PointsTransactionType["EARN"] = "EARN";
    PointsTransactionType["SPEND"] = "SPEND";
    PointsTransactionType["FROZEN"] = "FROZEN";
    PointsTransactionType["UNFROZEN"] = "UNFROZEN";
    PointsTransactionType["TRANSFER_IN"] = "TRANSFER_IN";
    PointsTransactionType["TRANSFER_OUT"] = "TRANSFER_OUT";
})(PointsTransactionType || (exports.PointsTransactionType = PointsTransactionType = {}));
// 冻结状态
var FreezeStatus;
(function (FreezeStatus) {
    FreezeStatus["FROZEN"] = "FROZEN";
    FreezeStatus["RELEASED"] = "RELEASED";
    FreezeStatus["USED"] = "USED";
})(FreezeStatus || (exports.FreezeStatus = FreezeStatus = {}));
//# sourceMappingURL=points.js.map