/**
 * AI Sensitive Content Detection Service
 * Uses vision AI models for real detection of faces, license plates, text/addresses, etc.
 * Includes error handling, timeout, and graceful degradation.
 */

import sharp from 'sharp';

import { stripExif, extractExif, hasGpsExif } from '../../utils/imageProcessing';

import { GPT4VisionAdapter } from './adapters/vision/gpt4Vision';
import { ClaudeVisionAdapter } from './adapters/vision/claudeVision';
import { ImageInput } from './vision/types';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectionResult {
  type: SensitiveType;
  boundingBox: BoundingBox;
  confidence: number;
  metadata?: Record<string, unknown>;
}

export type SensitiveType =
  | 'face'
  | 'license_plate'
  | 'text'
  | 'address'
  | 'sensitive_object'
  | 'qr_code'
  | 'barcode';

export interface DetectionOptions {
  types: SensitiveType[];
  minConfidence: number;
  maxResults?: number;
  timeoutMs?: number;
}

export interface VisionAnalysisResult {
  detections: DetectionResult[];
  imageWidth: number;
  imageHeight: number;
  processingTime: number;
  exifStripped: boolean;
  hadGpsData: boolean;
}

const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Get vision adapter for sensitive content detection
 */
function getDetectionAdapter(): GPT4VisionAdapter | ClaudeVisionAdapter {
  if (process.env.OPENAI_API_KEY) {
    return new GPT4VisionAdapter({
      apiKey: process.env.OPENAI_API_KEY,
      apiUrl: process.env.OPENAI_API_URL,
      organization: process.env.OPENAI_ORGANIZATION,
    });
  }
  if (process.env.CLAUDE_API_KEY) {
    return new ClaudeVisionAdapter({
      apiKey: process.env.CLAUDE_API_KEY,
      apiUrl: process.env.CLAUDE_API_URL,
    });
  }
  throw new Error('No Vision API key configured for sensitive content detection');
}

/**
 * Parse AI response to extract detection results
 */
function parseDetectionResponse(
  response: string,
  types: SensitiveType[],
  imageWidth: number,
  imageHeight: number
): DetectionResult[] {
  const detections: DetectionResult[] = [];

  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) return detections;

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return detections;

    for (const item of parsed) {
      const type = (item.type || '').toLowerCase() as SensitiveType;
      if (!types.includes(type)) continue;

      const confidence = typeof item.confidence === 'number' ? item.confidence : 0.5;
      const bbox = item.boundingBox || item.bbox || {};

      detections.push({
        type,
        boundingBox: {
          x: Math.round(
            typeof bbox.x === 'number'
              ? bbox.x
              : bbox.x_percent
                ? (bbox.x_percent / 100) * imageWidth
                : 0
          ),
          y: Math.round(
            typeof bbox.y === 'number'
              ? bbox.y
              : bbox.y_percent
                ? (bbox.y_percent / 100) * imageHeight
                : 0
          ),
          width: Math.round(
            typeof bbox.width === 'number'
              ? bbox.width
              : bbox.w_percent
                ? (bbox.w_percent / 100) * imageWidth
                : 100
          ),
          height: Math.round(
            typeof bbox.height === 'number'
              ? bbox.height
              : bbox.h_percent
                ? (bbox.h_percent / 100) * imageHeight
                : 100
          ),
        },
        confidence,
        metadata: item.metadata || {},
      });
    }
  } catch {
    // If JSON parsing fails, return empty detections
  }

  return detections;
}

/**
 * Build a detection prompt for the AI model
 */
function buildDetectionPrompt(types: SensitiveType[]): string {
  const typeDescriptions: Record<SensitiveType, string> = {
    face: 'human faces',
    license_plate: 'vehicle license plates',
    text: 'readable text content',
    address: 'street addresses or location information',
    sensitive_object: 'sensitive objects like ID cards, documents, credit cards, medical records',
    qr_code: 'QR codes',
    barcode: 'barcodes',
  };

  const targetTypes = types.map(t => typeDescriptions[t]).join(', ');

  return `Analyze this image for sensitive/privacy content. Look for: ${targetTypes}.

For each detection, provide a JSON array with objects containing:
- "type": one of [${types.map(t => `"${t}"`).join(', ')}]
- "confidence": 0.0 to 1.0
- "boundingBox": { "x_percent": 0-100, "y_percent": 0-100, "w_percent": 0-100, "h_percent": 0-100 }
- "metadata": any relevant details (text content, plate number, etc.)

Respond ONLY with the JSON array, no other text. If nothing is detected, respond with [].`;
}

/**
 * Perform a single AI detection attempt with timeout.
 * Throws on failure so the caller can retry.
 */
