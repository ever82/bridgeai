/**
 * AgentDate Scene Extractor
 * AgentDate场景提取器 - 交友约会需求
 */

import { logger } from '../../../utils/logger';

import { BaseSceneExtractor } from './baseExtractor';
import { AgentDateData, SceneType, SceneExtractedEntity } from './types';

/**
 * AgentDate Extractor - Handles dating and matchmaking demands
 */
export class AgentDateExtractor extends BaseSceneExtractor<AgentDateData> {
  readonly sceneType: SceneType = 'agentdate';

  protected readonly detectionKeywords = [
    '约会', '相亲', '交友', '脱单', '找对象',
    'date', 'dating', 'matchmaking', 'relationship',
    '男朋友', '女朋友', '伴侣', '另一半',
    '择偶', '标准', '条件', '要求',
  ];

  protected readonly requiredFields = [
    'partnerPreferences',
  ];

  protected readonly optionalFields = [
    'interests',
    'dateTime',
    'dateActivities',
    'budget',
    'personalInfo',
  ];

  /**
   * Extract AgentDate-specific data from text
   */
  async extract(text: string, _context?: Record<string, any>): Promise<AgentDateData> {
    logger.info('Extracting AgentDate demand', { textLength: text.length });

    const entities = this.extractAgentDateEntities(text);
    const structured = this.buildStructuredData(text, entities);

    const data: AgentDateData = {
      scene: 'agentdate',
      entities,
      structured,
      confidence: this.calculateConfidence(entities, structured),
    };

    logger.info('AgentDate extraction completed', {
      confidence: data.confidence,
      entityCount: entities.length,
    });

    return data;
  }

  /**
   * Extract entities specific to AgentDate scene
   */
  private extractAgentDateEntities(text: string): SceneExtractedEntity[] {
    const patterns: Record<string, RegExp[]> = {
      age: [
        /(\d{2})\s*[岁岁]?/g,
        /年龄\s*[在约大概]?\s*(\d{2})/g,
      ],
      height: [
        /(\d{3})\s*厘米/g,
        /身高\s*[在约大概]?\s*(\d{3})/g,
      ],
      education: [
        /(本科|硕士|博士|大专|高中|研究生|海归)/g,
      ],
      occupation: [
        /(医生|教师|工程师|程序员|设计师|销售|管理|公务员|创业)/g,
      ],
      interest: [
        /喜欢\s*([^，。]+)/g,
        /爱好\s*是?\s*([^，。]+)/g,
        /兴趣\s*是?\s*([^，。]+)/g,
      ],
      location: [
        /([\u4e00-\u9fa5]{2,5}(?:市|区|县))/g,
      ],
      budget: [
        /预算\s*[约大概]?\s*(\d+)/g,
        /(\d+)\s*[元块￥$]/g,
      ],
    };

    return this.extractEntitiesWithPatterns(text, patterns);
  }

  /**
   * Build structured AgentDate data from entities
   */
  private buildStructuredData(text: string, entities: SceneExtractedEntity[]): AgentDateData['structured'] {
    const structured: AgentDateData['structured'] = {};

    // Extract partner preferences
    structured.partnerPreferences = this.extractPartnerPreferences(text, entities);

    // Extract interests
    structured.interests = this.extractInterests(text, entities);

    // Extract date time
    structured.dateTime = this.extractDateTime(text);

    // Extract date activities
    structured.dateActivities = this.extractDateActivities(text);

    // Extract budget
    structured.budget = this.parseBudget(text);

    // Extract personal info
    structured.personalInfo = this.extractPersonalInfo(text);

    return structured;
  }

  /**
   * Extract partner preferences from text
   */
  private extractPartnerPreferences(text: string, entities: SceneExtractedEntity[]): AgentDateData['structured']['partnerPreferences'] {
    const preferences: AgentDateData['structured']['partnerPreferences'] = {};

    // Extract age range
    const ageMatch = text.match(/(\d{2})\s*[岁岁]?\s*[-~到至]\s*(\d{2})/);
    if (ageMatch) {
      preferences.ageRange = {
        min: parseInt(ageMatch[1], 10),
        max: parseInt(ageMatch[2], 10),
      };
    } else {
      const singleAgeMatch = text.match(/年龄\s*(\d{2})/);
      if (singleAgeMatch) {
        const age = parseInt(singleAgeMatch[1], 10);
        preferences.ageRange = { min: age - 3, max: age + 3 };
      }
    }

    // Extract height range
    const heightMatch = text.match(/身高\s*(\d{3})\s*[-~到至]\s*(\d{3})/);
    if (heightMatch) {
      preferences.height = {
        min: parseInt(heightMatch[1], 10),
        max: parseInt(heightMatch[2], 10),
      };
    }

    // Extract education preferences
    const educations: string[] = [];
    if (/本科|大学/.test(text)) educations.push('本科');
    if (/硕士/.test(text)) educations.push('硕士');
    if (/博士/.test(text)) educations.push('博士');
    if (/大专/.test(text)) educations.push('大专');
    if (/研究生/.test(text)) educations.push('研究生');
    if (/海归|留学/.test(text)) educations.push('海归');
    if (educations.length > 0) {
      preferences.education = educations;
    }

    // Extract occupation preferences
    const occupations: string[] = [];
    const occupationPatterns = [
      '医生', '教师', '工程师', '程序员', '设计师', '销售',
      '管理', '公务员', '创业', '金融', '律师', '会计',
    ];
    for (const occ of occupationPatterns) {
      if (text.includes(occ)) {
        occupations.push(occ);
      }
    }
    if (occupations.length > 0) {
      preferences.occupation = occupations;
    }

    // Extract location preference
    const location = this.parseLocation(text);
    if (location.city) {
      preferences.location = location.city;
    }

    return preferences;
  }

