/**
 * Negotiation Room Model
 * 薪资协商房间模型
 */
export var NegotiationTopic;
(function (NegotiationTopic) {
    NegotiationTopic["SALARY"] = "salary";
    NegotiationTopic["BONUS"] = "bonus";
    NegotiationTopic["WORK_HOURS"] = "work_hours";
    NegotiationTopic["REMOTE_WORK"] = "remote_work";
    NegotiationTopic["BENEFITS"] = "benefits";
    NegotiationTopic["STOCK_OPTIONS"] = "stock_options";
    NegotiationTopic["VACATION"] = "vacation";
    NegotiationTopic["OTHER"] = "other";
})(NegotiationTopic || (NegotiationTopic = {}));
export var NegotiationStatus;
(function (NegotiationStatus) {
    NegotiationStatus["PENDING"] = "pending";
    NegotiationStatus["ACTIVE"] = "active";
    NegotiationStatus["NEGOTIATING"] = "negotiating";
    NegotiationStatus["REACHED"] = "reached";
    NegotiationStatus["FAILED"] = "failed";
    NegotiationStatus["CANCELLED"] = "cancelled";
    NegotiationStatus["HANDOFF_TO_HUMAN"] = "handoff_to_human";
})(NegotiationStatus || (NegotiationStatus = {}));
export var MessageSender;
(function (MessageSender) {
    MessageSender["JOBSEEKER_AGENT"] = "jobseeker_agent";
    MessageSender["EMPLOYER_AGENT"] = "employer_agent";
    MessageSender["SYSTEM"] = "system";
    MessageSender["HUMAN"] = "human";
})(MessageSender || (MessageSender = {}));
// Validation helpers
export function isValidNegotiationTopic(topic) {
    return Object.values(NegotiationTopic).includes(topic);
}
export function isValidNegotiationStatus(status) {
    return Object.values(NegotiationStatus).includes(status);
}
export function createNegotiationRoom(input, generateId) {
    const now = new Date();
    return {
        id: generateId(),
        jobApplicationId: input.jobApplicationId,
        jobSeekerId: input.jobSeekerId,
        jobSeekerAgentId: input.jobSeekerAgentId,
        employerId: input.employerId,
        employerAgentId: input.employerAgentId,
        status: NegotiationStatus.PENDING,
        topics: input.topics || [NegotiationTopic.SALARY],
        currentRound: 0,
        maxRounds: input.maxRounds || 5,
        initialOffer: input.initialOffer,
        currentOffer: input.initialOffer,
        targetRange: input.targetRange,
        currency: input.currency || 'CNY',
        rounds: [],
        createdAt: now,
        updatedAt: now,
        metadata: input.metadata
    };
}
export function createNegotiationMessage(roomId, sender, senderId, content, round, generateId, options) {
    return {
        id: generateId(),
        roomId,
        sender,
        senderId,
        content,
        topic: options?.topic,
        timestamp: new Date(),
        round,
        isCounterOffer: options?.isCounterOffer,
        offerValue: options?.offerValue,
        offerCurrency: options?.offerCurrency,
        metadata: options?.metadata
    };
}
export function calculateNegotiationProgress(room) {
    const progress = (room.currentRound / room.maxRounds) * 100;
    const remainingRounds = room.maxRounds - room.currentRound;
    // Check if negotiation is stale (no activity for 24 hours)
    const lastUpdate = new Date(room.updatedAt);
    const now = new Date();
    const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
    const isStale = hoursSinceUpdate > 24 && room.status === NegotiationStatus.NEGOTIATING;
    return { progress, remainingRounds, isStale };
}
export function shouldHandoffToHuman(room) {
    // Handoff conditions
    if (room.currentRound >= room.maxRounds) {
        return { should: true, reason: 'MAX_ROUNDS_REACHED' };
    }
    const { isStale } = calculateNegotiationProgress(room);
    if (isStale) {
        return { should: true, reason: 'NEGOTIATION_STALE' };
    }
    if (room.status === NegotiationStatus.FAILED) {
        return { should: true, reason: 'NEGOTIATION_FAILED' };
    }
    // Check for repeated counter-offers (stalemate detection)
    const lastRound = room.rounds[room.rounds.length - 1];
    if (lastRound && room.rounds.length >= 3) {
        const recentRounds = room.rounds.slice(-3);
        const allSameOffers = recentRounds.every(r => r.jobSeekerOffer === recentRounds[0].jobSeekerOffer &&
            r.employerOffer === recentRounds[0].employerOffer);
        if (allSameOffers) {
            return { should: true, reason: 'STALEMATE_DETECTED' };
        }
    }
    return { should: false };
}
//# sourceMappingURL=NegotiationRoom.js.map