/**
 * Disclosure Service
 *
 * Provides disclosure level calculation and access permission verification
 * for agent information disclosure control.
 */
import {
  DisclosureLevel,
  RelationshipStage,
  FieldDisclosure,
  AgentDisclosureSettings,
  DisclosureCheckResult,
  canDiscloseAtStage,
  getRequiredStage,
  createDefaultDisclosureSettings,
  DEFAULT_FIELD_DISCLOSURES,
  DISCLOSABLE_FIELDS,
} from '@bridgeai/shared';

import { prisma } from '../db/client';

import { auditService } from './auditService';
import { disclosureAuditService } from './disclosureAuditService';

/**
 * User relationship info
 */
interface UserRelationship {
  hasMatched: boolean;
  hasChatted: boolean;
  hasReferred: boolean;
  matchId?: string;
}

/**
 * Disclosure Service
 */
export class DisclosureService {
  /**
   * Get disclosure settings for an agent
   * Creates default settings if none exist
   */
  async getDisclosureSettings(agentId: string): Promise<AgentDisclosureSettings> {
    // Try to get existing settings from database
    const settings = await this.loadSettingsFromDB(agentId);
    if (settings) {
      return settings;
    }

    // Get agent info to create default settings
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { id: true, userId: true },
    });

    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Create and save default settings
    const defaultSettings = createDefaultDisclosureSettings(agentId, agent.userId);
    await this.saveSettingsToDB(defaultSettings);
    return defaultSettings;
  }

  /**
   * Update disclosure settings for an agent
   */
  async updateDisclosureSettings(
    agentId: string,
    updates: Partial<AgentDisclosureSettings>,
    changedBy: string
  ): Promise<AgentDisclosureSettings> {
    const currentSettings = await this.getDisclosureSettings(agentId);

    // Track changes for audit
    const changes: { fieldName: string; oldLevel: DisclosureLevel; newLevel: DisclosureLevel }[] = [];

    // Update field disclosures
    if (updates.fieldDisclosures) {
      for (const newField of updates.fieldDisclosures) {
        const existingField = currentSettings.fieldDisclosures.find(
          (f: FieldDisclosure) => f.fieldName === newField.fieldName
        );
        if (existingField && existingField.level !== newField.level) {
          changes.push({
            fieldName: newField.fieldName,
            oldLevel: existingField.level,
            newLevel: newField.level,
          });
        }
      }
      currentSettings.fieldDisclosures = updates.fieldDisclosures;
    }

    // Update other settings
    if (updates.defaultLevel !== undefined) {
      currentSettings.defaultLevel = updates.defaultLevel;
    }
    if (updates.strictMode !== undefined) {
      currentSettings.strictMode = updates.strictMode;
    }

    currentSettings.updatedAt = new Date().toISOString();

    // Save to database
    await this.saveSettingsToDB(currentSettings);

    // Log changes to audit
    for (const change of changes) {
      await disclosureAuditService.logDisclosureChange({
        agentId,
        fieldName: change.fieldName,
        previousLevel: change.oldLevel,
        newLevel: change.newLevel,
        changedBy,
      });
    }

    // Audit log
    await auditService.log({
      action: 'DISCLOSURE_SETTINGS_UPDATED',
      resource: 'disclosure_settings',
      resourceId: agentId,
      userId: changedBy,
      details: { fieldChanges: changes.length, changes },
    });

    return currentSettings;
  }

  /**
   * Check if a user can view a specific field of an agent
   * This is the core permission check function
   */
  async canViewField(
    agentId: string,
    fieldName: string,
    viewerId: string
  ): Promise<DisclosureCheckResult> {
    // Get disclosure settings
    const settings = await this.getDisclosureSettings(agentId);

    // Find field disclosure config
    const fieldConfig = settings.fieldDisclosures.find((f: FieldDisclosure) => f.fieldName === fieldName);

    // If field is not disclosable, deny access
    if (fieldConfig && !fieldConfig.isDisclosable) {
      return {
        canView: false,
        fieldLevel: fieldConfig.level,
        relationshipStage: RelationshipStage.NONE,
        denialReason: 'Field is not disclosable',
      };
    }

    // If in strict mode and field is not configured, deny
    if (settings.strictMode && !fieldConfig) {
      return {
        canView: false,
        fieldLevel: settings.defaultLevel,
        relationshipStage: RelationshipStage.NONE,
        denialReason: 'Field not configured in strict mode',
      };
    }

    // Get the required disclosure level for this field
    const requiredLevel = fieldConfig?.level || settings.defaultLevel;

    // Owner can always view their own fields
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { userId: true },
    });

    if (agent?.userId === viewerId) {
      const relationship = await this.getRelationshipStage(agent.userId, viewerId);
      return {
        canView: true,
        fieldLevel: requiredLevel,
        relationshipStage: relationship,
      };
    }

    // Get relationship stage between agent owner and viewer
    const relationshipStage = await this.getRelationshipStage(agent!.userId, viewerId);

    // Check if current relationship satisfies the required level
    const canView = canDiscloseAtStage(requiredLevel, relationshipStage);

    // Log the access attempt
    await disclosureAuditService.logAccessAttempt({
      agentId,
      fieldName,
      accessedBy: viewerId,
      ownerId: agent!.userId,
      accessGranted: canView,
    });

    return {
      canView,
      fieldLevel: requiredLevel,
      relationshipStage,
      denialReason: canView ? undefined : `Requires ${requiredLevel} level, current: ${relationshipStage}`,
    };
  }

  /**
   * Get the relationship stage between two users
   */
  async getRelationshipStage(userId: string, otherUserId: string): Promise<RelationshipStage> {
    if (userId === otherUserId) {
      return RelationshipStage.REFERRED; // Self has full access
    }

    const relationship = await this.getUserRelationship(userId, otherUserId);

    if (relationship.hasReferred) {
      return RelationshipStage.REFERRED;
    }
    if (relationship.hasChatted) {
      return RelationshipStage.CHATTED;
    }
    if (relationship.hasMatched) {
      return RelationshipStage.MATCHED;
    }
    return RelationshipStage.NONE;
  }

  /**
   * Get user relationship information
   */
  async getUserRelationship(userId: string, otherUserId: string): Promise<UserRelationship> {
    // Check for matches
    const match = await prisma.match.findFirst({
      where: {
        OR: [
          { userId, matchedUserId: otherUserId },
          { userId: otherUserId, matchedUserId: userId },
        ],
        status: 'ACTIVE' as any,
      } as any,
    });

    // Check for chats
    const chat = await (prisma as any).chat?.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      },
    });

    // Check for referrals
    const referral = await (prisma as any).referral?.findFirst({
      where: {
        OR: [
          { referrerId: userId, referredId: otherUserId },
          { referrerId: otherUserId, referredId: userId },
        ],
      },
    });

    return {
      hasMatched: !!match,
      hasChatted: !!chat,
      hasReferred: !!referral,
      matchId: match?.id,
    };
  }

  /**
   * Filter agent data based on disclosure permissions
   * Returns only fields the viewer is allowed to see
   */
  async filterAgentData(
    agentId: string,
    agentData: Record<string, unknown>,
    viewerId: string
  ): Promise<Record<string, unknown>> {
    const filtered: Record<string, unknown> = {};

    for (const [fieldName, value] of Object.entries(agentData)) {
      const check = await this.canViewField(agentId, fieldName, viewerId);
      if (check.canView) {
        filtered[fieldName] = value;
      }
    }

    return filtered;
  }

  /**
   * Update disclosure level for multiple fields (bulk update)
   */
  async bulkUpdateDisclosure(
    agentId: string,
    fieldUpdates: { fieldName: string; level: DisclosureLevel }[],
    changedBy: string,
    notifyAffectedUsers: boolean = false
  ): Promise<AgentDisclosureSettings> {
    const settings = await this.getDisclosureSettings(agentId);

    for (const update of fieldUpdates) {
      const existingField = settings.fieldDisclosures.find((f: FieldDisclosure) => f.fieldName === update.fieldName);

      if (existingField) {
        // Log the change
        await disclosureAuditService.logDisclosureChange({
          agentId,
          fieldName: update.fieldName,
          previousLevel: existingField.level,
          newLevel: update.level,
          changedBy,
        });
        existingField.level = update.level;
      } else {
        // Add new field disclosure
        settings.fieldDisclosures.push({
          fieldName: update.fieldName,
          level: update.level,
          isDisclosable: true,
          defaultLevel: update.level,
        });
      }
    }

    settings.updatedAt = new Date().toISOString();
    await this.saveSettingsToDB(settings);

    // Notify affected users if requested
    if (notifyAffectedUsers) {
      await this.notifyDisclosureChanges(agentId, fieldUpdates);
    }

    return settings;
  }

  /**
   * Reset disclosure settings to defaults
   */
  async resetToDefaults(agentId: string, changedBy: string): Promise<AgentDisclosureSettings> {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { userId: true },
    });

    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const defaultSettings = createDefaultDisclosureSettings(agentId, agent.userId);
    await this.saveSettingsToDB(defaultSettings);

    await auditService.log({
      action: 'DISCLOSURE_SETTINGS_RESET',
      resource: 'disclosure_settings',
      resourceId: agentId,
      userId: changedBy,
      details: { resetToDefaults: true },
    });

    return defaultSettings;
  }

  /**
   * Load disclosure settings from database
   */
  private async loadSettingsFromDB(agentId: string): Promise<AgentDisclosureSettings | null> {
    // This would typically query a disclosure_settings table
    // For now, we'll return null to trigger default creation
    // In a full implementation, this would be:
    /*
    const record = await prisma.disclosureSettings.findUnique({
      where: { agentId },
    });
    if (record) {
      return {
        agentId: record.agentId,
        userId: record.userId,
        fieldDisclosures: record.fieldDisclosures as FieldDisclosure[],
        defaultLevel: record.defaultLevel as DisclosureLevel,
        strictMode: record.strictMode,
        updatedAt: record.updatedAt.toISOString(),
        createdAt: record.createdAt.toISOString(),
      };
    }
    */
    return null;
  }

  /**
   * Save disclosure settings to database
   */
  private async saveSettingsToDB(settings: AgentDisclosureSettings): Promise<void> {
    // This would typically upsert to a disclosure_settings table
    // In a full implementation, this would be:
    /*
    await prisma.disclosureSettings.upsert({
      where: { agentId: settings.agentId },
      update: {
        fieldDisclosures: settings.fieldDisclosures,
        defaultLevel: settings.defaultLevel,
        strictMode: settings.strictMode,
        updatedAt: new Date(),
      },
      create: {
        agentId: settings.agentId,
        userId: settings.userId,
        fieldDisclosures: settings.fieldDisclosures,
        defaultLevel: settings.defaultLevel,
        strictMode: settings.strictMode,
      },
    });
    */
    console.log('[DisclosureService] Settings saved for agent:', settings.agentId);
  }

  /**
   * Notify users affected by disclosure changes
   */
  private async notifyDisclosureChanges(
    agentId: string,
    changes: { fieldName: string; level: DisclosureLevel }[]
  ): Promise<void> {
    // This would send notifications to users who have access to this agent
    // In a full implementation, this would:
    // 1. Find all users who can view this agent
    // 2. Send push notifications or in-app notifications
    // 3. Create notification records in the database
    console.log('[DisclosureService] Notifying affected users for agent:', agentId, changes);
  }
}

// Export singleton instance
export const disclosureService = new DisclosureService();
export default disclosureService;
