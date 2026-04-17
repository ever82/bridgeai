/**
 * Job Posting Service
 *
 * Handles CRUD operations for job postings, status management,
 * and job statistics tracking.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  type JobPosting,
  JobStatus,
  type CreateJobPostingRequest,
  type UpdateJobPostingRequest,
  type UpdateJobStatusRequest,
  type RefreshJobRequest,
  type JobListResponse,
  type JobFilterOptions,
  type JobStats,
  ApplicationStatus,
  type JobApplication,
  type JobApplicationFilter,
  createJobPostingSchema,
  updateJobPostingSchema,
} from '@bridgeai/shared';
import { extractJobFromDescription, evaluateJobQuality } from './jobExtraction';
import { AppError } from '../../errors';

// TODO: Replace with actual database implementation
const jobPostings: Map<string, JobPosting> = new Map();
const jobApplications: Map<string, JobApplication> = new Map();

export interface CreateJobOptions {
  employerId: string;
  employerProfileId: string;
  agentId: string;
  data: CreateJobPostingRequest;
  autoExtract?: boolean;
}

/**
 * Create a new job posting
 */
export async function createJobPosting(
  options: CreateJobOptions
): Promise<JobPosting> {
  const { employerId, employerProfileId, agentId, data, autoExtract = false } = options;

  // Validate input
  const validated = createJobPostingSchema.parse(data) as CreateJobPostingRequest;

  const now = new Date().toISOString();
  const id = uuidv4();

  // Process description - either use structured or extract from natural language
  let description = typeof validated.description === 'string'
    ? { summary: validated.description, responsibilities: [], requirements: [], preferredQualifications: [], benefits: [] }
    : validated.description;

  let extractedSkills: string[] | undefined;
  let skillMatchScore: number | undefined;
  let competitivenessScore: number | undefined;

  // Auto-extract from natural language if description is a string
  if (typeof validated.description === 'string' && autoExtract) {
    const extraction = await extractJobFromDescription(validated.description);
    description = extraction.structuredData;
    extractedSkills = extraction.extractedSkills;
    skillMatchScore = extraction.skillMatchScore;
    competitivenessScore = extraction.competitivenessScore;
  }

  const job: JobPosting = {
    id,
    employerId,
    employerProfileId,
    agentId,
    title: validated.title,
    department: validated.department,
    type: validated.type,
    positions: validated.positions,
    description,
    requirements: validated.requirements || {
      skills: [],
      experienceLevel: 'ENTRY' as const,
      educationLevel: 'NO_REQUIREMENT' as const,
    },
    salary: validated.salary || {
      min: 0,
      max: 0,
      period: 'MONTHLY' as const,
      currency: 'CNY',
      isNegotiable: true,
    },
    benefits: validated.benefits || {
      healthInsurance: false,
      dentalInsurance: false,
      visionInsurance: false,
      lifeInsurance: false,
      retirementPlan: false,
      paidTimeOff: 0,
      flexibleSchedule: false,
      remoteWork: false,
      professionalDevelopment: false,
      gymMembership: false,
      freeMeals: false,
      transportation: false,
      stockOptions: false,
      bonus: false,
    },
    location: validated.location,
    status: JobStatus.DRAFT,
    validFrom: now,
    validUntil: validated.validUntil,
    stats: {
      views: 0,
      uniqueViews: 0,
      applications: 0,
      interested: 0,
      saved: 0,
      shared: 0,
      clickThroughRate: 0,
      conversionRate: 0,
    },
    extractedSkills,
    skillMatchScore,
    competitivenessScore,
    isUrgent: validated.isUrgent || false,
    isFeatured: false,
    viewCount: 0,
    applicationCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  // TODO: Save to database
  jobPostings.set(id, job);

  return job;
}

/**
 * Get a job posting by ID
 */
export async function getJobPosting(
  jobId: string,
  options: { incrementView?: boolean } = {}
): Promise<JobPosting> {
  const job = jobPostings.get(jobId);

  if (!job) {
    throw new AppError('Job not found', 'JOB_NOT_FOUND', 404);
  }

  // Increment view count if requested
  if (options.incrementView) {
    job.viewCount += 1;
    job.stats.views += 1;
    job.stats.uniqueViews += 1;
    // TODO: Update in database
  }

  return job;
}

/**
 * Update a job posting
 */
export async function updateJobPosting(
  jobId: string,
  employerId: string,
  data: UpdateJobPostingRequest
): Promise<JobPosting> {
  const job = jobPostings.get(jobId);

  if (!job) {
    throw new AppError('Job not found', 'JOB_NOT_FOUND', 404);
  }

  if (job.employerId !== employerId) {
    throw new AppError('Unauthorized', 'UNAUTHORIZED', 403);
  }

  // Validate input
  const validated = updateJobPostingSchema.parse(data) as UpdateJobPostingRequest;

  const now = new Date().toISOString();

  // Update fields
  if (validated.title) job.title = validated.title;
  if (validated.department) job.department = validated.department;
  if (validated.type) job.type = validated.type;
  if (validated.positions) job.positions = validated.positions;
  if (validated.description) {
    job.description = typeof validated.description === 'string'
      ? { summary: validated.description, responsibilities: [], requirements: [], preferredQualifications: [], benefits: [] }
      : validated.description;
  }
  if (validated.requirements) job.requirements = validated.requirements;
  if (validated.salary) job.salary = validated.salary;
  if (validated.benefits) job.benefits = { ...job.benefits, ...validated.benefits };
  if (validated.location) job.location = validated.location;
  if (validated.validUntil) job.validUntil = validated.validUntil;
  if (validated.isUrgent !== undefined) job.isUrgent = validated.isUrgent;

  job.updatedAt = now;

  // TODO: Update in database
  jobPostings.set(jobId, job);

  return job;
}

/**
 * Update job status
 */
export async function updateJobStatus(
  jobId: string,
  employerId: string,
  data: UpdateJobStatusRequest
): Promise<JobPosting> {
  const job = jobPostings.get(jobId);

  if (!job) {
    throw new AppError('Job not found', 'JOB_NOT_FOUND', 404);
  }

  if (job.employerId !== employerId) {
    throw new AppError('Unauthorized', 'UNAUTHORIZED', 403);
  }

  const validTransitions: Record<JobStatus, JobStatus[]> = {
    [JobStatus.DRAFT]: [JobStatus.PUBLISHED, JobStatus.CLOSED],
    [JobStatus.PUBLISHED]: [JobStatus.PAUSED, JobStatus.CLOSED, JobStatus.EXPIRED],
    [JobStatus.PAUSED]: [JobStatus.PUBLISHED, JobStatus.CLOSED],
    [JobStatus.CLOSED]: [JobStatus.DRAFT],
    [JobStatus.EXPIRED]: [JobStatus.DRAFT, JobStatus.PUBLISHED],
  };

  if (!validTransitions[job.status].includes(data.status)) {
    throw new AppError(
      `Invalid status transition from ${job.status} to ${data.status}`,
      'INVALID_STATUS_TRANSITION',
      400
    );
  }

  const now = new Date().toISOString();

  job.status = data.status;
  job.updatedAt = now;

  if (data.status === JobStatus.PUBLISHED && !job.publishedAt) {
    job.publishedAt = now;
  }

  // TODO: Update in database
  jobPostings.set(jobId, job);

  return job;
}

/**
 * Refresh job posting (bump to top)
 */
export async function refreshJobPosting(
  jobId: string,
  employerId: string,
  data: RefreshJobRequest = {}
): Promise<JobPosting> {
  const job = jobPostings.get(jobId);

  if (!job) {
    throw new AppError('Job not found', 'JOB_NOT_FOUND', 404);
  }

  if (job.employerId !== employerId) {
    throw new AppError('Unauthorized', 'UNAUTHORIZED', 403);
  }

  if (job.status !== JobStatus.PUBLISHED) {
    throw new AppError('Only published jobs can be refreshed', 'INVALID_STATUS', 400);
  }

  const now = new Date().toISOString();

  job.refreshedAt = now;
  job.updatedAt = now;

  if (data.isFeatured !== undefined) {
    job.isFeatured = data.isFeatured;
  }

  // TODO: Update in database
  jobPostings.set(jobId, job);

  return job;
}

/**
 * Delete a job posting (soft delete by closing)
 */
export async function deleteJobPosting(
  jobId: string,
  employerId: string
): Promise<void> {
  await updateJobStatus(jobId, employerId, { status: JobStatus.CLOSED });
}

/**
 * List job postings with filtering
 */
export async function listJobPostings(
  filter: JobFilterOptions = {}
): Promise<JobListResponse> {
  let jobs = Array.from(jobPostings.values());

  // Apply filters
  if (filter.keyword) {
    const keyword = filter.keyword.toLowerCase();
    jobs = jobs.filter(j =>
      j.title.toLowerCase().includes(keyword) ||
      j.description.summary.toLowerCase().includes(keyword)
    );
  }

  if (filter.city) {
    jobs = jobs.filter(j => j.location.city === filter.city);
  }

  if (filter.workMode) {
    jobs = jobs.filter(j => j.location.workMode === filter.workMode);
  }

  if (filter.jobType) {
    jobs = jobs.filter(j => j.type === filter.jobType);
  }

  if (filter.experienceLevel) {
    jobs = jobs.filter(j => j.requirements.experienceLevel === filter.experienceLevel);
  }

  if (filter.educationLevel) {
    jobs = jobs.filter(j => j.requirements.educationLevel === filter.educationLevel);
  }

  if (filter.minSalary) {
    jobs = jobs.filter(j => j.salary.min >= filter.minSalary!);
  }

  if (filter.maxSalary) {
    jobs = jobs.filter(j => j.salary.max <= filter.maxSalary!);
  }

  if (filter.skills && filter.skills.length > 0) {
    jobs = jobs.filter(j =>
      filter.skills!.some(skill =>
        j.requirements.skills.includes(skill) ||
        j.extractedSkills?.includes(skill)
      )
    );
  }

  if (filter.status) {
    jobs = jobs.filter(j => j.status === filter.status);
  } else {
    // Default to published jobs only
    jobs = jobs.filter(j => j.status === JobStatus.PUBLISHED);
  }

  if (filter.isUrgent !== undefined) {
    jobs = jobs.filter(j => j.isUrgent === filter.isUrgent);
  }

  // Sorting
  const sortBy = filter.sortBy || 'createdAt';
  const sortOrder = filter.sortOrder || 'desc';

  jobs.sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'createdAt':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'updatedAt':
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        break;
      case 'salary':
        comparison = a.salary.max - b.salary.max;
        break;
      case 'viewCount':
        comparison = a.viewCount - b.viewCount;
        break;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Pagination
  const page = filter.page || 1;
  const limit = filter.limit || 20;
  const total = jobs.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedJobs = jobs.slice(start, end);

  return {
    jobs: paginatedJobs,
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
 * Get jobs by employer
 */
export async function getEmployerJobs(
  employerId: string,
  filter: Omit<JobFilterOptions, 'status'> & { status?: JobStatus | JobStatus[] } = {}
): Promise<JobListResponse> {
  let jobs = Array.from(jobPostings.values()).filter(j => j.employerId === employerId);

  // Apply status filter
  if (filter.status) {
    if (Array.isArray(filter.status)) {
      jobs = jobs.filter(j => filter.status!.includes(j.status));
    } else {
      jobs = jobs.filter(j => j.status === filter.status);
    }
  }

  // Pagination
  const page = filter.page || 1;
  const limit = filter.limit || 20;
  const total = jobs.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedJobs = jobs.slice(start, end);

  return {
    jobs: paginatedJobs,
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
 * Get job statistics
 */
export async function getJobStats(jobId: string, employerId: string): Promise<JobStats> {
  const job = await getJobPosting(jobId);

  if (job.employerId !== employerId) {
    throw new AppError('Unauthorized', 'UNAUTHORIZED', 403);
  }

  return job.stats;
}

/**
 * Create a job application
 */
export async function createJobApplication(
  jobId: string,
  applicantId: string,
  applicantAgentId: string,
  coverLetter?: string,
  resumeUrl?: string,
  answers?: Record<string, string>
): Promise<JobApplication> {
  const job = await getJobPosting(jobId);

  if (job.status !== JobStatus.PUBLISHED) {
    throw new AppError('Job is not accepting applications', 'JOB_NOT_ACCEPTING', 400);
  }

  const now = new Date().toISOString();
  const id = uuidv4();

  const application: JobApplication = {
    id,
    jobId,
    applicantId,
    applicantAgentId,
    status: ApplicationStatus.PENDING,
    coverLetter,
    resumeUrl,
    answers,
    createdAt: now,
    updatedAt: now,
  };

  // Update job stats
  job.applicationCount += 1;
  job.stats.applications += 1;

  // TODO: Save to database
  jobApplications.set(id, application);
  jobPostings.set(jobId, job);

  return application;
}

/**
 * Get applications for a job
 */
export async function getJobApplications(
  jobId: string,
  employerId: string,
  filter: JobApplicationFilter = {}
): Promise<{ applications: JobApplication[]; total: number; page: number; limit: number }> {
  const job = await getJobPosting(jobId);

  if (job.employerId !== employerId) {
    throw new AppError('Unauthorized', 'UNAUTHORIZED', 403);
  }

  let applications = Array.from(jobApplications.values()).filter(a => a.jobId === jobId);

  if (filter.status) {
    applications = applications.filter(a => a.status === filter.status);
  }

  // Sort by newest first
  applications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const page = filter.page || 1;
  const limit = filter.limit || 20;
  const total = applications.length;
  const start = (page - 1) * limit;
  const end = start + limit;

  return {
    applications: applications.slice(start, end),
    total,
    page,
    limit,
  };
}

/**
 * Update application status
 */
export async function updateApplicationStatus(
  applicationId: string,
  employerId: string,
  status: ApplicationStatus,
  notes?: string
): Promise<JobApplication> {
  const application = jobApplications.get(applicationId);

  if (!application) {
    throw new AppError('Application not found', 'APPLICATION_NOT_FOUND', 404);
  }

  const job = await getJobPosting(application.jobId);

  if (job.employerId !== employerId) {
    throw new AppError('Unauthorized', 'UNAUTHORIZED', 403);
  }

  const now = new Date().toISOString();

  application.status = status;
  application.notes = notes || application.notes;
  application.updatedAt = now;

  if (status === ApplicationStatus.VIEWED && !application.viewedAt) {
    application.viewedAt = now;
  }

  if ([ApplicationStatus.REJECTED, ApplicationStatus.OFFERED, ApplicationStatus.HIRED].includes(status)) {
    application.respondedAt = now;
  }

  // TODO: Update in database
  jobApplications.set(applicationId, application);

  return application;
}

/**
 * Get employer statistics
 */
export async function getEmployerJobStats(employerId: string): Promise<{
  activeJobs: number;
  totalJobs: number;
  totalViews: number;
  totalApplications: number;
  conversionRate: number;
}> {
  const jobs = Array.from(jobPostings.values()).filter(j => j.employerId === employerId);
  const activeJobs = jobs.filter(j => j.status === JobStatus.PUBLISHED).length;
  const totalJobs = jobs.length;
  const totalViews = jobs.reduce((sum, j) => sum + j.viewCount, 0);
  const totalApplications = jobs.reduce((sum, j) => sum + j.applicationCount, 0);
  const conversionRate = totalViews > 0 ? (totalApplications / totalViews) * 100 : 0;

  return {
    activeJobs,
    totalJobs,
    totalViews,
    totalApplications,
    conversionRate: Math.round(conversionRate * 100) / 100,
  };
}

/**
 * Evaluate job quality
 */
export async function evaluateJob(jobId: string, employerId: string) {
  const job = await getJobPosting(jobId);

  if (job.employerId !== employerId) {
    throw new AppError('Unauthorized', 'UNAUTHORIZED', 403);
  }

  return evaluateJobQuality(job);
}
