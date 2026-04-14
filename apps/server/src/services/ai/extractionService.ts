/**
 * L3 to L2 Extraction Service
 * 使用 LLM 从自然语言文本中提取结构化 L2 数据
 */

import { llmService } from './llmService';
import { metricsService } from './metricsService';
import { LLMProvider } from './types';
import { L2Schema, L2Data, L2FieldType, getL2Schema } from '@visionshare/shared';
import { logger } from '../../utils/logger';

// Extraction result
export interface ExtractionResult {
  success: boolean;
  data: L2Data;
  confidence: number; // 0-100
  fieldsExtracted: string[];
  fieldsFailed: string[];
  reasoning?: string;
  provider: LLMProvider;
  model: string;
  latencyMs: number;
}

// Extraction request
export interface ExtractionRequest {
  text: string;
  scene: string;
  agentId: string;
  userId: string;
  previousExtractions?: ExtractionHistoryEntry[];
}

// Extraction history entry
export interface ExtractionHistoryEntry {
  id: string;
  agentId: string;
  timestamp: Date;
  originalText: string;
  extractedData: L2Data;
  confidence: number;
  userConfirmed: boolean;
  userCorrections?: L2Data;
}

// Field extraction confidence
export interface FieldConfidence {
  field: string;
  confidence: number;
  reasoning: string;
}

/**
 * Extract L2 structured data from L3 natural language text
 */
