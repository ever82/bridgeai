/**
 * AgentJob Extractor
 * 招聘求职场景提取器 - 提取技能、经验、薪资期望等信息
 */

import { BaseSceneExtractor, SceneType } from './base';
import { Demand, DemandExtractionRequest, ExtractedEntity } from '../demandExtractionService';
import { logger } from '../../../utils/logger';

/**
 * AgentJob Specific Fields
 */
export interface AgentJobFields {
  jobType: 'hire' | 'seek' | '';
  position: string;
  jobCategory: string;
  skills: string[];
  experienceYears: { min?: number; max?: number };
  educationRequirement: string;
  salaryRange: { min?: number; max?: number; currency: string; unit: string };
  location: string;
  workType: string;
  companySize: string;
  companyIndustry: string;
  benefits: string[];
  responsibilities: string[];
  startDate: string;
  urgency: string;
}

export class AgentJobExtractor extends BaseSceneExtractor {
  protected sceneType: SceneType = 'agentjob';
  protected requiredFields = [
    'structured.title',
    'structured.people.roles',
    'structured.budget.max'
  ];

  async extract(request: DemandExtractionRequest): Promise<Partial<Demand>> {
    const startTime = Date.now();
    const { text } = request;

    logger.info('AgentJob extraction started', { textLength: text.length });

    try {
      const prompt = this.buildExtractionPrompt(text);
      const llmResult = await this.callLLM(prompt, { temperature: 0.3, maxTokens: 1200 });

      const extractedData = this.parseAgentJobData(llmResult.text);
      const demand = this.buildAgentJobDemand(text, extractedData);

      demand.metadata!.latencyMs = Date.now() - startTime;

      logger.info('AgentJob extraction completed', {
        jobType: extractedData.jobType,
        position: extractedData.position,
        hasSalary: !!(extractedData.salaryRange?.min || extractedData.salaryRange?.max),
        latencyMs: demand.metadata!.latencyMs
      });

      return demand;
    } catch (error) {
      logger.error('AgentJob extraction failed', { error, text });
      return this.buildBaseDemand(text, 'agentjob');
    }
  }

  private buildExtractionPrompt(text: string): string {
    return `You are a specialized extractor for AgentJob recruitment/job search demands. Extract the following information from the user's message.

User Message: "${text}"

Determine if this is a hiring demand (雇主招聘) or job seeking demand (求职者找工作), then extract and return as JSON:
{
  "jobType": "hire" or "seek",
  "position": "职位名称 (e.g., Java开发工程师, 产品经理, 销售代表)",
  "jobCategory": "职位类别 (e.g., 技术, 产品, 运营, 销售, 设计)",
  "skills": ["技能要求列表 (e.g., Java, Python, React, 数据分析)"],
  "experienceYears": {
    "min": 最少经验年数 (number, optional),
    "max": 最多经验年数 (number, optional)
  },
  "educationRequirement": "学历要求 (e.g., 本科及以上, 大专, 不限)",
  "salaryRange": {
    "min": 最低薪资 (number, optional),
    "max": 最高薪资 (number, optional),
    "currency": "货币 (CNY or USD, default: CNY)",
    "unit": "薪资单位 (monthly/yearly/hourly, default: monthly)"
  },
  "location": "工作地点",
  "workType": "工作类型 (e.g., 全职, 兼职, 实习, 远程办公)",
  "companySize": "公司规模 (e.g., 初创, 中型, 大型)",
  "companyIndustry": "行业领域 (e.g., 互联网, 金融, 教育)",
  "benefits": ["福利待遇列表 (e.g., 五险一金, 年终奖, 股票期权)"],
  "responsibilities": ["工作职责列表"],
  "startDate": "入职时间 (ISO format or description)",
  "urgency": "紧急程度 (e.g., 急招, 尽快入职, 可协商)",
  "title": "生成的需求标题",
  "description": "详细描述"
}

Important:
1. Identify whether user is hiring or job seeking
2. Extract all job-related requirements
3. Salary should be monthly in CNY unless specified otherwise
4. Return ONLY the JSON object"`;
  }

