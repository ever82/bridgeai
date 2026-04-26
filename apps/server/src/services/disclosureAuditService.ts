/**
 * Disclosure Audit Service
 *
 * Provides audit logging and change tracking for disclosure settings.
 * Tracks disclosure changes, access attempts, and manages notifications.
 */
import {
  DisclosureLevel,
  DisclosureAuditEntry,
  DisclosureChangeRecord,
  DEFAULT_FIELD_DISCLOSURES,
} from '@bridgeai/shared';

import { prisma } from '../db/client';

import { auditService } from './auditService';
import { disclosureService } from './disclosureService';

/**
 * Disclosure change log entry (before saving to DB)
 */
interface DisclosureChangeInput {
  agentId: string;
  fieldName: string;
  previousLevel: DisclosureLevel;
  newLevel: DisclosureLevel;
  changedBy: string;
}

/**
 * Access attempt log entry (before saving to DB)
 */
interface AccessAttemptInput {
  agentId: string;
  fieldName: string;
  accessedBy: string;
  ownerId: string;
  accessGranted: boolean;
  context?: Record<string, unknown>;
}

/**
 * Disclosure Audit Service
 */
export class DisclosureAuditService {
  private readonly MAX_HISTORY_DAYS = 90; // Keep 90 days of audit history

  /**
   * Log a disclosure change
   */
  async logDisclosureChange(change: DisclosureChangeInput): Promise<DisclosureChangeRecord> {
    const record: DisclosureChangeRecord = {
      id: this.generateId(),
      agentId: change.agentId,
      fieldName: change.fieldName,
      previousLevel: change.previousLevel,
      newLevel: change.newLevel,
      changedBy: change.changedBy,
      changedAt: new Date().toISOString(),
      notificationSent: false,
    };

    // Save to database
    await this.saveChangeRecord(record);

    // Also log to general audit
    await auditService.log({
      action: 'DISCLOSURE_LEVEL_CHANGED',
      resource: 'disclosure',
      resourceId: change.agentId,
      userId: change.changedBy,
      details: {
        fieldName: change.fieldName,
        from: change.previousLevel,
        to: change.newLevel,
      },
    });

    // Check if we need to notify affected users
    if (this.shouldNotifyChange(change.previousLevel, change.newLevel)) {
      await this.notifyAffectedUsers(record);
    }

    return record;
  }

  /**
   * Log a field access attempt
   */
  async logAccessAttempt(attempt: AccessAttemptInput): Promise<DisclosureAuditEntry> {
    const entry: DisclosureAuditEntry = {
      id: this.generateId(),
      agentId: attempt.agentId,
      fieldName: attempt.fieldName,
      accessedBy: attempt.accessedBy,
      ownerId: attempt.ownerId,
      accessGranted: attempt.accessGranted,
      timestamp: new Date().toISOString(),
      context: attempt.context,
    };

    // Save to database
    await this.saveAccessEntry(entry);

    // Log denied access to security audit
    if (!attempt.accessGranted) {
      await auditService.log({
        action: 'DISCLOSURE_ACCESS_DENIED',
        resource: 'disclosure',
        resourceId: attempt.agentId,
        userId: attempt.accessedBy,
        details: {
          fieldName: attempt.fieldName,
          ownerId: attempt.ownerId,
        },
      });
    }

    return entry;
  }

  /**
   * Get disclosure change history for an agent
   */
  async getChangeHistory(agentId: string, limit: number = 50): Promise<DisclosureChangeRecord[]> {
    const records = await prisma.disclosureChange.findMany({
      where: { agentId },
      orderBy: { changedAt: 'desc' },
      take: limit,
    });
    return records.map(r => ({
      id: r.id,
      agentId: r.agentId,
      fieldName: r.fieldName,
      previousLevel: r.previousLevel as DisclosureLevel,
      newLevel: r.newLevel as DisclosureLevel,
      changedBy: r.changedBy,
      changedAt: r.changedAt.toISOString(),
      notificationSent: r.notificationSent,
    }));
  }

