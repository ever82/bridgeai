/**
 * Job Seeker Profile Controller
 *
 * HTTP handlers for job seeker profile management
 */

import { Request, Response, NextFunction } from 'express';

import {
  createProfile,
  getProfile,
  getProfilesByUserId,
  getPrimaryProfile,
  updateProfile,
  deleteProfile,
  updateVisibility,
  getQualityReport,
  getWorkTimeline,
  listProfiles,
  exportToMarkdown,
  maskProfileData,
} from '../../services/jobSeeker/profileService';
import { AppError } from '../../errors';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    agentId?: string;
  };
}

/**
 * Create a new job seeker profile
 */
export async function create(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
    }

    const profile = await createProfile(req.user.id, req.user.agentId || req.user.id, req.body);

    res.status(201).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get profile by ID
 */
export async function get(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // If authenticated, verify ownership
    const profile = await getProfile(id, userId);

    // Apply masking based on visibility for non-owners
    if (!userId || profile.userId !== userId) {
      const masked = maskProfileData(profile, profile.visibility);
      res.json({ success: true, data: masked });
      return;
    }

    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all profiles for current user
 */
export async function getMyProfiles(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
    }

    const isPrimary =
      req.query.isPrimary === 'true' ? true : req.query.isPrimary === 'false' ? false : undefined;

    const profiles = await getProfilesByUserId(req.user.id, { isPrimary });

    res.json({ success: true, data: profiles });
  } catch (error) {
    next(error);
  }
}

/**
 * Get primary profile
 */
export async function getMyPrimaryProfile(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
    }

    const profile = await getPrimaryProfile(req.user.id);

    if (!profile) {
      res.json({ success: true, data: null });
      return;
    }

    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
}

/**
 * Update a profile
 */
export async function update(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
    }

    const { id } = req.params;
    const profile = await updateProfile(id, req.user.id, req.body);

    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a profile
 */
export async function remove(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
    }

    const { id } = req.params;
    await deleteProfile(id, req.user.id);

    res.json({ success: true, message: 'Profile deleted' });
  } catch (error) {
    next(error);
  }
}

/**
 * Update visibility settings
 */
export async function updatePrivacy(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
    }

    const { id } = req.params;
    const { visibility, maskedFields } = req.body;

    const profile = await updateVisibility(id, req.user.id, visibility, maskedFields);

    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
}

/**
 * Get quality report
 */
export async function getQuality(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
    }

    const { id } = req.params;
    const report = await getQualityReport(id, req.user.id);

    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
}

/**
 * Get work timeline
 */
export async function getTimeline(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
    }

    const { id } = req.params;
    const timeline = await getWorkTimeline(id, req.user.id);

    res.json({ success: true, data: timeline });
  } catch (error) {
    next(error);
  }
}

/**
 * Export resume to markdown
 */
export async function exportResume(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
    }

    const { id } = req.params;
    const profile = await getProfile(id, req.user.id);
    const markdown = exportToMarkdown(profile);

    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="${profile.name}_resume.md"`);
    res.send(markdown);
  } catch (error) {
    next(error);
  }
}

/**
 * List profiles (admin/browse)
 */
export async function browse(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const isPrimary =
      req.query.isPrimary === 'true' ? true : req.query.isPrimary === 'false' ? false : undefined;

    const result = await listProfiles({ page, limit, isPrimary });

    // Apply masking for public profiles
    const maskedProfiles = result.profiles.map(p => maskProfileData(p, p.visibility));

    res.json({
      success: true,
      data: maskedProfiles,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Parse natural language resume
 */
export async function parseResume(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
    }

    const { text } = req.body;
    if (!text) {
      throw new AppError('Resume text is required', 'MISSING_TEXT', 400);
    }

    const { extractFromNaturalLanguage } =
      await import('../../services/jobSeeker/resumeExtractionService');
    const result = await extractFromNaturalLanguage(text);

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
