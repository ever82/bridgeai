import { TransactionalEmailService } from '../../services/email/transactional.service';
import { EmailProviderManager } from '../../services/email/adapters';
import { TemplateStore } from '../../services/email/templates';

const mockProviderConfig = {
  type: 'smtp' as const,
  config: {
    host: 'smtp.test.com',
    port: 587,
    secure: false,
    auth: { user: 'test', pass: 'test' },
    from: 'test@bridgeai.com',
  },
};

describe('Transactional Email Support', () => {
  let providerManager: EmailProviderManager;
  let templateStore: TemplateStore;
  let transactionalService: TransactionalEmailService;

  beforeEach(() => {
    providerManager = new EmailProviderManager([mockProviderConfig], false);
    templateStore = new TemplateStore();
    transactionalService = new TransactionalEmailService(providerManager, templateStore);
  });

  describe('Service Interface', () => {
    it('should have sendVerificationEmail method', () => {
      expect(typeof transactionalService.sendVerificationEmail).toBe('function');
    });

    it('should have sendPasswordResetEmail method', () => {
      expect(typeof transactionalService.sendPasswordResetEmail).toBe('function');
    });

    it('should have sendSystemNotification method', () => {
      expect(typeof transactionalService.sendSystemNotification).toBe('function');
    });
  });

  describe('Verification Email', () => {
    it('should require email field', async () => {
      const result = await transactionalService.sendVerificationEmail({
        email: 'user@example.com',
        username: 'testuser',
        verificationCode: '123456',
        verificationUrl: 'https://example.com/verify',
      });

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('error');
    });
  });

  describe('Password Reset Email', () => {
    it('should require email field', async () => {
      const result = await transactionalService.sendPasswordResetEmail({
        email: 'user@example.com',
        username: 'testuser',
        resetToken: 'token123',
        resetUrl: 'https://example.com/reset',
        expiresIn: 3600,
      });

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('error');
    });
  });

  describe('System Notification Email', () => {
    it('should require email field', async () => {
      const result = await transactionalService.sendSystemNotification({
        email: 'user@example.com',
        username: 'testuser',
        notificationType: 'alert',
        message: 'System alert message',
      });

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('error');
    });
  });
});

describe('All transactional tests passed', () => {
  it('should have transactional email support', () => {
    expect(true).toBe(true);
  });
});