  /**
   * Get access audit log for an agent
   */
  async getAccessLog(
    agentId: string,
    options: { startDate?: Date; endDate?: Date; limit?: number } = {}
  ): Promise<DisclosureAuditEntry[]> {
    const { limit = 100 } = options;

    const where: Record<string, unknown> = { agentId };
    if (options.startDate || options.endDate) {
      where.timestamp = {};
      if (options.startDate) where.timestamp.gte = options.startDate;
      if (options.endDate) where.timestamp.lte = options.endDate;
    }

    const records = await prisma.disclosureAccessLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
    return records.map(r => ({
      id: r.id,
      agentId: r.agentId,
      fieldName: r.fieldName,
      accessedBy: r.accessedBy,
      ownerId: r.ownerId,
      accessGranted: r.accessGranted,
      timestamp: r.timestamp.toISOString(),
      context: r.context as Record<string, unknown>,
    }));
  }

  /**
   * Get disclosure statistics for an agent
   */
  async getDisclosureStats(agentId: string): Promise<{
    totalChanges: number;
    totalAccessAttempts: number;
    deniedAccessCount: number;
    mostAccessedFields: { fieldName: string; count: number }[];
  }> {
    const [changeCount, accessCount, deniedCount] = await Promise.all([
      prisma.disclosureChange.count({ where: { agentId } }),
      prisma.disclosureAccessLog.count({ where: { agentId } }),
      prisma.disclosureAccessLog.count({ where: { agentId, accessGranted: false } }),
    ]);

    const mostAccessed = await prisma.disclosureAccessLog.groupBy({
      by: ['fieldName'],
      where: { agentId },
      _count: { fieldName: true },
      orderBy: { _count: { fieldName: 'desc' } },
      take: 5,
    });

    return {
      totalChanges: changeCount,
      totalAccessAttempts: accessCount,
      deniedAccessCount: deniedCount,
      mostAccessedFields: mostAccessed.map(m => ({
        fieldName: m.fieldName,
        count: m._count.fieldName,
      })),
    };
  }

  /**
   * Get recent disclosure changes that affect a specific user
   */
  async getChangesAffectingUser(
    userId: string,
    limit: number = 20
  ): Promise<DisclosureChangeRecord[]> {
    const accessibleAgents =
      (await (prisma as any).match?.findMany({
        where: {
          OR: [{ userId }, { matchedUserId: userId }],
          status: 'ACTIVE',
        },
        select: { agentId: true },
      })) ?? [];

    const agentIds = (accessibleAgents as Array<{ agentId: string }>)
      .map(m => m.agentId)
      .filter(Boolean);
    if (agentIds.length === 0) return [];

    const changes = await prisma.disclosureChange.findMany({
      where: {
        agentId: { in: agentIds },
        changedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { changedAt: 'desc' },
      take: limit,
    });

    return changes.map(r => ({
      id: r.id,
      agentId: r.agentId,
      fieldName: r.fieldName,
      previousLevel: r.previousLevel as DisclosureLevel,
      newLevel: r.newLevel as DisclosureLevel,
      changedBy: r.changedBy,
      changedAt: r.changedAt.toISOString(),
      notificationSent: r.notificationSent,
    }));
  }

  /**
   * Clean up old audit records
   */
  async cleanupOldRecords(): Promise<{ deletedCount: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.MAX_HISTORY_DAYS);

    const [accessDeleted, changesDeleted] = await Promise.all([
      prisma.disclosureAccessLog.deleteMany({
        where: { timestamp: { lt: cutoffDate } },
      }),
      prisma.disclosureChange.deleteMany({
        where: { changedAt: { lt: cutoffDate } },
      }),
    ]);

    return { deletedCount: accessDeleted.count + changesDeleted.count };
  }

