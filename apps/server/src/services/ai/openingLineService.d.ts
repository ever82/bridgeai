/**
 * Opening Line Service
 * 约会开场白生成服务 - 基于匹配点生成个性化开场白
 */
import type { MatchScore } from '../dating/matchAlgorithm';
export interface OpeningLineRequest {
    matchScore: MatchScore;
    sourcePersona?: {
        name?: string;
        personality?: string[];
    };
    targetPersona?: {
        name?: string;
        personality?: string[];
        interests?: string[];
    };
    tone?: 'casual' | 'friendly' | 'humorous' | 'sincere';
    language?: string;
}
export interface OpeningLineResult {
    line: string;
    tone: string;
    basedOn: string[];
    alternatives: string[];
}
/**
 * 根据匹配亮点生成个性化开场白
 */
export declare function generateOpeningLine(request: OpeningLineRequest): OpeningLineResult;
/**
 * 批量生成多个开场白选项
 */
export declare function generateOpeningLineOptions(request: OpeningLineRequest, count?: number): OpeningLineResult[];
declare const _default: {
    generateOpeningLine: typeof generateOpeningLine;
    generateOpeningLineOptions: typeof generateOpeningLineOptions;
};
export default _default;
//# sourceMappingURL=openingLineService.d.ts.map