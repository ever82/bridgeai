/**
 * Supply Completion Service
 * 供给信息补全服务
 *
 * 功能：
 * - 信息缺失检测
 * - 智能补全建议
 * - 外部数据增强
 * - 默认值推断
 * - 补全确认流程
 */

import { logger } from '../utils/logger';

import { Supply, PricingInfo, Capability, LocationInfo, ExperienceInfo, AvailabilityInfo } from './supplyExtractionService';

/**
 * Completion suggestion for a single field
 */
export interface CompletionSuggestion {
  field: string;
  currentValue: any;
  suggestedValue: any;
  confidence: number; // 0-100
  source: 'inference' | 'default' | 'external' | 'rule';
  reason: string;
  confirmed?: boolean;
}

/**
 * Result of completion analysis
 */
export interface CompletionResult {
  supplyId: string;
  missingFields: string[];
  incompleteFields: string[];
  suggestions: CompletionSuggestion[];
  completenessScore: number; // 0-100
  appliedDefaults: string[];
  externalQueries: ExternalDataQuery[];
}

/**
 * External data query for enhancement
 */
export interface ExternalDataQuery {
  type: 'certification' | 'market_rate' | 'location' | 'service_type';
  query: string;
  status: 'pending' | 'success' | 'failed';
  result?: any;
}

/**
 * Required fields per scene
 */
const SCENE_REQUIRED_FIELDS: Record<string, string[]> = {
  default: ['title', 'description', 'serviceType', 'pricing', 'capabilities'],
  photography: ['title', 'description', 'serviceType', 'pricing', 'capabilities', 'location', 'experience'],
  design: ['title', 'description', 'serviceType', 'pricing', 'capabilities', 'skills'],
  development: ['title', 'description', 'serviceType', 'pricing', 'capabilities', 'skills', 'experience'],
  consulting: ['title', 'description', 'serviceType', 'pricing', 'capabilities', 'experience', 'availability'],
};

/**
 * Common defaults by service type
 */
const SERVICE_DEFAULTS: Record<string, Record<string, any>> = {
  photography: {
    priceCurrency: 'CNY',
    priceType: 'fixed',
    priceUnit: 'session',
    locationRemote: false,
    locationOnsite: true,
  },
  design: {
    priceCurrency: 'CNY',
    priceType: 'hourly',
    priceUnit: 'hour',
    locationRemote: true,
    locationOnsite: false,
  },
  development: {
    priceCurrency: 'CNY',
    priceType: 'hourly',
    priceUnit: 'hour',
    locationRemote: true,
    locationOnsite: false,
  },
  consulting: {
    priceCurrency: 'CNY',
    priceType: 'hourly',
    priceUnit: 'hour',
    locationRemote: true,
  },
};

/**
 * Supply Completion Service Class
 * 供给信息补全服务
 */
export class SupplyCompletionService {
  /**
   * Detect incomplete and missing fields in supply data
   */
  detectIncomplete(supply: Supply): { missing: string[]; incomplete: string[] } {
    const missing: string[] = [];
    const incomplete: string[] = [];

    // Check title
    if (!supply.title || supply.title.trim().length === 0) {
      missing.push('title');
    } else if (supply.title.length < 5) {
      incomplete.push('title');
    }

    // Check description
    if (!supply.description || supply.description.trim().length === 0) {
      missing.push('description');
    } else if (supply.description.length < 20) {
      incomplete.push('description');
    }

    // Check serviceType
    if (!supply.serviceType || supply.serviceType.trim().length === 0) {
      missing.push('serviceType');
    }

    // Check pricing
    if (!supply.pricing) {
      missing.push('pricing');
    } else {
      if (!supply.pricing.type) incomplete.push('pricing.type');
      if (supply.pricing.type !== 'negotiable' && supply.pricing.minRate === undefined && supply.pricing.maxRate === undefined) {
        incomplete.push('pricing.rates');
      }
      if (!supply.pricing.currency) incomplete.push('pricing.currency');
    }

    // Check capabilities
    if (!supply.capabilities || supply.capabilities.length === 0) {
      missing.push('capabilities');
    } else {
      for (let i = 0; i < supply.capabilities.length; i++) {
        const cap = supply.capabilities[i];
        if (!cap.level) incomplete.push(`capabilities[${i}].level`);
        if (!cap.category) incomplete.push(`capabilities[${i}].category`);
      }
    }

    // Check skills
    if (!supply.skills || supply.skills.length === 0) {
      incomplete.push('skills');
    }

    // Check location
    if (!supply.location) {
      incomplete.push('location');
    } else {
      if (supply.location.remote === undefined && supply.location.onsite === undefined) {
        incomplete.push('location.mode');
      }
    }

    // Check experience
    if (!supply.experience) {
      incomplete.push('experience');
    } else {
      if (supply.experience.years === undefined) incomplete.push('experience.years');
    }

    // Check availability
    if (!supply.availability) {
      incomplete.push('availability');
    }

    return { missing, incomplete };
  }