  /**
   * Extract interests from text
   */
  private extractInterests(text: string, entities: SceneExtractedEntity[]): string[] {
    const interests: string[] = [];

    // Extract interests from patterns
    const interestPatterns = [
      { pattern: /旅游|旅行/, interest: '旅游' },
      { pattern: /电影|观影/, interest: '电影' },
      { pattern: /音乐|听歌|唱歌/, interest: '音乐' },
      { pattern: /阅读|看书|读书/, interest: '阅读' },
      { pattern: /运动|健身|跑步|游泳/, interest: '运动' },
      { pattern: /美食|烹饪|做饭/, interest: '美食' },
      { pattern: /摄影|拍照/, interest: '摄影' },
      { pattern: /游戏|电竞/, interest: '游戏' },
      { pattern: /宠物|猫|狗/, interest: '宠物' },
      { pattern: /户外|徒步|登山/, interest: '户外活动' },
    ];

    for (const { pattern, interest } of interestPatterns) {
      if (pattern.test(text) && !interests.includes(interest)) {
        interests.push(interest);
      }
    }

    // Extract from entities
    for (const entity of entities) {
      if (entity.type === 'interest' && !interests.includes(entity.value)) {
        interests.push(entity.value);
      }
    }

    return interests;
  }

  /**
   * Extract date time from text
   */
  private extractDateTime(text: string): AgentDateData['structured']['dateTime'] {
    const time = this.parseTime(text);

    return {
      date: time.date,
      timeRange: time.timeRange,
      flexibility: time.flexibility,
    };
  }

  /**
   * Extract date activities from text
   */
  private extractDateActivities(text: string): string[] {
    const activities: string[] = [];

    const activityPatterns = [
      { pattern: /吃饭|餐厅|聚餐/, activity: '共进晚餐' },
      { pattern: /电影|影院|看片/, activity: '看电影' },
      { pattern: /咖啡|下午茶|咖啡厅/, activity: '喝咖啡' },
      { pattern: /公园|散步|逛街/, activity: '散步逛街' },
      { pattern: /展览|博物馆|艺术馆/, activity: '看展览' },
      { pattern: /运动|健身|打球/, activity: '运动健身' },
      { pattern: /KTV|唱歌/, activity: 'KTV唱歌' },
      { pattern: /户外|郊游|野餐/, activity: '户外活动' },
    ];

    for (const { pattern, activity } of activityPatterns) {
      if (pattern.test(text) && !activities.includes(activity)) {
        activities.push(activity);
      }
    }

    return activities;
  }

  /**
   * Extract personal info from text
   */
  private extractPersonalInfo(text: string): AgentDateData['structured']['personalInfo'] {
    const info: AgentDateData['structured']['personalInfo'] = {};

    // Extract self introduction
    const introMatch = text.match(/我是\s*([^，。]+)/);
    if (introMatch) {
      info.selfIntroduction = introMatch[1];
    }

    // Extract expectations
    const expectationMatch = text.match(/希望\s*([^，。]+)/);
    if (expectationMatch) {
      info.expectations = expectationMatch[1];
    }

    return info;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(entities: SceneExtractedEntity[], structured: AgentDateData['structured']): number {
    let score = 0.4; // Base score

    // +0.3 for having partner preferences
    if (structured.partnerPreferences &&
        (structured.partnerPreferences.ageRange ||
         structured.partnerPreferences.education ||
         structured.partnerPreferences.occupation)) {
      score += 0.3;
    }

    // +0.1 for having interests
    if (structured.interests && structured.interests.length > 0) {
      score += 0.1;
    }

    // +0.1 for having date time
    if (structured.dateTime?.date || structured.dateTime?.timeRange) {
      score += 0.1;
    }

    // +0.1 for having date activities
    if (structured.dateActivities && structured.dateActivities.length > 0) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Override get clarification question for AgentDate-specific fields
   */
  protected getClarificationQuestion(field: string): string {
    const agentDateQuestions: Record<string, string> = {
      'partnerCriteria': '请问您对理想伴侣有什么要求？（如：年龄、身高、学历、职业等）',
      'partnerPreferences.ageRange': '请问您希望对方的年龄范围是多少？',
      'partnerPreferences.education': '请问您对对方的学历有要求吗？',
      'partnerPreferences.occupation': '请问您希望对方从事什么职业？',
      'interests': '请问您有什么兴趣爱好？（如：旅游、电影、音乐、运动等）',
      'dateTime': '请问您希望在什么时间见面约会？',
      'dateActivities': '请问您希望一起做什么活动？（如：吃饭、看电影、喝咖啡等）',
    };

    return agentDateQuestions[field] || super.getClarificationQuestion(field);
  }
}
