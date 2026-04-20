/**
 * Supply Extraction Service
 * 供给智能提炼服务 - 核心解析引擎
 *
 * 功能：
 * - 服务描述理解
 * - 供给实体识别
 * - 服务类型分类
 * - 供给结构化输出
 * - 能力评估评分
 */

import { logger } from '../../utils/logger';

import { LLMService } from './llmService';
import { LLMMetricsService } from './metricsService';
import { LLMProvider } from './types';

// LLM Service configuration from environment
function createLLMService(): LLMService {
  return new LLMService({
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      apiUrl: process.env.OPENAI_API_URL,
      organization: process.env.OPENAI_ORGANIZATION,
    },
    claude: {
      apiKey: process.env.CLAUDE_API_KEY || '',
      apiUrl: process.env.CLAUDE_API_URL,
    },
    wenxin: {
      apiKey: process.env.WENXIN_API_KEY || '',
      secretKey: process.env.WENXIN_SECRET_KEY || '',
      apiUrl: process.env.WENXIN_API_URL,
    },
    defaultStrategy: (process.env.LLM_ROUTING_STRATEGY as any) || 'round-robin',
  });
}

// Metrics service instance
const metricsService = new LLMMetricsService();

// 供给提取结果
export interface Supply {
  id?: string;
  agentId?: string;
  title: string;
  description: string;
  serviceType: string;
  capabilities: Capability[];
  pricing: PricingInfo;
  skills: string[];
  availability?: AvailabilityInfo;
  location?: LocationInfo;
  experience?: ExperienceInfo;
  quality: QualityMetrics;
  metadata?: Record<string, unknown>;
}

// 服务能力
export interface Capability {
  name: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  category: string;
  keywords: string[];
}

// 定价信息
export interface PricingInfo {
  type: 'hourly' | 'fixed' | 'range' | 'negotiable';
  minRate?: number;
  maxRate?: number;
  currency: string;
  unit?: string;
  description?: string;
}

// 可用性信息
export interface AvailabilityInfo {
  schedule: string;
  timezone?: string;
  responseTime?: string;
  leadTime?: string;
}

// 位置信息
export interface LocationInfo {
  city?: string;
  country?: string;
  remote: boolean;
  onsite: boolean;
  hybrid: boolean;
  timezone?: string;
}

// 经验信息
export interface ExperienceInfo {
  years?: number;
  totalProjects?: number;
  relevantProjects?: number;
  certifications?: string[];
  portfolio?: string[];
}

// 质量指标
export interface QualityMetrics {
  overallScore: number; // 0-100
  completenessScore: number; // 0-100
  clarityScore: number; // 0-100
  relevanceScore: number; // 0-100
  confidence: number; // 0-100
}

// 供给提取请求
export interface SupplyExtractionRequest {
  text: string;
  scene: string;
  agentId?: string;
  userId?: string;
  language?: string;
  options?: ExtractionOptions;
}

// 提取选项
export interface ExtractionOptions {
  includeCapabilities?: boolean;
  includePricing?: boolean;
  includeAvailability?: boolean;
  includeLocation?: boolean;
  includeExperience?: boolean;
  minConfidence?: number;
}

// 提取结果
export interface SupplyExtractionResult {
  success: boolean;
  supply: Supply;
  fieldsExtracted: string[];
  fieldsFailed: string[];
  provider: LLMProvider;
  model: string;
  latencyMs: number;
}

// 批量提取请求
export interface BulkSupplyExtractionRequest {
  items: SupplyExtractionRequest[];
  options?: ExtractionOptions;
}

// 批量提取结果
export interface BulkSupplyExtractionResult {
  success: boolean;
  results: SupplyExtractionResult[];
  failed: number;
  total: number;
  qualityReport: QualityReport;
}

// 质量报告
export interface QualityReport {
  overallQuality: number;
  averageConfidence: number;
  averageCompleteness: number;
  extractionRate: number; // 成功提取的字段比例
  issues: QualityIssue[];
  recommendations: string[];
}

