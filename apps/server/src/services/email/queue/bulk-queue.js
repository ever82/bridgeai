export class BulkEmailQueue {
    jobs = new Map();
    campaigns = new Map();
    providerManager;
    rateLimit;
    isProcessing = false;
    isPaused = false;
    processingInterval;
    constructor(providerManager, rateLimit) {
        this.providerManager = providerManager;
        this.rateLimit = rateLimit;
    }
    async createCampaign(name, messages) {
        const campaignId = `campaign_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const campaign = {
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
            const job = {
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
    async startCampaign(campaignId) {
        const campaign = this.campaigns.get(campaignId);
        if (!campaign) {
            throw new Error(`Campaign ${campaignId} not found`);
        }
        campaign.status = 'processing';
        campaign.startedAt = new Date();
        this.isPaused = false;
        this.startProcessing();
    }
    pauseCampaign(campaignId) {
        const campaign = this.campaigns.get(campaignId);
        if (campaign && campaign.status === 'processing') {
            campaign.status = 'paused';
            this.isPaused = true;
        }
    }
    resumeCampaign(campaignId) {
        const campaign = this.campaigns.get(campaignId);
        if (campaign && campaign.status === 'paused') {
            campaign.status = 'processing';
            this.isPaused = false;
        }
    }
    cancelCampaign(campaignId) {
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
    getCampaignStatus(campaignId) {
        return this.campaigns.get(campaignId) || null;
    }
    startProcessing() {
        if (this.processingInterval)
            return;
        const delayMs = Math.floor(1000 / this.rateLimit.emailsPerSecond);
        this.processingInterval = setInterval(async () => {
            if (this.isPaused)
                return;
            const pendingJob = Array.from(this.jobs.values()).find((j) => j.status === 'pending' && j.attempts < j.maxAttempts);
            if (!pendingJob) {
                return;
            }
            await this.processJob(pendingJob);
        }, delayMs);
    }
    async processJob(job) {
        job.status = 'processing';
        job.attempts++;
        const result = await this.providerManager.send(job.message);
        if (result.success) {
            job.status = 'completed';
            job.processedAt = new Date();
        }
        else if (job.attempts >= job.maxAttempts) {
            job.status = 'failed';
            job.error = result.error;
            job.processedAt = new Date();
        }
        this.updateCampaignStats(job.campaignId);
        this.checkCampaignCompletion(job.campaignId);
    }
    updateCampaignStats(campaignId) {
        const campaign = this.campaigns.get(campaignId);
        if (!campaign)
            return;
        const campaignJobs = Array.from(this.jobs.values()).filter((j) => j.campaignId === campaignId);
        campaign.sentEmails = campaignJobs.filter((j) => j.status === 'completed').length;
        campaign.failedEmails = campaignJobs.filter((j) => j.status === 'failed').length;
    }
    checkCampaignCompletion(campaignId) {
        const campaign = this.campaigns.get(campaignId);
        if (!campaign)
            return;
        const campaignJobs = Array.from(this.jobs.values()).filter((j) => j.campaignId === campaignId);
        const allProcessed = campaignJobs.every((j) => j.status === 'completed' || j.status === 'failed');
        if (allProcessed) {
            campaign.status = 'completed';
            campaign.completedAt = new Date();
            this.stopProcessing();
        }
    }
    stopProcessing() {
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = undefined;
        }
    }
    shutdown() {
        this.stopProcessing();
    }
}
//# sourceMappingURL=bulk-queue.js.map