async function runDetectionAttempt(
  imageBuffer: Buffer,
  metadata: sharp.Metadata,
  imageWidth: number,
  imageHeight: number,
  timeoutMs: number,
  types: SensitiveType[],
  minConfidence: number
): Promise<DetectionResult[]> {
  const adapter = getDetectionAdapter();
  await adapter.initialize();

  const imageInput: ImageInput = {
    type: 'base64',
    data: imageBuffer.toString('base64'),
    mimeType: `image/${metadata.format ?? 'jpeg'}`,
  };

  const prompt = buildDetectionPrompt(types);

  // Apply timeout around AI call
  const detectionPromise = adapter.analyzeImage(imageInput, prompt);
  const timeoutPromise = new Promise<string>((_, reject) =>
    setTimeout(() => reject(new Error('Detection timeout')), timeoutMs)
  );

  const response = await Promise.race([detectionPromise, timeoutPromise]);

  let detections = parseDetectionResponse(response, types, imageWidth, imageHeight);
  detections = detections.filter(d => d.confidence >= minConfidence);

  return detections;
}

/**
 * Detect sensitive content in an image using AI vision analysis.
 * Includes timeout, retry (max 1 retry), and graceful degradation.
 */
export async function detectSensitiveContent(
  imageBuffer: Buffer,
  options: DetectionOptions = {
    types: ['face', 'license_plate', 'text', 'address'],
    minConfidence: 0.7,
  }
): Promise<VisionAnalysisResult> {
  const startTime = Date.now();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const MAX_RETRIES = 1;

  // Get real image dimensions
  const metadata = await sharp(imageBuffer).metadata();
  const imageWidth = metadata.width ?? 0;
  const imageHeight = metadata.height ?? 0;

  // Strip EXIF data (GPS coordinates, camera model, date/time) before AI analysis
  const { cleanedBuffer, hadGpsData } = await stripExifFromImage(imageBuffer);

  let detections: DetectionResult[] = [];
  let lastError: Error | null = null;

  // Retry loop: attempt detection up to MAX_RETRIES on transient failure
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      detections = await runDetectionAttempt(
        cleanedBuffer,
        metadata,
        imageWidth,
        imageHeight,
        timeoutMs,
        options.types,
        options.minConfidence
      );
      // Success — break out of retry loop
      break;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown detection error');
      if (attempt < MAX_RETRIES) {
        console.warn(
          `[SensitiveContentDetection] Attempt ${attempt + 1} failed: ${lastError.message}. Retrying...`
        );
      }
    }
  }

  // Graceful degradation: if all attempts failed, return empty detections with warning
  if (detections.length === 0 && lastError !== null) {
    console.warn(
      `[SensitiveContentDetection] All AI detection attempts failed (${MAX_RETRIES + 1} tries), returning empty results: ${lastError.message}`
    );
  }

  // Sort by confidence and limit results
  detections.sort((a, b) => b.confidence - a.confidence);
  if (options.maxResults && detections.length > options.maxResults) {
    detections.splice(options.maxResults);
  }

  return {
    detections,
    imageWidth,
    imageHeight,
    processingTime: Date.now() - startTime,
    exifStripped: true,
    hadGpsData,
  };
}

/**
 * Strip EXIF data from image and return cleaned buffer
 */
export async function stripExifFromImage(imageBuffer: Buffer): Promise<{
  cleanedBuffer: Buffer;
  exifData: Record<string, unknown> | null;
  hadGpsData: boolean;
}> {
  const exifData = await extractExif(imageBuffer);
  const hadGpsData = exifData ? await hasGpsExif(imageBuffer) : false;
  const cleanedBuffer = await stripExif(imageBuffer);

  return { cleanedBuffer, exifData, hadGpsData };
}

/**
 * Calculate overall privacy risk score based on detections
 */
export function calculatePrivacyRisk(detections: DetectionResult[]): number {
  if (detections.length === 0) return 0;

  const typeWeights: Record<SensitiveType, number> = {
    face: 0.9,
    license_plate: 0.8,
    address: 0.85,
    text: 0.5,
    sensitive_object: 0.75,
    qr_code: 0.6,
    barcode: 0.4,
  };

  let weightedScore = 0;
  let totalWeight = 0;

  for (const detection of detections) {
    const weight = typeWeights[detection.type] || 0.5;
    weightedScore += detection.confidence * weight;
    totalWeight += weight;
  }

  const normalizedScore = Math.min(
    100,
    Math.round((weightedScore / Math.max(1, totalWeight)) * 100)
  );

  return normalizedScore;
}

/**
 * Get risk level based on score
 */
export function getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score < 30) return 'low';
  if (score < 60) return 'medium';
  if (score < 85) return 'high';
  return 'critical';
}
