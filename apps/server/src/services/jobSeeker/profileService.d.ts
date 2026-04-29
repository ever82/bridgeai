/**
 * Job Seeker Profile Service
 *
 * Handles CRUD operations for job seeker profiles,
 * privacy management, and resume quality scoring.
 */
import { type JobSeekerProfile, type CreateJobSeekerProfileRequest, type UpdateJobSeekerProfileRequest, type JobSeekerProfileListResponse, type ResumeQualityReport, type WorkTimeline, type ResumeVisibility } from '@bridgeai/shared';
export interface MaskingOptions {
    applyTo: ResumeVisibility;
}
/**
 * Mask sensitive data based on visibility and rules
 */
export declare function maskProfileData(profile: JobSeekerProfile, visibility: ResumeVisibility): JobSeekerProfile;
/**
 * Calculate resume quality score
 */
export declare function calculateQualityScore(profile: Partial<JobSeekerProfile>): ResumeQualityReport;
/**
 * Generate work timeline from profile
 */
export declare function generateWorkTimeline(profile: JobSeekerProfile): WorkTimeline;
/**
 * Create a new job seeker profile
 */
export declare function createProfile(userId: string, agentId: string, data: CreateJobSeekerProfileRequest): Promise<JobSeekerProfile>;
/**
 * Get profile by ID
 */
export declare function getProfile(profileId: string, userId?: string): Promise<JobSeekerProfile>;
/**
 * Get profiles by user ID
 */
export declare function getProfilesByUserId(userId: string, options?: {
    isPrimary?: boolean;
}): Promise<JobSeekerProfile[]>;
/**
 * Get primary profile for user
 */
export declare function getPrimaryProfile(userId: string): Promise<JobSeekerProfile | null>;
/**
 * Update a profile
 */
export declare function updateProfile(profileId: string, userId: string, data: UpdateJobSeekerProfileRequest): Promise<JobSeekerProfile>;
/**
 * Delete a profile
 */
export declare function deleteProfile(profileId: string, userId: string): Promise<void>;
/**
 * Update visibility settings
 */
export declare function updateVisibility(profileId: string, userId: string, visibility: ResumeVisibility, maskedFields?: string[]): Promise<JobSeekerProfile>;
/**
 * Get quality report
 */
export declare function getQualityReport(profileId: string, userId: string): Promise<ResumeQualityReport>;
/**
 * Get work timeline
 */
export declare function getWorkTimeline(profileId: string, userId: string): Promise<WorkTimeline>;
/**
 * List profiles (for admin or matching)
 */
export declare function listProfiles(options?: {
    isPrimary?: boolean;
    page?: number;
    limit?: number;
}): Promise<JobSeekerProfileListResponse>;
/**
 * Export resume to markdown
 */
export declare function exportToMarkdown(profile: JobSeekerProfile): string;
//# sourceMappingURL=profileService.d.ts.map