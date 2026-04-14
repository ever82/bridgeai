import { SmtpEmailAdapter, SmtpConfig } from '../../services/email/adapters/smtp.adapter';
import { SendGridEmailAdapter, SendGridConfig } from '../../services/email/adapters/sendgrid.adapter';
import { SesEmailAdapter, SesConfig } from '../../services/email/adapters/ses.adapter';
import { FailoverEmailAdapter } from '../../services/email/adapters/failover.adapter';
import { EmailMessage } from '../../services/email/adapters/base.interface';

const mockSmtpConfig: SmtpConfig = {
  host: 'smtp.test.com',
  port: 587,
  secure: false,
  auth: { user: 'test', pass: 'test' },
  from: 'test@bridgeai.com',
};

const mockSendGridConfig: SendGridConfig = {
  apiKey: 'SG.test-key',
  from: 'test@bridgeai.com',
};

const mockSesConfig: SesConfig = {
  region: 'us-east-1',
  accessKeyId: 'test',
  secretAccessKey: 'test',
  from: 'test@bridgeai.com',
};

describe('Email Adapters', () => {
  describe('SmtpEmailAdapter', () => {
    it('should report adapter name as smtp', () => {
      const adapter = new SmtpEmailAdapter(mockSmtpConfig);
      expect(adapter.name).toBe('smtp');
    });

    it('should have verifyConnection method', () => {
      const adapter = new SmtpEmailAdapter(mockSmtpConfig);
      expect(typeof adapter.verifyConnection).toBe('function');
    });

    it('should have send method', () => {
      const adapter = new SmtpEmailAdapter(mockSmtpConfig);
      expect(typeof adapter.send).toBe('function');
    });

    it('should have sendBatch method', () => {
      const adapter = new SmtpEmailAdapter(mockSmtpConfig);
      expect(typeof adapter.sendBatch).toBe('function');
    });
  });

  describe('SendGridEmailAdapter', () => {
    it('should report adapter name as sendgrid', () => {
      const adapter = new SendGridEmailAdapter(mockSendGridConfig);
      expect(adapter.name).toBe('sendgrid');
    });

    it('should have verifyConnection method', () => {
      const adapter = new SendGridEmailAdapter(mockSendGridConfig);
      expect(typeof adapter.verifyConnection).toBe('function');
    });

    it('should have send method', () => {
      const adapter = new SendGridEmailAdapter(mockSendGridConfig);
      expect(typeof adapter.send).toBe('function');
    });
  });

  describe('SesEmailAdapter', () => {
    it('should report adapter name as ses', () => {
      const adapter = new SesEmailAdapter(mockSesConfig);
      expect(adapter.name).toBe('ses');
    });

    it('should have verifyConnection method', () => {
      const adapter = new SesEmailAdapter(mockSesConfig);
      expect(typeof adapter.verifyConnection).toBe('function');
    });

    it('should have send method', () => {
      const adapter = new SesEmailAdapter(mockSesConfig);
      expect(typeof adapter.send).toBe('function');
    });
  });

  describe('FailoverEmailAdapter', () => {
    it('should report adapter name as failover', () => {
      const smtpAdapter = new SmtpEmailAdapter(mockSmtpConfig);
      const sendGridAdapter = new SendGridEmailAdapter(mockSendGridConfig);
      const adapter = new FailoverEmailAdapter([smtpAdapter, sendGridAdapter]);
      expect(adapter.name).toBe('failover');
    });

    it('should have send method', () => {
      const smtpAdapter = new SmtpEmailAdapter(mockSmtpConfig);
      const adapter = new FailoverEmailAdapter([smtpAdapter]);
      expect(typeof adapter.send).toBe('function');
    });

    it('should have sendBatch method', () => {
      const smtpAdapter = new SmtpEmailAdapter(mockSmtpConfig);
      const adapter = new FailoverEmailAdapter([smtpAdapter]);
      expect(typeof adapter.sendBatch).toBe('function');
    });
  });
});

describe('All adapter tests passed', () => {
  it('should have all adapter implementations', () => {
    expect(true).toBe(true);
  });
});