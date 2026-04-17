/**
 * 邮件服务 (Email Service)
 * 支持邮件模板、队列管理和发送状态追踪
 */

import { prisma } from '../db/client';

// 邮件配置
interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  fromEmail: string;
  fromName: string;
  maxRetries: number;
  retryDelayMs: number;
}

// 邮件模板
interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

// 发送邮件请求
interface SendEmailRequest {
  toEmail: string;
  toName?: string;
  templateId: string;
  subject?: string;
  variables?: Record<string, any>;
  attachments?: EmailAttachment[];
  priority?: number;
}

// 邮件附件
interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

// 发送结果
interface EmailResult {
  success: boolean;
  queueId?: string;
  messageId?: string;
  error?: string;
}

/**
 * 邮件服务类
 */
export class EmailService {
  private config: EmailConfig;
  private templates: Map<string, EmailTemplate> = new Map();

  constructor(config: Partial<EmailConfig> = {}) {
    this.config = {
      smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
      smtpPort: parseInt(process.env.SMTP_PORT || '587'),
      smtpUser: process.env.SMTP_USER || '',
      smtpPass: process.env.SMTP_PASS || '',
      fromEmail: process.env.FROM_EMAIL || 'noreply@bridgeai.com',
      fromName: process.env.FROM_NAME || 'BridgeAI',
      maxRetries: 3,
      retryDelayMs: 5000,
      ...config,
    };

    this.initializeTemplates();
  }

