import { maskLogMessage, maskObject } from '../utils/mask';
import { logger } from '../utils/logger';

interface LogEntry {
  level: string;
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class SecureLogger {
  private static instance: SecureLogger;
  private auditEnabled: boolean = true;

  private constructor() {}

  static getInstance(): SecureLogger {
    if (!SecureLogger.instance) {
      SecureLogger.instance = new SecureLogger();
    }
    return SecureLogger.instance;
  }

  private sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
    if (!metadata) return undefined;
    return maskObject(metadata);
  }

  log(level: string, message: string, metadata?: Record<string, any>): void {
    const sanitizedMessage = maskLogMessage(message);
    const sanitizedMetadata = this.sanitizeMetadata(metadata);

    const entry: LogEntry = {
      level,
      message: sanitizedMessage,
      timestamp: new Date(),
      metadata: sanitizedMetadata,
    };

    // Output to structured logger
    logger.info(entry.message, entry);
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.log('info', message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.log('warn', message, metadata);
  }

  error(message: string, metadata?: Record<string, any>): void {
    this.log('error', message, metadata);
  }

  debug(message: string, metadata?: Record<string, any>): void {
    this.log('debug', message, metadata);
  }

  audit(action: string, details: Record<string, any>): void {
    if (!this.auditEnabled) return;

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
