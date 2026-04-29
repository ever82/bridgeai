import { maskLogMessage, maskObject } from '../utils/mask';
import { logger } from '../utils/logger';
export class SecureLogger {
    static instance;
    auditEnabled = true;
    constructor() { }
    static getInstance() {
        if (!SecureLogger.instance) {
            SecureLogger.instance = new SecureLogger();
        }
        return SecureLogger.instance;
    }
    sanitizeMetadata(metadata) {
        if (!metadata)
            return undefined;
        return maskObject(metadata);
    }
    log(level, message, metadata) {
        const sanitizedMessage = maskLogMessage(message);
        const sanitizedMetadata = this.sanitizeMetadata(metadata);
        const entry = {
            level,
            message: sanitizedMessage,
            timestamp: new Date(),
            metadata: sanitizedMetadata,
        };
        // Output to structured logger
        logger.info(entry.message, entry);
    }
    info(message, metadata) {
        this.log('info', message, metadata);
    }
    warn(message, metadata) {
        this.log('warn', message, metadata);
    }
    error(message, metadata) {
        this.log('error', message, metadata);
    }
    debug(message, metadata) {
        this.log('debug', message, metadata);
    }
    audit(action, details) {
        if (!this.auditEnabled)
            return;
        const entry = {
            level: 'audit',
            action,
            details: this.sanitizeMetadata(details),
            timestamp: new Date(),
        };
        logger.info(`[AUDIT] ${entry.action}`, entry);
    }
}
export const secureLogger = SecureLogger.getInstance();
//# sourceMappingURL=logging.js.map