/**
 * AI Offer Extraction Service
 * Integrates with AI003 to extract offer information from natural language
 */

import { AppError } from '../../errors/AppError';
import {
  OfferType,
  ApplicableScope,
  UserGroup,
  AIExtractionData,
} from '../../types/offer.types';

export interface ExtractedOfferData {
  title: string;
  description?: string;
  type: OfferType;
  discountValue?: number;
  minPurchaseAmount?: number;
  maxDiscountAmount?: number;
  applicableScope?: ApplicableScope;
  validFrom?: Date;
  validUntil?: Date;
  totalStock?: number;
  confidence: number;
  rawText: string;
}

/**
 * Extract offer information from natural language text
 * This is a placeholder implementation that simulates AI extraction
 * In production, this would call the AI003 service
 */
export async function extractOfferFromText(
  naturalLanguageText: string
): Promise<ExtractedOfferData> {
  // TODO: Integrate with AI003 service for actual extraction
  // For now, we'll use a rule-based extraction as a fallback

  const extractedData = parseNaturalLanguageOffer(naturalLanguageText);
  const confidence = calculateConfidence(extractedData);

  return {
    rawText: naturalLanguageText,
    confidence,
    title: extractedData.title ?? naturalLanguageText.slice(0, 50),
    description: extractedData.description,
    type: extractedData.type ?? OfferType.DISCOUNT,
    discountValue: extractedData.discountValue,
    minPurchaseAmount: extractedData.minPurchaseAmount,
    maxDiscountAmount: extractedData.maxDiscountAmount,
    applicableScope: extractedData.applicableScope,
    validFrom: extractedData.validFrom,
    validUntil: extractedData.validUntil,
    totalStock: extractedData.totalStock,
  };
}

/**
 * Parse natural language offer description using pattern matching
 * This is a simplified implementation for demo purposes
 */
function parseNaturalLanguageOffer(text: string): Partial<ExtractedOfferData> {
  const lowerText = text.toLowerCase();
  const result: Partial<ExtractedOfferData> = {
    title: text.slice(0, 50) + (text.length > 50 ? '...' : ''),
    description: text,
  };

  // Extract discount type and value
  // Pattern: X折, X% off, X percent off
  const discountPattern = /(\d+(?:\.\d+)?)\s*折/;
  const percentPattern = /(\d+(?:\.\d+)?)\s*%\s*(?:off|折扣|优惠)/;
  const percentPattern2 = /(\d+(?:\.\d+)?)\s*折/;

  const discountMatch = text.match(discountPattern);
  const percentMatch = text.match(percentPattern) || text.match(percentPattern2);

  if (discountMatch) {
    result.type = OfferType.DISCOUNT;
    result.discountValue = parseFloat(discountMatch[1]);
  } else if (percentMatch) {
    result.type = OfferType.PERCENTAGE;
    result.discountValue = parseFloat(percentMatch[1]);
  }

  // Extract reduction: 满X减Y, X off when spend Y
  const reductionPattern = /满\s*(\d+)\s*减\s*(\d+)/;
  const reductionMatch = text.match(reductionPattern);

  if (reductionMatch) {
    result.type = OfferType.REDUCTION;
    result.minPurchaseAmount = parseFloat(reductionMatch[1]);
    result.discountValue = parseFloat(reductionMatch[2]);
  }

  // Extract gift/buy one get one
  if (lowerText.includes('买一送一') || lowerText.includes('买1送1') || lowerText.includes('gift')) {
    result.type = OfferType.GIFT;
    result.discountValue = 100; // 100% gift
  }

  // Extract package
  if (lowerText.includes('套餐') || lowerText.includes('package') || lowerText.includes('combo')) {
    result.type = OfferType.PACKAGE;
  }

  // Extract fixed amount discount
  const fixedAmountPattern = /立减\s*(\d+)/;
  const fixedAmountMatch = text.match(fixedAmountPattern);

  if (fixedAmountMatch && !result.type) {
    result.type = OfferType.FIXED_AMOUNT;
    result.discountValue = parseFloat(fixedAmountMatch[1]);
  }

  // Extract applicable scope
  const scope: ApplicableScope = {};

  // Check for exclusions
  if (lowerText.includes('除外') || lowerText.includes('exclude') || lowerText.includes('except')) {
    // Parse excluded items
    const excludePattern = /(?:除外|exclude|except)[^,，。]*([\u4e00-\u9fa5]+)/;
    const excludeMatch = text.match(excludePattern);
    if (excludeMatch) {
      scope.excludedProducts = [excludeMatch[1]];
    }
  }

  // Check for specific categories
  const categories = ['饮品', '食品', '饮料', '餐饮', '商品', 'clothing', 'food', 'drink'];
  for (const cat of categories) {
    if (lowerText.includes(cat.toLowerCase())) {
      scope.products = [cat];
      break;
    }
  }

  // Check for user groups
  if (lowerText.includes('新用户') || lowerText.includes('新客') || lowerText.includes('new user')) {
    scope.userGroups = [UserGroup.NEW_USER];
  } else if (lowerText.includes('会员') || lowerText.includes('vip') || lowerText.includes('member')) {
    scope.userGroups = [UserGroup.MEMBER];
  }

  // Check for time restrictions
  if (lowerText.includes('本周') || lowerText.includes('this week')) {
    const now = new Date();
    const endOfWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    result.validFrom = now;
    result.validUntil = endOfWeek;
  } else if (lowerText.includes('本月') || lowerText.includes('this month')) {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    result.validFrom = now;
    result.validUntil = endOfMonth;
  }

  // Check for specific days
  if (lowerText.includes('全场') || lowerText.includes('all')) {
    // All items applicable, no specific scope needed
  }

  if (Object.keys(scope).length > 0) {
    result.applicableScope = scope;
  }

  // Default values
  if (!result.totalStock) {
    result.totalStock = 100;
  }

  if (!result.validFrom) {
    result.validFrom = new Date();
  }

  if (!result.validUntil) {
    // Default 30 days
    result.validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }

  return result;
}

