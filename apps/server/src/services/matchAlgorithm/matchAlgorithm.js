/**
 * Match Algorithm
 * 匹配算法核心实现 - 委托给 resumeMatcher 多维度评分
 */
import { matchResumeToJob } from '../matching/resumeMatcher';
export class MatchScoringModel {
    constructor(_config, _version) {
        // Initialize with config and version if needed
    }
    /**
     * 计算匹配分数 (0-1)
     * 委托给 resumeMatcher 多维度评分算法，结果转换为 0-1 范围
     */
    async calculateScore(params) {
        // 尝试从 userA/userB 提取 ResumeProfile 和 JobCriteria
        const resume = params.userA;
        const job = params.userB;
        if (resume?.skills && job?.skills && job?.salary) {
            // 使用 resumeMatcher 核心算法
            const result = matchResumeToJob(resume, job);
            return result.totalScore / 100;
        }
        // 回退到默认分数
        return 0.5;
    }
    async getCompatibilityFactors(_userId) {
        return Promise.resolve({});
    }
}
//# sourceMappingURL=matchAlgorithm.js.map