/**
 * Job Seeker Profile Service
 *
 * Handles CRUD operations for job seeker profiles,
 * privacy management, and resume quality scoring.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  type JobSeekerProfile,
  type CreateJobSeekerProfileRequest,
  type UpdateJobSeekerProfileRequest,
  type JobSeekerProfileListResponse,
  type ResumeQualityReport,
  type WorkTimeline,
  type WorkTimelineItem,
  type MaskingRule,
  type ResumeVisibility,
  type ContactInfo,
  type MaskingType,
  ResumeVisibility as Visibility,
  MaskingType as MT,
  DEFAULT_MASKING_RULES,
} from '@bridgeai/shared';
import {
  createJobSeekerProfileSchema,
  updateJobSeekerProfileSchema,
} from '@bridgeai/shared';
import { AppError } from '../../errors';

// In-memory store (replace with Prisma)
const profiles: Map<string, JobSeekerProfile> = new Map();

export interface MaskingOptions {
  applyTo: ResumeVisibility;
}

/**
 * Mask sensitive data based on visibility and rules
 */
export function maskProfileData(
  profile: JobSeekerProfile,
  visibility: ResumeVisibility
): JobSeekerProfile {
  const masked = { ...profile };

  // Apply masking rules
  for (const rule of DEFAULT_MASKING_RULES) {
    if (!rule.visibleTo.includes(visibility)) {
      const fieldPath = rule.field.split('.');
      if (fieldPath.length === 2 && fieldPath[0] === 'contactInfo') {
        const contactField = fieldPath[1] as keyof ContactInfo;
        if (masked.contactInfo && masked.contactInfo[contactField]) {
          masked.contactInfo = { ...masked.contactInfo };
          masked.contactInfo[contactField] = applyMask(
            masked.contactInfo[contactField] as string,
            rule.type
          );
        }
      }
    }
  }

  // If hidden, strip contact info entirely
  if (visibility === Visibility.HIDDEN) {
    masked.contactInfo = {};
    masked.resumeUrl = undefined;
  }

  // If application-only, partially mask name
  if (visibility === Visibility.APPLICATION_ONLY && masked.name) {
    masked.name = maskName(masked.name);
  }

  return masked;
}

function applyMask(value: string, type: MaskingType): string {
  switch (type) {
    case MT.PHONE:
      // 138****1234
      if (value.length >= 7) {
        return value.slice(0, 3) + '****' + value.slice(-4);
      }
      return '****';
    case MT.EMAIL:
      // j***@example.com
      const [local, domain] = value.split('@');
      if (local && domain) {
        return local.slice(0, 1) + '***@' + domain;
      }
      return '***@***';
    default:
      return value;
  }
}

function maskName(name: string): string {
  if (name.length <= 1) return name + '*';
  return name.slice(0, 1) + '*'.repeat(Math.min(name.length - 1, 2));
}

/**
 * Calculate resume quality score
 */
