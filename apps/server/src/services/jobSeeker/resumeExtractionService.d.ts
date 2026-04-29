/**
 * Resume Extraction Service
 *
 * AI-powered resume parsing and skill extraction.
 */
import { type JobSeekerProfile, type WorkExperience, type Education, type SkillTag, type ResumeQualityReport } from '@bridgeai/shared';
/**
 * Extract structured data from natural language resume text
 */
export declare function extractFromNaturalLanguage(text: string): Promise<ResumeExtractionResult>;
/**
 * Match skills from profile against job requirements
 */
export declare function matchSkills(profileSkills: SkillTag[], requiredSkills: string[]): SkillMatchResult;
/**
 * Score resume for a specific job
 */
export declare function scoreForJob(profile: JobSeekerProfile, jobRequirements: {
    skills: string[];
    experienceLevel?: string;
    educationLevel?: string;
}): ResumeQualityReport & {
    skillMatch: SkillMatchResult;
};
export interface ResumeExtractionResult {
    skills: SkillTag[];
    workExperiences: WorkExperience[];
    educations: Education[];
    summary?: string;
    certifications: string[];
    languages: string[];
    confidence: number;
}
export interface SkillMatchResult {
    matchedSkills: string[];
    missingSkills: string[];
    partialSkills: string[];
    matchScore: number;
}
//# sourceMappingURL=resumeExtractionService.d.ts.map