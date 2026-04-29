import { prisma } from '../db/client';
/**
 * Log an audit event
 */
export async function log(entry) {
    const data = {
        userId: entry.userId,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        details: entry.details,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        timestamp: entry.timestamp || new Date(),
    };
    await prisma.auditLog.create({ data });
}
/**
 * Audit Service class
 */
export class AuditService {
    async log(entry) {
        return log(entry);
    }
}
export const auditService = new AuditService();
export default auditService;
//# sourceMappingURL=auditService.js.map