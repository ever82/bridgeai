/**
 * VisionShare Supply Extractor
 * VisionShare 供给提取器 - 摄影师/服务提供者的供给信息提取
 */

import { logger } from '../../../../utils/logger';

import { BaseSupplyExtractor } from './baseSupplyExtractor';
import { VisionShareSupplyData, SupplySceneType, SupplyQualification } from './types';

/**
 * VisionShare Supply Extractor
 * Extracts photographer supply information (equipment, experience, style, pricing)
 */
export class VisionShareSupplyExtractor extends BaseSupplyExtractor<VisionShareSupplyData> {
  private readonly sceneTypeValue: SupplySceneType = 'visionshare';

  protected readonly detectionKeywords = [
    '摄影师', '摄影服务', '拍照服务', '拍摄服务',
    '写真拍摄', '婚纱摄影', '商业摄影', '人像摄影',
    '摄影棚', '工作室', '影棚',
    '镜头', '相机', '单反', '微单',
    '后期修图', '修片', '调色',
    '摄影作品', '作品集', '样片',
    '摄影师求职', '接单', '约拍',
  ];

  protected readonly requiredFields = [
    'experience',
    'style',
  ];

  protected readonly optionalFields = [
    'equipment',
    'pricing',
    'availability',
    'qualification',
  ];

  getSceneType(): SupplySceneType {
    return this.sceneTypeValue;
  }

  /**
   * Extract VisionShare supply data from text
   */
  async extract(text: string, context?: Record<string, any>): Promise<VisionShareSupplyData> {
    logger.info('Extracting VisionShare supply', { textLength: text.length });

    const keywords = this.extractKeywords(text);
    const equipment = this.extractEquipment(text);
    const experience = this.extractExperience(text);
    const style = this.extractStyle(text);
    const pricing = this.extractPricing(text);
    const availability = this.extractAvailability(text);
    const qualification = this.extractQualification(text, experience, style);

    // Count extracted fields for quality metrics
    let extractedFields = 0;
    const totalFields = 5;
    if (equipment.cameras.length > 0 || equipment.lenses.length > 0) extractedFields++;
    if (experience.years > 0 || experience.photographyTypes.length > 0) extractedFields++;
    if (style.primary) extractedFields++;
    if (pricing) extractedFields++;
    if (availability) extractedFields++;

    const qualityMetrics = this.calculateQualityMetrics(
      extractedFields,
      totalFields,
      pricing !== undefined,
      experience.portfolio.length > 0,
    );

    const confidence = this.calculateConfidence(experience, style, equipment);

    const data: VisionShareSupplyData = {
      scene: 'visionshare',
      rawText: text,
      qualification,
      qualityMetrics,
      confidence,
      keywords,
      equipment,
      experience,
      style,
      pricing,
      availability,
    };

    logger.info('VisionShare supply extraction completed', {
      confidence,
      equipmentCount: equipment.cameras.length + equipment.lenses.length,
      experienceYears: experience.years,
    });

    return data;
  }

  /**
   * Extract equipment information
   */
  private extractEquipment(text: string): VisionShareSupplyData['equipment'] {
    const cameras: string[] = [];
    const lenses: string[] = [];
    const lighting: string[] = [];
    const other: string[] = [];

    // Camera brands and models
    const cameraPatterns = [
      { pattern: /佳能|Canon\s*(\w+)?/gi, name: (m: RegExpMatchArray) => m[0] },
      { pattern: /尼康|Nikon\s*(\w+)?/gi, name: (m: RegExpMatchArray) => m[0] },
      { pattern: /索尼|Sony\s*(\w+)?/gi, name: (m: RegExpMatchArray) => m[0] },
      { pattern: /富士|Fujifilm\s*(\w+)?/gi, name: (m: RegExpMatchArray) => m[0] },
      { pattern: /徕卡|Leica\s*(\w+)?/gi, name: (m: RegExpMatchArray) => m[0] },
      { pattern: /哈苏|Hasselblad/gi, name: (m: RegExpMatchArray) => m[0] },
      { pattern: /单反/g, name: () => '单反相机' },
      { pattern: /微单|无反/g, name: () => '微单相机' },
      { pattern: /中画幅/g, name: () => '中画幅相机' },
    ];

    for (const { pattern, name } of cameraPatterns) {
      const match = text.match(pattern);
      if (match && !cameras.includes(name(match))) {
        cameras.push(name(match));
      }
    }

    // Lenses
    const lensPatterns = [
      /(\d+)mm/g,
      /(\d+)-(\d+)mm/g,
      /定焦/g,
      /变焦/g,
      /广角/g,
      /长焦/g,
      /鱼眼/g,
      /50mm/g,
      /85mm/g,
      /35mm/g,
      /24-70/g,
      /70-200/g,
    ];

    for (const pattern of lensPatterns) {
      const match = text.match(pattern);
      if (match && !lenses.includes(match[0])) {
        lenses.push(match[0]);
      }
    }

    // Lighting
    if (/闪光灯|外闪/.test(text)) lighting.push('闪光灯');
    if (/柔光箱/.test(text)) lighting.push('柔光箱');
    if (/反光板/.test(text)) lighting.push('反光板');
    if (/补光灯|LED/.test(text)) lighting.push('补光灯');
    if (/影棚灯|摄影灯/.test(text)) lighting.push('影棚灯');

    // Other equipment
    if (/无人机|航拍|大疆|DJI/.test(text)) other.push('无人机');
    if (/稳定器|云台/.test(text)) other.push('稳定器');
    if (/三脚架|脚架/.test(text)) other.push('三脚架');
    if (/滑轨|轨道/.test(text)) other.push('滑轨');
    if (/绿幕|蓝幕/.test(text)) other.push('绿幕');

    return { cameras, lenses, lighting, other };
  }

