"use strict";
/**
 * Employer types shared between client and server
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VERIFICATION_STATUS_COLORS = exports.WORK_MODE_LABELS = exports.VERIFICATION_STATUS_LABELS = exports.COMPANY_INDUSTRY_LABELS = exports.COMPANY_SIZE_LABELS = exports.WorkMode = exports.VerificationStatus = exports.CompanyIndustry = exports.CompanySize = void 0;
var CompanySize;
(function (CompanySize) {
    CompanySize["STARTUP"] = "STARTUP";
    CompanySize["SMALL"] = "SMALL";
    CompanySize["MEDIUM"] = "MEDIUM";
    CompanySize["LARGE"] = "LARGE";
    CompanySize["ENTERPRISE"] = "ENTERPRISE";
})(CompanySize || (exports.CompanySize = CompanySize = {}));
var CompanyIndustry;
(function (CompanyIndustry) {
    CompanyIndustry["TECH"] = "TECH";
    CompanyIndustry["FINANCE"] = "FINANCE";
    CompanyIndustry["HEALTHCARE"] = "HEALTHCARE";
    CompanyIndustry["EDUCATION"] = "EDUCATION";
    CompanyIndustry["MANUFACTURING"] = "MANUFACTURING";
    CompanyIndustry["RETAIL"] = "RETAIL";
    CompanyIndustry["CONSULTING"] = "CONSULTING";
    CompanyIndustry["MEDIA"] = "MEDIA";
    CompanyIndustry["REAL_ESTATE"] = "REAL_ESTATE";
    CompanyIndustry["OTHER"] = "OTHER";
})(CompanyIndustry || (exports.CompanyIndustry = CompanyIndustry = {}));
var VerificationStatus;
(function (VerificationStatus) {
    VerificationStatus["UNVERIFIED"] = "UNVERIFIED";
    VerificationStatus["PENDING"] = "PENDING";
    VerificationStatus["EMAIL_VERIFIED"] = "EMAIL_VERIFIED";
    VerificationStatus["BUSINESS_VERIFIED"] = "BUSINESS_VERIFIED";
    VerificationStatus["REJECTED"] = "REJECTED";
})(VerificationStatus || (exports.VerificationStatus = VerificationStatus = {}));
var WorkMode;
(function (WorkMode) {
    WorkMode["REMOTE"] = "REMOTE";
    WorkMode["ONSITE"] = "ONSITE";
    WorkMode["HYBRID"] = "HYBRID";
})(WorkMode || (exports.WorkMode = WorkMode = {}));
// Company size labels
exports.COMPANY_SIZE_LABELS = {
    [CompanySize.STARTUP]: '1-50人',
    [CompanySize.SMALL]: '51-200人',
    [CompanySize.MEDIUM]: '201-1000人',
    [CompanySize.LARGE]: '1001-10000人',
    [CompanySize.ENTERPRISE]: '10000人以上',
};
// Company industry labels
exports.COMPANY_INDUSTRY_LABELS = {
    [CompanyIndustry.TECH]: '互联网/科技',
    [CompanyIndustry.FINANCE]: '金融',
    [CompanyIndustry.HEALTHCARE]: '医疗健康',
    [CompanyIndustry.EDUCATION]: '教育',
    [CompanyIndustry.MANUFACTURING]: '制造业',
    [CompanyIndustry.RETAIL]: '零售/电商',
    [CompanyIndustry.CONSULTING]: '咨询',
    [CompanyIndustry.MEDIA]: '媒体/广告',
    [CompanyIndustry.REAL_ESTATE]: '房地产',
    [CompanyIndustry.OTHER]: '其他',
};
// Verification status labels
exports.VERIFICATION_STATUS_LABELS = {
    [VerificationStatus.UNVERIFIED]: '未认证',
    [VerificationStatus.PENDING]: '审核中',
    [VerificationStatus.EMAIL_VERIFIED]: '邮箱已认证',
    [VerificationStatus.BUSINESS_VERIFIED]: '企业已认证',
    [VerificationStatus.REJECTED]: '认证被拒绝',
};
// Work mode labels
exports.WORK_MODE_LABELS = {
    [WorkMode.REMOTE]: '远程办公',
    [WorkMode.ONSITE]: '现场办公',
    [WorkMode.HYBRID]: '混合办公',
};
// Verification status colors
exports.VERIFICATION_STATUS_COLORS = {
    [VerificationStatus.UNVERIFIED]: '#9E9E9E',
    [VerificationStatus.PENDING]: '#FFC107',
    [VerificationStatus.EMAIL_VERIFIED]: '#2196F3',
    [VerificationStatus.BUSINESS_VERIFIED]: '#4CAF50',
    [VerificationStatus.REJECTED]: '#F44336',
};
//# sourceMappingURL=employer.js.map