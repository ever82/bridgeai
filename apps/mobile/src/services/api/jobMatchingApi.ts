/**
 * Job Matching API Service
 *
 * API functions for job matching and candidate recommendations
 */

import { api } from './client';
import { JobPosting, JobApplication, ApplicationStatus } from '@bridgeai/shared';

// Match score factors interface
export interface MatchFactors {
  skills: number;
  experience: number;
  education: number;
  salary: number;
  location: number;
  culture: number;
}

// Job recommendation interface
export interface JobRecommendation {
  id: string;
  jobId: string;
  job: JobPosting;
  matchScore: number;
  matchFactors: MatchFactors;
  reasons: string[];
  isInterested: boolean | null;
  createdAt: string;
}

// Candidate profile for employer view
export interface CandidateProfile {
  id: string;
  userId: string;
  name: string;
  avatar?: string;
  title: string;
  summary: string;
  skills: string[];
  experienceYears: number;
  educationLevel: string;
  expectedSalary: {
    min: number;
    max: number;
    currency: string;
  };
  location: string;
  isOpenToWork: boolean;
  agentGeneratedSummary?: string;
}

// Candidate recommendation interface
export interface CandidateRecommendation {
  id: string;
  jobId: string;
  candidate: CandidateProfile;
  matchScore: number;
  matchFactors: MatchFactors;
  reasons: string[];
  status: 'new' | 'viewed' | 'shortlisted' | 'rejected' | 'contacted';
  notes?: string;
  createdAt: string;
}

// Recommendation filter options
export interface RecommendationFilterOptions {
  jobId?: string;
  minScore?: number;
  maxScore?: number;
  status?: string;
  page?: number;
  limit?: number;
}

// Pagination response
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Get job recommendations for job seeker
 */
export const getJobRecommendations = async (
  options: RecommendationFilterOptions = {}
): Promise<PaginatedResponse<JobRecommendation>> => {
  const { jobId, minScore, maxScore, status, page = 1, limit = 20 } = options;

  const params = new URLSearchParams();
  if (jobId) params.append('jobId', jobId);
  if (minScore !== undefined) params.append('minScore', minScore.toString());
  if (maxScore !== undefined) params.append('maxScore', maxScore.toString());
  if (status) params.append('status', status);
  params.append('page', page.toString());
  params.append('limit', limit.toString());

  const response = await api.get<PaginatedResponse<JobRecommendation>>(
    `/job-matching/recommendations/jobs?${params.toString()}`
  );
  return response.data.data;
};

/**
 * Get candidate recommendations for employer
 */
export const getCandidateRecommendations = async (
  options: RecommendationFilterOptions = {}
): Promise<PaginatedResponse<CandidateRecommendation>> => {
  const { jobId, minScore, maxScore, status, page = 1, limit = 20 } = options;

  const params = new URLSearchParams();
  if (jobId) params.append('jobId', jobId);
  if (minScore !== undefined) params.append('minScore', minScore.toString());
  if (maxScore !== undefined) params.append('maxScore', maxScore.toString());
  if (status) params.append('status', status);
  params.append('page', page.toString());
  params.append('limit', limit.toString());

  const response = await api.get<PaginatedResponse<CandidateRecommendation>>(
    `/job-matching/recommendations/candidates?${params.toString()}`
  );
  return response.data.data;
};

/**
 * Mark job recommendation as interested
 */
export const markJobInterested = async (
  recommendationId: string
): Promise<JobRecommendation> => {
  const response = await api.post<JobRecommendation>(
    `/job-matching/recommendations/jobs/${recommendationId}/interested`
  );
  return response.data.data;
};

/**
 * Skip job recommendation
 */
export const skipJobRecommendation = async (
  recommendationId: string
): Promise<void> => {
  await api.post(`/job-matching/recommendations/jobs/${recommendationId}/skip`);
};

/**
 * Shortlist candidate recommendation
 */
export const shortlistCandidate = async (
  recommendationId: string
): Promise<CandidateRecommendation> => {
  const response = await api.post<CandidateRecommendation>(
    `/job-matching/recommendations/candidates/${recommendationId}/shortlist`
  );
  return response.data.data;
};

/**
 * Reject candidate recommendation
 */
export const rejectCandidate = async (
  recommendationId: string,
  reason?: string
): Promise<CandidateRecommendation> => {
  const response = await api.post<CandidateRecommendation>(
    `/job-matching/recommendations/candidates/${recommendationId}/reject`,
    { reason }
  );
  return response.data.data;
};

/**
 * Contact candidate
 */
export const contactCandidate = async (
  recommendationId: string,
  message: string
): Promise<void> => {
  await api.post(`/job-matching/recommendations/candidates/${recommendationId}/contact`, {
    message,
  });
};

/**
 * Mark candidate as viewed
 */
export const markCandidateViewed = async (
  recommendationId: string
): Promise<CandidateRecommendation> => {
  const response = await api.post<CandidateRecommendation>(
    `/job-matching/recommendations/candidates/${recommendationId}/view`
  );
  return response.data.data;
};

/**
 * Get match details for a specific job and candidate
 */
export const getMatchDetails = async (
  jobId: string,
  candidateId: string
): Promise<{
  matchScore: number;
  matchFactors: MatchFactors;
  analysis: string;
  skillMatches: Array<{
    skill: string;
    required: boolean;
    candidateHas: boolean;
    relevance: number;
  }>;
}> => {
  const response = await api.get(
    `/job-matching/match-details?jobId=${jobId}&candidateId=${candidateId}`
  );
  return response.data.data;
};

/**
 * Refresh recommendations
 */
export const refreshRecommendations = async (): Promise<void> => {
  await api.post('/job-matching/refresh');
};

/**
 * Get recommendation statistics
 */
export const getRecommendationStats = async (): Promise<{
  totalJobsRecommended: number;
  totalCandidatesRecommended: number;
  averageMatchScore: number;
  interestedCount: number;
  shortlistedCount: number;
  contactedCount: number;
}> => {
  const response = await api.get('/job-matching/stats');
  return response.data.data;
};

export default {
  getJobRecommendations,
  getCandidateRecommendations,
  markJobInterested,
  skipJobRecommendation,
  shortlistCandidate,
  rejectCandidate,
  contactCandidate,
  markCandidateViewed,
  getMatchDetails,
  refreshRecommendations,
  getRecommendationStats,
};
