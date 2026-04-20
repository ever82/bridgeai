/**
 * VisionShare Scene Extractor
 * VisionShare场景提取器 - 摄影服务需求
 */

import { logger } from '../../../utils/logger';

import { BaseSceneExtractor } from './baseExtractor';
import { VisionShareData, SceneType, SceneExtractedEntity } from './types';

/**
 * VisionShare Extractor - Handles photography service demands
 */
export class VisionShareExtractor extends BaseSceneExtractor<VisionShareData> {
  readonly sceneType: SceneType = 'visionshare';

  protected readonly detectionKeywords = [
    '摄影',
    '拍照',
    '拍摄',
    '照片',
    '写真',
    '摄影师',
    '模特',
    '服务',
    'photography',
    'photo',
    'shoot',
    'picture',
    'service',
    '摄影棚',
    '外景',
    '内景',
    '婚礼摄影',
    '商业摄影',
    '人像摄影',
    '风景摄影',
  ];

  protected readonly requiredFields = ['photographyType'];

  protected readonly optionalFields = [
    'photographyTime',
    'budget',
    'location',
    'requirements',
    'photographerPreferences',
  ];

  /**
   * Extract VisionShare-specific data from text
   */
  async extract(text: string, _context?: Record<string, any>): Promise<VisionShareData> {
    logger.info('Extracting VisionShare demand', { textLength: text.length });

    const entities = this.extractVisionShareEntities(text);
    const structured = this.buildStructuredData(text, entities);

    const data: VisionShareData = {
      scene: 'visionshare',
      entities,
      structured,
      confidence: this.calculateConfidence(entities, structured),
    };

    logger.info('VisionShare extraction completed', {
      confidence: data.confidence,
      entityCount: entities.length,
    });

    return data;
  }

  /**
   * Extract entities specific to VisionShare scene
   */
  private extractVisionShareEntities(text: string): SceneExtractedEntity[] {
    const patterns: Record<string, RegExp[]> = {
      photographyType: [
        /(婚礼|婚纱|商业|人像|风景|建筑|产品|美食|宠物|儿童|家庭|艺术|时尚|街拍|旅拍|夜景|星空)摄影/g,
        /拍摄(婚纱照|写真|产品照|风景照|人像)/g,
        /(棚拍|外景|室内|室外)/g,
      ],
      photographyTime: [
        /(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}).{0,5}(?:拍|摄影)/g,
        /(?:拍|摄影).{0,5}(\d{4}[-/年]\d{1,2}[-/月]\d{1,2})/g,
        /(早上|上午|下午|傍晚|晚上|凌晨)/g,
      ],
      budget: [
        /预算\s*[约大概]?\s*(\d+)/g,
        /(\d+)\s*[-~到至]\s*(\d+)\s*[元块￥$]/g,
        /(\d+)\s*[元块￥$]/g,
      ],
      location: [/([\u4e00-\u9fa5]{2,5}(?:市|区|县|镇))/g, /(内景|外景|摄影棚|工作室)/g],
      requirement: [
        /需要\s*([^，。]+)(?:风格|效果|感觉)/g,
        /([\u4e00-\u9fa5]{2,8})(?:风格|感觉|效果)/g,
      ],
    };

