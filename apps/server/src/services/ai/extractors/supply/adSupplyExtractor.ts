/**
 * Ad Supply Extractor
 * AgentAd 供给提取器 - 商家供给信息提取
 */

import { logger } from '../../../../utils/logger';
import { BaseSupplyExtractor } from './baseSupplyExtractor';
import { AdSupplyData, SupplySceneType, SupplyQualification } from './types';

/**
 * Ad Supply Extractor
 * Extracts merchant/seller supply information (products, offers, inventory)
 */
export class AdSupplyExtractor extends BaseSupplyExtractor<AdSupplyData> {
  private readonly sceneTypeValue: SupplySceneType = 'agentad';

  protected readonly detectionKeywords = [
    '出售', '售卖', '供货', '供应', '批发', '零售',
    '商品', '产品', '库存', '现货',
    '优惠', '折扣', '促销', '特价', '活动',
    '商家', '店铺', '旗舰店', '专营店',
    '包邮', '满减', '优惠券', '赠品',
    '天猫', '淘宝', '京东', '拼多多', '抖音', '快手',
  ];

  protected readonly requiredFields = [
    'products',
  ];

  protected readonly optionalFields = [
    'offers',
    'business',
    'qualification',
  ];

  getSceneType(): SupplySceneType {
    return this.sceneTypeValue;
  }

  /**
   * Extract Ad supply data from text
   */
  async extract(text: string, context?: Record<string, any>): Promise<AdSupplyData> {
    logger.info('Extracting Ad supply', { textLength: text.length });

    const keywords = this.extractKeywords(text);
    const products = this.extractProducts(text);
    const offers = this.extractOffers(text);
    const business = this.extractBusiness(text);
    const qualification = this.extractQualification(text, products);

    let extractedFields = 0;
    const totalFields = 3;
    if (products.length > 0) extractedFields++;
    if (offers.length > 0) extractedFields++;
    if (business.name || business.platforms.length > 0) extractedFields++;

    const qualityMetrics = this.calculateQualityMetrics(
      extractedFields,
      totalFields,
      products.some(p => p.pricing !== undefined),
      products.some(p => p.features && p.features.length > 0),
    );

    const confidence = this.calculateConfidence(products, offers, business);

    const data: AdSupplyData = {
      scene: 'agentad',
      rawText: text,
      qualification,
      qualityMetrics,
      confidence,
      keywords,
      products,
      offers,
      business,
    };

    logger.info('Ad supply extraction completed', {
      confidence,
      productCount: products.length,
      offerCount: offers.length,
    });

    return data;
  }

  /**
   * Extract products
   */
  private extractProducts(text: string): AdSupplyData['products'] {
    const products: AdSupplyData['products'] = [];

    // Common product categories and names
    const productPatterns = [
      { pattern: /(?:出售|供应|现货)\s*([\u4e00-\u9fa5\w\s]{2,20}?)(?:，|。|，|$)/g },
      { pattern: /([\u4e00-\u9fa5\w]{2,15})(?:\s*(?:出售|供货|供应|现货|库存))/g },
    ];

    const extractedNames = new Set<string>();

    // Named products
    const namedProducts = [
      { pattern: /iPhone\s*(\d+)(?:\s*(?:Pro|Plus|Max|Mini))?/gi, name: 'iPhone', category: '手机' },
      { pattern: /(?:华为|Huawei)\s*([\w]+)/gi, name: '华为', category: '手机' },
      { pattern: /(?:小米|Xiaomi)\s*([\w]+)/gi, name: '小米', category: '手机' },
      { pattern: /MacBook\s*(?:Pro|Air)?/gi, name: 'MacBook', category: '电脑' },
      { pattern: /iPad\s*(?:Pro|Air|Mini)?/gi, name: 'iPad', category: '平板' },
      { pattern: /AirPods\s*(?:Pro)?/gi, name: 'AirPods', category: '耳机' },
    ];

    for (const { pattern, name, category } of namedProducts) {
      const match = text.match(pattern);
      if (match && !extractedNames.has(name)) {
        extractedNames.add(name);
        products.push({
          name: match[0],
          category,
          condition: this.extractCondition(text),
          pricing: this.parsePricing(text),
          features: this.extractProductFeatures(text),
        });
      }
    }

    // Generic products by category
    const categoryPatterns = [
      { pattern: /手机|Phone/i, category: '手机' },
      { pattern: /电脑|笔记本|laptop/i, category: '电脑' },
      { pattern: /相机|camera/i, category: '相机' },
      { pattern: /耳机|earphone/i, category: '耳机' },
      { pattern: /手表|watch/i, category: '手表' },
      { pattern: /衣服|服装|T恤|衬衫|外套/i, category: '服装' },
      { pattern: /鞋子|运动鞋|靴子/i, category: '鞋子' },
      { pattern: /包包|箱包|背包/i, category: '箱包' },
      { pattern: /食品|零食|饮料|茶叶|咖啡/i, category: '食品' },
      { pattern: /化妆品|护肤品|面膜|口红/i, category: '美妆' },
      { pattern: /家具|沙发|桌椅|床/i, category: '家具' },
      { pattern: /家电|空调|冰箱|洗衣机|电视/i, category: '家电' },
    ];

    for (const { pattern, category } of categoryPatterns) {
      if (pattern.test(text) && !products.some(p => p.category === category)) {
        const nameMatch = text.match(new RegExp(`(?:出售|供应|现货)?\\s*([\\u4e00-\\u9fa5]{2,8}?(?:${pattern.source}))`, 'i'));
        products.push({
          name: nameMatch ? nameMatch[1] : category,
          category,
          condition: this.extractCondition(text),
          pricing: this.parsePricing(text),
          features: this.extractProductFeatures(text),
        });
      }
    }

    // If no products found, try a generic extraction
    if (products.length === 0) {
      const genericMatch = text.match(/(?:供应|出售|售卖|提供)\s*([\u4e00-\u9fa5\w\s]{2,30}?)(?:，|。|,|$)/);
      if (genericMatch) {
        products.push({
          name: genericMatch[1].trim(),
          category: '其他',
          condition: this.extractCondition(text),
        });
      }
    }

    return products;
  }