// 质量问题
export interface QualityIssue {
  type: 'missing_field' | 'low_confidence' | 'ambiguous' | 'inconsistent';
  field?: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

// 提取质量评估
interface ExtractionQuality {
  completeness: number;
  clarity: number;
  relevance: number;
  confidence: number;
  issues: QualityIssue[];
}

/**
 * Supply Extraction Service 类
 * 供给智能提炼服务的核心解析引擎
 */
export class SupplyExtractionService {
  private llmService: LLMService;

  constructor(llmService?: LLMService) {
    this.llmService = llmService || createLLMService();
  }

  /**
   * 初始化服务
   */
  async initialize(): Promise<void> {
    await this.llmService.initialize();
    logger.info('SupplyExtractionService initialized');
  }

  /**
   * 从自然语言文本中提取供给信息
   */
  async extract(request: SupplyExtractionRequest): Promise<SupplyExtractionResult> {
    const startTime = Date.now();
    const { text, scene, agentId, userId: _userId, options = {} } = request;

    try {
      logger.info(`Starting supply extraction`, { agentId, scene, textLength: text.length });

      // 构建提取提示词
      const prompt = this.buildExtractionPrompt(text, scene, options);

      // 调用 LLM
      const response = await this.llmService.generateText(prompt, {
        temperature: 0.3,
        maxTokens: 2500,
      });

      // 解析提取结果
      const extraction = this.parseExtractionResult(response.text);

      // 评估质量
      const quality = this.evaluateQuality(extraction, text, options);

      // 构建供给对象
      const supply = this.buildSupplyObject(extraction, quality);

      // 获取提取和失败的字段
      const fieldsExtracted = this.getExtractedFields(extraction);
      const fieldsFailed = this.getFailedFields(extraction, options);

      const latencyMs = Date.now() - startTime;

      // 记录指标
      await metricsService.recordRequest({
        requestId: `supply-${agentId || 'unknown'}-${Date.now()}`,
        provider: response.provider,
        model: response.model,
        latencyMs,
        success: true,
        tokenUsage: response.usage || { input: 0, output: 0, total: 0 },
        costUsd: response.cost || 0,
      });

      logger.info(`Supply extraction completed`, {
        agentId,
        confidence: supply.quality.confidence,
        fieldsExtracted: fieldsExtracted.length,
        latencyMs,
      });

      return {
        success: true,
        supply,
        fieldsExtracted,
        fieldsFailed,
        provider: response.provider,
        model: response.model,
        latencyMs,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      logger.error(`Supply extraction failed`, {
        agentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // 记录失败指标
      await metricsService.recordRequest({
        requestId: `supply-${agentId || 'unknown'}-${Date.now()}`,
        provider: 'unknown',
        model: 'unknown',
        latencyMs,
        success: false,
        errorType: error instanceof Error ? error.name : 'UnknownError',
        tokenUsage: { input: 0, output: 0, total: 0 },
        costUsd: 0,
      });

      throw error;
    }
  }

  /**
   * 批量提取供给信息
   */
  async extractBulk(request: BulkSupplyExtractionRequest): Promise<BulkSupplyExtractionResult> {
    const { items, options = {} } = request;
    const results: SupplyExtractionResult[] = [];
    let failed = 0;

    logger.info(`Starting bulk supply extraction`, { total: items.length });

    for (const item of items) {
      try {
        const result = await this.extract({
          ...item,
          options: { ...item.options, ...options },
        });
        results.push(result);
      } catch (error) {
        failed++;
        logger.error(`Bulk extraction failed for item`, {
          agentId: item.agentId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // 生成质量报告
    const qualityReport = this.generateQualityReport(results);

    logger.info(`Bulk supply extraction completed`, {
      total: items.length,
      success: results.length,
      failed,
    });

    return {
      success: failed === 0,
      results,
      failed,
      total: items.length,
      qualityReport,
    };
  }

  /**
   * 构建提取提示词
   */
  private buildExtractionPrompt(text: string, scene: string, options: ExtractionOptions): string {
    const sections: string[] = [];

    // 基础指令
    sections.push(
      `You are an expert supply/service extraction system. Your task is to analyze service descriptions and extract structured supply information.`
    );

    // 场景信息
    sections.push(`\n## Scene: ${scene}`);

    // 输入文本
    sections.push(`\n## Service Description:\n"""${text}"""`);

    // 提取指令
    sections.push(`\n## Extraction Instructions:`);
    sections.push(`1. Extract the service title and description`);
    sections.push(`2. Identify the service type/category`);

    if (options.includeCapabilities !== false) {
      sections.push(`3. Extract capabilities with expertise levels`);
    }

    if (options.includePricing !== false) {
      sections.push(`4. Extract pricing information (hourly rate, fixed price, or range)`);
    }

    if (options.includeAvailability !== false) {
      sections.push(`5. Extract availability information`);
    }

    if (options.includeLocation !== false) {
      sections.push(`6. Extract location preferences (remote/onsite/hybrid)`);
    }

    if (options.includeExperience !== false) {
      sections.push(`7. Extract experience information`);
    }

    // 输出格式
    sections.push(`\n## Response Format (JSON):`);
    sections.push(`{\n  "title": "Service title",`);
    sections.push(`  "description": "Service description",`);
    sections.push(`  "service_type": "Primary service category",`);
    sections.push(`  "capabilities": [`);
    sections.push(`    {`);
    sections.push(`      "name": "Capability name",`);
    sections.push(`      "description": "What this capability entails",`);
    sections.push(`      "level": "beginner|intermediate|advanced|expert",`);
    sections.push(`      "category": "Category of capability",`);
    sections.push(`      "keywords": ["related", "keywords"]`);
    sections.push(`    }`);
    sections.push(`  ],`);
    sections.push(`  "pricing": {`);
    sections.push(`    "type": "hourly|fixed|range|negotiable",`);
    sections.push(`    "min_rate": 50,`);
    sections.push(`    "max_rate": 150,`);
    sections.push(`    "currency": "USD",`);
    sections.push(`    "unit": "hour",`);
    sections.push(`    "description": "Pricing details"`);
    sections.push(`  },`);
    sections.push(`  "skills": ["Skill 1", "Skill 2"],`);
    sections.push(`  "availability": {`);
    sections.push(`    "schedule": "Availability schedule",`);
    sections.push(`    "timezone": "Timezone",`);
    sections.push(`    "response_time": "Expected response time"`);
    sections.push(`  },`);
    sections.push(`  "location": {`);
    sections.push(`    "city": "City name",`);
    sections.push(`    "country": "Country",`);
    sections.push(`    "remote": true,`);
    sections.push(`    "onsite": false,`);
    sections.push(`    "hybrid": true`);
    sections.push(`  },`);
    sections.push(`  "experience": {`);
    sections.push(`    "years": 5,`);
    sections.push(`    "total_projects": 20,`);
    sections.push(`    "relevant_projects": 10,`);
    sections.push(`    "certifications": ["Cert 1"],`);
    sections.push(`    "portfolio": ["https://example.com/work1"]`);
    sections.push(`  },`);
    sections.push(`  "quality_assessment": {`);
    sections.push(`    "completeness": 85,`);
    sections.push(`    "clarity": 90,`);
    sections.push(`    "relevance": 88,`);
    sections.push(`    "confidence": 87,`);
    sections.push(`    "issues": [`);
    sections.push(`      {`);
    sections.push(`        "type": "missing_field",`);
    sections.push(`        "field": "field_name",`);
    sections.push(`        "message": "Description of issue",`);
    sections.push(`        "severity": "low|medium|high"`);
    sections.push(`      }`);
    sections.push(`    ]`);
    sections.push(`  }`);
    sections.push(`}`);

    sections.push(`\nRespond with ONLY the JSON object, no additional text.`);

    return sections.join('\n');
  }

  /**
   * 解析提取结果
   */
  private parseExtractionResult(text: string): any {
    try {
      // 提取 JSON（处理 markdown 代码块）
      const jsonMatch =
        text.match(/```json\n?([\s\S]*?)\n?```/) ||
        text.match(/```\n?([\s\S]*?)\n?```/) ||
        text.match(/(\{[\s\S]*\})/);

      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;
      return JSON.parse(jsonStr.trim());
    } catch (error) {
      logger.error('Failed to parse extraction result', { error, text });
      throw new Error('Failed to parse extraction result: invalid JSON');
    }
  }

  /**
   * 评估提取质量
   */
  private evaluateQuality(
    extraction: any,
    originalText: string,
    _options: ExtractionOptions
  ): ExtractionQuality {
    const issues: QualityIssue[] = [];
    let completeness = 0;
    let clarity = 0;
    let relevance = 0;

    // 评估完整性
    const requiredFields = ['title', 'description', 'service_type', 'capabilities', 'pricing'];
    const _optionalFields = ['skills', 'availability', 'location', 'experience'];

    const fieldsPresent = requiredFields.filter(f => {
      const value = extraction[f] || extraction[this.toSnakeCase(f)];
      return value !== undefined && value !== null && value !== '';
    }).length;

    completeness = Math.round((fieldsPresent / requiredFields.length) * 100);

    // 评估清晰度
    const textLength = originalText.length;
    if (textLength > 50) clarity += 30;
    if (textLength > 200) clarity += 30;
    if (extraction.description && extraction.description.length > 50) clarity += 40;

    // 评估相关性
    if (extraction.service_type) relevance += 25;
    if (extraction.capabilities && extraction.capabilities.length > 0) relevance += 25;
    if (extraction.skills && extraction.skills.length > 0) relevance += 25;
    if (extraction.pricing && extraction.pricing.type) relevance += 25;

    // 检查问题
    if (!extraction.title || extraction.title.length < 5) {
      issues.push({
        type: 'missing_field',
        field: 'title',
        message: 'Title is missing or too short',
        severity: 'high',
      });
    }

    if (!extraction.pricing || !extraction.pricing.type) {
      issues.push({
        type: 'missing_field',
        field: 'pricing',
        message: 'Pricing information is missing',
        severity: 'medium',
      });
    }

    // 计算置信度
    const confidence =
      extraction.quality_assessment?.confidence ||
      Math.round((completeness + clarity + relevance) / 3);

    return {
      completeness,
      clarity,
      relevance,
      confidence,
      issues,
    };
  }

  /**
   * 构建供给对象
   */
  private buildSupplyObject(extraction: any, quality: ExtractionQuality): Supply {
    const pricing = extraction.pricing || extraction.pricing_info || {};
    const location = extraction.location || {};
    const availability = extraction.availability || {};
    const experience = extraction.experience || {};

    return {
      title: extraction.title || 'Untitled Service',
      description: extraction.description || '',
      serviceType: extraction.service_type || extraction.serviceType || 'general',
      capabilities: (extraction.capabilities || []).map((c: any) => ({
        name: c.name || '',
        description: c.description || '',
        level: c.level || 'intermediate',
        category: c.category || 'general',
        keywords: c.keywords || [],
      })),
      pricing: {
        type: pricing.type || 'negotiable',
        minRate: pricing.min_rate || pricing.minRate,
        maxRate: pricing.max_rate || pricing.maxRate,
        currency: pricing.currency || 'USD',
        unit: pricing.unit || 'hour',
        description: pricing.description || '',
      },
      skills: extraction.skills || [],
      availability: {
        schedule: availability.schedule || '',
        timezone: availability.timezone,
        responseTime: availability.response_time || availability.responseTime,
        leadTime: availability.lead_time || availability.leadTime,
      },
      location: {
        city: location.city,
        country: location.country,
        remote: location.remote ?? true,
        onsite: location.onsite ?? false,
        hybrid: location.hybrid ?? false,
        timezone: location.timezone,
      },
      experience: {
        years: experience.years,
        totalProjects: experience.total_projects || experience.totalProjects,
        relevantProjects: experience.relevant_projects || experience.relevantProjects,
        certifications: experience.certifications || [],
        portfolio: experience.portfolio || [],
      },
      quality: {
        overallScore: Math.round((quality.completeness + quality.clarity + quality.relevance) / 3),
        completenessScore: quality.completeness,
        clarityScore: quality.clarity,
        relevanceScore: quality.relevance,
        confidence: quality.confidence,
      },
    };
  }

  /**
   * 获取已提取的字段
   */
  private getExtractedFields(extraction: any): string[] {
    const fields: string[] = [];
    if (extraction.title) fields.push('title');
    if (extraction.description) fields.push('description');
    if (extraction.service_type || extraction.serviceType) fields.push('serviceType');
    if (extraction.capabilities?.length > 0) fields.push('capabilities');
    if (extraction.pricing || extraction.pricing_info) fields.push('pricing');
    if (extraction.skills?.length > 0) fields.push('skills');
    if (extraction.availability) fields.push('availability');
    if (extraction.location) fields.push('location');
    if (extraction.experience) fields.push('experience');
    return fields;
  }

  /**
   * 获取失败的字段
   */
  private getFailedFields(extraction: any, options: ExtractionOptions): string[] {
    const failed: string[] = [];
    if (!extraction.title) failed.push('title');
    if (!extraction.description) failed.push('description');
    if (!(extraction.service_type || extraction.serviceType)) failed.push('serviceType');
    if (options.includeCapabilities !== false && !extraction.capabilities?.length) {
      failed.push('capabilities');
    }
    if (options.includePricing !== false) {
      const hasPricing =
        (extraction.pricing && Object.keys(extraction.pricing).length > 0) ||
        (extraction.pricing_info && Object.keys(extraction.pricing_info).length > 0);
      if (!hasPricing) {
        failed.push('pricing');
      }
    }
    return failed;
  }

  /**
   * 生成质量报告
   */
  private generateQualityReport(results: SupplyExtractionResult[]): QualityReport {
    if (results.length === 0) {
      return {
        overallQuality: 0,
        averageConfidence: 0,
        averageCompleteness: 0,
        extractionRate: 0,
        issues: [],
        recommendations: ['No results to analyze'],
      };
    }

    const totalConfidence = results.reduce((sum, r) => sum + r.supply.quality.confidence, 0);
    const totalCompleteness = results.reduce(
      (sum, r) => sum + r.supply.quality.completenessScore,
      0
    );

    const allIssues: QualityIssue[] = [];
    results.forEach(r => {
      // 收集所有质量问题
      if (r.fieldsFailed.length > 0) {
        r.fieldsFailed.forEach(field => {
          allIssues.push({
            type: 'missing_field',
            field,
            message: `Missing field in extraction`,
            severity: 'medium',
          });
        });
      }
    });

    const avgConfidence = Math.round(totalConfidence / results.length);
    const avgCompleteness = Math.round(totalCompleteness / results.length);
    const extractionRate = Math.round(
      (results.filter(r => r.success).length / results.length) * 100
    );

    // 生成建议
    const recommendations: string[] = [];
    if (avgConfidence < 70) {
      recommendations.push('Consider providing more detailed service descriptions');
    }
    if (avgCompleteness < 80) {
      recommendations.push('Include pricing and availability information for better extraction');
    }
    if (extractionRate < 90) {
      recommendations.push('Review failed extractions for formatting issues');
    }

    return {
      overallQuality: Math.round((avgConfidence + avgCompleteness + extractionRate) / 3),
      averageConfidence: avgConfidence,
      averageCompleteness: avgCompleteness,
      extractionRate,
      issues: allIssues.slice(0, 10), // 限制问题数量
      recommendations,
    };
  }

  /**
   * 将 camelCase 转换为 snake_case
   */
  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * 获取置信度级别
   */
  getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
    if (confidence >= 80) return 'high';
    if (confidence >= 50) return 'medium';
    return 'low';
  }

  /**
   * 获取质量等级
   */
  getQualityGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }
}

// 导出单例
export const supplyExtractionService = new SupplyExtractionService(createLLMService());
