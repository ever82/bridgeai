/**
 * 短信服务 (SMS Service)
 * 支持短信模板、队列管理和发送状态追踪
 */

import { prisma } from '../db/client';

// 短信配置
interface SMSConfig {
  provider: 'twilio' | 'aliyun' | 'tencent' | 'mock';
  accountSid?: string;
  authToken?: string;
  accessKeyId?: string;
  accessKeySecret?: string;
  signName?: string;
  maxRetries: number;
  retryDelayMs: number;
}

// 短信模板
interface SMSTemplate {
  id: string;
  name: string;
  content: string;
  templateCode?: string; // 第三方服务商的模板代码
}

// 发送短信请求
interface SendSMSRequest {
  phoneNumber: string;
  templateId: string;
  variables?: Record<string, any>;
  priority?: number;
}

// 发送结果
interface SMSResult {
  success: boolean;
  queueId?: string;
  messageId?: string;
  segments?: number;
  cost?: number;
  error?: string;
}

/**
 * 短信服务类
 */
export class SMSService {
  private config: SMSConfig;
  private templates: Map<string, SMSTemplate> = new Map();

  constructor(config: Partial<SMSConfig> = {}) {
    this.config = {
      provider: (process.env.SMS_PROVIDER as any) || 'mock',
      accountSid: process.env.SMS_ACCOUNT_SID,
      authToken: process.env.SMS_AUTH_TOKEN,
      accessKeyId: process.env.SMS_ACCESS_KEY_ID,
      accessKeySecret: process.env.SMS_ACCESS_KEY_SECRET,
      signName: process.env.SMS_SIGN_NAME || 'VisionShare',
      maxRetries: 3,
      retryDelayMs: 5000,
      ...config,
    };

    this.initializeTemplates();
  }

  /**
   * 初始化短信模板
   */
  private initializeTemplates(): void {
    // 新匹配通知
    this.templates.set('sms-match-new', {
      id: 'sms-match-new',
      name: '新匹配通知',
      content: '【VisionShare】发现新的匹配：{{matchTitle}}。请登录APP查看详情。',
    });

    // 匹配已接受
    this.templates.set('sms-match-accepted', {
      id: 'sms-match-accepted',
      name: '匹配已接受',
      content: '【VisionShare】您的匹配已被接受！匹配：{{matchTitle}}。请登录APP查看。',
    });

    // 匹配完成
    this.templates.set('sms-match-completed', {
      id: 'sms-match-completed',
      name: '匹配完成',
      content: '【VisionShare】恭喜！匹配已完成：{{matchTitle}}。请登录APP评价。',
    });

    // 验证码
    this.templates.set('sms-verification', {
      id: 'sms-verification',
      name: '验证码',
      content: '【VisionShare】您的验证码是：{{code}}，有效期5分钟，请勿泄露。',
    });

    // 系统通知
    this.templates.set('sms-system', {
      id: 'sms-system',
      name: '系统通知',
      content: '【VisionShare】{{message}}',
    });

    // 默认模板
    this.templates.set('sms-default', {
      id: 'sms-default',
      name: '默认模板',
      content: '【VisionShare】{{title}}：{{content}}',
    });
  }

