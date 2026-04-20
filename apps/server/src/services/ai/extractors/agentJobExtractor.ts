/**
 * AgentJob Scene Extractor
 * AgentJob场景提取器 - 求职招聘需求
 */

import { logger } from '../../../utils/logger';

import { BaseSceneExtractor } from './baseExtractor';
import { AgentJobData, SceneType, SceneExtractedEntity } from './types';

/**
 * AgentJob Extractor - Handles job search and recruitment demands
 */
export class AgentJobExtractor extends BaseSceneExtractor<AgentJobData> {
  readonly sceneType: SceneType = 'agentjob';

  protected readonly detectionKeywords = [
    '工作', '求职', '招聘', '找工作', '应聘',
    'job', 'work', 'career', 'employment', 'hire',
    '职位', '岗位', '薪资', '工资', '待遇',
    '经验', '技能', '简历', '面试', 'offer',
    '全职', '兼职', '实习', '自由职业', '远程',
    '开发', '编程', '工程师', '设计师', '经理',
  ];

  protected readonly requiredFields = [
    'skills',
    'salaryExpectation',
  ];

  protected readonly optionalFields = [
    'experience',
    'jobType',
    'location',
    'requirements',
    'benefits',
  ];

  /**
   * Extract AgentJob-specific data from text
   */
  async extract(text: string, _context?: Record<string, any>): Promise<AgentJobData> {
    logger.info('Extracting AgentJob demand', { textLength: text.length });

    const entities = this.extractAgentJobEntities(text);
    const structured = this.buildStructuredData(text, entities);

    const data: AgentJobData = {
      scene: 'agentjob',
      entities,
      structured,
      confidence: this.calculateConfidence(entities, structured),
    };

    logger.info('AgentJob extraction completed', {
      confidence: data.confidence,
      entityCount: entities.length,
    });

    return data;
  }

  /**
   * Extract entities specific to AgentJob scene
   */
  private extractAgentJobEntities(text: string): SceneExtractedEntity[] {
    const patterns: Record<string, RegExp[]> = {
      skill: [
        /(编程|开发|设计|营销|销售|管理|财务|人力资源|运营|产品)/g,
        /(Java|Python|JavaScript|React|Vue|Node\.js|SQL|AI|数据分析)/gi,
        /(英语|日语|韩语|法语|德语|西班牙语)/g,
      ],
      experience: [
        /(\d+)\s*年\s*经验/g,
        /经验\s*(\d+)\s*年/g,
        /工作\s*(\d+)\s*年/g,
      ],
      salary: [
        /薪资\s*[约大概]?\s*(\d+)/g,
        /(\d+)\s*[-~到至]\s*(\d+)\s*[Kk千]/g,
        /(\d+)\s*[Kk千万]/g,
        /(\d+)\s*[元块￥$]\s*\/\s*(月|年|天|小时)/g,
      ],
      jobType: [
        /(全职|兼职|实习|自由职业|远程|外包)/g,
      ],
      location: [
        /([\u4e00-\u9fa5]{2,5}(?:市|区|县))/g,
        /(远程|在家|线上|居家)/g,
      ],
      benefit: [
        /(五险一金|社保|公积金|医疗保险|年假|带薪)/g,
        /(双休|单休|弹性|加班)/g,
      ],
    };

    return this.extractEntitiesWithPatterns(text, patterns);
  }

  /**
   * Build structured AgentJob data from entities
   */
  private buildStructuredData(text: string, entities: SceneExtractedEntity[]): AgentJobData['structured'] {
    const structured: AgentJobData['structured'] = {};

    // Extract skills
    structured.skills = this.extractSkills(text, entities);

    // Extract experience
    structured.experience = this.extractExperience(text, entities);

    // Extract salary expectation
    structured.salaryExpectation = this.extractSalaryExpectation(text, entities);

    // Extract job type
    structured.jobType = this.extractJobType(text, entities);

    // Extract location
    structured.location = this.extractLocation(text, entities);

    // Extract requirements
    structured.requirements = this.extractRequirements(text);

    // Extract benefits
    structured.benefits = this.extractBenefits(text, entities);

    return structured;
  }