  /**
   * Generate completion suggestions for incomplete supply data
   */
  generateSuggestions(supply: Supply): CompletionSuggestion[] {
    const suggestions: CompletionSuggestion[] = [];
    const { missing, incomplete } = this.detectIncomplete(supply);

    // Generate suggestions for missing title
    if (missing.includes('title')) {
      const inferredTitle = this.inferTitle(supply);
      if (inferredTitle) {
        suggestions.push({
          field: 'title',
          currentValue: supply.title,
          suggestedValue: inferredTitle,
          confidence: 60,
          source: 'inference',
          reason: '基于服务类型和描述推断标题',
        });
      }
    }

    // Generate suggestions for missing/incomplete description
    if (missing.includes('description') || incomplete.includes('description')) {
      const inferredDesc = this.inferDescription(supply);
      if (inferredDesc) {
        suggestions.push({
          field: 'description',
          currentValue: supply.description,
          suggestedValue: inferredDesc,
          confidence: 50,
          source: 'inference',
          reason: '基于能力和技能推断描述',
        });
      }
    }

    // Suggest pricing defaults
    if (missing.includes('pricing') || incomplete.includes('pricing.currency')) {
      const defaults = SERVICE_DEFAULTS[supply.serviceType] || SERVICE_DEFAULTS['default'];
      suggestions.push({
        field: 'pricing.currency',
        currentValue: supply.pricing?.currency,
        suggestedValue: defaults.priceCurrency || 'CNY',
        confidence: 70,
        source: 'default',
        reason: `基于服务类型 ${supply.serviceType || '通用'} 的默认货币`,
      });
    }

    if (incomplete.includes('pricing.rates')) {
      const marketRate = this.estimateMarketRate(supply);
      if (marketRate) {
        suggestions.push({
          field: 'pricing.rates',
          currentValue: { min: supply.pricing?.minRate, max: supply.pricing?.maxRate },
          suggestedValue: marketRate,
          confidence: 40,
          source: 'rule',
          reason: '基于服务类型和能力等级估算的市场价格区间',
        });
      }
    }

    // Suggest capability levels for capabilities without levels
    if (incomplete.some(f => f.startsWith('capabilities['))) {
      for (const cap of supply.capabilities || []) {
        if (!cap.level) {
          suggestions.push({
            field: `capabilities.${cap.name}.level`,
            currentValue: cap.level,
            suggestedValue: 'intermediate',
            confidence: 50,
            source: 'default',
            reason: '默认中级水平，建议根据实际情况调整',
          });
        }
      }
    }

    // Suggest skills from capabilities
    if (incomplete.includes('skills')) {
      const inferredSkills = this.inferSkillsFromCapabilities(supply.capabilities);
      if (inferredSkills.length > 0) {
        suggestions.push({
          field: 'skills',
          currentValue: supply.skills,
          suggestedValue: inferredSkills,
          confidence: 65,
          source: 'inference',
          reason: '基于已声明的能力推断相关技能',
        });
      }
    }

    // Suggest location defaults
    if (incomplete.includes('location.mode')) {
      const defaults = SERVICE_DEFAULTS[supply.serviceType] || {};
      if (defaults.locationRemote !== undefined) {
        suggestions.push({
          field: 'location.mode',
          currentValue: { remote: supply.location?.remote, onsite: supply.location?.onsite },
          suggestedValue: { remote: defaults.locationRemote, onsite: defaults.locationOnsite ?? false },
          confidence: 60,
          source: 'default',
          reason: `基于服务类型 ${supply.serviceType || '通用'} 的常见工作模式`,
        });
      }
    }

    return suggestions;
  }