  /**
   * Extract experience information
   */
  private extractExperience(text: string): VisionShareSupplyData['experience'] {
    const years = this.parseExperienceYears(text);
    const photographyTypes: string[] = [];
    const portfolio: string[] = [];
    const notableProjects: string[] = [];

    // Photography types
    const typePatterns = [
      { pattern: /婚礼|婚纱/, type: '婚礼摄影' },
      { pattern: /人像|写真|肖像/, type: '人像摄影' },
      { pattern: /商业|产品|广告/, type: '商业摄影' },
      { pattern: /风景|风光/, type: '风景摄影' },
      { pattern: /建筑|空间/, type: '建筑摄影' },
      { pattern: /美食|餐饮|食品/, type: '美食摄影' },
      { pattern: /宠物|动物/, type: '宠物摄影' },
      { pattern: /儿童|亲子/, type: '儿童摄影' },
      { pattern: /时尚|服装/, type: '时尚摄影' },
      { pattern: /旅拍|旅行/, type: '旅拍摄影' },
      { pattern: /活动|会议|庆典/, type: '活动摄影' },
      { pattern: /证件照|形象照/, type: '证件照' },
    ];

    for (const { pattern, type } of typePatterns) {
      if (pattern.test(text) && !photographyTypes.includes(type)) {
        photographyTypes.push(type);
      }
    }

    // Portfolio
    const portfolioMatch = text.match(/(?:作品|样片|案例)[：:]\s*([^，。]+(?:，[^，。]+)*)/);
    if (portfolioMatch) {
      portfolio.push(...portfolioMatch[1].split(/[,，、]/).map(s => s.trim()).filter(Boolean));
    }

    // Notable projects
    const projectMatch = text.match(/(?:代表|主要|知名)\s*(?:项目|作品|案例)[：:]\s*([^。]+(?:，[^。]+)*)/);
    if (projectMatch) {
      notableProjects.push(...projectMatch[1].split(/[,，、]/).map(s => s.trim()).filter(Boolean));
    }

    return { years, photographyTypes, portfolio, notableProjects };
  }

  /**
   * Extract style information
   */
  private extractStyle(text: string): VisionShareSupplyData['style'] {
    let primary = '';
    const secondary: string[] = [];
    const techniques: string[] = [];

    const stylePatterns = [
      { pattern: /自然|纪实|抓拍/, style: '自然纪实' },
      { pattern: /唯美|浪漫|甜蜜/, style: '唯美浪漫' },
      { pattern: /时尚|潮流|前卫/, style: '时尚前卫' },
      { pattern: /复古|文艺|怀旧|胶片/, style: '复古文艺' },
      { pattern: /清新|日系|小清新/, style: '清新日系' },
      { pattern: /大气|高端|商务/, style: '高端大气' },
      { pattern: /创意|艺术|抽象/, style: '创意艺术' },
      { pattern: /韩式|ins风/, style: '韩式ins风' },
    ];

    for (const { pattern, style } of stylePatterns) {
      if (pattern.test(text)) {
        if (!primary) {
          primary = style;
        } else if (!secondary.includes(style)) {
          secondary.push(style);
        }
      }
    }

    if (!primary) {
      primary = '自然纪实'; // default
    }

    // Techniques
    if (/HDR/.test(text)) techniques.push('HDR');
    if (/延时/.test(text)) techniques.push('延时摄影');
    if (/慢门|长曝光/.test(text)) techniques.push('长曝光');
    if (/双重曝光/.test(text)) techniques.push('双重曝光');
    if (/航拍/.test(text)) techniques.push('航拍');
    if (/全景/.test(text)) techniques.push('全景');

    return { primary, secondary, techniques };
  }