  /**
   * 初始化邮件模板
   */
  private initializeTemplates(): void {
    // 新匹配通知模板
    this.templates.set('match-new', {
      id: 'match-new',
      name: '新匹配通知',
      subject: 'BridgeAI - 发现新的匹配',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">发现新的匹配</h2>
          <p>您好 {{name}}，</p>
          <p>系统为您找到了一个潜在匹配，点击查看详情：</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>{{matchTitle}}</strong></p>
            <p>{{matchDescription}}</p>
          </div>
          <a href="{{actionUrl}}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">查看详情</a>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            此邮件由 BridgeAI 系统自动发送，请勿回复。
          </p>
        </div>
      `,
      textContent: '发现新的匹配：{{matchTitle}}。请登录 BridgeAI 查看详情。',
    });

    // 匹配状态变更模板
    this.templates.set('match-accepted', {
      id: 'match-accepted',
      name: '匹配已接受',
      subject: 'BridgeAI - 您的匹配已被接受',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">匹配已被接受</h2>
          <p>您好 {{name}}，</p>
          <p>您的匹配请求已被对方接受！</p>
          <p>匹配详情：{{matchTitle}}</p>
          <a href="{{actionUrl}}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">查看匹配</a>
        </div>
      `,
    });

    this.templates.set('match-rejected', {
      id: 'match-rejected',
      name: '匹配被拒绝',
      subject: 'BridgeAI - 您的匹配已被拒绝',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc3545;">匹配已被拒绝</h2>
          <p>您好 {{name}}，</p>
          <p>您的匹配请求已被对方拒绝。</p>
          <p>匹配详情：{{matchTitle}}</p>
          <p>请查看其他匹配机会。</p>
        </div>
      `,
    });

    this.templates.set('match-completed', {
      id: 'match-completed',
      name: '匹配完成',
      subject: 'BridgeAI - 恭喜！匹配已完成',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">恭喜！匹配已完成</h2>
          <p>您好 {{name}}，</p>
          <p>您的匹配交易已成功完成！</p>
          <p>匹配详情：{{matchTitle}}</p>
          <a href="{{actionUrl}}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">查看详情</a>
        </div>
      `,
    });

    // 新消息通知模板
    this.templates.set('message-new', {
      id: 'message-new',
      name: '新消息通知',
      subject: 'BridgeAI - 您有一条新消息',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">新消息</h2>
          <p>您好 {{name}}，</p>
          <p><strong>{{senderName}}</strong> 给您发送了一条消息：</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p>{{messagePreview}}</p>
          </div>
          <a href="{{actionUrl}}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">回复消息</a>
        </div>
      `,
    });

    // 评分通知模板
    this.templates.set('rating-received', {
      id: 'rating-received',
      name: '收到评分',
      subject: 'BridgeAI - 您收到新的评分',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">收到新的评分</h2>
          <p>您好 {{name}}，</p>
          <p>{{raterName}} 给您打了 <strong>{{rating}} 分</strong>！</p>
          <a href="{{actionUrl}}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">查看评分</a>
        </div>
      `,
    });

    // 系统公告模板
    this.templates.set('system-announcement', {
      id: 'system-announcement',
      name: '系统公告',
      subject: 'BridgeAI - {{announcementTitle}}',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">{{announcementTitle}}</h2>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            {{announcementContent}}
          </div>
        </div>
      `,
    });

    // 促销模板
    this.templates.set('promotion', {
      id: 'promotion',
      name: '促销活动',
      subject: 'BridgeAI - {{promotionTitle}}',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ff6b6b;">{{promotionTitle}}</h2>
          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
            {{promotionContent}}
          </div>
          <a href="{{actionUrl}}" style="background: #ff6b6b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">立即参与</a>
        </div>
      `,
    });

    // 默认模板
    this.templates.set('default', {
      id: 'default',
      name: '默认模板',
      subject: 'BridgeAI - {{title}}',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">{{title}}</h2>
          <p>{{content}}</p>
        </div>
      `,
    });
  }

  /**
   * 发送邮件（加入队列）
   */
  async send(request: SendEmailRequest): Promise<EmailResult> {
    try {
      // 获取模板
      const template = this.templates.get(request.templateId) || this.templates.get('default')!;

      // 渲染模板
      const subject = this.renderTemplate(request.subject || template.subject, request.variables);
      const htmlContent = this.renderTemplate(template.htmlContent, request.variables);
      // 创建队列记录
      const queue = await prisma.emailQueue.create({
        data: {
          toEmail: request.toEmail,
          toName: request.toName,
          templateId: request.templateId,
          subject,
          content: htmlContent,
          variables: request.variables || {},
          status: 'PENDING',
          priority: request.priority || 0,
        },
      });

      return {
        success: true,
        queueId: queue.id,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 立即发送邮件
   */
  async sendImmediate(request: SendEmailRequest): Promise<EmailResult> {
    try {
      // 先加入队列
      const queueResult = await this.send(request);
      if (!queueResult.success) {
        return queueResult;
      }

      // 立即处理该邮件
      await this.processEmail(queueResult.queueId!);

      return queueResult;
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 批量发送邮件
   */
  async sendBatch(requests: SendEmailRequest[]): Promise<EmailResult[]> {
    return Promise.all(requests.map(req => this.send(req)));
  }

  /**
   * 处理邮件队列
   */
  async processQueue(batchSize: number = 10): Promise<{ processed: number; failed: number }> {
    const result = { processed: 0, failed: 0 };

    try {
      // 获取待发送的邮件
      const emails = await prisma.emailQueue.findMany({
        where: {
          status: 'PENDING',
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        take: batchSize,
      });

      for (const email of emails) {
        try {
          await this.processEmail(email.id);
          result.processed++;
        } catch (error) {
          result.failed++;
          console.error(`Failed to process email ${email.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error processing email queue:', error);
    }

    return result;
  }

  /**
   * 处理单封邮件
   */
  private async processEmail(emailId: string): Promise<void> {
    const email = await prisma.emailQueue.findUnique({
      where: { id: emailId },
    });

    if (!email || email.status !== 'PENDING') {
      return;
    }

    // 更新状态为发送中
    await prisma.emailQueue.update({
      where: { id: emailId },
      data: { status: 'SENDING' },
    });

    try {
      // 这里实际调用邮件发送API
      // 例如使用 nodemailer 或第三方服务
      const messageId = await this.sendViaSMTP(email);

      // 更新状态为已发送
      await prisma.emailQueue.update({
        where: { id: emailId },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          messageId,
        },
      });
    } catch (error) {
      // 更新重试次数和错误信息
      await prisma.emailQueue.update({
        where: { id: emailId },
        data: {
          status: email.retryCount < this.config.maxRetries ? 'PENDING' : 'FAILED',
          retryCount: { increment: 1 },
          errorMessage: error.message,
        },
      });

      throw error;
    }
  }

  /**
   * 通过 SMTP 发送邮件
   * 注意：实际实现需要使用 nodemailer 或其他邮件库
   */
  private async sendViaSMTP(email: any): Promise<string> {
    // 这里应该使用实际的邮件发送库
    // 例如：
    // const nodemailer = require('nodemailer');
    // const transporter = nodemailer.createTransport({...});
    // const result = await transporter.sendMail({...});
    // return result.messageId;

    // 模拟发送
    console.log(`Sending email to ${email.toEmail}: ${email.subject}`);
    return `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 更新邮件状态（用于外部服务回调）
   */
  async updateStatus(
    messageId: string,
    status: 'DELIVERED' | 'OPENED' | 'CLICKED' | 'BOUNCED' | 'FAILED'
  ): Promise<void> {
    const updateData: any = { status };

    switch (status) {
      case 'DELIVERED':
        updateData.deliveredAt = new Date();
        break;
      case 'OPENED':
        updateData.openedAt = new Date();
        break;
      case 'CLICKED':
        updateData.clickedAt = new Date();
        break;
    }

    await prisma.emailQueue.updateMany({
      where: { messageId },
      data: updateData,
    });
  }

  /**
   * 获取邮件统计
   */
  async getStats(userEmail?: string): Promise<{
    total: number;
    pending: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    failed: number;
  }> {
    const where = userEmail ? { toEmail: userEmail } : {};

    const [total, pending, sent, delivered, opened, clicked, failed] = await Promise.all([
      prisma.emailQueue.count({ where }),
      prisma.emailQueue.count({ where: { ...where, status: 'PENDING' } }),
      prisma.emailQueue.count({ where: { ...where, status: 'SENT' } }),
      prisma.emailQueue.count({ where: { ...where, status: 'DELIVERED' } }),
      prisma.emailQueue.count({ where: { ...where, status: 'OPENED' } }),
      prisma.emailQueue.count({ where: { ...where, status: 'CLICKED' } }),
      prisma.emailQueue.count({ where: { ...where, status: 'FAILED' } }),
    ]);

    return {
      total,
      pending,
      sent,
      delivered,
      opened,
      clicked,
      failed,
    };
  }

  /**
   * 渲染模板
   */
  private renderTemplate(template: string, variables?: Record<string, any>): string {
    if (!variables) return template;

    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }

  /**
   * 添加自定义模板
   */
  addTemplate(template: EmailTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * 获取模板列表
   */
  getTemplates(): EmailTemplate[] {
    return Array.from(this.templates.values());
  }
}

// 导出单例
export const emailService = new EmailService();
