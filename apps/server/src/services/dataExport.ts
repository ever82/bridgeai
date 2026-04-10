import crypto from 'crypto';
import { encrypt } from '../utils/encryption';
import { maskObject } from '../utils/mask';
import { PIIField, piiManager, PIIPermission } from '../models/user';

export interface DataExportRequest {
  userId: string;
  dataTypes: ('profile' | 'messages' | 'transactions' | 'logs')[];
  format: 'json' | 'csv';
  encrypted: boolean;
}

export interface DataExportResult {
  exportId: string;
  userId: string;
  exportedAt: Date;
  expiresAt: Date;
  downloadUrl: string;
  checksum: string;
  encrypted: boolean;
}

class DataExportService {
  private exportLog: Map<string, DataExportResult> = new Map();

  async exportUserData(request: DataExportRequest): Promise<DataExportResult> {
    const exportId = crypto.randomUUID();
    const exportedAt = new Date();
    const expiresAt = new Date(exportedAt.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Gather user data (this would normally query the database)
    const userData = await this.gatherUserData(request.userId, request.dataTypes);

    // Mask sensitive data for export
    const maskedData = maskObject(userData);

    // Convert to requested format
    let exportContent: string;
    if (request.format === 'json') {
      exportContent = JSON.stringify(maskedData, null, 2);
    } else {
      exportContent = this.convertToCSV(maskedData);
    }

    // Encrypt if requested
    let finalContent = exportContent;
    if (request.encrypted) {
      const encrypted = await encrypt(exportContent);
      finalContent = JSON.stringify(encrypted);
    }

    // Generate checksum for integrity verification
    const checksum = crypto.createHash('sha256').update(finalContent).digest('hex');

    // Store export (in production, this would upload to secure storage)
    const result: DataExportResult = {
      exportId,
      userId: request.userId,
      exportedAt,
      expiresAt,
      downloadUrl: `/api/exports/${exportId}`,
      checksum,
      encrypted: request.encrypted,
    };

    this.exportLog.set(exportId, result);

    // Log the export for compliance
    this.logExport(result, request);

    return result;
  }

  private async gatherUserData(
    userId: string,
    dataTypes: ('profile' | 'messages' | 'transactions' | 'logs')[]
  ): Promise<Record<string, any>> {
    const data: Record<string, any> = { userId, exportDate: new Date().toISOString() };

    for (const type of dataTypes) {
      switch (type) {
        case 'profile':
          data.profile = await this.getProfileData(userId);
          break;
        case 'messages':
          data.messages = await this.getMessageData(userId);
          break;
        case 'transactions':
          data.transactions = await this.getTransactionData(userId);
          break;
        case 'logs':
          data.logs = await this.getLogData(userId);
          break;
      }
    }

    return data;
  }

  private async getProfileData(userId: string): Promise<Record<string, any>> {
    // In production, this would query the database
    return {
      userId,
      username: 'user123',
      email: 'user@example.com',
      phone: '13812345678',
      createdAt: '2024-01-01T00:00:00Z',
      lastLogin: '2024-04-10T12:00:00Z',
    };
  }

  private async getMessageData(userId: string): Promise<Record<string, any>[]> {
    return [
      { id: 'msg1', content: 'Hello', sentAt: '2024-04-10T10:00:00Z' },
      { id: 'msg2', content: 'World', sentAt: '2024-04-10T10:01:00Z' },
    ];
  }

  private async getTransactionData(userId: string): Promise<Record<string, any>[]> {
    return [
      { id: 'tx1', amount: 100, currency: 'CNY', timestamp: '2024-04-09T15:30:00Z' },
    ];
  }

  private async getLogData(userId: string): Promise<Record<string, any>[]> {
    return [
      { action: 'login', timestamp: '2024-04-10T12:00:00Z', ip: '192.168.1.1' },
    ];
  }

  private convertToCSV(data: Record<string, any>): string {
    // Simple CSV conversion for demonstration
    const rows: string[] = [];

    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value)) {
        rows.push(`${key}:`);
        value.forEach((item, index) => {
          rows.push(`  [${index}] ${JSON.stringify(item)}`);
        });
      } else {
        rows.push(`${key}: ${JSON.stringify(value)}`);
      }
    }

    return rows.join('\n');
  }

  private logExport(result: DataExportResult, request: DataExportRequest): void {
    console.log('[DATA_EXPORT]', {
      exportId: result.exportId,
      userId: result.userId,
      dataTypes: request.dataTypes,
      encrypted: result.encrypted,
      exportedAt: result.exportedAt,
    });
  }

  getExportHistory(userId: string): DataExportResult[] {
    return Array.from(this.exportLog.values())
      .filter(export_ => export_.userId === userId)
      .sort((a, b) => b.exportedAt.getTime() - a.exportedAt.getTime());
  }

  validateExportAccess(userId: string, role: string): boolean {
    return piiManager.canAccess(PIIField.PHONE, role, PIIPermission.EXPORT);
  }
}

export const dataExportService = new DataExportService();