export function calculateQualityScore(profile: Partial<JobSeekerProfile>): ResumeQualityReport {
  const scores = {
    completeness: 0,
    clarity: 0,
    keyword: 0,
    achievement: 0,
  };
  const missingFields: string[] = [];

  // Completeness (40% of overall)
  let completenessFields = 0;
  let totalFields = 10;

  if (profile.name) completenessFields++;
  else missingFields.push('name');
  if (profile.location) completenessFields++;
  else missingFields.push('location');
  if (profile.currentTitle) completenessFields++;
  else missingFields.push('currentTitle');
  if (profile.summary) completenessFields++;
  else missingFields.push('summary');
  if (profile.skills && profile.skills.length > 0) completenessFields++;
  else missingFields.push('skills');
  if (profile.workExperiences && profile.workExperiences.length > 0) completenessFields++;
  else missingFields.push('workExperiences');
  if (profile.educations && profile.educations.length > 0) completenessFields++;
  else missingFields.push('educations');
  if (profile.contactInfo?.email || profile.contactInfo?.phone) completenessFields++;
  else missingFields.push('contactInfo');
  if (profile.preferences) completenessFields++;
  else missingFields.push('preferences');
  if (profile.resumeUrl) completenessFields++;
  else missingFields.push('resumeUrl');

  scores.completeness = (completenessFields / totalFields) * 100;

  // Clarity (20% of overall)
  let clarityScore = 0;
  if (profile.summary) {
    const wordCount = profile.summary.split(/\s+/).length;
    clarityScore += Math.min(wordCount / 50, 1) * 50; // prefer 50+ words
  }
  if (profile.workExperiences) {
    const withDescriptions = profile.workExperiences.filter(e => e.description);
    clarityScore += (withDescriptions.length / Math.max(profile.workExperiences.length, 1)) * 50;
  }
  scores.clarity = clarityScore;

  // Keyword density (20% of overall)
  let keywordScore = 0;
  if (profile.skills) {
    keywordScore = Math.min(profile.skills.length * 5, 100);
  }
  scores.keyword = keywordScore;

  // Achievement presence (20% of overall)
  let achievementScore = 0;
  if (profile.workExperiences) {
    const withAchievements = profile.workExperiences.filter(e => e.achievements && e.achievements.length > 0);
    achievementScore = (withAchievements.length / Math.max(profile.workExperiences.length, 1)) * 100;
  }
  scores.achievement = achievementScore;

  const overallScore = Math.round(
    scores.completeness * 0.4 +
    scores.clarity * 0.2 +
    scores.keyword * 0.2 +
    scores.achievement * 0.2
  );

  // Suggestions
  const suggestions: string[] = [];
  if (!profile.summary) suggestions.push('Add a professional summary to highlight your career goals');
  if (!profile.skills || profile.skills.length < 5) suggestions.push('List at least 5 relevant skills');
  if (!profile.resumeUrl) suggestions.push('Upload a resume file for better visibility');
  if (profile.workExperiences) {
    for (const exp of profile.workExperiences) {
      if (!exp.achievements || exp.achievements.length === 0) {
        suggestions.push(`Add achievements for ${exp.title} at ${exp.company}`);
        break;
      }
    }
  }

  return {
    overallScore,
    completenessScore: Math.round(scores.completeness),
    clarityScore: Math.round(scores.clarity),
    keywordScore: Math.round(scores.keyword),
    achievementScore: Math.round(scores.achievement),
    missingFields,
    suggestions,
  };
}

/**
 * Generate work timeline from profile
 */
