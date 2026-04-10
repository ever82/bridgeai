import crypto from 'crypto';

export interface DataDeletionRequest {
  userId: string;
  reason: 'user_request' | 'data_retention' | 'legal_requirement' | 'fraud';
  verificationMethod: 'email' | 'sms' | 'mfa';
  verified: boolean;
  deleteOptions?: {
    keepTransactions?: boolean;
    anonymizeInstead?: boolean;
    gracePeriodDays?: number;
  };
}

export interface DataDeletionResult {
  deletionId: string;
  userId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  requestedAt: Date;
  scheduledAt?: Date;
  completedAt?: Date;
  itemsDeleted: number;
  itemsAnonymized: number;
  proofOfDeletion?: string;
}

export interface GDPRRequest {
  userId: string;
  type: 'access' | 'deletion' | 'portability' | 'rectification' | 'restriction';
  details: Record<string, any>;
}

class GDPRService {
  private deletionLog: Map<string, DataDeletionResult> = new Map();
  private pendingDeletions: Map<string, NodeJS.Timeout> = new Map();

  async requestDataDeletion(request: DataDeletionRequest): Promise<DataDeletionResult> {
    const deletionId = crypto.randomUUID();
    const requestedAt = new Date();

    // Schedule deletion after grace period (default 30 days)
    const gracePeriodDays = request.deleteOptions?.gracePeriodDays ?? 30;
    const scheduledAt = new Date(requestedAt.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000);

    const result: DataDeletionResult = {
      deletionId,
      userId: request.userId,
      status: 'pending',
      requestedAt,
      scheduledAt,
      itemsDeleted: 0,
      itemsAnonymized: 0,
    };

    this.deletionLog.set(deletionId, result);

    // Schedule the actual deletion
    const timeoutId = setTimeout(() => {
      this.executeDeletion(deletionId, request);
    }, gracePeriodDays * 24 * 60 * 60 * 1000);

    this.pendingDeletions.set(deletionId, timeoutId);

    // Log the request
    this.logGDPRRequest('deletion_request', {
      deletionId,
      userId: request.userId,
      reason: request.reason,
      scheduledAt,
    });

    return result;
  }

  private async executeDeletion(
    deletionId: string,
    request: DataDeletionRequest
  ): Promise<void> {
    const result = this.deletionLog.get(deletionId);
    if (!result) return;

    result.status = 'in_progress';

    try {
      const options = request.deleteOptions || {};

      // Delete or anonymize user data
      if (options.anonymizeInstead) {
        result.itemsAnonymized = await this.anonymizeUserData(request.userId);
      } else {
        result.itemsDeleted = await this.deleteUserData(request.userId, options.keepTransactions);
      }

      // Generate proof of deletion
      result.proofOfDeletion = this.generateProofOfDeletion(deletionId, request.userId);
      result.status = 'completed';
      result.completedAt = new Date();

      this.logGDPRRequest('deletion_completed', {
        deletionId,
        userId: request.userId,
        itemsDeleted: result.itemsDeleted,
        itemsAnonymized: result.itemsAnonymized,
      });
    } catch (error) {
      result.status = 'failed';
      console.error(`Data deletion failed for ${deletionId}:`, error);
    }

    this.pendingDeletions.delete(deletionId);
  }

  private async deleteUserData(userId: string, keepTransactions?: boolean): Promise<number> {
    // In production, this would delete from database
    let deletedCount = 0;

    // Delete user profile
    console.log(`Deleting profile for user ${userId}`);
    deletedCount++;

    // Delete messages
    console.log(`Deleting messages for user ${userId}`);
    deletedCount += 10; // Example count

    // Delete sessions
    console.log(`Deleting sessions for user ${userId}`);
    deletedCount++;

    // Optionally keep transaction records for legal compliance
    if (!keepTransactions) {
      console.log(`Deleting transactions for user ${userId}`);
      deletedCount += 5;
    }

    // Delete activity logs
    console.log(`Deleting activity logs for user ${userId}`);
    deletedCount += 20;

    return deletedCount;
  }

  private async anonymizeUserData(userId: string): Promise<number> {
    // In production, this would anonymize data instead of deleting
    const anonymizedId = `anon_${crypto.randomBytes(8).toString('hex')}`;
    console.log(`Anonymizing user ${userId} to ${anonymizedId}`);
    return 15; // Example count
  }

  private generateProofOfDeletion(deletionId: string, userId: string): string {
    const timestamp = new Date().toISOString();
    const data = `${deletionId}:${userId}:${timestamp}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  async cancelDeletion(deletionId: string): Promise<boolean> {
    const timeoutId = this.pendingDeletions.get(deletionId);
    if (!timeoutId) return false;

    clearTimeout(timeoutId);
    this.pendingDeletions.delete(deletionId);

    const result = this.deletionLog.get(deletionId);
    if (result) {
      result.status = 'failed';
      this.logGDPRRequest('deletion_cancelled', {
        deletionId,
        userId: result.userId,
      });
    }

    return true;
  }

  async processGDPRRequest(request: GDPRRequest): Promise<Record<string, any>> {
    this.logGDPRRequest(request.type, {
      userId: request.userId,
      details: request.details,
    });

    switch (request.type) {
      case 'access':
        return this.handleAccessRequest(request.userId);
      case 'portability':
        return this.handlePortabilityRequest(request.userId);
      case 'rectification':
        return this.handleRectificationRequest(request.userId, request.details);
      case 'restriction':
        return this.handleRestrictionRequest(request.userId, request.details);
      default:
        throw new Error(`Unknown GDPR request type: ${request.type}`);
    }
  }

  private async handleAccessRequest(userId: string): Promise<Record<string, any>> {
    // Gather all data about the user
    return {
      userId,
      processedAt: new Date().toISOString(),
      data: {
        profile: {},
        messages: [],
        transactions: [],
        logs: [],
      },
    };
  }

  private async handlePortabilityRequest(userId: string): Promise<Record<string, any>> {
    // Export data in portable format
    return {
      userId,
      exportedAt: new Date().toISOString(),
      format: 'json',
      downloadUrl: `/api/gdpr/portability/${userId}`,
    };
  }

  private async handleRectificationRequest(
    userId: string,
    details: Record<string, any>
  ): Promise<Record<string, any>> {
    // Update user data
    return {
      userId,
      updatedAt: new Date().toISOString(),
      fields: Object.keys(details),
    };
  }

  private async handleRestrictionRequest(
    userId: string,
    details: Record<string, any>
  ): Promise<Record<string, any>> {
    // Restrict processing of user data
    return {
      userId,
      restrictedAt: new Date().toISOString(),
      restrictions: details.restrictions || [],
    };
  }

  private logGDPRRequest(action: string, details: Record<string, any>): void {
    console.log('[GDPR]', {
      action,
      timestamp: new Date().toISOString(),
      ...details,
    });
  }

  getDeletionStatus(deletionId: string): DataDeletionResult | undefined {
    return this.deletionLog.get(deletionId);
  }

  getUserDeletionHistory(userId: string): DataDeletionResult[] {
    return Array.from(this.deletionLog.values())
      .filter(result => result.userId === userId)
      .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
  }
}

export const gdprService = new GDPRService();
