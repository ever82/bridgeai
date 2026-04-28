"use strict";
/**
 * Job posting types shared between client and server
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VALID_JOB_STATUS_TRANSITIONS = exports.APPLICATION_STATUS_COLORS = exports.JOB_STATUS_COLORS = exports.APPLICATION_STATUS_LABELS = exports.SALARY_PERIOD_LABELS = exports.EDUCATION_LEVEL_LABELS = exports.EXPERIENCE_LEVEL_LABELS = exports.JOB_TYPE_LABELS = exports.JOB_STATUS_LABELS = exports.ApplicationStatus = exports.SalaryPeriod = exports.ExperienceLevel = exports.JobType = exports.JobStatus = void 0;
const agentProfile_1 = require("./agentProfile");
var JobStatus;
(function (JobStatus) {
    JobStatus["DRAFT"] = "DRAFT";
    JobStatus["PUBLISHED"] = "PUBLISHED";
    JobStatus["PAUSED"] = "PAUSED";
    JobStatus["CLOSED"] = "CLOSED";
    JobStatus["EXPIRED"] = "EXPIRED";
})(JobStatus || (exports.JobStatus = JobStatus = {}));
var JobType;
(function (JobType) {
    JobType["FULL_TIME"] = "FULL_TIME";
    JobType["PART_TIME"] = "PART_TIME";
    JobType["CONTRACT"] = "CONTRACT";
    JobType["INTERNSHIP"] = "INTERNSHIP";
    JobType["FREELANCE"] = "FREELANCE";
})(JobType || (exports.JobType = JobType = {}));
var ExperienceLevel;
(function (ExperienceLevel) {
    ExperienceLevel["ENTRY"] = "ENTRY";
    ExperienceLevel["JUNIOR"] = "JUNIOR";
    ExperienceLevel["MID"] = "MID";
    ExperienceLevel["SENIOR"] = "SENIOR";
    ExperienceLevel["EXPERT"] = "EXPERT";
})(ExperienceLevel || (exports.ExperienceLevel = ExperienceLevel = {}));
var SalaryPeriod;
(function (SalaryPeriod) {
    SalaryPeriod["MONTHLY"] = "MONTHLY";
    SalaryPeriod["YEARLY"] = "YEARLY";
    SalaryPeriod["HOURLY"] = "HOURLY";
    SalaryPeriod["DAILY"] = "DAILY";
})(SalaryPeriod || (exports.SalaryPeriod = SalaryPeriod = {}));
var ApplicationStatus;
(function (ApplicationStatus) {
    ApplicationStatus["PENDING"] = "PENDING";
    ApplicationStatus["VIEWED"] = "VIEWED";
    ApplicationStatus["SHORTLISTED"] = "SHORTLISTED";
    ApplicationStatus["REJECTED"] = "REJECTED";
    ApplicationStatus["INTERVIEWING"] = "INTERVIEWING";
    ApplicationStatus["OFFERED"] = "OFFERED";
    ApplicationStatus["HIRED"] = "HIRED";
    ApplicationStatus["WITHDRAWN"] = "WITHDRAWN";
})(ApplicationStatus || (exports.ApplicationStatus = ApplicationStatus = {}));
// Status labels
exports.JOB_STATUS_LABELS = {
    [JobStatus.DRAFT]: '草稿',
    [JobStatus.PUBLISHED]: '已发布',
    [JobStatus.PAUSED]: '已暂停',
    [JobStatus.CLOSED]: '已关闭',
    [JobStatus.EXPIRED]: '已过期',
};
exports.JOB_TYPE_LABELS = {
    [JobType.FULL_TIME]: '全职',
    [JobType.PART_TIME]: '兼职',
    [JobType.CONTRACT]: '合同',
    [JobType.INTERNSHIP]: '实习',
    [JobType.FREELANCE]: '自由职业',
};
exports.EXPERIENCE_LEVEL_LABELS = {
    [ExperienceLevel.ENTRY]: '应届生/1年以下',
    [ExperienceLevel.JUNIOR]: '1-3年',
    [ExperienceLevel.MID]: '3-5年',
    [ExperienceLevel.SENIOR]: '5-10年',
    [ExperienceLevel.EXPERT]: '10年以上',
};
exports.EDUCATION_LEVEL_LABELS = {
    [agentProfile_1.EducationLevel.HIGH_SCHOOL]: '高中',
    [agentProfile_1.EducationLevel.ASSOCIATE]: '大专',
    [agentProfile_1.EducationLevel.BACHELOR]: '本科',
    [agentProfile_1.EducationLevel.MASTER]: '硕士',
    [agentProfile_1.EducationLevel.DOCTORATE]: '博士',
    [agentProfile_1.EducationLevel.OTHER]: '其他',
    [agentProfile_1.EducationLevel.NO_REQUIREMENT]: '不限',
};
exports.SALARY_PERIOD_LABELS = {
    [SalaryPeriod.MONTHLY]: '月',
    [SalaryPeriod.YEARLY]: '年',
    [SalaryPeriod.HOURLY]: '小时',
    [SalaryPeriod.DAILY]: '天',
};
exports.APPLICATION_STATUS_LABELS = {
    [ApplicationStatus.PENDING]: '待处理',
    [ApplicationStatus.VIEWED]: '已查看',
    [ApplicationStatus.SHORTLISTED]: ' shortlisted',
    [ApplicationStatus.REJECTED]: '已拒绝',
    [ApplicationStatus.INTERVIEWING]: '面试中',
    [ApplicationStatus.OFFERED]: '已发offer',
    [ApplicationStatus.HIRED]: '已录用',
    [ApplicationStatus.WITHDRAWN]: '已撤回',
};
// Status colors
exports.JOB_STATUS_COLORS = {
    [JobStatus.DRAFT]: '#9E9E9E',
    [JobStatus.PUBLISHED]: '#4CAF50',
    [JobStatus.PAUSED]: '#FFC107',
    [JobStatus.CLOSED]: '#F44336',
    [JobStatus.EXPIRED]: '#757575',
};
exports.APPLICATION_STATUS_COLORS = {
    [ApplicationStatus.PENDING]: '#9E9E9E',
    [ApplicationStatus.VIEWED]: '#2196F3',
    [ApplicationStatus.SHORTLISTED]: '#FF9800',
    [ApplicationStatus.REJECTED]: '#F44336',
    [ApplicationStatus.INTERVIEWING]: '#9C27B0',
    [ApplicationStatus.OFFERED]: '#4CAF50',
    [ApplicationStatus.HIRED]: '#4CAF50',
    [ApplicationStatus.WITHDRAWN]: '#757575',
};
// Valid status transitions
exports.VALID_JOB_STATUS_TRANSITIONS = {
    [JobStatus.DRAFT]: [JobStatus.PUBLISHED, JobStatus.CLOSED],
    [JobStatus.PUBLISHED]: [JobStatus.PAUSED, JobStatus.CLOSED, JobStatus.EXPIRED],
    [JobStatus.PAUSED]: [JobStatus.PUBLISHED, JobStatus.CLOSED],
    [JobStatus.CLOSED]: [JobStatus.DRAFT],
    [JobStatus.EXPIRED]: [JobStatus.DRAFT, JobStatus.PUBLISHED],
};
//# sourceMappingURL=jobPosting.js.map