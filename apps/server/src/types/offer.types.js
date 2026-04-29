/**
 * Offer Types
 * Types and interfaces for offer management
 */
export var OfferType;
(function (OfferType) {
    OfferType["DISCOUNT"] = "DISCOUNT";
    OfferType["REDUCTION"] = "REDUCTION";
    OfferType["GIFT"] = "GIFT";
    OfferType["PACKAGE"] = "PACKAGE";
    OfferType["PERCENTAGE"] = "PERCENTAGE";
    OfferType["FIXED_AMOUNT"] = "FIXED_AMOUNT";
})(OfferType || (OfferType = {}));
export var OfferStatus;
(function (OfferStatus) {
    OfferStatus["DRAFT"] = "DRAFT";
    OfferStatus["PENDING"] = "PENDING";
    OfferStatus["ACTIVE"] = "ACTIVE";
    OfferStatus["PAUSED"] = "PAUSED";
    OfferStatus["EXPIRED"] = "EXPIRED";
    OfferStatus["SOLD_OUT"] = "SOLD_OUT";
    OfferStatus["DISABLED"] = "DISABLED";
})(OfferStatus || (OfferStatus = {}));
export var OfferPublishType;
(function (OfferPublishType) {
    OfferPublishType["MANUAL"] = "MANUAL";
    OfferPublishType["SCHEDULED"] = "SCHEDULED";
    OfferPublishType["IMMEDIATE"] = "IMMEDIATE";
})(OfferPublishType || (OfferPublishType = {}));
export var UserGroup;
(function (UserGroup) {
    UserGroup["NEW_USER"] = "NEW_USER";
    UserGroup["ALL_USERS"] = "ALL_USERS";
    UserGroup["VIP"] = "VIP";
    UserGroup["MEMBER"] = "MEMBER";
})(UserGroup || (UserGroup = {}));
// Valid status transitions
export const VALID_OFFER_STATUS_TRANSITIONS = [
    { from: OfferStatus.DRAFT, to: [OfferStatus.PENDING, OfferStatus.ACTIVE, OfferStatus.DISABLED] },
    { from: OfferStatus.PENDING, to: [OfferStatus.ACTIVE, OfferStatus.DISABLED, OfferStatus.DRAFT] },
    { from: OfferStatus.ACTIVE, to: [OfferStatus.PAUSED, OfferStatus.DISABLED, OfferStatus.EXPIRED, OfferStatus.SOLD_OUT] },
    { from: OfferStatus.PAUSED, to: [OfferStatus.ACTIVE, OfferStatus.DISABLED] },
    { from: OfferStatus.EXPIRED, to: [OfferStatus.DISABLED] },
    { from: OfferStatus.SOLD_OUT, to: [OfferStatus.DISABLED, OfferStatus.ACTIVE] },
    { from: OfferStatus.DISABLED, to: [OfferStatus.DRAFT] },
];
//# sourceMappingURL=offer.types.js.map