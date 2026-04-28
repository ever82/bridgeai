/**
 * Salary Negotiation Prompts
 * AI薪资协商提示词
 */
import { NegotiationRoom, NegotiationMessage, NegotiationTopic } from '../../models/NegotiationRoom';
export interface PromptContext {
    room: NegotiationRoom;
    messages?: NegotiationMessage[];
    isJobSeeker?: boolean;
    messageType?: string;
    lastOffer?: number;
    marketData?: {
        position: string;
        location: string;
        experienceYears: number;
        marketRange: {
            min: number;
            max: number;
            median: number;
        };
    };
    jobSeekerProfile?: {
        currentSalary?: number;
        expectedMin?: number;
        expectedMax?: number;
        priorityTopics: NegotiationTopic[];
    };
    employerProfile?: {
        budgetMin?: number;
        budgetMax?: number;
        priorityTopics: NegotiationTopic[];
        flexibilityScore: number;
    };
}
export interface NegotiationPrompt {
    system: string;
    user: string;
}
/**
 * Get prompt for strategy generation
 */
export declare function getStrategyPrompt(context: PromptContext): NegotiationPrompt;
/**
 * Get prompt for counter offer generation
 */
export declare function getCounterOfferPrompt(context: PromptContext): NegotiationPrompt;
/**
 * Get prompt for negotiation analysis
 */
export declare function getAnalysisPrompt(context: PromptContext): NegotiationPrompt;
/**
 * Get prompt for message generation
 */
export declare function getMessagePrompt(context: PromptContext): NegotiationPrompt;
/**
 * Get prompt for agreement check
 */
export declare function getAgreementCheckPrompt(context: PromptContext): NegotiationPrompt;
/**
 * Get prompt for negotiation summary
 */
export declare function getSummaryPrompt(context: PromptContext): NegotiationPrompt;
/**
 * Main prompt dispatcher
 */
export declare function getSalaryNegotiationPrompt(type: 'strategy' | 'counter_offer' | 'analysis' | 'message' | 'check_agreement' | 'summary', context: PromptContext): NegotiationPrompt;
export default getSalaryNegotiationPrompt;
//# sourceMappingURL=salaryNegotiation.d.ts.map