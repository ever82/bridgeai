/**
 * Violation Handler Service
 * Manages user violations, applies punitive actions (mute/ban/suspend),
 * links violations to credit score deduction, and sends user warnings.
 */

import {
  ViolationType,
  ViolationAction,
  UserViolation,
  NotificationType,
  PriorityLevel,
  UserStatus,
} from '@prisma/client';

import { prisma } from '../db/client';

import { notificationService } from './notificationService';
import { updateCreditScore as creditScoreUpdate, getUserCreditScore } from './creditScoreService';

// Violation action thresholds
const VIOLATION_CONFIG = {
  CREDIT_DEDUCTION_BASE: 5, // Base credit deduction per violation
  CREDIT_DEDUCTION_PER_SEVERITY: 2, // Additional deduction per severity level
  WARNING_SEVERITY_THRESHOLD: 3,
  MUTE_SEVERITY_THRESHOLD: 5,
  SUSPEND_SEVERITY_THRESHOLD: 7,
  BAN_SEVERITY_THRESHOLD: 9,
  MUTE_DURATION_HOURS: 24,
  SUSPEND_DURATION_DAYS: 7,
  MAX_ACTIVE_VIOLATIONS_FOR_WARNING: 3,
  MAX_ACTIVE_VIOLATIONS_FOR_MUTE: 5,
  MAX_ACTIVE_VIOLATIONS_FOR_SUSPEND: 7,
};

export interface ViolationRecord {
  type: ViolationType;
  severity: number; // 1-10
  description?: string;
  reportId?: string;
  moderatorId?: string;
}

export interface ViolationResult {
  success: boolean;
  violation?: UserViolation;
  action?: ViolationAction;
  creditDeducted?: number;
  notificationSent?: boolean;
  error?: string;
}

export interface ViolationCheck {
  activeViolationCount: number;
  totalViolationCount: number;
  recentViolations: UserViolation[];
  shouldEscalate: boolean;
}

/**
 * Determines the appropriate action based on severity and violation count
 */
function determineAction(severity: number, activeCount: number): ViolationAction {
  // Escalate based on severity
  if (severity >= VIOLATION_CONFIG.BAN_SEVERITY_THRESHOLD) {
    return ViolationAction.BAN;
  }
  if (severity >= VIOLATION_CONFIG.SUSPEND_SEVERITY_THRESHOLD) {
    return ViolationAction.SUSPEND;
  }
  if (severity >= VIOLATION_CONFIG.MUTE_SEVERITY_THRESHOLD || activeCount >= VIOLATION_CONFIG.MAX_ACTIVE_VIOLATIONS_FOR_MUTE) {
    return ViolationAction.MUTE;
  }
  if (severity >= VIOLATION_CONFIG.WARNING_SEVERITY_THRESHOLD || activeCount >= VIOLATION_CONFIG.MAX_ACTIVE_VIOLATIONS_FOR_WARNING) {
    return ViolationAction.WARNING;
  }
  return ViolationAction.WARNING;
}

/**
 * Gets the duration for a temporary action
 */