  /**
   * Extract product condition
   */
  private extractCondition(text: string): 'new' | 'used' | 'refurbished' {
    if (/全新|new|未拆封|全新未使用|新品/.test(text)) return 'new';
    if (/二手|used|旧|pre-owned/.test(text)) return 'used';
    if (/官翻|翻新|refurbished/.test(text)) return 'refurbished';
    return 'new';
  }

  /**
   * Extract product features
   */
  private extractProductFeatures(text: string): string[] {
    const features: string[] = [];

    const featurePatterns = [
      { pattern: /正品|官方|旗舰店/, feature: '正品保障' },
      { pattern: /包邮|免邮|免运费/, feature: '包邮' },
      { pattern: /保修|质保|保修期/, feature: '有保修' },
      { pattern: /7天.*退|无理由退换/, feature: '7天无理由退换' },
      { pattern: /发票|开票/, feature: '提供发票' },
      { pattern: /送礼|礼盒|礼品装/, feature: '礼盒包装' },
      { pattern: /定制|DIY|个性化/, feature: '支持定制' },
      { pattern: /进口|海外|海外直邮/, feature: '进口正品' },
      { pattern: /有机|天然|绿色/, feature: '绿色有机' },
    ];

    for (const { pattern, feature } of featurePatterns) {
      if (pattern.test(text)) {
        features.push(feature);
      }
    }

    return features;
  }

  /**
   * Extract offers/promotions
   */
  private extractOffers(text: string): AdSupplyData['offers'] {
    const offers: AdSupplyData['offers'] = [];

    // Discount percentage
    const discountMatch = text.match(/(\d+)\s*折/);
    if (discountMatch) {
      offers.push({
        type: '折扣',
        description: `${discountMatch[1]}折优惠`,
      });
    }

    // Full reduction: 满X减Y
    const reductionMatch = text.match(/满\s*(\d+)\s*减\s*(\d+)/);
    if (reductionMatch) {
      offers.push({
        type: '满减',
        description: `满${reductionMatch[1]}减${reductionMatch[2]}`,
        conditions: `订单满${reductionMatch[1]}元`,
      });
    }

    // Free shipping
    if (/包邮|免邮|免运费/.test(text)) {
      offers.push({
        type: '包邮',
        description: '全场包邮',
      });
    }

    // Gifts
    if (/赠品|送礼|买.*送/.test(text)) {
      const giftMatch = text.match(/买.*?送\s*([\u4e00-\u9fa5\w]{2,20})/);
      offers.push({
        type: '赠品',
        description: giftMatch ? `赠送${giftMatch[1]}` : '购买即赠',
      });
    }

    // Coupon
    if (/优惠券|代金券|券/.test(text)) {
      const couponMatch = text.match(/(\d+)\s*[元块]?\s*(?:优惠券|代金券|券)/);
      offers.push({
        type: '优惠券',
        description: couponMatch ? `${couponMatch[1]}元优惠券` : '优惠券',
      });
    }

    // Flash sale
    if (/秒杀|限时|闪购/.test(text)) {
      offers.push({
        type: '限时活动',
        description: '限时特惠活动',
      });
    }

    // Bundle deal
    if (/套餐|组合|套装/.test(text)) {
      offers.push({
        type: '套餐',
        description: '超值套餐组合',
      });
    }

    return offers;
  }