  /**
   * 发送短信（加入队列）
   */
  async send(request: SendSMSRequest): Promise<SMSResult> {
    try {
      // 验证手机号格式
      if (!this.validatePhoneNumber(request.phoneNumber)) {
        return {
          success: false,
          error: 'Invalid phone number format',
        };
      }

      // 获取模板
      const template = this.templates.get(request.templateId) || this.templates.get('sms-default')!;

      // 渲染模板
      const content = this.renderTemplate(template.content, request.variables);

      // 计算短信段数（中文70字符/段，英文160字符/段）
      const segments = this.calculateSegments(content);

      // 创建队列记录
      const queue = await prisma.sMSQueue.create({
        data: {
          phoneNumber: request.phoneNumber,
          templateId: request.templateId,
          content,
          variables: request.variables || {},
          status: 'PENDING',
          priority: request.priority || 0,
          segments,
        },
      });

      return {
        success: true,
        queueId: queue.id,
        segments,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 立即发送短信
   */
  async sendImmediate(request: SendSMSRequest): Promise<SMSResult> {
    try {
      // 先加入队列
      const queueResult = await this.send(request);
      if (!queueResult.success) {
        return queueResult;
      }

      // 立即处理该短信
      await this.processSMS(queueResult.queueId!);

      return queueResult;
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 批量发送短信
   */
  async sendBatch(requests: SendSMSRequest[]): Promise<SMSResult[]> {
    return Promise.all(requests.map(req => this.send(req)));
  }

  /**
   * 发送验证码
   */
  async sendVerificationCode(phoneNumber: string, code: string): Promise<SMSResult> {
    return this.send({
      phoneNumber,
      templateId: 'sms-verification',
      variables: { code },
      priority: 2, // 高优先级
    });
  }

  /**
   * 处理短信队列
   */
  async processQueue(batchSize: number = 10): Promise<{ processed: number; failed: number }> {
    const result = { processed: 0, failed: 0 };

    try {
      // 获取待发送的短信
      const messages = await prisma.sMSQueue.findMany({
        where: {
          status: 'PENDING',
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        take: batchSize,
      });

      for (const message of messages) {
        try {
          await this.processSMS(message.id);
          result.processed++;
        } catch (error) {
          result.failed++;
          console.error(`Failed to process SMS ${message.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error processing SMS queue:', error);
    }

    return result;
  }

  /**
   * 处理单条短信
   */
  private async processSMS(smsId: string): Promise<void> {
    const sms = await prisma.sMSQueue.findUnique({
      where: { id: smsId },
    });

    if (!sms || sms.status !== 'PENDING') {
      return;
    }

    // 更新状态为发送中
    await prisma.sMSQueue.update({
      where: { id: smsId },
      data: { status: 'SENDING' },
    });

    try {
      // 根据提供商发送短信
      let messageId: string;
      let cost: number;

      switch (this.config.provider) {
        case 'twilio':
          ({ messageId, cost } = await this.sendViaTwilio(sms));
          break;
        case 'aliyun':
          ({ messageId, cost } = await this.sendViaAliyun(sms));
          break;
        case 'tencent':
          ({ messageId, cost } = await this.sendViaTencent(sms));
          break;
        case 'mock':
        default:
          ({ messageId, cost } = await this.sendViaMock(sms));
          break;
      }

      // 更新状态为已发送
      await prisma.sMSQueue.update({
        where: { id: smsId },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          messageId,
          cost,
        },
      });
    } catch (error) {
      // 更新重试次数和错误信息
      await prisma.sMSQueue.update({
        where: { id: smsId },
        data: {
          status: sms.retryCount < this.config.maxRetries ? 'PENDING' : 'FAILED',
          retryCount: { increment: 1 },
          errorMessage: error.message,
        },
      });

      throw error;
    }
  }

  /**
   * 通过 Twilio 发送短信
   */
  private async sendViaTwilio(sms: any): Promise<{ messageId: string; cost: number }> {
    // 实际实现需要使用 twilio SDK
    // const twilio = require('twilio');
    // const client = twilio(this.config.accountSid, this.config.authToken);
    // const result = await client.messages.create({...});

    console.log(`[Twilio] Sending SMS to ${sms.phoneNumber}: ${sms.content.slice(0, 30)}...`);

    // 模拟成本计算（每段 $0.0075）
    const cost = sms.segments * 0.0075;

    return {
      messageId: `twilio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      cost,
    };
  }

  /**
   * 通过阿里云发送短信
   */
  private async sendViaAliyun(sms: any): Promise<{ messageId: string; cost: number }> {
    // 实际实现需要使用阿里云 SDK
    console.log(`[Aliyun] Sending SMS to ${sms.phoneNumber}: ${sms.content.slice(0, 30)}...`);

    // 模拟成本计算（每条 ¥0.05）
    const cost = 0.05;

    return {
      messageId: `aliyun-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      cost,
    };
  }

  /**
   * 通过腾讯云发送短信
   */
  private async sendViaTencent(sms: any): Promise<{ messageId: string; cost: number }> {
    // 实际实现需要使用腾讯云 SDK
    console.log(`[Tencent] Sending SMS to ${sms.phoneNumber}: ${sms.content.slice(0, 30)}...`);

    // 模拟成本计算（每条 ¥0.045）
    const cost = 0.045;

    return {
      messageId: `tencent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      cost,
    };
  }

  /**
   * 模拟发送（用于测试）
   */
  private async sendViaMock(sms: any): Promise<{ messageId: string; cost: number }> {
    console.log(`[Mock SMS] To: ${sms.phoneNumber}, Content: ${sms.content}`);

    return {
      messageId: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      cost: 0,
    };
  }

  /**
   * 更新短信状态（用于外部服务回调）
   */
  async updateStatus(messageId: string, status: 'DELIVERED' | 'FAILED'): Promise<void> {
    const updateData: any = { status };

    if (status === 'DELIVERED') {
      updateData.deliveredAt = new Date();
    }

    await prisma.sMSQueue.updateMany({
      where: { messageId },
      data: updateData,
    });
  }

  /**
   * 获取短信统计
   */
  async getStats(phoneNumber?: string): Promise<{
    total: number;
    pending: number;
    sent: number;
    delivered: number;
    failed: number;
    totalCost: number;
  }> {
    const where = phoneNumber ? { phoneNumber } : {};

    const [total, pending, sent, delivered, failed] = await Promise.all([
      prisma.sMSQueue.count({ where }),
      prisma.sMSQueue.count({ where: { ...where, status: 'PENDING' } }),
      prisma.sMSQueue.count({ where: { ...where, status: 'SENT' } }),
      prisma.sMSQueue.count({ where: { ...where, status: 'DELIVERED' } }),
      prisma.sMSQueue.count({ where: { ...where, status: 'FAILED' } }),
    ]);

    // 计算总成本
    const costResult = await prisma.sMSQueue.aggregate({
      where: { ...where, status: { in: ['SENT', 'DELIVERED'] } },
      _sum: { cost: true },
    });

    return {
      total,
      pending,
      sent,
      delivered,
      failed,
      totalCost: costResult._sum.cost?.toNumber() || 0,
    };
  }

  /**
   * 验证手机号格式
   */
  private validatePhoneNumber(phoneNumber: string): boolean {
    // 支持中国大陆、香港、台湾、美国等常见格式
    const patterns = [
      /^1[3-9]\d{9}$/, // 中国大陆
      /^[569]\d{7}$/, // 香港
      /^09\d{8}$/, // 台湾
      /^\+?1\d{10}$/, // 美国
      /^\+[1-9]\d{1,14}$/, // 国际格式
    ];

    return patterns.some(pattern => pattern.test(phoneNumber));
  }

  /**
   * 计算短信段数
   * 中文：70字符/段
   * 英文：160字符/段
   */
  private calculateSegments(content: string): number {
    // eslint-disable-next-line no-control-regex
    const hasUnicode = /[^\x01-\x7F]/.test(content);
    const maxLength = hasUnicode ? 70 : 160;
    return Math.ceil(content.length / maxLength);
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
  addTemplate(template: SMSTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * 获取模板列表
   */
  getTemplates(): SMSTemplate[] {
    return Array.from(this.templates.values());
  }
}

// 导出单例
export const smsService = new SMSService();
