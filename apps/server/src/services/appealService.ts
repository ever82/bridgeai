/**
 * Appeal Service
 * General appeal system for moderation decisions, violations, and warnings.
 *
 * Handles appeal submission, admin review, punishment revocation,
 * and credit score restoration.
 */

import { Prisma } from '@prisma/client';

import { prisma } from '../db/client';
import { AppError } from '../errors/AppError';

import { violationHandler } from './violationHandler';
import { getUserCreditScore } from './creditScoreService';

// Appeal window: 30 days to appeal after action
const APPEAL_WINDOW_DAYS = 30;

export interface AppealSubmitData {
  appealType: 'MODERATION' | 'VIOLATION' | 'WARNING' | 'OTHER';
  userId: string;
  targetId: string;
  targetType: 'report' | 'violation' | 'warning';
  reason: string;
  evidence?: unknown;
}

export interface AppealReviewData {
  reviewedBy: string;
  status: 'APPROVED' | 'REJECTED';
  reviewNote?: string;
  resolution?: string;
}

export interface AppealQueryFilters {
  status?: string;
  userId?: string;
  appealType?: string;
  page?: number;
  limit?: number;
}

export class AppealService {
  /**
   * Submit a new appeal
   */
  async submitAppeal(data: AppealSubmitData): Promise<Prisma.AppealGetPayload<object>> {
    // Check if user already has a pending appeal for the same target
    const existing = await prisma.appeal.findFirst({
      where: {
        userId: data.userId,
        targetId: data.targetId,
        targetType: data.targetType,
        status: { in: ['PENDING', 'APPROVED', 'REJECTED'] },
      },
    });

    if (existing) {
      throw new AppError(
        'An appeal has already been submitted for this item',
        'APPEAL_EXISTS',
        409
      );
    }

    // Check appeal window based on target type
    let targetCreatedAt: Date | null = null;

    if (data.targetType === 'violation') {
      const violation = await prisma.userViolation.findUnique({
        where: { id: data.targetId },
      });
      targetCreatedAt = violation?.createdAt || null;
    } else if (data.targetType === 'report') {
      const report = await prisma.report.findUnique({
        where: { id: data.targetId },
      });
      targetCreatedAt = report?.createdAt || null;
    }

    if (targetCreatedAt) {
      const windowMs = APPEAL_WINDOW_DAYS * 24 * 60 * 60 * 1000;
      if (Date.now() - targetCreatedAt.getTime() > windowMs) {
        throw new AppError(
          `Appeal window of ${APPEAL_WINDOW_DAYS} days has expired`,
          'APPEAL_EXPIRED',
          400
        );
      }
    }

    const appeal = await prisma.appeal.create({
      data: {
        appealType: data.appealType,
        userId: data.userId,
        targetId: data.targetId,
        targetType: data.targetType,
        reason: data.reason,
        evidence: data.evidence || undefined,
        status: 'PENDING',
      },
    });

    // Mark the report as appealed if it's a report target
    if (data.targetType === 'report') {
      await prisma.report.update({
        where: { id: data.targetId },
        data: { status: 'APPEALED' },
      }).catch(() => {
        // Report might not exist or already be in a different state - non-fatal
      });
    }

    return appeal;
  }

