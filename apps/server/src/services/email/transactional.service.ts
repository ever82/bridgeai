import { EmailProviderManager } from '../adapters';
import { TemplateStore, TemplateVariable } from '../templates';
import { EmailMessage } from '../adapters/base.interface';

export type TransactionalEmailType =
  | 'verification'
  | 'password_reset'
  | 'system_notification';

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

export class TransactionalEmailService {
  private providerManager: EmailProviderManager;
  private templateStore: TemplateStore;

  constructor(providerManager: EmailProviderManager, templateStore: TemplateStore) {
    this.providerManager = providerManager;
    this.templateStore = templateStore;
  }

  async sendVerificationEmail(data: VerificationEmailData): Promise<{ success: boolean; error?: string }> {
    const variables: TemplateVariable[] = [
      { key: 'username', value: data.username },
      { key: 'verificationCode', value: data.verificationCode },
      { key: 'verificationUrl', value: data.verificationUrl },
    ];

    const rendered = await this.templateStore.render('verification', variables);
    if (!rendered) {
      return { success: false, error: 'Verification template not found' };
    }

    const message: EmailMessage = {
      to: data.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      trackOpens: true,
    };

    const result = await this.providerManager.send(message);
    return { success: result.success, error: result.error };
  }

  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<{ success: boolean; error?: string }> {
    const variables: TemplateVariable[] = [
      { key: 'username', value: data.username },
      { key: 'resetToken', value: data.resetToken },
      { key: 'resetUrl', value: data.resetUrl },
      { key: 'expiresIn', value: `${data.expiresIn / 60} minutes` },
    ];

    const rendered = await this.templateStore.render('password_reset', variables);
    if (!rendered) {
      return { success: false, error: 'Password reset template not found' };
    }

    const message: EmailMessage = {
      to: data.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      trackOpens: true,
    };

    const result = await this.providerManager.send(message);
    return { success: result.success, error: result.error };
  }

  async sendSystemNotification(data: SystemNotificationEmailData): Promise<{ success: boolean; error?: string }> {
    const variables: TemplateVariable[] = [
      { key: 'username', value: data.username },
      { key: 'notificationType', value: data.notificationType },
      { key: 'message', value: data.message },
      { key: 'actionUrl', value: data.actionUrl || '' },
    ];

    const rendered = await this.templateStore.render('system_notification', variables);
    if (!rendered) {
      return { success: false, error: 'System notification template not found' };
    }

    const message: EmailMessage = {
      to: data.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    };

    const result = await this.providerManager.send(message);
    return { success: result.success, error: result.error };
  }
}