  private parseAgentJobData(text: string): Partial<AgentJobFields> {
    const defaultData: Partial<AgentJobFields> = {
      jobType: '',
      position: '',
      jobCategory: '',
      skills: [],
      experienceYears: {},
      educationRequirement: '',
      salaryRange: { currency: 'CNY', unit: 'monthly' },
      location: '',
      workType: '',
      companySize: '',
      companyIndustry: '',
      benefits: [],
      responsibilities: [],
      startDate: '',
      urgency: ''
    };

    return this.parseJSONResponse(text, defaultData);
  }

  private buildAgentJobDemand(text: string, data: Partial<AgentJobFields>): Partial<Demand> {
    const entities: ExtractedEntity[] = [];

    if (data.position) {
      entities.push({
        type: 'requirement',
        value: data.position,
        normalizedValue: data.position,
        startIndex: text.indexOf(data.position) >= 0 ? text.indexOf(data.position) : 0,
        endIndex: text.indexOf(data.position) >= 0 ? text.indexOf(data.position) + data.position.length : 0,
        confidence: 0.95
      });
    }

    if (data.location) {
      entities.push({
        type: 'location',
        value: data.location,
        normalizedValue: data.location,
        startIndex: text.indexOf(data.location) >= 0 ? text.indexOf(data.location) : 0,
        endIndex: text.indexOf(data.location) >= 0 ? text.indexOf(data.location) + data.location.length : 0,
        confidence: 0.9
      });
    }

    const demand = this.buildBaseDemand(text, 'agentjob');

    demand.structured = {
      title: data.title || `${data.position || (data.jobType === 'hire' ? '招聘' : '求职')}需求`,
      description: data.description || text,
      location: { city: data.location },
      time: {
        startTime: data.startDate,
        flexibility: data.urgency?.includes('急') ? 'strict' : 'flexible'
      },
      people: {
        count: data.jobType === 'hire' ? undefined : 1,
        roles: data.position ? [data.position] : []
      },
      budget: data.salaryRange ? {
        min: data.salaryRange.min,
        max: data.salaryRange.max,
        currency: data.salaryRange.currency || 'CNY',
        unit: data.salaryRange.unit || 'monthly'
      } : {},
      requirements: [
        ...(data.skills || []),
        ...(data.educationRequirement ? [`学历: ${data.educationRequirement}`] : []),
        ...(data.workType ? [`工作类型: ${data.workType}`] : [])
      ],
      preferences: [
        ...(data.benefits || []),
        ...(data.companyIndustry ? [`行业: ${data.companyIndustry}`] : []),
        ...(data.companySize ? [`公司规模: ${data.companySize}`] : [])
      ].filter(Boolean),
      constraints: [
        ...(data.experienceYears?.min ? [`经验: ${data.experienceYears.min}-${data.experienceYears.max || '不限'}年`] : [])
      ].filter(Boolean)
    };

    demand.entities = entities;
    demand.confidence = this.calculateConfidence(data);

    const validation = this.validateExtraction(demand);
    demand.clarificationNeeded = !validation.valid;
    demand.clarificationQuestions = this.generateQuestions(validation.missingFields, data.jobType);

    return demand;
  }

  private calculateConfidence(data: Partial<AgentJobFields>): number {
    const fields = [
      data.position,
      data.jobType,
      data.skills?.length,
      data.salaryRange?.min || data.salaryRange?.max,
      data.location
    ];
    const filledFields = fields.filter(f => f !== undefined && f !== '' && f !== null && f !== 0).length;
    return Math.round((filledFields / fields.length) * 100) / 100;
  }

  private generateQuestions(missingFields: string[], jobType?: string): string[] {
    const fieldToQuestion: Record<string, string> = {
      'structured.title': jobType === 'hire'
        ? '请描述您要招聘的职位（如：招聘Java开发工程师）'
        : '请描述您要找的工作类型（如：寻找产品经理职位）',
      'structured.people.roles': '请问是什么职位？',
      'structured.budget.max': jobType === 'hire'
        ? '请问提供的薪资范围是多少？'
        : '请问您的期望薪资是多少？'
    };

    return missingFields
      .map(field => fieldToQuestion[field])
      .filter(Boolean) as string[];
  }
}

// Export singleton instance
export const agentJobExtractor = new AgentJobExtractor();
