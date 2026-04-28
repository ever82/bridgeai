"use strict";
/**
 * VisionShare Payment Types
 * Shared types for credit payment and transaction functionality
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionType = exports.PaymentStatus = void 0;
/** Payment status enum */
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "pending";
    PaymentStatus["PROCESSING"] = "processing";
    PaymentStatus["COMPLETED"] = "completed";
    PaymentStatus["FAILED"] = "failed";
    PaymentStatus["REFUNDED"] = "refunded";
    PaymentStatus["DISPUTED"] = "disputed";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
/** Transaction type enum */
var TransactionType;
(function (TransactionType) {
    TransactionType["PURCHASE"] = "purchase";
    TransactionType["REFUND"] = "refund";
    TransactionType["BONUS"] = "bonus";
    TransactionType["ADJUSTMENT"] = "adjustment";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
//# sourceMappingURL=payment.types.js.map