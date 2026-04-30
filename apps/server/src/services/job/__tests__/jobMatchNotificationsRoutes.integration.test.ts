/**
 * @jest-environment node
 *
 * Integration tests for Job Match Notification Routes (JOB003c)
 *
 * These tests exercise the HTTP request flow end-to-end through the Express
 * router, request validation, the notification service layer, and JSON
 * response shaping. The data layer (prisma) and the push notification
 * transport are mocked at the module boundary so the tests run hermetically
 * without a live database, while still verifying the integration of routes,
 * services, and authorization rules.
 */

/* eslint-disable import/order */
import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';

jest.mock('../../../db/client', () => {
  const mPrisma = {
    notificationPreference: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    notification: {
      count: jest.fn(),
    },
  };
  return { prisma: mPrisma };
});

jest.mock('../../pushNotification', () => ({
  pushNotificationService: {
    send: jest.fn(),
  },
}));

import jobMatchNotificationsRoutes from '../../../routes/job/jobMatchNotificationsRoutes';
import { prisma } from '../../../db/client';
import { pushNotificationService } from '../../pushNotification';
import { AppError } from '../../../errors';

const mockedSend = pushNotificationService.send as jest.Mock;
const mockedFindUnique = prisma.notificationPreference.findUnique as jest.Mock;
const mockedUpsert = prisma.notificationPreference.upsert as jest.Mock;
const mockedCount = prisma.notification.count as jest.Mock;

// ---------------------------------------------------------------------------
// App factory
// ---------------------------------------------------------------------------

interface TestUser {
  id: string;
  role?: string;
}

function buildApp(user: TestUser | null = { id: 'user-1' }): Express {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (user) {
      (req as any).user = user;
    }
    next();
  });
  app.use('/api/v1/job-notifications', jobMatchNotificationsRoutes);

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction): void => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: err.message },
    });
  });
  return app;
}