export async function extractL2FromL3(
  request: ExtractionRequest
): Promise<ExtractionResult> {
  const startTime = Date.now();
  const { text, scene, agentId, userId } = request;

  try {
    // Get schema for the scene
    const schema = getL2Schema(scene);
    if (!schema) {
      throw new Error(`Schema not found for scene: ${scene}`);
    }

    logger.info(`Starting L3 to L2 extraction for agent ${agentId}`, {
      scene,
      textLength: text.length,
    });

    // Build extraction prompt
    const prompt = buildExtractionPrompt(text, schema);

    // Call LLM
    const response = await llmService.generateText(prompt, {
      temperature: 0.3, // Lower temperature for more consistent extraction
      maxTokens: 2000,
    });

    // Parse extraction result
    const extraction = parseExtractionResult(response.text, schema);

    // Calculate overall confidence
    const confidence = calculateOverallConfidence(extraction.fieldConfidences);

    // Get extracted and failed fields
    const fieldsExtracted = Object.keys(extraction.data);
    const fieldsFailed = schema.fields
      .filter(f => f.required && !extraction.data[f.id])
      .map(f => f.id);

    const latencyMs = Date.now() - startTime;

    // Record metrics
    await metricsService.recordRequest({
      requestId: `${agentId}-${Date.now()}`,
      provider: response.provider,
      model: response.model,
      latencyMs,
      success: true,
      tokenUsage: {
        input: response.usage?.promptTokens || 0,
        output: response.usage?.completionTokens || 0,
        total: response.usage?.totalTokens || 0,
      },
      costUsd: response.cost || 0,
    });

    logger.info(`L3 extraction completed for agent ${agentId}`, {
      confidence,
      fieldsExtracted: fieldsExtracted.length,
      fieldsFailed: fieldsFailed.length,
      latencyMs,
    });

    return {
      success: true,
      data: extraction.data,
      confidence,
      fieldsExtracted,
      fieldsFailed,
      reasoning: extraction.reasoning,
      provider: response.provider,
      model: response.model,
      latencyMs,
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;

    logger.error(`L3 extraction failed for agent ${agentId}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      scene,
    });

    // Record failure metrics
    await metricsService.recordRequest({
      requestId: `${agentId}-${Date.now()}`,
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
 * Build extraction prompt for LLM
 */
function buildExtractionPrompt(text: string, schema: L2Schema): string {
  const fieldDescriptions = schema.fields.map(field => {
    let description = `- ${field.id}: ${field.label}`;
    if (field.type === L2FieldType.ENUM && field.options) {
      const options = field.options.map(o => `"${o.value}"(${o.label})`).join(', ');
      description += ` [enum: ${options}]`;
    } else if (field.type === L2FieldType.MULTI_SELECT && field.options) {
      const options = field.options.map(o => `"${o.value}"(${o.label})`).join(', ');
      description += ` [multi-select: ${options}]`;
    } else if (field.type === L2FieldType.RANGE) {
      description += ` [range: {min, max}]`;
    } else {
      description += ` [${field.type}]`;
    }
    if (field.required) {
      description += ' (required)';
    }
    return description;
  }).join('\n');

  return `You are an expert information extraction system. Your task is to extract structured information from the user's natural language description and format it as JSON.

## Schema: ${schema.title}
${schema.description || ''}

## Fields to Extract:
${fieldDescriptions}

## User's Description:
"""${text}"""

## Instructions:
1. Extract values from the text that match the schema fields
2. For enum fields, use one of the provided values
3. For multi-select fields, return an array of matching values
4. For range fields, return an object with "min" and "max" keys
5. If a required field cannot be extracted, note it in the "fields_failed" list
6. Provide confidence scores (0-100) for each extracted field

## Response Format (JSON):
{
  "data": {
    "field_id": "extracted_value"
  },
  "field_confidences": [
    {"field": "field_id", "confidence": 85, "reasoning": "explicitly mentioned in text"}
  ],
  "fields_failed": ["field_id"],
  "reasoning": "Overall extraction reasoning"
}

Respond with ONLY the JSON object, no additional text.`;
}

/**
 * Parse LLM extraction result
 */
function parseExtractionResult(text: string, schema: L2Schema): {
  data: L2Data;
  fieldConfidences: FieldConfidence[];
  reasoning?: string;
} {
  try {
    // Extract JSON from text (handle markdown code blocks)
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) ||
                      text.match(/```\n?([\s\S]*?)\n?```/) ||
                      text.match(/(\{[\s\S]*\})/);

    const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;
    const result = JSON.parse(jsonStr.trim());

    // Validate and normalize data
    const data: L2Data = {};
    for (const [key, value] of Object.entries(result.data || {})) {
      const field = schema.fields.find(f => f.id === key);
      if (field) {
        data[key] = normalizeFieldValue(value, field);
      }
    }

    return {
      data,
      fieldConfidences: result.field_confidences || [],
      reasoning: result.reasoning,
    };
  } catch (error) {
    logger.error('Failed to parse extraction result', { error, text });
    return {
      data: {},
      fieldConfidences: [],
      reasoning: 'Failed to parse extraction result',
    };
  }
}

/**
 * Normalize field value based on field type
 */
function normalizeFieldValue(value: any, field: any): any {
  if (value === null || value === undefined) {
    return undefined;
  }

  switch (field.type) {
    case L2FieldType.NUMBER:
      return typeof value === 'number' ? value : parseFloat(value) || undefined;

    case L2FieldType.BOOLEAN:
      return typeof value === 'boolean' ? value : Boolean(value);

    case L2FieldType.ENUM:
      // Validate that value is in options
      if (field.options?.some((o: any) => o.value === value)) {
        return value;
      }
      return undefined;

    case L2FieldType.MULTI_SELECT:
      if (Array.isArray(value)) {
        const validValues = field.options?.map((o: any) => o.value) || [];
        return value.filter((v: any) => validValues.includes(v));
      }
      return undefined;

    case L2FieldType.RANGE:
      if (typeof value === 'object' && value.min !== undefined && value.max !== undefined) {
        return { min: Number(value.min), max: Number(value.max) };
      }
      return undefined;

    default:
      return String(value);
  }
}

/**
 * Calculate overall confidence score
 */
function calculateOverallConfidence(fieldConfidences: FieldConfidence[]): number {
  if (!fieldConfidences || fieldConfidences.length === 0) {
    return 0;
  }

  const totalConfidence = fieldConfidences.reduce((sum, f) => sum + f.confidence, 0);
  return Math.round(totalConfidence / fieldConfidences.length);
}

/**
 * Re-extract with user corrections
 */
export async function reExtractWithCorrections(
  request: ExtractionRequest,
  userCorrections: L2Data
): Promise<ExtractionResult> {
  // Add corrections to the prompt for few-shot learning
  const correctionsContext = Object.entries(userCorrections)
    .map(([field, value]) => `${field}: ${JSON.stringify(value)}`)
    .join('\n');

  const enhancedRequest: ExtractionRequest = {
    ...request,
    text: `${request.text}\n\n## User Corrections:\n${correctionsContext}`,
  };

  return extractL2FromL3(enhancedRequest);
}

/**
 * Get extraction confidence level
 */
export function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 80) return 'high';
  if (confidence >= 50) return 'medium';
  return 'low';
}

/**
 * Get confidence color for UI
 */
export function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return '#4CAF50'; // Green
  if (confidence >= 50) return '#FFC107'; // Yellow
  return '#FF5722'; // Orange/Red
}