  /**
   * List appeals with filters (admin view)
   */
  async getAppeals(filters: AppealQueryFilters): Promise<{
    appeals: Prisma.AppealGetPayload<object>[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { status, userId, appealType, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.AppealWhereInput = {};
    if (status) where.status = status as Prisma.AppealWhereInput['status'];
    if (userId) where.userId = userId;
    if (appealType) where.appealType = appealType as Prisma.AppealWhereInput['appealType'];

    const [appeals, total] = await Promise.all([
      prisma.appeal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.appeal.count({ where }),
    ]);

    return { appeals, total, page, limit };
  }

  /**
   * Get a single appeal by ID
   */
  async getAppealById(id: string): Promise<Prisma.AppealGetPayload<object> | null> {
    return prisma.appeal.findUnique({ where: { id } });
  }

  /**
   * Admin reviews an appeal
   */
  async reviewAppeal(
    appealId: string,
    data: AppealReviewData
  ): Promise<Prisma.AppealGetPayload<object>> {
    const appeal = await prisma.appeal.findUnique({ where: { id: appealId } });

    if (!appeal) {
      throw new AppError('Appeal not found', 'APPEAL_NOT_FOUND', 404);
    }

    if (appeal.status !== 'PENDING') {
      throw new AppError(
        'Appeal has already been reviewed',
        'APPEAL_ALREADY_REVIEWED',
        400
      );
    }

    const updated = await prisma.appeal.update({
      where: { id: appealId },
      data: {
        status: data.status,
        reviewedBy: data.reviewedBy,
        reviewNote: data.reviewNote || undefined,
        resolution: data.resolution || undefined,
        reviewedAt: new Date(),
      },
    });

    // If approved, revoke punishment and restore credit score
    if (data.status === 'APPROVED') {
      await this.revokePunishment(appeal);
      await this.restoreCreditScore(appeal);
    }

    return updated;
  }

  /**
   * Revoke punishment associated with the appeal
   */
  async revokePunishment(appeal: Prisma.AppealGetPayload<object>): Promise<void> {
    if (appeal.targetType === 'violation') {
      // Lift the user status restriction via violation handler
      await violationHandler.liftAction(appeal.userId, appeal.reviewedBy || undefined);
    }
    // For other target types, extend as needed
  }

  /**
   * Restore credit score points for the approved appeal
   */
  async restoreCreditScore(appeal: Prisma.AppealGetPayload<object>): Promise<void> {
    if (appeal.targetType === 'violation') {
      // Find the related violation and credit deduction
      const violation = await prisma.userViolation.findUnique({
        where: { id: appeal.targetId },
      });

      if (violation) {
        // Calculate the deduction that was applied
        const severity = violation.severity;
        const deduction = 5 + (severity * 2); // matches violationHandler.calculateCreditDeduction

        const previousScore = await getUserCreditScore(appeal.userId);

        // Restore credit by adding back the deducted points
        await prisma.creditHistory.create({
          data: {
            userId: appeal.userId,
            score: previousScore + deduction,
            delta: deduction,
            reason: `Appeal approved: ${appeal.resolution || 'violation appeal granted'}`,
            sourceType: 'APPEAL_RESTORE',
            sourceId: appeal.id,
          },
        });

        // Update credit score record
        await prisma.creditScore.update({
          where: { userId: appeal.userId },
          data: {
            score: previousScore + deduction,
            lastUpdated: new Date(),
            updatedBy: appeal.reviewedBy || undefined,
            reason: `Appeal approved - credit restored`,
          },
        }).catch(() => {
          // CreditScore might not exist for this user - create it
          return prisma.creditScore.create({
            data: {
              userId: appeal.userId,
              score: 600 + deduction,
              level: 'general',
              lastUpdated: new Date(),
              updatedBy: appeal.reviewedBy || undefined,
              reason: `Appeal approved - credit restored`,
            },
          });
        });
      }
    }
  }

  /**
   * Withdraw a pending appeal (owner only)
   */
  async withdrawAppeal(appealId: string, userId: string): Promise<Prisma.AppealGetPayload<object>> {
    const appeal = await prisma.appeal.findUnique({ where: { id: appealId } });

    if (!appeal) {
      throw new AppError('Appeal not found', 'APPEAL_NOT_FOUND', 404);
    }

    if (appeal.userId !== userId) {
      throw new AppError(
        'You can only withdraw your own appeals',
        'FORBIDDEN',
        403
      );
    }

    if (appeal.status !== 'PENDING') {
      throw new AppError(
        'Only pending appeals can be withdrawn',
        'APPEAL_NOT_PENDING',
        400
      );
    }

    const updated = await prisma.appeal.update({
      where: { id: appealId },
      data: {
        status: 'WITHDRAWN',
      },
    });

    // Revert the report status if it was marked as appealed
    if (appeal.targetType === 'report') {
      await prisma.report.update({
        where: { id: appeal.targetId },
        data: { status: 'PENDING' },
      }).catch(() => {
        // Non-fatal
      });
    }

    return updated;
  }

  /**
   * Get appeals by user ID
   */
  async getAppealsByUser(userId: string, page = 1, limit = 20) {
    return this.getAppeals({ userId, page, limit });
  }
}

// Export singleton
export const appealService = new AppealService();