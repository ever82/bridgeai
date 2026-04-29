/**
 * Recommendation Service
 * Provides personalized agent recommendations using collaborative filtering and user preference learning
 */
import { Agent } from '../models/Agent';
interface Recommendation {
    agent: Agent;
    score: number;
    reason: string;
}
/**
 * Get personalized recommendations for a user
 */
export declare function getRecommendationsForUser(userId: string, agents: Agent[]): Promise<Recommendation[]>;
/**
 * Record user interaction for learning (invalidates cache; preferences will be
 * recomputed and persisted to DB on next getRecommendationsForUser call)
 */
export declare function recordInteraction(userId: string, agentId: string, type: 'view' | 'contact' | 'hire' | 'review', rating?: number): Promise<void>;
/**
 * Get recommendation explanation for a specific agent
 */
export declare function getRecommendationExplanation(userId: string, agent: Agent): Promise<string>;
/**
 * Feedback on recommendations
 */
export declare function recordRecommendationFeedback(userId: string, agentId: string, helpful: boolean): void;
export {};
//# sourceMappingURL=recommendation.d.ts.map