  /**
   * Extract pricing information
   */
  private extractPricing(text: string): VisionShareSupplyData['pricing'] | undefined {
    const pricing: VisionShareSupplyData['pricing'] = {};
    let hasAnyPricing = false;

    // Portrait pricing
    if (/人像|写真|肖像/.test(text)) {
      const p = this.parsePricing(text);
      if (p) {
        pricing.portrait = p;
        hasAnyPricing = true;
      }
    }

    // Wedding pricing
    if (/婚礼|婚纱|婚拍/.test(text)) {
      const p = this.parsePricing(text);
      if (p) {
        pricing.wedding = p;
        hasAnyPricing = true;
      }
    }

    // Commercial pricing
    if (/商业|产品|广告/.test(text)) {
      const p = this.parsePricing(text);
      if (p) {
        pricing.commercial = p;
        hasAnyPricing = true;
      }
    }

    // General pricing (no specific type)
    if (!hasAnyPricing) {
      const p = this.parsePricing(text);
      if (p) {
        pricing.other = p;
        hasAnyPricing = true;
      }
    }

    return hasAnyPricing ? pricing : undefined;
  }

  /**
   * Extract availability information
   */
  private extractAvailability(text: string): VisionShareSupplyData['availability'] | undefined {
    const availability: VisionShareSupplyData['availability'] = {
      weekdays: false,
      weekends: false,
      evenings: false,
      travel: false,
    };

    let hasAny = false;

    if (/工作日|平时|周一到周五|周一至周五/.test(text)) {
      availability.weekdays = true;
      hasAny = true;
    }
    if (/周末|周六日|双休/.test(text)) {
      availability.weekends = true;
      hasAny = true;
    }
    if (/晚上|下班后|夜间|傍晚/.test(text)) {
      availability.evenings = true;
      hasAny = true;
    }
    if (/出差|外拍|旅拍|外地|可到/.test(text)) {
      availability.travel = true;
      hasAny = true;
    }

    // If text mentions availability but no specific times
    if (!hasAny && /时间灵活|随时|可约/.test(text)) {
      availability.weekdays = true;
      availability.weekends = true;
      hasAny = true;
    }

    return hasAny ? availability : undefined;
  }

  /**
   * Extract qualification
   */
  private extractQualification(
    text: string,
    experience: VisionShareSupplyData['experience'],
    style: VisionShareSupplyData['style'],
  ): SupplyQualification {
    const certifications: string[] = [];
    const specializations: string[] = [];

    // Certifications
    if (/专业摄影师|高级摄影师/.test(text)) certifications.push('专业摄影师');
    if (/PS|Photoshop/.test(text)) certifications.push('Photoshop');
    if (/Lightroom|LR/.test(text)) certifications.push('Lightroom');
    if (/摄影协会|PSA/.test(text)) certifications.push('摄影协会会员');

    // Specializations from photography types and style
    specializations.push(...experience.photographyTypes);
    if (style.primary) specializations.push(style.primary);

    return this.buildQualification(text, certifications, specializations);
  }

  /**
   * Calculate overall confidence
   */
  private calculateConfidence(
    experience: VisionShareSupplyData['experience'],
    style: VisionShareSupplyData['style'],
    equipment: VisionShareSupplyData['equipment'],
  ): number {
    let score = 0.3;

    if (experience.years > 0) score += 0.15;
    if (experience.photographyTypes.length > 0) score += 0.15;
    if (style.primary) score += 0.15;
    if (equipment.cameras.length > 0) score += 0.1;
    if (equipment.lenses.length > 0) score += 0.05;
    if (experience.portfolio.length > 0) score += 0.1;

    return Math.min(score, 1.0);
  }

  protected getClarificationQuestion(field: string): string {
    const questions: Record<string, string> = {
      'equipment': '请问您使用什么摄影设备？（如相机型号、镜头等）',
      'experience': '请问您有多少年摄影经验？擅长什么类型的摄影？',
      'style': '请问您的主要拍摄风格是什么？',
      'pricing': '请问您的服务价格是多少？',
      'availability': '请问您的可预约时间是什么？',
      'experience.years': '请问您有多少年的摄影从业经验？',
      'experience.photographyTypes': '请问您擅长哪些类型的摄影？',
    };

    return questions[field] || super.getClarificationQuestion(field);
  }
}