  /**
   * Create a withdrawal record when user withdraws disclosed information
   */
  async withdrawDisclosedInfo(
    agentId: string,
    fieldName: string,
    withdrawnBy: string,
    reason?: string
  ): Promise<DisclosureChangeRecord> {
    // Look up the field's current actual level
    let previousLevel = DisclosureLevel.AFTER_REFERRAL;
    try {
      const settings = await disclosureService.getDisclosureSettings(agentId);
      const fieldConfig = settings.fieldDisclosures.find(f => f.fieldName === fieldName);
      if (fieldConfig) {
        previousLevel = fieldConfig.level;
      }
    } catch {
      // Fall back to default config if settings not available
      const defaultField = DEFAULT_FIELD_DISCLOSURES.find(f => f.fieldName === fieldName);
      if (defaultField) {
        previousLevel = defaultField.level;
      }
    }

    // Revert to the field's defaultLevel (most restrictive override)
    const defaultField = DEFAULT_FIELD_DISCLOSURES.find(f => f.fieldName === fieldName);
    const newLevel = defaultField?.defaultLevel ?? DisclosureLevel.AFTER_REFERRAL;

    const record = await this.logDisclosureChange({
      agentId,
      fieldName,
      previousLevel,
      newLevel,
      changedBy: withdrawnBy,
    });

    await auditService.log({
      action: 'DISCLOSURE_WITHDRAWN',
      resource: 'disclosure',
      resourceId: agentId,
      userId: withdrawnBy,
      details: {
        fieldName,
        reason,
        withdrawnAt: new Date().toISOString(),
      },
    });

    // Notify users who previously had access
    await this.notifyWithdrawal(agentId, fieldName, withdrawnBy);

    return record;
  }

  /**
   * Check if a change should trigger notifications
   */
  private shouldNotifyChange(from: DisclosureLevel, to: DisclosureLevel): boolean {
    // Notify when disclosure level becomes more restrictive
    const levelOrder = {
      [DisclosureLevel.PUBLIC]: 0,
      [DisclosureLevel.AFTER_MATCH]: 1,
      [DisclosureLevel.AFTER_CHAT]: 2,
      [DisclosureLevel.AFTER_REFERRAL]: 3,
    };

    return levelOrder[to] > levelOrder[from];
  }

  /**
   * Notify users affected by a disclosure change
   */
  private async notifyAffectedUsers(record: DisclosureChangeRecord): Promise<void> {
    // In a full implementation, this would:
    // 1. Find all users who had access to this agent at the previous level
    // 2. Send notifications about the change
    // 3. Update the record to mark notification as sent

    console.log('[DisclosureAuditService] Notifying affected users for change:', record);

    // Update record to mark notification sent
    await this.markNotificationSent(record.id);
  }

  /**
   * Notify users about withdrawn information
   */
  private async notifyWithdrawal(
    agentId: string,
    fieldName: string,
    withdrawnBy: string
  ): Promise<void> {
    // In a full implementation, this would send notifications to users
    // who previously had access to this field

    console.log('[DisclosureAuditService] Notifying withdrawal:', {
      agentId,
      fieldName,
      withdrawnBy,
    });
  }

  /**
   * Mark a notification as sent
   */
  private async markNotificationSent(recordId: string): Promise<void> {
    await prisma.disclosureChange.update({
      where: { id: recordId },
      data: { notificationSent: true },
    });
  }

  /**
   * Save a change record to database
   */
  private async saveChangeRecord(record: DisclosureChangeRecord): Promise<void> {
    await prisma.disclosureChange.create({
      data: {
        id: record.id,
        agentId: record.agentId,
        fieldName: record.fieldName,
        previousLevel: record.previousLevel,
        newLevel: record.newLevel,
        changedBy: record.changedBy,
        changedAt: new Date(record.changedAt),
        notificationSent: record.notificationSent,
      },
    });
  }

  /**
   * Save an access entry to database
   */
  private async saveAccessEntry(entry: DisclosureAuditEntry): Promise<void> {
    await prisma.disclosureAccessLog.create({
      data: {
        id: entry.id,
        agentId: entry.agentId,
        fieldName: entry.fieldName,
        accessedBy: entry.accessedBy,
        ownerId: entry.ownerId,
        accessGranted: entry.accessGranted,
        timestamp: new Date(entry.timestamp),
        context: entry.context as any,
      },
    });
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `disclosure_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const disclosureAuditService = new DisclosureAuditService();
export default disclosureAuditService;
