/**
 * VisionShare Payment Types
 * Shared types for credit payment and transaction functionality
 */
/** Payment status enum */
export var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "pending";
    PaymentStatus["PROCESSING"] = "processing";
    PaymentStatus["COMPLETED"] = "completed";
    PaymentStatus["FAILED"] = "failed";
    PaymentStatus["REFUNDED"] = "refunded";
    PaymentStatus["DISPUTED"] = "disputed";
})(PaymentStatus || (PaymentStatus = {}));
/** Transaction type enum */
export var TransactionType;
(function (TransactionType) {
    TransactionType["PURCHASE"] = "purchase";
    TransactionType["REFUND"] = "refund";
    TransactionType["BONUS"] = "bonus";
    TransactionType["ADJUSTMENT"] = "adjustment";
})(TransactionType || (TransactionType = {}));
//# sourceMappingURL=payment.types.js.map