    return this.extractEntitiesWithPatterns(text, patterns);
  }

  /**
   * Build structured VisionShare data from entities
   */
  private buildStructuredData(
    text: string,
    entities: SceneExtractedEntity[]
  ): VisionShareData['structured'] {
    const structured: VisionShareData['structured'] = {};

    // Extract photography type
    structured.photographyType = this.extractPhotographyType(text, entities);

    // Extract photography time
    structured.photographyTime = this.extractPhotographyTime(text, entities);

    // Extract budget
    structured.budget = this.parseBudget(text);

    // Extract location
    const location: VisionShareData['structured']['location'] = {};

    // Find '区' first, then look backward for district name
    const districtPos = text.indexOf('区');
    if (districtPos > 0) {
      const before = text.substring(0, districtPos);
      // Try common district name lengths (2 chars like 朝阳 first, then 3 like 浦东新)
      let districtName: string | null = null;
      let districtStart = 0;
      for (const len of [3, 2, 4, 1]) {
        const match = before.match(new RegExp(`([\u4e00-\u9fa5]{${len}})$`));
        if (match && !/[省市县省]/.test(match[1].charAt(0))) {
          districtName = match[1];
          districtStart = match.index!;
          break;
        }
      }
      if (districtName) {
        location.district = districtName + '区';
        // Look for city in text before the district start
        const textBeforeDistrict = text.substring(0, districtStart);
        // Try to find city: last 2-3 Chinese chars, stripping common suffixes
        const chineseOnly = textBeforeDistrict.replace(/[^\u4e00-\u9fa5]/g, '');
        const cityCandidate = chineseOnly.match(/([\u4e00-\u9fa5]{2,3})$/);
        if (cityCandidate) {
          // Strip common suffixes (市, 县, etc.) and leading prepositions (在, 从, 到)
          location.city = cityCandidate[1].replace(/^[在从到去回]/, '');
        }
      }
    } else {
      // Fallback to base parseLocation
      const parsedLocation = this.parseLocation(text);
      if (parsedLocation.city) location.city = parsedLocation.city;
      if (parsedLocation.district) location.district = parsedLocation.district;
    }

    const indoorKeyword = /内景|棚拍|室内|摄影棚/.test(text);
    const outdoorKeyword = /外景|户外|室外/.test(text);
    if (location.city || location.district || indoorKeyword || outdoorKeyword) {
      structured.location = {
        ...location,
        indoor: indoorKeyword ? true : outdoorKeyword ? false : undefined,
      };
    }

    // Extract requirements
    structured.requirements = this.extractRequirements(text, entities);

    // Extract photographer preferences
    structured.photographerPreferences = this.extractPhotographerPreferences(text);

    return structured;
  }

  /**
   * Extract photography type from text
   */
  private extractPhotographyType(text: string, entities: SceneExtractedEntity[]): string[] {
    const types: string[] = [];
    const typePatterns = [
      { pattern: /婚礼|婚纱/, type: '婚礼摄影' },
      { pattern: /商业|产品/, type: '商业摄影' },
      { pattern: /人像|肖像/, type: '人像摄影' },
      { pattern: /风景|风光/, type: '风景摄影' },
      { pattern: /建筑|空间/, type: '建筑摄影' },
      { pattern: /美食|餐饮/, type: '美食摄影' },
      { pattern: /宠物|动物/, type: '宠物摄影' },
      { pattern: /儿童|亲子/, type: '儿童摄影' },
      { pattern: /家庭/, type: '家庭摄影' },
      { pattern: /艺术|创意/, type: '艺术摄影' },
      { pattern: /时尚|服装/, type: '时尚摄影' },
      { pattern: /街拍/, type: '街拍摄影' },
      { pattern: /旅拍|旅行/, type: '旅拍摄影' },
      { pattern: /夜景/, type: '夜景摄影' },
      { pattern: /星空/, type: '星空摄影' },
    ];

    for (const { pattern, type } of typePatterns) {
      if (pattern.test(text) && !types.includes(type)) {
        types.push(type);
      }
    }

    // Also check entities
    for (const entity of entities) {
      if (entity.type === 'photographyType' && !types.includes(entity.value)) {
        types.push(entity.value);
      }
    }

    return types.length > 0 ? types : [];
  }

  /**
   * Extract photography time from text
   */
  private extractPhotographyTime(
    text: string,
    _entities: SceneExtractedEntity[]
  ): VisionShareData['structured']['photographyTime'] {
    const time = this.parseTime(text);

    // Determine time of day
    let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' | undefined;
    if (/早上|上午|早晨/.test(text)) {
      timeOfDay = 'morning';
    } else if (/下午|中午/.test(text)) {
      timeOfDay = 'afternoon';
    } else if (/晚上|傍晚|夜间/.test(text)) {
      timeOfDay = 'evening';
    } else if (/半夜|凌晨/.test(text)) {
      timeOfDay = 'night';
    }

    return {
      date: time.date,
      timeOfDay,
      flexibility: time.flexibility,
    };
  }

  /**
   * Extract requirements from text
   */
  private extractRequirements(text: string, _entities: SceneExtractedEntity[]): string[] {
    const requirements: string[] = [];

    // Check for style requirements
    const styleMatch = text.match(/([\u4e00-\u9fa5]{2,8})(?:风格|感觉|效果)/g);
    if (styleMatch) {
      requirements.push(...styleMatch.map(m => m.replace(/风格|感觉|效果/, '') + '风格'));
    }

    // Check for equipment requirements
    if (/专业设备|高端相机|单反/.test(text)) {
      requirements.push('专业摄影设备');
    }

    // Check for post-processing requirements
    if (/精修|后期|修图/.test(text)) {
      requirements.push('包含后期精修');
    }

    return requirements;
  }

  /**
   * Extract photographer preferences from text
   */
  private extractPhotographerPreferences(
    text: string
  ): VisionShareData['structured']['photographerPreferences'] {
    const preferences: VisionShareData['structured']['photographerPreferences'] = {};

    // Extract style preferences
    const styles: string[] = [];
    if (/自然|纪实/.test(text)) styles.push('自然纪实');
    if (/唯美|浪漫/.test(text)) styles.push('唯美浪漫');
    if (/时尚|潮流/.test(text)) styles.push('时尚潮流');
    if (/复古|文艺/.test(text)) styles.push('复古文艺');
    if (styles.length > 0) {
      preferences.style = styles;
    }

    // Extract experience requirements
    if (/资深|经验丰富|专业/.test(text)) {
      preferences.experience = '资深摄影师';
    } else if (/新手|入门/.test(text)) {
      preferences.experience = '新手摄影师';
    }

    // Extract equipment preferences
    const equipment: string[] = [];
    if (/佳能|Canon/.test(text)) equipment.push('佳能');
    if (/尼康|Nikon/.test(text)) equipment.push('尼康');
    if (/索尼|Sony/.test(text)) equipment.push('索尼');
    if (/富士|Fujifilm/.test(text)) equipment.push('富士');
    if (equipment.length > 0) {
      preferences.equipment = equipment;
    }

    return preferences;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(
    entities: SceneExtractedEntity[],
    structured: VisionShareData['structured']
  ): number {
    let score = 0.5; // Base score

    // +0.2 for having photography type
    if (structured.photographyType && structured.photographyType.length > 0) {
      score += 0.2;
    }

    // +0.1 for having time
    if (structured.photographyTime?.date || structured.photographyTime?.timeOfDay) {
      score += 0.1;
    }

    // +0.1 for having budget
    if (structured.budget?.min || structured.budget?.max) {
      score += 0.1;
    }

    // +0.1 for having location
    if (structured.location?.city || structured.location?.address) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Override get clarification question for VisionShare-specific fields
   */
  protected getClarificationQuestion(field: string): string {
    const visionShareQuestions: Record<string, string> = {
      photographyTime: '请问您希望在什么时间拍摄？（如：下周六下午、下个月等）',
      photographyType: '请问您需要什么摄影类型的服务？（如：人像写真、婚礼摄影、商业拍摄等）',
      'photographerPreferences.style': '请问您希望拍摄什么风格的照片？（如：自然、唯美、时尚等）',
      'photographerPreferences.experience': '请问您对摄影师的经验有要求吗？',
      'location.indoor': '请问您希望在室内棚拍还是外景拍摄？',
    };

    return visionShareQuestions[field] || super.getClarificationQuestion(field);
  }
}
