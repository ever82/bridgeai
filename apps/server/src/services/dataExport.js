import crypto from 'crypto';
import { encrypt } from '../utils/encryption';
import { maskObject } from '../utils/mask';
import { PIIField, piiManager, PIIPermission } from '../models/user';
class DataExportService {
    exportLog = new Map();
    async exportUserData(request) {
        const exportId = crypto.randomUUID();
        const exportedAt = new Date();
        const expiresAt = new Date(exportedAt.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
        // Gather user data (this would normally query the database)
        const userData = await this.gatherUserData(request.userId, request.dataTypes);
        // Mask sensitive data for export
        const maskedData = maskObject(userData);
        // Convert to requested format
        let exportContent;
        if (request.format === 'json') {
            exportContent = JSON.stringify(maskedData, null, 2);
        }
        else {
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
        const result = {
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
    async gatherUserData(userId, dataTypes) {
        const data = { userId, exportDate: new Date().toISOString() };
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
    async getProfileData(userId) {
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
    async getMessageData(userId) {
        return [
            { id: 'msg1', content: 'Hello', sentAt: '2024-04-10T10:00:00Z' },
            { id: 'msg2', content: 'World', sentAt: '2024-04-10T10:01:00Z' },
        ];
    }
    async getTransactionData(userId) {
        return [
            { id: 'tx1', amount: 100, currency: 'CNY', timestamp: '2024-04-09T15:30:00Z' },
        ];
    }
    async getLogData(userId) {
        return [
            { action: 'login', timestamp: '2024-04-10T12:00:00Z', ip: '192.168.1.1' },
        ];
    }
    convertToCSV(data) {
        // Simple CSV conversion for demonstration
        const rows = [];
        for (const [key, value] of Object.entries(data)) {
            if (Array.isArray(value)) {
                rows.push(`${key}:`);
                value.forEach((item, index) => {
                    rows.push(`  [${index}] ${JSON.stringify(item)}`);
                });
            }
            else {
                rows.push(`${key}: ${JSON.stringify(value)}`);
            }
        }
        return rows.join('\n');
    }
    logExport(result, request) {
        console.log('[DATA_EXPORT]', {
            exportId: result.exportId,
            userId: result.userId,
            dataTypes: request.dataTypes,
            encrypted: result.encrypted,
            exportedAt: result.exportedAt,
        });
    }
    getExportHistory(userId) {
        return Array.from(this.exportLog.values())
            .filter(export_ => export_.userId === userId)
            .sort((a, b) => b.exportedAt.getTime() - a.exportedAt.getTime());
    }
    validateExportAccess(userId, role) {
        return piiManager.canAccess(PIIField.PHONE, role, PIIPermission.EXPORT);
    }
}
export const dataExportService = new DataExportService();
//# sourceMappingURL=dataExport.js.map