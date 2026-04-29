/**
 * Job Match Notification Routes
 *
 * REST endpoints for match notifications and notification preferences.
 */

import { Router, Request, Response, NextFunction } from 'express';

import {
  notifyNewMatch,
  notifyHighMatchJob,
  notifyResumeViewed,
  notifyMatchStatusChange,
  getNotificationPreferences,
  updateNotificationPreferences,
} from '../../services/job/jobMatchNotifications';
import { AppError } from '../../errors';

interface AuthenticatedRequest extends Request {
  user?: { id: string; role?: string };
}

const router: Router = Router();

// ---------------------------------------------------------------------------
// Trigger notifications (for internal / agent use)
// ---------------------------------------------------------------------------

router.post(
  '/notify/new-match',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
      }

      const { matchId, matchScore, jobTitle, candidateName, metadata, targetUserId } = req.body;
      const effectiveTargetUserId =
        targetUserId && req.user.role === 'admin' ? targetUserId : req.user.id;
      const result = await notifyNewMatch({
        userId: effectiveTargetUserId,
        matchId,
        matchScore,
        jobTitle,
        candidateName,
        metadata,
      });

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/notify/high-match',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
      }

      const { matchId, matchScore, jobTitle, metadata, targetUserId } = req.body;
      const effectiveTargetUserId =
        targetUserId && req.user.role === 'admin' ? targetUserId : req.user.id;
      const result = await notifyHighMatchJob({
        userId: effectiveTargetUserId,
        matchId,
        matchScore,
        jobTitle,
        metadata,
      });

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/notify/resume-viewed',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
      }

      const { matchId, candidateName, metadata, targetUserId } = req.body;
      const effectiveTargetUserId =
        targetUserId && req.user.role === 'admin' ? targetUserId : req.user.id;
      const result = await notifyResumeViewed({
        userId: effectiveTargetUserId,
        matchId,
        candidateName,
        metadata,
      });

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/notify/match-status',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
      }

      const { matchId, status, metadata, targetUserId } = req.body;
      if (!['accepted', 'rejected', 'completed'].includes(status)) {
        throw new AppError(
          'Invalid status. Must be: accepted, rejected, completed',
          'INVALID_STATUS',
          400
        );
      }

      const effectiveTargetUserId =
        targetUserId && req.user.role === 'admin' ? targetUserId : req.user.id;
      const result = await notifyMatchStatusChange(status, {
        userId: effectiveTargetUserId,
        matchId,
        metadata,
      });

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

router.get('/preferences', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
    }

    const prefs = await getNotificationPreferences(req.user.id);

    res.json({ success: true, data: prefs });
  } catch (error) {
    next(error);
  }
});

router.put('/preferences', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 'UNAUTHORIZED', 401);
    }

    const prefs = await updateNotificationPreferences(req.user.id, req.body);

    res.json({ success: true, data: prefs });
  } catch (error) {
    next(error);
  }
});

export default router;