export function generateWorkTimeline(profile: JobSeekerProfile): WorkTimeline {
  const items: WorkTimelineItem[] = [];

  // Add work experiences
  for (const exp of profile.workExperiences || []) {
    items.push({
      type: 'work',
      title: exp.title,
      organization: exp.company,
      startDate: exp.startDate,
      endDate: exp.endDate,
      isCurrent: exp.isCurrent,
      description: exp.description,
    });
  }

  // Add educations
  for (const edu of profile.educations || []) {
    items.push({
      type: 'education',
      title: `${edu.degree} in ${edu.field}`,
      organization: edu.institution,
      startDate: edu.startDate,
      endDate: edu.endDate,
      isCurrent: edu.isCurrent,
      description: edu.description,
    });
  }

  // Sort by start date (newest first)
  items.sort((a, b) => {
    const dateA = new Date(a.startDate + '-01').getTime();
    const dateB = new Date(b.startDate + '-01').getTime();
    return dateB - dateA;
  });

  // Calculate total years
  let totalYears = 0;
  for (const item of items) {
    const start = new Date(item.startDate + '-01');
    const end = item.endDate ? new Date(item.endDate + '-01') : new Date();
    const years = (end.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    totalYears += years;
  }

  return { items, totalYears: Math.round(totalYears * 10) / 10 };
}

/**
 * Create a new job seeker profile
 */
export async function createProfile(
  userId: string,
  agentId: string,
  data: CreateJobSeekerProfileRequest
): Promise<JobSeekerProfile> {
  const validated = createJobSeekerProfileSchema.parse(data);

  // If this is set as primary, unset other primaries
  if (validated.isPrimary) {
    for (const [id, profile] of profiles) {
      if (profile.userId === userId && profile.isPrimary) {
        profiles.set(id, { ...profile, isPrimary: false });
      }
    }
  }

  const now = new Date().toISOString();
  const id = uuidv4();

  const profile: JobSeekerProfile = {
    id,
    userId,
    agentId,
    name: validated.name,
    age: validated.age,
    gender: validated.gender,
    location: validated.location,
    currentTitle: validated.currentTitle,
    summary: validated.summary,
    skills: validated.skills || [],
    workExperiences: (validated.workExperiences || []).map(e => ({
      ...e,
      id: e.id || uuidv4(),
    })),
    educations: (validated.educations || []).map(e => ({
      ...e,
      id: e.id || uuidv4(),
    })),
    certifications: validated.certifications || [],
    languages: validated.languages || [],
    preferences: validated.preferences || {
      preferredJobTypes: ['FULL_TIME'],
      preferredWorkModes: ['ONSITE'],
      preferredLocations: [],
      willingToRelocate: false,
      remoteOnly: false,
    },
    contactInfo: validated.contactInfo || {},
    visibility: validated.visibility,
    maskedFields: [],
    resumeUrl: validated.resumeUrl,
    resumeFileName: validated.resumeFileName,
    resumeVersion: 1,
    isPrimary: validated.isPrimary ?? true,
    aiExtracted: false,
    qualityScore: calculateQualityScore(validated as Partial<JobSeekerProfile>).overallScore,
    createdAt: now,
    updatedAt: now,
  };

  profiles.set(id, profile);
  return profile;
}

/**
 * Get profile by ID
 */
export async function getProfile(
  profileId: string,
  userId?: string
): Promise<JobSeekerProfile> {
  const profile = profiles.get(profileId);

  if (!profile) {
    throw new AppError('Profile not found', 'PROFILE_NOT_FOUND', 404);
  }

  // Verify ownership if userId provided
  if (userId && profile.userId !== userId) {
    throw new AppError('Unauthorized', 'UNAUTHORIZED', 403);
  }

  return profile;
}

/**
 * Get profiles by user ID
 */
export async function getProfilesByUserId(
  userId: string,
  options: { isPrimary?: boolean } = {}
): Promise<JobSeekerProfile[]> {
  const userProfiles = Array.from(profiles.values()).filter(p => p.userId === userId);

  if (options.isPrimary !== undefined) {
    return userProfiles.filter(p => p.isPrimary === options.isPrimary);
  }

  return userProfiles;
}

/**
 * Get primary profile for user
 */
export async function getPrimaryProfile(userId: string): Promise<JobSeekerProfile | null> {
  const userProfiles = Array.from(profiles.values()).filter(
    p => p.userId === userId && p.isPrimary
  );
  return userProfiles[0] || null;
}

/**
 * Update a profile
 */
export async function updateProfile(
  profileId: string,
  userId: string,
  data: UpdateJobSeekerProfileRequest
): Promise<JobSeekerProfile> {
  const profile = profiles.get(profileId);

  if (!profile) {
    throw new AppError('Profile not found', 'PROFILE_NOT_FOUND', 404);
  }

  if (profile.userId !== userId) {
    throw new AppError('Unauthorized', 'UNAUTHORIZED', 403);
  }

  const validated = updateJobSeekerProfileSchema.parse(data);

  // If setting as primary, unset others
  if (validated.isPrimary === true) {
    for (const [id, p] of profiles) {
      if (p.userId === userId && p.isPrimary && id !== profileId) {
        profiles.set(id, { ...p, isPrimary: false });
      }
    }
  }

  const now = new Date().toISOString();
  const updated: JobSeekerProfile = {
    ...profile,
    ...Object.fromEntries(
      Object.entries(validated).filter(([_, v]) => v !== undefined)
    ),
    id: profile.id,
    userId: profile.userId,
    agentId: profile.agentId,
    resumeVersion: (validated.workExperiences || validated.skills ||
      validated.educations || validated.resumeUrl) !== undefined
      ? profile.resumeVersion + 1
      : profile.resumeVersion,
    aiExtracted: false,
    qualityScore: undefined,
    updatedAt: now,
  };

  // Recalculate quality score
  updated.qualityScore = calculateQualityScore(updated).overallScore;

  profiles.set(profileId, updated);
  return updated;
}

/**
 * Delete a profile
 */
export async function deleteProfile(
  profileId: string,
  userId: string
): Promise<void> {
  const profile = profiles.get(profileId);

  if (!profile) {
    throw new AppError('Profile not found', 'PROFILE_NOT_FOUND', 404);
  }

  if (profile.userId !== userId) {
    throw new AppError('Unauthorized', 'UNAUTHORIZED', 403);
  }

  profiles.delete(profileId);

  // If deleted was primary, promote another if available
  if (profile.isPrimary) {
    const remaining = Array.from(profiles.values()).filter(p => p.userId === userId);
    if (remaining.length > 0) {
      profiles.set(remaining[0].id, { ...remaining[0], isPrimary: true });
    }
  }
}

/**
 * Update visibility settings
 */
export async function updateVisibility(
  profileId: string,
  userId: string,
  visibility: ResumeVisibility,
  maskedFields?: string[]
): Promise<JobSeekerProfile> {
  const profile = profiles.get(profileId);

  if (!profile) {
    throw new AppError('Profile not found', 'PROFILE_NOT_FOUND', 404);
  }

  if (profile.userId !== userId) {
    throw new AppError('Unauthorized', 'UNAUTHORIZED', 403);
  }

  const now = new Date().toISOString();
  const updated: JobSeekerProfile = {
    ...profile,
    visibility,
    maskedFields: maskedFields || profile.maskedFields,
    updatedAt: now,
  };

  profiles.set(profileId, updated);
  return updated;
}

/**
 * Get quality report
 */
export async function getQualityReport(
  profileId: string,
  userId: string
): Promise<ResumeQualityReport> {
  const profile = await getProfile(profileId, userId);
  return calculateQualityScore(profile);
}

/**
 * Get work timeline
 */
export async function getWorkTimeline(
  profileId: string,
  userId: string
): Promise<WorkTimeline> {
  const profile = await getProfile(profileId, userId);
  return generateWorkTimeline(profile);
}

/**
 * List profiles (for admin or matching)
 */
export async function listProfiles(
  options: {
    isPrimary?: boolean;
    page?: number;
    limit?: number;
  } = {}
): Promise<JobSeekerProfileListResponse> {
  let results = Array.from(profiles.values());

  if (options.isPrimary !== undefined) {
    results = results.filter(p => p.isPrimary === options.isPrimary);
  }

  // Sort by updatedAt
  results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const page = options.page || 1;
  const limit = options.limit || 20;
  const total = results.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const end = start + limit;

  return {
    profiles: results.slice(start, end),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

/**
 * Export resume to markdown
 */
export function exportToMarkdown(profile: JobSeekerProfile): string {
  const lines: string[] = [];

  lines.push(`# ${profile.name}`);
  if (profile.currentTitle) lines.push(`**${profile.currentTitle}**`);
  if (profile.location) lines.push(`${profile.location}`);
  lines.push('');

  if (profile.summary) {
    lines.push('## 简介');
    lines.push(profile.summary);
    lines.push('');
  }

  if (profile.skills && profile.skills.length > 0) {
    lines.push('## 技能');
    for (const skill of profile.skills) {
      const level = skill.level ? ` (${skill.level})` : '';
      lines.push(`- ${skill.name}${level}`);
    }
    lines.push('');
  }

  if (profile.workExperiences && profile.workExperiences.length > 0) {
    lines.push('## 工作经历');
    for (const exp of profile.workExperiences) {
      const period = exp.isCurrent
        ? `${exp.startDate} - 至今`
        : `${exp.startDate} - ${exp.endDate}`;
      lines.push(`### ${exp.title} @ ${exp.company}`);
      lines.push(`*${period}*`);
      if (exp.description) lines.push(exp.description);
      if (exp.achievements && exp.achievements.length > 0) {
        lines.push('**成就:**');
        for (const ach of exp.achievements) {
          lines.push(`- ${ach}`);
        }
      }
      lines.push('');
    }
  }

  if (profile.educations && profile.educations.length > 0) {
    lines.push('## 教育背景');
    for (const edu of profile.educations) {
      const period = edu.isCurrent
        ? `${edu.startDate} - 至今`
        : `${edu.startDate} - ${edu.endDate}`;
      lines.push(`### ${edu.degree} - ${edu.field}`);
      lines.push(`${edu.institution} | ${period}`);
      lines.push('');
    }
  }

  if (profile.certifications && profile.certifications.length > 0) {
    lines.push('## 证书');
    for (const cert of profile.certifications) {
      lines.push(`- ${cert}`);
    }
    lines.push('');
  }

  if (profile.contactInfo && Object.keys(profile.contactInfo).length > 0) {
    lines.push('## 联系方式');
    if (profile.contactInfo.email) lines.push(`- Email: ${profile.contactInfo.email}`);
    if (profile.contactInfo.phone) lines.push(`- 电话: ${profile.contactInfo.phone}`);
    if (profile.contactInfo.linkedin) lines.push(`- LinkedIn: ${profile.contactInfo.linkedin}`);
    if (profile.contactInfo.github) lines.push(`- GitHub: ${profile.contactInfo.github}`);
  }

  return lines.join('\n');
}
