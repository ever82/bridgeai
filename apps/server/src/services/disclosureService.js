/**
 * Disclosure Service
 *
 * Provides disclosure level calculation and access permission verification
 * for agent information disclosure control.
 */
import { RelationshipStage, canDiscloseAtStage, createDefaultDisclosureSettings, } from '@bridgeai/shared';
import { prisma } from '../db/client';
import { logger } from '../utils/logger';
import { auditService } from './auditService';
import { disclosureAuditService } from './disclosureAuditService';
/**
 * Disclosure Service
 */
export class DisclosureService {
    /**
     * Get disclosure settings for an agent
     * Creates default settings if none exist
     */
    async getDisclosureSettings(agentId) {
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
    async updateDisclosureSettings(agentId, updates, changedBy) {
        const currentSettings = await this.getDisclosureSettings(agentId);
        // Track changes for audit
        const changes = [];
        // Update field disclosures
        if (updates.fieldDisclosures) {
            for (const newField of updates.fieldDisclosures) {
                const existingField = currentSettings.fieldDisclosures.find((f) => f.fieldName === newField.fieldName);
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
    async canViewField(agentId, fieldName, viewerId) {
        // Get disclosure settings
        const settings = await this.getDisclosureSettings(agentId);
        // Find field disclosure config
        const fieldConfig = settings.fieldDisclosures.find((f) => f.fieldName === fieldName);
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
        const relationshipStage = await this.getRelationshipStage(agent.userId, viewerId);
        // Check if current relationship satisfies the required level
        const canView = canDiscloseAtStage(requiredLevel, relationshipStage);
        // Log the access attempt
        await disclosureAuditService.logAccessAttempt({
            agentId,
            fieldName,
            accessedBy: viewerId,
            ownerId: agent.userId,
            accessGranted: canView,
        });
        return {
            canView,
            fieldLevel: requiredLevel,
            relationshipStage,
            denialReason: canView
                ? undefined
                : `Requires ${requiredLevel} level, current: ${relationshipStage}`,
        };
    }
    /**
     * Get the relationship stage between two users
     */
    async getRelationshipStage(userId, otherUserId) {
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
    async getUserRelationship(userId, otherUserId) {
        // Find matches where one user's agent has a demand and the other has a supply (or vice versa)
        const match = await prisma.match.findFirst({
            where: {
                status: { in: ['ACCEPTED', 'COMPLETED'] },
                OR: [
                    {
                        demand: { agent: { userId } },
                        supply: { agent: { userId: otherUserId } },
                    },
                    {
                        demand: { agent: { userId: otherUserId } },
                        supply: { agent: { userId } },
                    },
                ],
            },
        });
        let hasChatted = false;
        if (match) {
            // Check if a conversation exists for this match with messages from both users
            const conversation = await prisma.conversation.findUnique({
                where: { matchId: match.id },
            });
            if (conversation) {
                const messageCount = await prisma.message.count({
                    where: {
                        conversationId: conversation.id,
                        senderId: { in: [userId, otherUserId] },
                    },
                });
                hasChatted = messageCount > 0;
            }
        }
        return {
            hasMatched: !!match,
            hasChatted,
            hasReferred: false, // No referral model exists yet
            matchId: match?.id,
        };
    }
    /**
     * Filter agent data based on disclosure permissions
     * Returns only fields the viewer is allowed to see
     */
    async filterAgentData(agentId, agentData, viewerId) {
        const filtered = {};
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
    async bulkUpdateDisclosure(agentId, fieldUpdates, changedBy, notifyAffectedUsers = false) {
        const settings = await this.getDisclosureSettings(agentId);
        for (const update of fieldUpdates) {
            const existingField = settings.fieldDisclosures.find((f) => f.fieldName === update.fieldName);
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
            }
            else {
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
    async resetToDefaults(agentId, changedBy) {
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
    async loadSettingsFromDB(agentId) {
        const record = await prisma.disclosureSettings.findUnique({
            where: { agentId },
        });
        if (record) {
            return {
                agentId: record.agentId,
                userId: record.userId,
                fieldDisclosures: record.fieldDisclosures,
                defaultLevel: record.defaultLevel,
                strictMode: record.strictMode,
                updatedAt: record.updatedAt.toISOString(),
                createdAt: record.createdAt.toISOString(),
            };
        }
        return null;
    }
    /**
     * Save disclosure settings to database
     */
    async saveSettingsToDB(settings) {
        await prisma.disclosureSettings.upsert({
            where: { agentId: settings.agentId },
            update: {
                fieldDisclosures: settings.fieldDisclosures,
                defaultLevel: settings.defaultLevel,
                strictMode: settings.strictMode,
            },
            create: {
                agentId: settings.agentId,
                userId: settings.userId,
                fieldDisclosures: settings.fieldDisclosures,
                defaultLevel: settings.defaultLevel,
                strictMode: settings.strictMode,
            },
        });
    }
    /**
     * Notify users affected by disclosure changes
     */
    async notifyDisclosureChanges(agentId, changes) {
        // This would send notifications to users who have access to this agent
        // In a full implementation, this would:
        // 1. Find all users who can view this agent
        // 2. Send push notifications or in-app notifications
        // 3. Create notification records in the database
        logger.info('Notifying affected users for disclosure changes', { agentId, changes });
    }
}
// Export singleton instance
export const disclosureService = new DisclosureService();
export default disclosureService;
//# sourceMappingURL=disclosureService.js.map