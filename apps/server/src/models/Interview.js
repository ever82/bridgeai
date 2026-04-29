/**
 * Interview Model
 * 面试安排模型
 */
export var InterviewStatus;
(function (InterviewStatus) {
    InterviewStatus["PENDING"] = "pending";
    InterviewStatus["PROPOSED"] = "proposed";
    InterviewStatus["CONFIRMED"] = "confirmed";
    InterviewStatus["RESCHEDULED"] = "rescheduled";
    InterviewStatus["CANCELLED"] = "cancelled";
    InterviewStatus["COMPLETED"] = "completed";
    InterviewStatus["NO_SHOW"] = "no_show";
    InterviewStatus["FEEDBACK_PENDING"] = "feedback_pending";
    InterviewStatus["CLOSED"] = "closed";
})(InterviewStatus || (InterviewStatus = {}));
export var InterviewType;
(function (InterviewType) {
    InterviewType["PHONE"] = "phone";
    InterviewType["VIDEO"] = "video";
    InterviewType["ONSITE"] = "onsite";
    InterviewType["ONLINE_ASSESSMENT"] = "online_assessment";
    InterviewType["GROUP"] = "group";
    InterviewType["PANEL"] = "panel";
})(InterviewType || (InterviewType = {}));
export var InterviewRound;
(function (InterviewRound) {
    InterviewRound["SCREENING"] = "screening";
    InterviewRound["TECHNICAL"] = "technical";
    InterviewRound["BEHAVIORAL"] = "behavioral";
    InterviewRound["CULTURE_FIT"] = "culture_fit";
    InterviewRound["FINAL"] = "final";
    InterviewRound["HR"] = "hr";
    InterviewRound["OFFER_DISCUSSION"] = "offer_discussion";
})(InterviewRound || (InterviewRound = {}));
// Validation helpers
export function isValidInterviewStatus(status) {
    return Object.values(InterviewStatus).includes(status);
}
export function isValidInterviewType(type) {
    return Object.values(InterviewType).includes(type);
}
export function isValidInterviewRound(round) {
    return Object.values(InterviewRound).includes(round);
}
export function createInterview(input, generateId) {
    const now = new Date();
    return {
        id: generateId(),
        jobApplicationId: input.jobApplicationId,
        jobSeekerId: input.jobSeekerId,
        employerId: input.employerId,
        positionId: input.positionId,
        round: input.round,
        roundNumber: input.roundNumber || 1,
        status: InterviewStatus.PENDING,
        type: input.type,
        proposedSlots: [],
        interviewers: input.interviewers || [],
        feedbacks: [],
        createdAt: now,
        updatedAt: now,
        notes: input.notes,
        metadata: input.metadata
    };
}
export function createTimeSlot(startTime, endTime, timezone, generateId, proposedBy) {
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
    return {
        id: generateId(),
        startTime,
        endTime,
        duration,
        timezone,
        isAvailable: true,
        proposedBy
    };
}
export function createInterviewSchedule(interviewId, slot, type, round, generateId, options) {
    return {
        id: generateId(),
        interviewId,
        round,
        type,
        scheduledAt: slot.startTime,
        duration: slot.duration,
        timezone: slot.timezone,
        location: options?.location,
        meetingLink: options?.meetingLink,
        dialInNumber: options?.dialInNumber,
        conferenceId: options?.conferenceId,
        reminderSent: false
    };
}
export function isInterviewUpcoming(interview) {
    if (!interview.schedule)
        return false;
    const now = new Date();
    const interviewTime = new Date(interview.schedule.scheduledAt);
    return interviewTime > now && interview.status === InterviewStatus.CONFIRMED;
}
export function getInterviewTimeRemaining(interview) {
    if (!interview.schedule)
        return null;
    const now = new Date();
    const interviewTime = new Date(interview.schedule.scheduledAt);
    const diffMs = interviewTime.getTime() - now.getTime();
    if (diffMs <= 0)
        return { hours: 0, minutes: 0 };
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return { hours, minutes };
}
export function canReschedule(interview) {
    const allowedStatuses = [
        InterviewStatus.PENDING,
        InterviewStatus.PROPOSED,
        InterviewStatus.CONFIRMED
    ];
    return allowedStatuses.includes(interview.status);
}
export function shouldSendReminder(interview) {
    if (!interview.schedule || interview.schedule.reminderSent)
        return false;
    if (interview.status !== InterviewStatus.CONFIRMED)
        return false;
    const timeRemaining = getInterviewTimeRemaining(interview);
    if (!timeRemaining)
        return false;
    // Send reminder 24 hours before
    return timeRemaining.hours <= 24 && timeRemaining.hours > 0;
}
export function getNextRound(currentRound) {
    const roundOrder = [
        InterviewRound.SCREENING,
        InterviewRound.TECHNICAL,
        InterviewRound.BEHAVIORAL,
        InterviewRound.CULTURE_FIT,
        InterviewRound.FINAL,
        InterviewRound.HR,
        InterviewRound.OFFER_DISCUSSION
    ];
    const currentIndex = roundOrder.indexOf(currentRound);
    if (currentIndex === -1 || currentIndex === roundOrder.length - 1)
        return null;
    return roundOrder[currentIndex + 1];
}
export function aggregateFeedback(interview) {
    if (interview.feedbacks.length === 0)
        return null;
    const totalRating = interview.feedbacks.reduce((sum, f) => sum + f.rating, 0);
    const averageRating = totalRating / interview.feedbacks.length;
    const recommendations = interview.feedbacks.map(f => f.recommendation);
    const hireCount = recommendations.filter(r => r === 'strong_hire' || r === 'hire').length;
    const noHireCount = recommendations.filter(r => r === 'no_hire' || r === 'strong_no_hire').length;
    let recommendation;
    if (hireCount > noHireCount)
        recommendation = 'hire';
    else if (noHireCount > hireCount)
        recommendation = 'no_hire';
    else
        recommendation = 'undecided';
    const strengths = [...new Set(interview.feedbacks.flatMap(f => f.strengths))];
    const weaknesses = [...new Set(interview.feedbacks.flatMap(f => f.weaknesses))];
    const summary = `Strengths: ${strengths.join(', ')}. Areas for improvement: ${weaknesses.join(', ')}`;
    return { averageRating, recommendation, summary };
}
//# sourceMappingURL=Interview.js.map