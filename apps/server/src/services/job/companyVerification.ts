/**
 * Company Verification Service
 *
 * Handles company email verification and business license verification
 */

import { v4 as uuidv4 } from 'uuid';
import {
  type EmployerProfile,
  VerificationStatus,
  type EmployerVerification,
  type EmployerVerificationResponse,
  companyVerificationRequestSchema,
  verifyEmailSchema,
} from '@visionshare/shared';
import { AppError } from '../../errors';

// TODO: Replace with actual database implementation
const employerProfiles: Map<string, EmployerProfile> = new Map();
const verificationTokens: Map<string, { employerId: string; expiresAt: Date }> = new Map();

export interface VerificationOptions {
  sendEmail?: boolean;
}

/**
 * Request email verification
 */
export async function requestEmailVerification(
  employerProfileId: string,
  email: string,
  options: VerificationOptions = {}
): Promise<{ token: string; expiresAt: Date }> {
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  verificationTokens.set(token, {
    employerId: employerProfileId,
    expiresAt,
  });

  // TODO: Send verification email if sendEmail is true
  if (options.sendEmail) {
    // await sendVerificationEmail(email, token);
  }

  return { token, expiresAt };
}

/**
 * Verify email with token
 */
export async function verifyEmail(
  token: string
): Promise<EmployerVerificationResponse> {
  const verification = verificationTokens.get(token);

  if (!verification) {
    throw new AppError('Invalid or expired verification token', 'INVALID_TOKEN', 400);
  }

  if (verification.expiresAt < new Date()) {
    verificationTokens.delete(token);
    throw new AppError('Verification token has expired', 'TOKEN_EXPIRED', 400);
  }

  const profile = employerProfiles.get(verification.employerId);

  if (!profile) {
    throw new AppError('Employer profile not found', 'PROFILE_NOT_FOUND', 404);
  }

  const now = new Date().toISOString();

  // Update verification status
  profile.verification.emailVerifiedAt = now;

  if (profile.verification.status === VerificationStatus.UNVERIFIED) {
    profile.verification.status = VerificationStatus.EMAIL_VERIFIED;
  }

  profile.updatedAt = now;

  // Clean up token
  verificationTokens.delete(token);

  // TODO: Update in database
  employerProfiles.set(verification.employerId, profile);

  return {
    status: profile.verification.status,
    message: 'Email verified successfully',
    nextSteps: profile.verification.status !== VerificationStatus.BUSINESS_VERIFIED
      ? ['Complete business license verification for full verification status']
      : undefined,
  };
}

/**
 * Submit business license for verification
 */
export async function submitBusinessVerification(
  employerProfileId: string,
  userId: string,
  businessLicenseUrl: string,
  businessRegistrationNumber: string
): Promise<EmployerVerificationResponse> {
  // Validate input
  const validated = companyVerificationRequestSchema.parse({
    businessLicenseUrl,
    businessRegistrationNumber,
  });

  const profile = employerProfiles.get(employerProfileId);

  if (!profile) {
    throw new AppError('Employer profile not found', 'PROFILE_NOT_FOUND', 404);
  }

  if (profile.userId !== userId) {
    throw new AppError('Unauthorized', 'UNAUTHORIZED', 403);
  }

  const now = new Date().toISOString();

  // Update verification status to pending
  profile.verification.status = VerificationStatus.PENDING;
  profile.verification.businessLicenseUrl = validated.businessLicenseUrl;
  profile.verification.submittedAt = now;

  profile.updatedAt = now;

  // TODO: Save to database and trigger review workflow
  employerProfiles.set(employerProfileId, profile);

  return {
    status: VerificationStatus.PENDING,
    message: 'Business verification submitted successfully and is pending review',
    nextSteps: [
      'Our team will review your submission within 1-3 business days',
      'You will receive an email notification once the review is complete',
    ],
  };
}

/**
 * Approve business verification (admin only)
 */
