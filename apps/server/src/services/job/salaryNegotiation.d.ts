/**
 * Salary Negotiation Service
 * AI驱动的薪资协商服务
 */
import { LLMService } from '../ai/llmService';
import { NegotiationRoom, NegotiationMessage, NegotiationTopic } from '../../models/NegotiationRoom';
export interface MarketData {
    position: string;
    location: string;
    experienceYears: number;
    marketRange: {
        min: number;
        max: number;
        median: number;
    };
    industry: string;
    companySize: string;
}
export interface NegotiationContext {
    room: NegotiationRoom;
    messages: NegotiationMessage[];
    marketData?: MarketData;
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
export interface NegotiationStrategy {
    approach: 'collaborative' | 'competitive' | 'compromising' | 'accommodating';
    keyPoints: string[];
    concessions: string[];
    bottomLine: number;
    targetAmount: number;
    reasoning: string;
}
export interface CounterOffer {
    amount: number;
    reasoning: string;
    conditions?: string[];
    benefits?: string[];
    deadline?: Date;
}
export interface NegotiationAnalysis {
    currentGap: number;
    percentageGap: number;
    suggestedCompromise: number;
    winWinOpportunities: string[];
    riskAreas: string[];
    nextMoveSuggestion: string;
}
export declare class SalaryNegotiationService {
    private llmService;
    constructor(llmService: LLMService);
    /**
     * Generate negotiation strategy for an agent
     */
    generateStrategy(context: NegotiationContext, isJobSeeker: boolean): Promise<NegotiationStrategy>;
    /**
     * Generate a counter offer
     */
    generateCounterOffer(context: NegotiationContext, isJobSeeker: boolean, lastOffer?: number): Promise<CounterOffer>;
    /**
     * Analyze negotiation situation
     */
    analyzeNegotiation(context: NegotiationContext): Promise<NegotiationAnalysis>;
    /**
     * Generate negotiation message
     */
    generateMessage(context: NegotiationContext, isJobSeeker: boolean, messageType: 'opening' | 'counter' | 'compromise' | 'closing' | 'response'): Promise<{
        content: string;
        isCounterOffer: boolean;
        offerValue?: number;
        topic?: NegotiationTopic;
    }>;
    /**
     * Check if agreement is reached
     */
    checkAgreement(context: NegotiationContext): Promise<{
        isReached: boolean;
        agreedAmount?: number;
        agreedBenefits?: string[];
        confidence: number;
    }>;
    /**
     * Generate negotiation summary
     */
    generateSummary(roomId: string): Promise<{
        summary: string;
        outcome: 'success' | 'partial' | 'failed';
        keyPoints: string[];
        lessonsLearned: string[];
    } | null>;
    private parseStrategyResponse;
    private parseCounterOfferResponse;
    private parseAnalysisResponse;
    private parseMessageResponse;
    private parseAgreementResponse;
    private parseSummaryResponse;
    private getDefaultStrategy;
    private getDefaultCounterOffer;
    private getDefaultAnalysis;
    private getDefaultMessage;
}
declare let salaryNegotiationService: SalaryNegotiationService | null;
export declare function initializeSalaryNegotiationService(llmService: LLMService): void;
export declare function getSalaryNegotiationService(): SalaryNegotiationService;
export { salaryNegotiationService };
//# sourceMappingURL=salaryNegotiation.d.ts.map