/**
 * Audit Service
 *
 * Provides audit logging for security events.
 */
import { prisma } from '../db/client';

export interface AuditLogEntry {
  action: string;
  resource: string;
  resourceId?: string;
  userId?: string;
  details?: Record<string, unknown>;
  timestamp?: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an audit event
 */
export async function log(entry: AuditLogEntry): Promise<void> {
  const logEntry = {
    userId: entry.userId,
    action: entry.action,
    resource: entry.resource,
    resourceId: entry.resourceId,
    details: entry.details,
    ipAddress: entry.ipAddress,
    userAgent: entry.userAgent,
    timestamp: entry.timestamp || new Date(),
  };

  await prisma.auditLog.create({ data: logEntry });
}

/**
 * Audit Service class
 */
export class AuditService {
  async log(entry: AuditLogEntry): Promise<void> {
    return log(entry);
  }
}

export const auditService = new AuditService();
export default auditService;