  /**
   * Extract skills from text
   */
  private extractSkills(text: string, entities: SceneExtractedEntity[]): string[] {
    const skills: string[] = [];

    // Technical skills
    const techSkills = [
      'Java', 'Python', 'JavaScript', 'TypeScript', 'React', 'Vue',
      'Node.js', 'SQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes',
      'AWS', 'Azure', 'GCP', 'Linux', 'Git', 'CI/CD',
      'AI', '机器学习', '深度学习', '数据分析', '数据科学',
      '产品设计', 'UI设计', 'UX设计', '平面设计', '3D设计',
    ];

    for (const skill of techSkills) {
      if (new RegExp(skill, 'i').test(text) && !skills.includes(skill)) {
        skills.push(skill);
      }
    }

    // Language skills
    const languages = [
      '英语', '日语', '韩语', '法语', '德语', '西班牙语',
      '俄语', '意大利语', '葡萄牙语', '阿拉伯语',
    ];

    for (const lang of languages) {
      if (text.includes(lang) && !skills.includes(lang)) {
        skills.push(lang);
      }
    }

    // Soft skills
    const softSkills = [
      '沟通', '协调', '管理', '领导', '团队合作',
      '项目管理', '时间管理', '问题解决', '创新',
    ];

    for (const skill of softSkills) {
      if (text.includes(skill) && !skills.includes(skill)) {
        skills.push(skill);
      }
    }

    // Extract from entities
    for (const entity of entities) {
      if (entity.type === 'skill' && !skills.includes(entity.value)) {
        skills.push(entity.value);
      }
    }

    return skills;
  }

  /**
   * Extract experience from text
   */
  private extractExperience(text: string, entities: SceneExtractedEntity[]): AgentJobData['structured']['experience'] {
    const experience: AgentJobData['structured']['experience'] = {};

    // Extract years of experience
    const yearsMatch = text.match(/(\d+)\s*年\s*(?:工作)?(?:经验)?/);
    if (yearsMatch) {
      experience.years = parseInt(yearsMatch[1], 10);
    }

    // Determine experience level
    if (/应届生|毕业生|无经验/.test(text)) {
      experience.level = 'junior';
    } else if (/资深|高级|专家|总监/.test(text)) {
      experience.level = 'expert';
    } else if (/中级|熟练/.test(text)) {
      experience.level = 'mid';
    } else if (/初级|入门/.test(text)) {
      experience.level = 'junior';
    }

    // Extract industry experience
    const industries: string[] = [];
    const industryPatterns = [
      '互联网', '金融', '电商', '教育', '医疗', '制造业',
      '房地产', '汽车', '游戏', '广告', '咨询', '法律',
    ];

    for (const industry of industryPatterns) {
      if (text.includes(industry) && !industries.includes(industry)) {
        industries.push(industry);
      }
    }

    if (industries.length > 0) {
      experience.industries = industries;
    }

    return experience;
  }

  /**
   * Extract salary expectation from text
   */
  private extractSalaryExpectation(text: string, entities: SceneExtractedEntity[]): AgentJobData['structured']['salaryExpectation'] {
    const salary: AgentJobData['structured']['salaryExpectation'] = {
      currency: text.includes('$') || text.includes('USD') ? 'USD' : 'CNY',
      period: 'monthly',
    };

    // Determine period - be careful not to match '年' in '薪资'
    if (/年薪|一年|\/年|per year/i.test(text)) {
      salary.period = 'yearly';
    } else if (/天/.test(text)) {
      salary.period = 'daily';
    } else if (/小时/.test(text)) {
      salary.period = 'hourly';
    }

    // Extract salary range - handle patterns like "20K-30K" or "20-30K"
    const salaryRangeMatch = text.match(/(\d+)\s*[Kk千]?\s*[-~到至]\s*(\d+)\s*[Kk千]/);
    if (salaryRangeMatch) {
      const multiplier = salary.period === 'yearly' ? 10000 : 1000;
      salary.min = parseInt(salaryRangeMatch[1], 10) * multiplier;
      salary.max = parseInt(salaryRangeMatch[2], 10) * multiplier;
    } else {
      // Single value with K
      const singleMatch = text.match(/(\d+)\s*[Kk千]/);
      if (singleMatch) {
        const multiplier = salary.period === 'yearly' ? 10000 : 1000;
        salary.max = parseInt(singleMatch[1], 10) * multiplier;
      } else {
        // Regular number
        const regularMatch = text.match(/(\d{4,6})/);
        if (regularMatch) {
          const value = parseInt(regularMatch[1], 10);
          salary.max = value < 100 ? value * 1000 : value;
        }
      }
    }

    return salary;
  }