/**
 * Calculate confidence score based on extracted data completeness
 */
function calculateConfidence(data: Partial<ExtractedOfferData>): number {
  let score = 0;
  let total = 0;

  // Title is required
  if (data.title) score += 1;
  total += 1;

  // Type is important
  if (data.type) score += 1;
  total += 1;

  // Discount value based on type
  if (data.discountValue) score += 1;
  total += 1;

  // Applicable scope
  if (data.applicableScope) score += 0.5;
  total += 0.5;

  // Validity period
  if (data.validFrom && data.validUntil) score += 0.5;
  total += 0.5;

  return Math.round((score / total) * 100) / 100;
}

/**
 * Validate extracted offer data
 */
export function validateExtractedData(data: Partial<ExtractedOfferData>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.title) {
    errors.push('Title is required');
  }

  if (!data.type) {
    errors.push('Offer type could not be determined');
  }

  if (data.type === OfferType.DISCOUNT || data.type === OfferType.PERCENTAGE) {
    if (!data.discountValue || data.discountValue <= 0) {
      errors.push('Discount value is required for discount offers');
    }
    if (data.type === OfferType.PERCENTAGE && data.discountValue != null && data.discountValue > 100) {
      errors.push('Percentage discount cannot exceed 100%');
    }
  }

  if (data.type === OfferType.REDUCTION) {
    if (!data.minPurchaseAmount) {
      errors.push('Minimum purchase amount is required for reduction offers');
    }
    if (!data.discountValue) {
      errors.push('Discount value is required for reduction offers');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Process natural language offer and return structured data
 * This is the main entry point for AI offer extraction
 */
export async function processNaturalLanguageOffer(
  naturalLanguageText: string,
  merchantId: string
): Promise<{
  success: boolean;
  data?: ExtractedOfferData;
  errors?: string[];
}> {
  try {
    const extractedData = await extractOfferFromText(naturalLanguageText);

    const validation = validateExtractedData(extractedData);

    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors,
      };
    }

    return {
      success: true,
      data: extractedData,
    };
  } catch (error) {
    return {
      success: false,
      errors: [(error as Error).message],
    };
  }
}
