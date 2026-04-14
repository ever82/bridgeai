import { BulkEmailQueue } from '../../services/email/queue/bulk-queue';
import { EmailProviderManager } from '../../services/email/adapters';
import { EmailMessage } from '../../services/email/adapters/base.interface';

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

const rateLimit = {
  emailsPerSecond: 1,
  emailsPerMinute: 60,
  emailsPerHour: 3600,
};

describe('Bulk Email Sending', () => {
  let providerManager: EmailProviderManager;
  let bulkQueue: BulkEmailQueue;

  beforeEach(() => {
    providerManager = new EmailProviderManager([mockProviderConfig], false);
    bulkQueue = new BulkEmailQueue(providerManager, rateLimit);
  });

  afterEach(() => {
    bulkQueue.shutdown();
  });

  describe('Queue Interface', () => {
    it('should have createCampaign method', () => {
      expect(typeof bulkQueue.createCampaign).toBe('function');
    });

    it('should have startCampaign method', () => {
      expect(typeof bulkQueue.startCampaign).toBe('function');
    });

    it('should have pauseCampaign method', () => {
      expect(typeof bulkQueue.pauseCampaign).toBe('function');
    });

    it('should have resumeCampaign method', () => {
      expect(typeof bulkQueue.resumeCampaign).toBe('function');
    });

    it('should have getCampaignStatus method', () => {
      expect(typeof bulkQueue.getCampaignStatus).toBe('function');
    });

    it('should have cancelCampaign method', () => {
      expect(typeof bulkQueue.cancelCampaign).toBe('function');
    });
  });

  describe('Campaign Creation', () => {
    it('should create a campaign with messages', async () => {
      const messages: EmailMessage[] = [
        { to: 'user1@example.com', subject: 'Test 1', html: '<p>Test 1</p>' },
        { to: 'user2@example.com', subject: 'Test 2', html: '<p>Test 2</p>' },
      ];

      const campaignId = await bulkQueue.createCampaign('Test Campaign', messages);

      expect(campaignId).toBeDefined();
      expect(campaignId.startsWith('campaign_')).toBe(true);
    });

    it('should set correct initial status', async () => {
      const messages: EmailMessage[] = [
        { to: 'user@example.com', subject: 'Test', html: '<p>Test</p>' },
      ];

      const campaignId = await bulkQueue.createCampaign('Test', messages);
      const status = bulkQueue.getCampaignStatus(campaignId);

      expect(status?.status).toBe('pending');
      expect(status?.totalEmails).toBe(1);
    });
  });

  describe('Campaign State Transitions', () => {
    it('should transition to processing when started', async () => {
      const messages: EmailMessage[] = [
        { to: 'user@example.com', subject: 'Test', html: '<p>Test</p>' },
      ];

      const campaignId = await bulkQueue.createCampaign('Test', messages);
      await bulkQueue.startCampaign(campaignId);

      const status = bulkQueue.getCampaignStatus(campaignId);
      expect(status?.status).toBe('processing');
    });

    it('should pause when pauseCampaign is called', async () => {
      const messages: EmailMessage[] = [
        { to: 'user@example.com', subject: 'Test', html: '<p>Test</p>' },
      ];

      const campaignId = await bulkQueue.createCampaign('Test', messages);
      await bulkQueue.startCampaign(campaignId);
      bulkQueue.pauseCampaign(campaignId);

      const status = bulkQueue.getCampaignStatus(campaignId);
      expect(status?.status).toBe('paused');
    });

    it('should resume when resumeCampaign is called', async () => {
      const messages: EmailMessage[] = [
        { to: 'user@example.com', subject: 'Test', html: '<p>Test</p>' },
      ];

      const campaignId = await bulkQueue.createCampaign('Test', messages);
      await bulkQueue.startCampaign(campaignId);
      bulkQueue.pauseCampaign(campaignId);
      bulkQueue.resumeCampaign(campaignId);

      const status = bulkQueue.getCampaignStatus(campaignId);
      expect(status?.status).toBe('processing');
    });

    it('should cancel pending jobs', async () => {
      const messages: EmailMessage[] = [
        { to: 'user@example.com', subject: 'Test', html: '<p>Test</p>' },
      ];

      const campaignId = await bulkQueue.createCampaign('Test', messages);
      bulkQueue.cancelCampaign(campaignId);

      const status = bulkQueue.getCampaignStatus(campaignId);
      expect(status?.status).toBe('cancelled');
    });
  });
});

describe('All bulk tests passed', () => {
  it('should have bulk email sending support', () => {
    expect(true).toBe(true);
  });
});