// Default-enabled notification preferences for the test user.
function mockEnabledPreferences(overrides: Record<string, any> = {}): void {
  mockedFindUnique.mockResolvedValue({
    userId: 'user-1',
    matchNotifications: true,
    quietHoursEnabled: false,
    quietHoursStart: null,
    quietHoursEnd: null,
    dailyLimit: 0,
    ...overrides,
  });
  mockedCount.mockResolvedValue(0);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Job Match Notification Routes Integration (JOB003c)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSend.mockResolvedValue({ delivered: true, channel: 'push' });
  });

  // -------------------------------------------------------------------------
  // POST /notify/new-match
  // -------------------------------------------------------------------------

  describe('POST /notify/new-match', () => {
    it('sends a new-match notification for an enabled user', async () => {
      mockEnabledPreferences();

      const res = await request(buildApp())
        .post('/api/v1/job-notifications/notify/new-match')
        .send({
          matchId: 'match-1',
          matchScore: 88,
          jobTitle: 'Senior Frontend Engineer',
          candidateName: 'Alice',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(mockedSend).toHaveBeenCalledTimes(1);
      const sentArg = mockedSend.mock.calls[0][0];
      expect(sentArg.userId).toBe('user-1');
    });

    it('returns 401 when not authenticated', async () => {
      const res = await request(buildApp(null))
        .post('/api/v1/job-notifications/notify/new-match')
        .send({ matchId: 'm1' })
        .expect(401);

      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(mockedSend).not.toHaveBeenCalled();
    });

    it('non-admin users cannot impersonate other users via targetUserId', async () => {
      mockEnabledPreferences();

      await request(buildApp({ id: 'user-1', role: 'user' }))
        .post('/api/v1/job-notifications/notify/new-match')
        .send({
          matchId: 'match-1',
          matchScore: 88,
          jobTitle: 'Senior Frontend Engineer',
          targetUserId: 'someone-else',
        })
        .expect(200);

      // findUnique is called with the requester's own id, not the spoofed one
      expect(mockedFindUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('admins may target a different user via targetUserId', async () => {
      mockEnabledPreferences({ userId: 'target-user' });

      await request(buildApp({ id: 'admin-1', role: 'admin' }))
        .post('/api/v1/job-notifications/notify/new-match')
        .send({
          matchId: 'match-1',
          matchScore: 88,
          jobTitle: 'Senior Frontend Engineer',
          targetUserId: 'target-user',
        })
        .expect(200);

      expect(mockedFindUnique).toHaveBeenCalledWith({
        where: { userId: 'target-user' },
      });
    });
  });

  // -------------------------------------------------------------------------
  // POST /notify/high-match
  // -------------------------------------------------------------------------

  describe('POST /notify/high-match', () => {
    it('sends a high-match notification', async () => {
      mockEnabledPreferences();

      const res = await request(buildApp())
        .post('/api/v1/job-notifications/notify/high-match')
        .send({ matchId: 'match-2', matchScore: 95, jobTitle: 'Lead Engineer' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(mockedSend).toHaveBeenCalledTimes(1);
    });

    it('returns 401 when not authenticated', async () => {
      await request(buildApp(null))
        .post('/api/v1/job-notifications/notify/high-match')
        .send({})
        .expect(401);
    });
  });

  // -------------------------------------------------------------------------
  // POST /notify/resume-viewed
  // -------------------------------------------------------------------------

  describe('POST /notify/resume-viewed', () => {
    it('sends a resume-viewed notification', async () => {
      mockEnabledPreferences();

      const res = await request(buildApp())
        .post('/api/v1/job-notifications/notify/resume-viewed')
        .send({ matchId: 'match-3', candidateName: 'Bob' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(mockedSend).toHaveBeenCalledTimes(1);
    });

    it('returns 401 when not authenticated', async () => {
      await request(buildApp(null))
        .post('/api/v1/job-notifications/notify/resume-viewed')
        .send({})
        .expect(401);
    });
  });

  // -------------------------------------------------------------------------
  // POST /notify/match-status
  // -------------------------------------------------------------------------

  describe('POST /notify/match-status', () => {
    it('sends a match-status notification for a valid status', async () => {
      mockEnabledPreferences();

      const res = await request(buildApp())
        .post('/api/v1/job-notifications/notify/match-status')
        .send({ matchId: 'match-4', status: 'accepted' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(mockedSend).toHaveBeenCalledTimes(1);
    });

    it('rejects invalid status values with 400', async () => {
      mockEnabledPreferences();

      const res = await request(buildApp())
        .post('/api/v1/job-notifications/notify/match-status')
        .send({ matchId: 'match-4', status: 'bogus' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_STATUS');
      expect(mockedSend).not.toHaveBeenCalled();
    });

    it('returns 401 when not authenticated', async () => {
      await request(buildApp(null))
        .post('/api/v1/job-notifications/notify/match-status')
        .send({ status: 'accepted' })
        .expect(401);
    });
  });

  // -------------------------------------------------------------------------
  // GET /preferences and PUT /preferences
  // -------------------------------------------------------------------------

  describe('Preferences endpoints', () => {
    it('GET /preferences returns the user preferences', async () => {
      mockedFindUnique.mockResolvedValue({
        userId: 'user-1',
        matchNotifications: true,
        quietHoursEnabled: false,
        quietHoursStart: null,
        quietHoursEnd: null,
        dailyLimit: 0,
      });

      const res = await request(buildApp())
        .get('/api/v1/job-notifications/preferences')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.userId).toBe('user-1');
      expect(res.body.data.matchNotifications).toBe(true);
    });

    it('PUT /preferences upserts preferences for the user', async () => {
      mockedUpsert.mockResolvedValue({
        userId: 'user-1',
        matchNotifications: false,
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        dailyLimit: 5,
      });

      const res = await request(buildApp())
        .put('/api/v1/job-notifications/preferences')
        .send({
          matchNotifications: false,
          quietHoursEnabled: true,
          quietHoursStart: '22:00',
          quietHoursEnd: '07:00',
          dailyLimit: 5,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.matchNotifications).toBe(false);
      expect(res.body.data.dailyLimit).toBe(5);
      expect(mockedUpsert).toHaveBeenCalledTimes(1);
      const upsertArgs = mockedUpsert.mock.calls[0][0];
      expect(upsertArgs.where).toEqual({ userId: 'user-1' });
    });

    it('GET /preferences returns 401 when not authenticated', async () => {
      await request(buildApp(null)).get('/api/v1/job-notifications/preferences').expect(401);
    });

    it('PUT /preferences returns 401 when not authenticated', async () => {
      await request(buildApp(null))
        .put('/api/v1/job-notifications/preferences')
        .send({ matchNotifications: false })
        .expect(401);
    });
  });
});