export async function approveBusinessVerification(
  employerProfileId: string,
  adminId: string
): Promise<EmployerVerificationResponse> {
  // TODO: Check admin permissions

  const profile = employerProfiles.get(employerProfileId);

  if (!profile) {
    throw new AppError('Employer profile not found', 'PROFILE_NOT_FOUND', 404);
  }

  if (profile.verification.status !== VerificationStatus.PENDING) {
    throw new AppError('No pending verification request found', 'NO_PENDING_VERIFICATION', 400);
  }

  const now = new Date().toISOString();

  profile.verification.status = VerificationStatus.BUSINESS_VERIFIED;
  profile.verification.businessLicenseVerifiedAt = now;
  profile.verification.reviewedAt = now;
  profile.verification.rejectedReason = undefined;

  profile.updatedAt = now;

  // TODO: Update in database and send notification
  employerProfiles.set(employerProfileId, profile);

  return {
    status: VerificationStatus.BUSINESS_VERIFIED,
    message: 'Business verification approved successfully',
  };
}

/**
 * Reject business verification (admin only)
 */
export async function rejectBusinessVerification(
  employerProfileId: string,
  adminId: string,
  reason: string
): Promise<EmployerVerificationResponse> {
  // TODO: Check admin permissions

  const profile = employerProfiles.get(employerProfileId);

  if (!profile) {
    throw new AppError('Employer profile not found', 'PROFILE_NOT_FOUND', 404);
  }

  if (profile.verification.status !== VerificationStatus.PENDING) {
    throw new AppError('No pending verification request found', 'NO_PENDING_VERIFICATION', 400);
  }

  const now = new Date().toISOString();

  profile.verification.status = VerificationStatus.REJECTED;
  profile.verification.rejectedReason = reason;
  profile.verification.reviewedAt = now;

  profile.updatedAt = now;

  // TODO: Update in database and send notification
  employerProfiles.set(employerProfileId, profile);

  return {
    status: VerificationStatus.REJECTED,
    message: 'Business verification rejected',
    nextSteps: [
      'Please review the rejection reason and resubmit with corrected information',
      `Reason: ${reason}`,
    ],
  };
}

/**
 * Get verification status
 */
export async function getVerificationStatus(
  employerProfileId: string,
  userId: string
): Promise<EmployerVerification> {
  const profile = employerProfiles.get(employerProfileId);

  if (!profile) {
    throw new AppError('Employer profile not found', 'PROFILE_NOT_FOUND', 404);
  }

  if (profile.userId !== userId) {
    throw new AppError('Unauthorized', 'UNAUTHORIZED', 403);
  }

  return profile.verification;
}

/**
 * Calculate verification score for employer profile
 */
export function calculateVerificationScore(verification: EmployerVerification): number {
  let score = 0;

  if (verification.status === VerificationStatus.EMAIL_VERIFIED) {
    score += 30;
  }

  if (verification.status === VerificationStatus.BUSINESS_VERIFIED) {
    score += 70;
  }

  if (verification.status === VerificationStatus.REJECTED) {
    score = 10; // Base score even if rejected
  }

  return score;
}

/**
 * Check if employer is fully verified
 */
export function isFullyVerified(verification: EmployerVerification): boolean {
  return verification.status === VerificationStatus.BUSINESS_VERIFIED;
}

/**
 * Check if employer can post jobs
 */
export function canPostJobs(verification: EmployerVerification): boolean {
  return [
    VerificationStatus.EMAIL_VERIFIED,
    VerificationStatus.BUSINESS_VERIFIED,
  ].includes(verification.status);
}

/**
 * Get verification badge info
 */
export function getVerificationBadge(verification: EmployerVerification): {
  type: 'none' | 'email' | 'business';
  label: string;
  color: string;
} {
  switch (verification.status) {
    case VerificationStatus.BUSINESS_VERIFIED:
      return {
        type: 'business',
        label: '企业认证',
        color: '#4CAF50',
      };
    case VerificationStatus.EMAIL_VERIFIED:
      return {
        type: 'email',
        label: '邮箱认证',
        color: '#2196F3',
      };
    default:
      return {
        type: 'none',
        label: '未认证',
        color: '#9E9E9E',
      };
  }
}
