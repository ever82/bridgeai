/**
 * 短信服务 (SMS Service)
 * 支持短信模板、队列管理和发送状态追踪
 */
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
interface SMSTemplate {
    id: string;
    name: string;
    content: string;
    templateCode?: string;
}
interface SendSMSRequest {
    phoneNumber: string;
    templateId: string;
    variables?: Record<string, any>;
    priority?: number;
}
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
export declare class SMSService {
    private config;
    private templates;
    constructor(config?: Partial<SMSConfig>);
    /**
     * 初始化短信模板
     */
    private initializeTemplates;
    /**
     * 发送短信（加入队列）
     */
    send(request: SendSMSRequest): Promise<SMSResult>;
    /**
     * 立即发送短信
     */
    sendImmediate(request: SendSMSRequest): Promise<SMSResult>;
    /**
     * 批量发送短信
     */
    sendBatch(requests: SendSMSRequest[]): Promise<SMSResult[]>;
    /**
     * 发送验证码
     */
    sendVerificationCode(phoneNumber: string, code: string): Promise<SMSResult>;
    /**
     * 处理短信队列
     */
    processQueue(batchSize?: number): Promise<{
        processed: number;
        failed: number;
    }>;
    /**
     * 处理单条短信
     */
    private processSMS;
    /**
     * 通过 Twilio 发送短信
     */
    private sendViaTwilio;
    /**
     * 通过阿里云发送短信
     */
    private sendViaAliyun;
    /**
     * 通过腾讯云发送短信
     */
    private sendViaTencent;
    /**
     * 模拟发送（用于测试）
     */
    private sendViaMock;
    /**
     * 更新短信状态（用于外部服务回调）
     */
    updateStatus(messageId: string, status: 'DELIVERED' | 'FAILED'): Promise<void>;
    /**
     * 获取短信统计
     */
    getStats(phoneNumber?: string): Promise<{
        total: number;
        pending: number;
        sent: number;
        delivered: number;
        failed: number;
        totalCost: number;
    }>;
    /**
     * 验证手机号格式
     */
    private validatePhoneNumber;
    /**
     * 计算短信段数
     * 中文：70字符/段
     * 英文：160字符/段
     */
    private calculateSegments;
    /**
     * 渲染模板
     */
    private renderTemplate;
    /**
     * 添加自定义模板
     */
    addTemplate(template: SMSTemplate): void;
    /**
     * 获取模板列表
     */
    getTemplates(): SMSTemplate[];
}
export declare const smsService: SMSService;
export {};
//# sourceMappingURL=smsService.d.ts.map