  /**
   * Extract job type from text
   */
  private extractJobType(text: string, _entities: SceneExtractedEntity[]): string[] {
    const types: string[] = [];

    const typePatterns = [
      { pattern: /全职/, type: '全职' },
      { pattern: /兼职|part-time/, type: '兼职' },
      { pattern: /实习|intern/, type: '实习' },
      { pattern: /自由职业|freelance|自由工作者/, type: '自由职业' },
      { pattern: /远程|在家|居家|remote/, type: '远程工作' },
      { pattern: /外包|外包/, type: '外包' },
    ];

    for (const { pattern, type } of typePatterns) {
      if (pattern.test(text) && !types.includes(type)) {
        types.push(type);
      }
    }

    return types.length > 0 ? types : ['全职'];
  }

  /**
   * Extract location from text
   */
  private extractLocation(text: string, entities: SceneExtractedEntity[]): AgentJobData['structured']['location'] {
    const location: AgentJobData['structured']['location'] = {};

    // Check for remote work
    if (/远程|在家|居家|线上|remote/.test(text)) {
      location.remote = true;
    }

    // Extract city and district
    const parsedLocation = this.parseLocation(text);
    if (parsedLocation.city) {
      location.city = parsedLocation.city;
    }
    if (parsedLocation.district) {
      location.district = parsedLocation.district;
    }

    return location;
  }

  /**
   * Extract requirements from text
   */
  private extractRequirements(text: string): string[] {
    const requirements: string[] = [];

    // Check for specific requirements
    if (/本科|大学|学历/.test(text)) {
      requirements.push('本科学历及以上');
    }
    if (/硕士|研究生/.test(text)) {
      requirements.push('硕士学历');
    }
    if (/英语|CET/.test(text)) {
      requirements.push('英语能力');
    }
    if (/驾照|驾驶/.test(text)) {
      requirements.push('驾照');
    }
    if (/出差|travel/.test(text)) {
      requirements.push('接受出差');
    }
    if (/加班|overtime/.test(text)) {
      requirements.push('接受加班');
    }

    return requirements;
  }

  /**
   * Extract benefits from text
   */
  private extractBenefits(text: string, entities: SceneExtractedEntity[]): string[] {
    const benefits: string[] = [];

    // Standard benefits
    if (/五险一金|社保/.test(text)) {
      benefits.push('五险一金');
    }
    if (/公积金/.test(text)) {
      benefits.push('住房公积金');
    }
    if (/医疗保险|医保/.test(text)) {
      benefits.push('医疗保险');
    }
    if (/年假/.test(text)) {
      benefits.push('年假');
    }
    if (/带薪/.test(text)) {
      benefits.push('带薪年假');
    }
    if (/双休/.test(text)) {
      benefits.push('双休');
    }
    if (/弹性/.test(text)) {
      benefits.push('弹性工作');
    }
    if (/餐补|饭补|食堂/.test(text)) {
      benefits.push('餐饮补贴');
    }
    if (/交通|通勤/.test(text)) {
      benefits.push('交通补贴');
    }
    if (/年终奖|奖金|bonus/.test(text)) {
      benefits.push('年终奖金');
    }
    if (/股票|期权|股权/.test(text)) {
      benefits.push('股票期权');
    }

    return benefits;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(entities: SceneExtractedEntity[], structured: AgentJobData['structured']): number {
    let score = 0.4; // Base score

    // +0.2 for having skills
    if (structured.skills && structured.skills.length > 0) {
      score += 0.2;
    }

    // +0.2 for having salary expectation
    if (structured.salaryExpectation?.min || structured.salaryExpectation?.max) {
      score += 0.2;
    }

    // +0.1 for having experience
    if (structured.experience?.years || structured.experience?.level) {
      score += 0.1;
    }

    // +0.1 for having job type
    if (structured.jobType && structured.jobType.length > 0) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Override get clarification question for AgentJob-specific fields
   */
  protected getClarificationQuestion(field: string): string {
    const agentJobQuestions: Record<string, string> = {
      'skills': '请问您具备哪些技能？（如：编程语言、设计软件、专业证书等）',
      'experience.years': '请问您有多少年工作经验？',
      'experience.level': '请问您希望找什么级别的工作？（如：初级、中级、高级、资深）',
      'salaryExpectation': '请问您的薪资期望是多少？（如：15K-25K/月、年薪30万等）',
      'salaryExpectation.period': '请问您期望的薪资是按月薪还是年薪计算？',
      'jobType': '请问您希望找什么类型的工作？（如：全职、兼职、实习、远程等）',
      'location.remote': '请问您接受远程工作吗？',
    };

    return agentJobQuestions[field] || super.getClarificationQuestion(field);
  }
}
