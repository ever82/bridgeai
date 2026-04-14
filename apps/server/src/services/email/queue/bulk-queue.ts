import { EmailProviderManager, EmailMessage } from '../adapters';

export interface BulkEmailJob {
  id: string;
  campaignId: string;
  message: EmailMessage;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  processedAt?: Date;
  error?: string;
}

export interface BulkCampaign {
  id: string;
  name: string;
  totalEmails: number;
  sentEmails: number;
  failedEmails: number;
  status: 'pending' | 'processing' | 'paused' | 'completed' | 'cancelled';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface RateLimitConfig {
  emailsPerSecond: number;
  emailsPerMinute?: number;
  emailsPerHour?: number;
}

export class BulkEmailQueue {
  private jobs: Map<string, BulkEmailJob> = new Map();
  private campaigns: Map<string, BulkCampaign> = new Map();
  private providerManager: EmailProviderManager;
  private rateLimit: RateLimitConfig;
  private isProcessing = false;
  private isPaused = false;
  private processingInterval?: NodeJS.Timeout;

  constructor(providerManager: EmailProviderManager, rateLimit: RateLimitConfig) {
    this.providerManager = providerManager;
    this.rateLimit = rateLimit;
  }

  async createCampaign(name: string, messages: EmailMessage[]): Promise<string> {
    const campaignId = `campaign_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const campaign: BulkCampaign = {
      id: campaignId,
      name,
      totalEmails: messages.length,
      sentEmails: 0,
      failedEmails: 0,
      status: 'pending',
      createdAt: new Date(),
    };

    this.campaigns.set(campaignId, campaign);

    for (const message of messages) {
      const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const job: BulkEmailJob = {
        id: jobId,
        campaignId,
        message,
        status: 'pending',
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date(),
      };
      this.jobs.set(jobId, job);
    }

    return campaignId;
  }

  async startCampaign(campaignId: string): Promise<void> {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found`);
    }

    campaign.status = 'processing';
    campaign.startedAt = new Date();
    this.isPaused = false;

    this.startProcessing();
  }

  pauseCampaign(campaignId: string): void {
    const campaign = this.campaigns.get(campaignId);
    if (campaign && campaign.status === 'processing') {
      campaign.status = 'paused';
      this.isPaused = true;
    }
  }

  resumeCampaign(campaignId: string): void {
    const campaign = this.campaigns.get(campaignId);
    if (campaign && campaign.status === 'paused') {
      campaign.status = 'processing';
      this.isPaused = false;
    }
  }

  cancelCampaign(campaignId: string): void {
    const campaign = this.campaigns.get(campaignId);
    if (campaign) {
      campaign.status = 'cancelled';
      this.isPaused = true;

      for (const [jobId, job] of this.jobs) {
        if (job.campaignId === campaignId && job.status === 'pending') {
          this.jobs.delete(jobId);
        }
      }
    }
  }

  getCampaignStatus(campaignId: string): BulkCampaign | null {
    return this.campaigns.get(campaignId) || null;
  }

  private startProcessing(): void {
    if (this.processingInterval) return;

    const delayMs = Math.floor(1000 / this.rateLimit.emailsPerSecond);

    this.processingInterval = setInterval(async () => {
      if (this.isPaused) return;

      const pendingJob = Array.from(this.jobs.values()).find(
        (j) => j.status === 'pending' && j.attempts < j.maxAttempts
      );

      if (!pendingJob) {
        return;
      }

      await this.processJob(pendingJob);
    }, delayMs);
  }

  private async processJob(job: BulkEmailJob): Promise<void> {
    job.status = 'processing';
    job.attempts++;

    const result = await this.providerManager.send(job.message);

    if (result.success) {
      job.status = 'completed';
      job.processedAt = new Date();
    } else if (job.attempts >= job.maxAttempts) {
      job.status = 'failed';
      job.error = result.error;
      job.processedAt = new Date();
    }

    this.updateCampaignStats(job.campaignId);
    this.checkCampaignCompletion(job.campaignId);
  }

  private updateCampaignStats(campaignId: string): void {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return;

    const campaignJobs = Array.from(this.jobs.values()).filter(
      (j) => j.campaignId === campaignId
    );

    campaign.sentEmails = campaignJobs.filter((j) => j.status === 'completed').length;
    campaign.failedEmails = campaignJobs.filter((j) => j.status === 'failed').length;
  }

  private checkCampaignCompletion(campaignId: string): void {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return;

    const campaignJobs = Array.from(this.jobs.values()).filter(
      (j) => j.campaignId === campaignId
    );

    const allProcessed = campaignJobs.every(
      (j) => j.status === 'completed' || j.status === 'failed'
    );

    if (allProcessed) {
      campaign.status = 'completed';
      campaign.completedAt = new Date();
      this.stopProcessing();
    }
  }

  private stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
  }

  shutdown(): void {
    this.stopProcessing();
  }
}