  /**
   * Apply confirmed suggestions to supply data
   */
  applySuggestions(supply: Supply, suggestions: CompletionSuggestion[]): Supply {
    const updated = { ...supply, capabilities: [...supply.capabilities], pricing: { ...supply.pricing } };

    for (const suggestion of suggestions) {
      if (!suggestion.confirmed) continue;

      switch (suggestion.field) {
        case 'title':
          updated.title = suggestion.suggestedValue;
          break;
        case 'description':
          updated.description = suggestion.suggestedValue;
          break;
        case 'pricing.currency':
          updated.pricing = { ...updated.pricing, currency: suggestion.suggestedValue };
          break;
        case 'pricing.rates':
          if (typeof suggestion.suggestedValue === 'object') {
            updated.pricing = {
              ...updated.pricing,
              minRate: suggestion.suggestedValue.min,
              maxRate: suggestion.suggestedValue.max,
            };
          }
          break;
        case 'skills':
          updated.skills = suggestion.suggestedValue;
          break;
        case 'location.mode':
          if (typeof suggestion.suggestedValue === 'object' && updated.location) {
            updated.location = {
              ...updated.location,
              remote: suggestion.suggestedValue.remote,
              onsite: suggestion.suggestedValue.onsite,
            };
          }
          break;
      }
    }

    return updated;
  }

  /**
   * Query external data for enhancement
   */
  queryExternalData(supply: Supply): ExternalDataQuery[] {
    const queries: ExternalDataQuery[] = [];

    // Query certification validity
    if (supply.experience?.certifications?.length) {
      for (const cert of supply.experience.certifications) {
        queries.push({
          type: 'certification',
          query: cert,
          status: 'pending',
        });
      }
    }

    // Query market rate for pricing comparison
    if (supply.serviceType) {
      queries.push({
        type: 'market_rate',
        query: supply.serviceType,
        status: 'pending',
      });
    }

    return queries;
  }

  /**
   * Complete the analysis and return full result
   */
  complete(supply: Supply): CompletionResult {
    const { missing, incomplete } = this.detectIncomplete(supply);
    const suggestions = this.generateSuggestions(suggestions.length > 0 ? supply : supply);

    // Calculate completeness score
    const totalFields = 8; // title, description, serviceType, pricing, capabilities, skills, location, experience
    const filledFields = totalFields - missing.length;
    const partialCredit = incomplete.length * 0.5;
    const completenessScore = Math.round(((filledFields + partialCredit) / totalFields) * 100);

    const appliedDefaults: string[] = [];
    const externalQueries = this.queryExternalData(supply);

    return {
      supplyId: supply.id || 'unknown',
      missingFields: missing,
      incompleteFields: incomplete,
      suggestions,
      completenessScore,
      appliedDefaults,
      externalQueries,
    };
  }

  // --- Private helpers ---

  private inferTitle(supply: Supply): string | undefined {
    if (supply.serviceType && supply.capabilities?.length > 0) {
      return `${supply.serviceType} - ${supply.capabilities[0].name}`;
    }
    if (supply.serviceType) {
      return `${supply.serviceType} 服务`;
    }
    return undefined;
  }

  private inferDescription(supply: Supply): string | undefined {
    const parts: string[] = [];
    if (supply.serviceType) parts.push(`提供${supply.serviceType}服务`);
    if (supply.capabilities?.length > 0) {
      const capNames = supply.capabilities.slice(0, 3).map(c => c.name).join('、');
      parts.push(`擅长${capNames}`);
    }
    if (supply.experience?.years) {
      parts.push(`${supply.experience.years}年经验`);
    }
    return parts.length > 0 ? parts.join('。') : undefined;
  }

  private inferSkillsFromCapabilities(capabilities: Capability[]): string[] {
    const skills: string[] = [];
    for (const cap of capabilities || []) {
      skills.push(cap.name);
      if (cap.keywords) {
        for (const kw of cap.keywords.slice(0, 2)) {
          skills.push(kw);
        }
      }
    }
    return [...new Set(skills)];
  }

  private estimateMarketRate(supply: Supply): { min: number; max: number } | undefined {
    // Simple heuristic: estimate from capability levels and service type
    const rates: Record<string, { min: number; max: number }> = {
      photography: { min: 500, max: 5000 },
      design: { min: 100, max: 800 },
      development: { min: 200, max: 1500 },
      consulting: { min: 300, max: 2000 },
      writing: { min: 50, max: 500 },
      translation: { min: 80, max: 600 },
    };

    const baseRate = rates[supply.serviceType?.toLowerCase() || ''] || { min: 100, max: 1000 };

    // Adjust by capability level
    const hasExpert = supply.capabilities?.some(c => c.level === 'expert');
    if (hasExpert) {
      return { min: baseRate.min * 2, max: baseRate.max * 2 };
    }

    return baseRate;
  }
}

// Export singleton instance
export const supplyCompletionService = new SupplyCompletionService();
