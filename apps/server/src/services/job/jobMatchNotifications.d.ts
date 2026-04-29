/**
 * Job Match Notification Service
 *
 * Handles match-related notifications: new matches, high-match pushes,
 * resume-viewed notifications, match status changes, and quiet hours.
 */
export type MatchEventType = 'new_match' | 'high_match_job' | 'resume_viewed' | 'match_accepted' | 'match_rejected' | 'match_completed';
export interface MatchNotificationPayload {
    userId: string;
    matchId: string;
    matchScore?: number;
    jobTitle?: string;
    candidateName?: string;
    metadata?: Record<string, unknown>;
}
export interface NotificationPreferenceUpdate {
    matchNotifications?: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    quietHoursEnabled?: boolean;
    dailyLimit?: number;
}
/**
 * Notify user about a new match.
 */
export declare function notifyNewMatch(payload: MatchNotificationPayload): Promise<{
    sent: boolean;
    reason?: string;
}>;
/**
 * Push notification for high-match-score job.
 */
export declare function notifyHighMatchJob(payload: MatchNotificationPayload): Promise<{
    sent: boolean;
    reason?: string;
}>;
/**
 * Notify candidate that their resume was viewed.
 */
export declare function notifyResumeViewed(payload: MatchNotificationPayload): Promise<{
    sent: boolean;
    reason?: string;
}>;
/**
 * Notify about match status change.
 */
export declare function notifyMatchStatusChange(status: 'accepted' | 'rejected' | 'completed', payload: MatchNotificationPayload): Promise<{
    sent: boolean;
    reason?: string;
}>;
/**
 * Get notification preferences for a user.
 */
export declare function getNotificationPreferences(userId: string): Promise<{
    userId: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    dailyLimit: number;
    pushEnabled: boolean;
    emailEnabled: boolean;
    smsEnabled: boolean;
    inAppEnabled: boolean;
    matchNotifications: boolean;
    messageNotifications: boolean;
    ratingNotifications: boolean;
    systemNotifications: boolean;
    promotionNotifications: boolean;
    quietHoursStart: string | null;
    quietHoursEnd: string | null;
    quietHoursEnabled: boolean;
}>;
/**
 * Update notification preferences (including quiet hours).
 */
export declare function updateNotificationPreferences(userId: string, updates: NotificationPreferenceUpdate): Promise<{
    userId: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    dailyLimit: number;
    pushEnabled: boolean;
    emailEnabled: boolean;
    smsEnabled: boolean;
    inAppEnabled: boolean;
    matchNotifications: boolean;
    messageNotifications: boolean;
    ratingNotifications: boolean;
    systemNotifications: boolean;
    promotionNotifications: boolean;
    quietHoursStart: string | null;
    quietHoursEnd: string | null;
    quietHoursEnabled: boolean;
}>;
/**
 * Subscribe to match notification events.
 */
export declare function onMatchNotification(listener: (event: {
    type: MatchEventType;
    payload: MatchNotificationPayload;
    notificationId?: string;
}) => void): () => void;
//# sourceMappingURL=jobMatchNotifications.d.ts.map