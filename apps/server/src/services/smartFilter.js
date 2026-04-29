/**
 * Smart Filter Service
 * Provides intelligent agent filtering with multi-criteria scoring and AI-assisted filtering
 */
import { sortAgents } from '../utils/sorting';
const DEFAULT_WEIGHTS = {
    skillMatch: 0.3,
    rating: 0.25,
    price: 0.15,
    availability: 0.1,
    experience: 0.1,
    verification: 0.1,
};
/**
 * Calculate skill match score
 */
function calculateSkillMatch(agent, requiredSkills) {
    if (!requiredSkills.length)
        return 1;
    const agentSkills = agent.skills.map(s => s.toLowerCase());
    const matches = requiredSkills.filter(skill => agentSkills.includes(skill.toLowerCase())).length;
    return matches / requiredSkills.length;
}
/**
 * Calculate price score (lower is better, up to max rate)
 */
function calculatePriceScore(agent, maxRate) {
    if (!maxRate || agent.hourlyRate <= maxRate)
        return 1;
    const ratio = maxRate / agent.hourlyRate;
    return Math.max(0, ratio);
}
/**
 * Calculate experience score
 */
function calculateExperienceScore(agent, minYears) {
    if (!minYears)
        return 1;
    if (agent.experienceYears >= minYears)
        return 1;
    return agent.experienceYears / minYears;
}
/**
 * Calculate availability score
 */
function calculateAvailabilityScore(agent, requireAvailable) {
    if (!requireAvailable)
        return 1;
    return agent.isAvailable ? 1 : 0;
}
/**
 * Calculate verification score
 */
function calculateVerificationScore(agent, requireVerified) {
    if (!requireVerified)
        return agent.isVerified ? 1 : 0.5;
    return agent.isVerified ? 1 : 0;
}
/**
 * Calculate rating score
 */
function calculateRatingScore(agent, minRating) {
    const rating = agent.rating || 0;
    if (minRating && rating < minRating)
        return 0;
    // Normalize rating to 0-1 scale (assuming 5-star max)
    return rating / 5;
}
/**
 * Apply smart filtering with multi-criteria scoring
 */
export function smartFilter(agents, criteria, weights = DEFAULT_WEIGHTS) {
    const results = agents.map(agent => {
        const skillMatch = calculateSkillMatch(agent, criteria.skills || []);
        const ratingScore = calculateRatingScore(agent, criteria.minRating);
        const priceScore = calculatePriceScore(agent, criteria.maxHourlyRate);
        const availabilityScore = calculateAvailabilityScore(agent, criteria.availability);
        const experienceScore = calculateExperienceScore(agent, criteria.experienceYears);
        const verificationScore = calculateVerificationScore(agent, criteria.verified);
        // Calculate weighted total score
        const score = skillMatch * weights.skillMatch +
            ratingScore * weights.rating +
            priceScore * weights.price +
            availabilityScore * weights.availability +
            experienceScore * weights.experience +
            verificationScore * weights.verification;
        return {
            agent,
            score,
            matchDetails: {
                skillMatch,
                ratingScore,
                priceScore,
                availabilityScore,
                experienceScore,
                verificationScore,
            },
        };
    });
    // Filter out agents with score below threshold (0.3)
    // Also apply hard filters for certain criteria
    return results.filter(r => {
        // Must meet score threshold
        if (r.score <= 0.3)
            return false;
        // Hard filter: skills - if skills specified, must match at least one
        if (criteria.skills && criteria.skills.length > 0 && r.matchDetails.skillMatch === 0) {
            return false;
        }
        // Hard filter: minimum rating
        if (criteria.minRating !== undefined && (r.agent.rating || 0) < criteria.minRating) {
            return false;
        }
        // Hard filter: max hourly rate
        if (criteria.maxHourlyRate !== undefined && r.agent.hourlyRate > criteria.maxHourlyRate) {
            return false;
        }
        // Hard filter: availability
        if (criteria.availability === true && !r.agent.isAvailable) {
            return false;
        }
        // Hard filter: verification
        if (criteria.verified === true && !r.agent.isVerified) {
            return false;
        }
        return true;
    });
}
/**
 * AI-assisted filtering with natural language query
 */
export async function aiAssistedFilter(agents, naturalLanguageQuery, aiService) {
    // Parse natural language query into structured criteria
    const criteria = await aiService.analyzeQuery(naturalLanguageQuery);
    // Apply smart filtering with parsed criteria
    return smartFilter(agents, criteria);
}
/**
 * Dynamically adjust weights based on user preferences
 */
export function adjustWeights(baseWeights, preferences) {
    const adjusted = { ...baseWeights, ...preferences };
    // Normalize weights to sum to 1
    const sum = Object.values(adjusted).reduce((a, b) => a + b, 0);
    return {
        skillMatch: adjusted.skillMatch / sum,
        rating: adjusted.rating / sum,
        price: adjusted.price / sum,
        availability: adjusted.availability / sum,
        experience: adjusted.experience / sum,
        verification: adjusted.verification / sum,
    };
}
/**
 * Get filter suggestions based on popular criteria
 */
export function getFilterSuggestions(_agents) {
    const suggestions = [
        { verified: true, minRating: 4.5 },
        { availability: true, minRating: 4.0 },
        { verified: true, availability: true },
    ];
    return suggestions;
}
/**
 * Combine filtering with sorting
 */
export function filterAndSort(agents, criteria, sortStrategy, sortOrder = 'desc', weights) {
    const filtered = smartFilter(agents, criteria, weights);
    // Sort by the specified strategy
    return sortAgents(filtered, sortStrategy, sortOrder);
}
//# sourceMappingURL=smartFilter.js.map