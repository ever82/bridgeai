import { EmailProviderManager } from './adapters';
import { TemplateStore } from './templates';
export type TransactionalEmailType = 'verification' | 'password_reset' | 'system_notification';
export interface VerificationEmailData {
    email: string;
    username: string;
    verificationCode: string;
    verificationUrl: string;
}
export interface PasswordResetEmailData {
    email: string;
    username: string;
    resetToken: string;
    resetUrl: string;
    expiresIn: number;
}
export interface SystemNotificationEmailData {
    email: string;
    username: string;
    notificationType: string;
    message: string;
    actionUrl?: string;
}
export declare class TransactionalEmailService {
    private providerManager;
    private templateStore;
    constructor(providerManager: EmailProviderManager, templateStore: TemplateStore);
    sendVerificationEmail(data: VerificationEmailData): Promise<{
        success: boolean;
        error?: string;
    }>;
    sendPasswordResetEmail(data: PasswordResetEmailData): Promise<{
        success: boolean;
        error?: string;
    }>;
    sendSystemNotification(data: SystemNotificationEmailData): Promise<{
        success: boolean;
        error?: string;
    }>;
}
//# sourceMappingURL=transactional.service.d.ts.map