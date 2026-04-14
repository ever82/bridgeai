export interface EmailTrackingRecord {
  messageId: string;
  to: string;
  sentAt: Date;
  openedAt?: Date;
  clickedUrls: { url: string; clickedAt: Date }[];
  bounced: boolean;
  bouncedAt?: Date;
  bouncedReason?: string;
  complained: boolean;
  complainedAt?: Date;
}

export interface ReputationEntry {
  email: string;
  reputation: 'good' | 'neutral' | 'poor' | 'bounced';
  score: number;
  lastUpdated: Date;
  bounceCount: number;
  complaintCount: number;
}

export class EmailTrackingService {
  private trackingRecords: Map<string, EmailTrackingRecord> = new Map();
  private reputationList: Map<string, ReputationEntry> = new Map();

  async recordSent(messageId: string, to: string): Promise<void> {
    const record: EmailTrackingRecord = {
      messageId,
      to,
      sentAt: new Date(),
      clickedUrls: [],
      bounced: false,
      complained: false,
    };
    this.trackingRecords.set(messageId, record);
  }

  async recordOpen(messageId: string): Promise<void> {
    const record = this.trackingRecords.get(messageId);
    if (record && !record.openedAt) {
      record.openedAt = new Date();
    }
  }

  async recordClick(messageId: string, url: string): Promise<void> {
    const record = this.trackingRecords.get(messageId);
    if (record) {
      record.clickedUrls.push({ url, clickedAt: new Date() });
    }
  }

  async recordBounce(messageId: string, reason: string): Promise<void> {
    const record = this.trackingRecords.get(messageId);
    if (record) {
      record.bounced = true;
      record.bouncedAt = new Date();
      record.bouncedReason = reason;

      await this.updateReputation(record.to, 'bounce');
    }
  }

  async recordComplaint(messageId: string): Promise<void> {
    const record = this.trackingRecords.get(messageId);
    if (record) {
      record.complained = true;
      record.complainedAt = new Date();

      await this.updateReputation(record.to, 'complaint');
    }
  }

  async getTrackingRecord(messageId: string): Promise<EmailTrackingRecord | null> {
    return this.trackingRecords.get(messageId) || null;
  }

  async getEmailStats(email: string): Promise<{
    sent: number;
    opened: number;
    clicked: number;
    bounced: number;
  }> {
    const records = Array.from(this.trackingRecords.values()).filter(
      (r) => r.to === email
    );

    return {
      sent: records.length,
      opened: records.filter((r) => r.openedAt).length,
      clicked: records.filter((r) => r.clickedUrls.length > 0).length,
      bounced: records.filter((r) => r.bounced).length,
    };
  }

  async updateReputation(email: string, event: 'bounce' | 'complaint'): Promise<void> {
    const entry = this.reputationList.get(email) || {
      email,
      reputation: 'neutral',
      score: 50,
      lastUpdated: new Date(),
      bounceCount: 0,
      complaintCount: 0,
    };

    if (event === 'bounce') {
      entry.bounceCount++;
      entry.score = Math.max(0, entry.score - 20);
    } else if (event === 'complaint') {
      entry.complaintCount++;
      entry.score = Math.max(0, entry.score - 30);
    }

    if (entry.bounceCount >= 3 || entry.score < 20) {
      entry.reputation = 'bounced';
    } else if (entry.score < 40) {
      entry.reputation = 'poor';
    } else if (entry.score > 70) {
      entry.reputation = 'good';
    }

    entry.lastUpdated = new Date();
    this.reputationList.set(email, entry);
  }

  async getReputation(email: string): Promise<ReputationEntry | null> {
    return this.reputationList.get(email) || null;
  }

  async isReputable(email: string): Promise<boolean> {
    const entry = this.reputationList.get(email);
    if (!entry) return true;
    return entry.reputation !== 'bounced' && entry.reputation !== 'poor';
  }

  generateTrackingPixel(messageId: string): string {
    return `<img src="/api/email/track/open/${messageId}" width="1" height="1" style="display:none" />`;
  }

  generateClickTrackingUrl(messageId: string, originalUrl: string): string {
    const encoded = Buffer.from(originalUrl).toString('base64');
    return `/api/email/track/click/${messageId}?url=${encoded}`;
  }
}