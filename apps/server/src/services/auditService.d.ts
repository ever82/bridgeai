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
export declare function log(entry: AuditLogEntry): Promise<void>;
/**
 * Audit Service class
 */
export declare class AuditService {
    log(entry: AuditLogEntry): Promise<void>;
}
export declare const auditService: AuditService;
export default auditService;
//# sourceMappingURL=auditService.d.ts.map