  /**
   * Extract business info
   */
  private extractBusiness(text: string): AdSupplyData['business'] {
    const business: AdSupplyData['business'] = {
      verified: false,
      platforms: [],
    };

    // Business name
    const namePatterns = [
      /([\u4e00-\u9fa5]{2,10})(?:旗舰店|专营店|官方店|旗舰店)/,
      /([\u4e00-\u9fa5]{2,10})(?:店铺|商店|商行)/,
    ];
    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match) {
        business.name = match[0];
        break;
      }
    }

    // Category
    const bizCategories = [
      '数码', '服装', '食品', '美妆', '家居', '母婴',
      '运动', '图书', '珠宝', '汽车', '医药', '建材',
    ];
    for (const cat of bizCategories) {
      if (text.includes(cat)) {
        business.category = cat;
        break;
      }
    }

    // Rating
    const ratingMatch = text.match(/(?:评分|好评率|评分)\s*[：:]?\s*(\d+\.?\d*)/);
    if (ratingMatch) {
      business.rating = parseFloat(ratingMatch[1]);
    }

    // Verified
    business.verified = /认证|旗舰店|官方店|品牌授权/.test(text);

    // Location
    const loc = this.parseLocation(text);
    business.location = loc.city || loc.district;

    // Platforms
    const platformPatterns = [
      { pattern: /淘宝|天猫/, platform: '淘宝/天猫' },
      { pattern: /京东|JD/, platform: '京东' },
      { pattern: /拼多多|PDD/, platform: '拼多多' },
      { pattern: /抖音|抖店/, platform: '抖音' },
      { pattern: /快手/, platform: '快手' },
      { pattern: /小红书/, platform: '小红书' },
      { pattern: /亚马逊|Amazon/, platform: '亚马逊' },
      { pattern: /微信|微店|小程序/, platform: '微信' },
    ];

    for (const { pattern, platform } of platformPatterns) {
      if (pattern.test(text)) {
        business.platforms.push(platform);
      }
    }

    return business;
  }

  /**
   * Extract qualification
   */
  private extractQualification(
    text: string,
    products: AdSupplyData['products'],
  ): SupplyQualification {
    const certifications: string[] = [];
    const specializations: string[] = [];

    // Business certifications
    if (/品牌授权|授权代理/.test(text)) certifications.push('品牌授权');
    if (/官方认证|平台认证/.test(text)) certifications.push('官方认证');
    if (/营业执照/.test(text)) certifications.push('营业执照');
    if (/食品经营许可证/.test(text)) certifications.push('食品经营许可');
    if (/3C认证/.test(text)) certifications.push('3C认证');

    // Specializations from product categories
    for (const product of products) {
      if (product.category && !specializations.includes(product.category)) {
        specializations.push(product.category);
      }
    }

    return this.buildQualification(text, certifications, specializations);
  }

  /**
   * Calculate confidence
   */
  private calculateConfidence(
    products: AdSupplyData['products'],
    offers: AdSupplyData['offers'],
    business: AdSupplyData['business'],
  ): number {
    let score = 0.3;

    if (products.length > 0) score += 0.3;
    if (products.some(p => p.pricing)) score += 0.1;
    if (offers.length > 0) score += 0.1;
    if (business.name) score += 0.1;
    if (business.platforms.length > 0) score += 0.1;

    return Math.min(score, 1.0);
  }

  protected getClarificationQuestion(field: string): string {
    const questions: Record<string, string> = {
      'products': '请问您供应哪些产品或商品？',
      'offers': '请问您有什么优惠活动？',
      'business': '请提供您的店铺或企业信息。',
      'products.name': '请问具体是什么产品？',
      'products.pricing': '请问产品的价格是多少？',
      'products.inventory': '请问有多少库存？',
    };

    return questions[field] || super.getClarificationQuestion(field);
  }
}