function getActionDuration(action: ViolationAction): Date | null {
  const now = new Date();
  switch (action) {
    case ViolationAction.MUTE:
      return new Date(now.getTime() + VIOLATION_CONFIG.MUTE_DURATION_HOURS * 60 * 60 * 1000);
    case ViolationAction.SUSPEND:
      return new Date(now.getTime() + VIOLATION_CONFIG.SUSPEND_DURATION_DAYS * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}

/**
 * Calculates credit score deduction based on severity
 */
function calculateCreditDeduction(severity: number): number {
  return VIOLATION_CONFIG.CREDIT_DEDUCTION_BASE + (severity * VIOLATION_CONFIG.CREDIT_DEDUCTION_PER_SEVERITY);
}

/**
 * Violation Handler Service
 */
export class ViolationHandler {
  /**
   * Records a new violation for a user
   */
  async recordViolation(
    userId: string,
    data: ViolationRecord,
    action?: ViolationAction
  ): Promise<UserViolation> {
    // Check user's active violations count to determine appropriate action
    const activeCount = await this.checkActiveViolationCount(userId);
    const determinedAction = action || determineAction(data.severity, activeCount);

    const violation = await prisma.userViolation.create({
      data: {
        userId,
        type: data.type,
        severity: data.severity,
        description: data.description,
        reportId: data.reportId,
        moderatorId: data.moderatorId,
        action: determinedAction,
        actionUntil: getActionDuration(determinedAction),
      },
    });

    return violation;
  }

  /**
   * Applies a punitive action to a user
   */
  async applyAction(
    userId: string,
    action: ViolationAction,
    moderatorId?: string
  ): Promise<void> {
    const actionUntil = getActionDuration(action);
    let newStatus: UserStatus;

    switch (action) {
      case ViolationAction.MUTE:
        // Mute is a temporary status change; we still use SUSPENDED as the intermediate state
        newStatus = UserStatus.SUSPENDED;
        break;
      case ViolationAction.SUSPEND:
        newStatus = UserStatus.SUSPENDED;
        break;
      case ViolationAction.BAN:
        newStatus = UserStatus.BANNED;
        break;
      case ViolationAction.WARNING:
        // No status change for warning
        return;
      default:
        return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { status: newStatus },
    });

    // Log the action in audit log if auditService is available
    try {
      const { auditService } = await import('./auditService');
      await auditService.log({
        userId,
        action: `VIOLATION_${action}`,
        resource: 'user',
        resourceId: userId,
        details: {
          action,
          actionUntil,
          appliedBy: moderatorId,
        },
      });
    } catch {
      // auditService may not be available in all contexts
    }
  }

  /**
   * Sends a warning notification to the user
   */
  async sendWarning(
    userId: string,
    violation: UserViolation,
    reason?: string
  ): Promise<void> {
    const violationTypeNames: Record<ViolationType, string> = {
      SPAM: '垃圾信息',
      HARASSMENT: '骚扰行为',
      INAPPROPRIATE_CONTENT: '不当内容',
      FAKE_REVIEW: '虚假评价',
      SCAM: '欺诈行为',
      OTHER: '其他违规',
    };

    await notificationService.sendToUser(userId, {
      type: NotificationType.VIOLATION_WARNING,
      title: '违规警告通知',
      content: reason ||
        `您因${violationTypeNames[violation.type] || '违规行为'}收到了警告。本次违规严重程度：${violation.severity}/10。请遵守平台规范，避免再次违规。`,
      data: {
        violationId: violation.id,
        violationType: violation.type,
        severity: violation.severity,
        description: violation.description,
        action: violation.action,
        actionUntil: violation.actionUntil,
      },
      priority: PriorityLevel.HIGH,
      category: 'violation',
    });
  }

  /**
   * Mutes a user temporarily
   */
  async muteUser(userId: string, durationHours?: number): Promise<void> {
    const muteUntil = new Date();
    muteUntil.setHours(muteUntil.getHours() + (durationHours || VIOLATION_CONFIG.MUTE_DURATION_HOURS));

    // Update user status to suspended (mute)
    await prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.SUSPENDED },
    });

    // Create notification
    await notificationService.sendToUser(userId, {
      type: NotificationType.VIOLATION_MUTE,
      title: '账号被禁言',
      content: `您的账号因违规行为被临时禁言，禁言将于 ${muteUntil.toLocaleString()} 结束。`,
      data: {
        muteUntil,
        durationHours: durationHours || VIOLATION_CONFIG.MUTE_DURATION_HOURS,
      },
      priority: PriorityLevel.HIGH,
      category: 'violation',
    });
  }

  /**
   * Bans a user permanently or temporarily suspends
   */
  async banUser(userId: string, isPermanent: boolean = false, until?: Date): Promise<void> {
    const newStatus = isPermanent ? UserStatus.BANNED : UserStatus.SUSPENDED;

    await prisma.user.update({
      where: { id: userId },
      data: { status: newStatus },
    });

    const notificationType = isPermanent
      ? NotificationType.VIOLATION_BAN
      : NotificationType.VIOLATION_SUSPEND;

    const title = isPermanent ? '账号被永久封禁' : '账号被临时封禁';
    const content = isPermanent
      ? '您的账号因严重违规行为被永久封禁。如有异议，请联系客服申诉。'
      : `您的账号因违规行为被临时封禁，封禁将于 ${(until || new Date()).toLocaleString()} 结束。`;

    await notificationService.sendToUser(userId, {
      type: notificationType,
      title,
      content,
      data: {
        isPermanent,
        until: until || null,
      },
      priority: PriorityLevel.URGENT,
      category: 'violation',
    });
  }

  /**
   * Checks a user's active violation count
   */
  async checkActiveViolationCount(userId: string): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return prisma.userViolation.count({
      where: {
        userId,
        createdAt: { gte: thirtyDaysAgo },
        action: { not: null },
      },
    });
  }

  /**
   * Gets detailed violation check for a user
   */
  async checkActiveViolations(userId: string): Promise<ViolationCheck> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [activeViolations, totalViolations, recentViolations] = await Promise.all([
      this.checkActiveViolationCount(userId),
      prisma.userViolation.count({ where: { userId } }),
      prisma.userViolation.findMany({
        where: {
          userId,
          createdAt: { gte: thirtyDaysAgo },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      activeViolationCount: activeViolations,
      totalViolationCount: totalViolations,
      recentViolations,
      shouldEscalate: activeViolations >= VIOLATION_CONFIG.MAX_ACTIVE_VIOLATIONS_FOR_WARNING,
    };
  }

  /**
   * Links a violation to credit score deduction
   */
  async linkToCreditScore(
    userId: string,
    severity: number,
    violationId?: string
  ): Promise<{ deducted: number; newScore: number }> {
    const deduction = calculateCreditDeduction(severity);

    const previousScore = await getUserCreditScore(userId);

    await creditScoreUpdate({
      userId,
      delta: -deduction,
      reason: `User violation (severity ${severity})`,
      sourceType: 'VIOLATION',
      sourceId: violationId,
      metadata: { severity },
    });

    // Send credit score change notification
    try {
      const { sendCreditScoreChangeNotification } = await import('./notificationService');
      const newScore = await getUserCreditScore(userId);
      await sendCreditScoreChangeNotification(
        userId,
        previousScore,
        newScore,
        `违规处罚：严重程度 ${severity}/10`
      );
    } catch {
      // Notification may fail, don't block the operation
    }

    return {
      deducted: deduction,
      newScore: previousScore - deduction,
    };
  }

  /**
   * Main entry point: handles a complete violation workflow
   * Records violation, applies action, links credit score, and sends notification
   */
  async handleViolation(
    userId: string,
    data: ViolationRecord,
    options: { notifyUser?: boolean; creditDeduct?: boolean; moderatorId?: string } = {}
  ): Promise<ViolationResult> {
    try {
      // 1. Record the violation
      const violation = await this.recordViolation(userId, data);
      const action = violation.action!;

      // 2. Apply the action
      await this.applyAction(userId, action, options.moderatorId);

      // 3. Send warning/notification
      if (options.notifyUser !== false) {
        await this.sendWarning(userId, violation, data.description || undefined);
      }

      // 4. Link to credit score deduction
      let creditDeducted = 0;
      if (options.creditDeduct !== false) {
        const result = await this.linkToCreditScore(userId, data.severity, violation.id);
        creditDeducted = result.deducted;
      }

      return {
        success: true,
        violation,
        action,
        creditDeducted,
        notificationSent: true,
      };
    } catch (error) {
      console.error(`Error handling violation for user ${userId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Lifts a temporary action (mute/suspend) early
   */
  async liftAction(userId: string, moderatorId?: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return false;

      // Only lift if currently suspended/banned due to violation
      if (user.status !== UserStatus.SUSPENDED && user.status !== UserStatus.BANNED) {
        return false;
      }

      // Reset status to active
      await prisma.user.update({
        where: { id: userId },
        data: { status: UserStatus.ACTIVE },
      });

      // Create notification
      await notificationService.sendToUser(userId, {
        type: NotificationType.SYSTEM_ANNOUNCEMENT,
        title: '账号限制已解除',
        content: '您的账号限制已解除，可以正常使用了。',
        priority: PriorityLevel.NORMAL,
        category: 'violation',
      });

      // Log the lift action
      try {
        const { auditService } = await import('./auditService');
        await auditService.log({
          userId,
          action: 'VIOLATION_LIFTED',
          resource: 'user',
          resourceId: userId,
          details: {
            previousStatus: user.status,
            liftedBy: moderatorId,
          },
        });
      } catch {
        // auditService may not be available
      }

      return true;
    } catch (error) {
      console.error(`Error lifting action for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Gets all violations for a user
   */
  async getUserViolations(
    userId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ violations: UserViolation[]; total: number }> {
    const { limit = 20, offset = 0 } = options;

    const [violations, total] = await Promise.all([
      prisma.userViolation.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.userViolation.count({ where: { userId } }),
    ]);

    return { violations, total };
  }
}

// Export singleton
export const violationHandler = new ViolationHandler();