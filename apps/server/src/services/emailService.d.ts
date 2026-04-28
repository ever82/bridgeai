/**
 * 邮件服务 (Email Service)
 * 支持邮件模板、队列管理和发送状态追踪
 */
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
interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    htmlContent: string;
    textContent?: string;
}
interface SendEmailRequest {
    toEmail: string;
    toName?: string;
    templateId: string;
    subject?: string;
    variables?: Record<string, any>;
    attachments?: EmailAttachment[];
    priority?: number;
}
interface EmailAttachment {
    filename: string;
    content: Buffer;
    contentType: string;
}
interface EmailResult {
    success: boolean;
    queueId?: string;
    messageId?: string;
    error?: string;
}
/**
 * 邮件服务类
 */
export declare class EmailService {
    private config;
    private templates;
    constructor(config?: Partial<EmailConfig>);
    /**
     * 初始化邮件模板
     */
    private initializeTemplates;
    /**
     * 发送邮件（加入队列）
     */
    send(request: SendEmailRequest): Promise<EmailResult>;
    /**
     * 立即发送邮件
     */
    sendImmediate(request: SendEmailRequest): Promise<EmailResult>;
    /**
     * 批量发送邮件
     */
    sendBatch(requests: SendEmailRequest[]): Promise<EmailResult[]>;
    /**
     * 处理邮件队列
     */
    processQueue(batchSize?: number): Promise<{
        processed: number;
        failed: number;
    }>;
    /**
     * 处理单封邮件
     */
    private processEmail;
    /**
     * 通过 SMTP 发送邮件
     * 注意：实际实现需要使用 nodemailer 或其他邮件库
     */
    private sendViaSMTP;
    /**
     * 更新邮件状态（用于外部服务回调）
     */
    updateStatus(messageId: string, status: 'DELIVERED' | 'OPENED' | 'CLICKED' | 'BOUNCED' | 'FAILED'): Promise<void>;
    /**
     * 获取邮件统计
     */
    getStats(userEmail?: string): Promise<{
        total: number;
        pending: number;
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        failed: number;
    }>;
    /**
     * 渲染模板
     */
    private renderTemplate;
    /**
     * 添加自定义模板
     */
    addTemplate(template: EmailTemplate): void;
    /**
     * 获取模板列表
     */
    getTemplates(): EmailTemplate[];
}
export declare const emailService: EmailService;
export {};
//# sourceMappingURL=emailService.d.ts.map