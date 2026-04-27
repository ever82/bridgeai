/**
 * Vision Analysis Service
 * Provides comprehensive image analysis using AI vision APIs
 */

import {
  detectSensitiveContent,
  DetectionResult,
  VisionAnalysisResult,
  SensitiveType,
} from './sensitiveContentDetection';
import { IVisionModelAdapter, ImageInput } from './vision/types';
import { OCRService } from './ocrService';

export interface VisionAnalysisOptions {
  detectSensitiveContent: boolean;
  detectObjects: boolean;
  detectScenes: boolean;
  detectText: boolean;
  minConfidence: number;
}

function bufferToImageInput(imageBuffer: Buffer): ImageInput {
  return {
    type: 'base64',
    data: imageBuffer.toString('base64'),
    mimeType: 'image/jpeg',
  };
}

export interface SceneAnalysis {
  scene: string;
  confidence: number;
  attributes: string[];
}

export interface ObjectAnalysis {
  label: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  confidence: number;
}

export interface TextAnalysis {
  text: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  confidence: number;
}

export interface ComprehensiveVisionResult {
  sensitiveContent: VisionAnalysisResult;
  sceneAnalysis: SceneAnalysis | null;
  objects: ObjectAnalysis[];
  text: TextAnalysis[];
  recommendations: DesensitizationRecommendation[];
}

export interface DesensitizationRecommendation {
  type: SensitiveType;
  priority: 'low' | 'medium' | 'high';
  reason: string;
  suggestedMethod: 'blur' | 'mosaic' | 'pixelate' | 'replace_background';
  suggestedIntensity: number; // 0-100
}

/**
 * Perform comprehensive vision analysis on an image
 */
export async function analyzeImage(
  imageBuffer: Buffer,
  options: VisionAnalysisOptions = {
    detectSensitiveContent: true,
    detectObjects: true,
    detectScenes: true,
    detectText: true,
    minConfidence: 0.7,
  },
  adapter?: IVisionModelAdapter
): Promise<ComprehensiveVisionResult> {
  const startTime = Date.now();

  // Run analyses in parallel
  const [sensitiveContent, sceneAnalysis, objects, text] = await Promise.all([
    options.detectSensitiveContent
      ? detectSensitiveContent(imageBuffer, {
          types: [
            'face',
            'license_plate',
            'text',
            'address',
            'sensitive_object',
            'qr_code',
            'barcode',
          ],
          minConfidence: options.minConfidence,
        })
      : Promise.resolve({ detections: [], imageWidth: 0, imageHeight: 0, processingTime: 0 }),
    options.detectScenes ? analyzeScene(imageBuffer, adapter) : Promise.resolve(null),
    options.detectObjects
      ? detectObjects(imageBuffer, options.minConfidence, adapter)
      : Promise.resolve([]),
    options.detectText
      ? detectText(imageBuffer, options.minConfidence, adapter)
      : Promise.resolve([]),
  ]);

  // Generate recommendations based on findings
  const recommendations = generateRecommendations(sensitiveContent.detections, sceneAnalysis);

  console.log(`Vision analysis completed in ${Date.now() - startTime}ms`);

  return {
    sensitiveContent,
    sceneAnalysis,
    objects,
    text,
    recommendations,
  };
}

/**
 * Analyze the scene/context of an image
 */
async function analyzeScene(
  imageBuffer: Buffer,
  adapter?: IVisionModelAdapter
): Promise<SceneAnalysis | null> {
  if (!adapter) {
    throw new Error('Vision adapter is required for real analysis');
  }

  const imageInput = bufferToImageInput(imageBuffer);

  const prompt = `Analyze this image and classify the scene. Return the result in JSON format:
{
  "scene": "scene name (e.g., street, office, home, restaurant)",
  "confidence": 0.0-1.0,
  "attributes": ["attribute1", "attribute2", ...]
}`;

  const response = await adapter.analyzeImage(imageInput, prompt, {
    maxTokens: 512,
    temperature: 0.2,
  });

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      return {
        scene: String(data.scene || 'unknown'),
        confidence: Number(data.confidence) || 0.5,
        attributes: Array.isArray(data.attributes) ? data.attributes : [],
      };
    }
  } catch {
    // JSON parsing failed
  }

  return null;
}

/**
 * Detect objects in an image
 */
async function detectObjects(
  imageBuffer: Buffer,
  minConfidence: number,
  adapter?: IVisionModelAdapter
): Promise<ObjectAnalysis[]> {
  if (!adapter) {
    throw new Error('Vision adapter is required for real analysis');
  }

  const imageInput = bufferToImageInput(imageBuffer);

  const prompt = `Detect all significant objects in this image. Return the results as a JSON array:
[
  {
    "label": "object name",
    "boundingBox": { "x": 0, "y": 0, "width": 0, "height": 0 },
    "confidence": 0.0-1.0
  }
]`;

  const response = await adapter.analyzeImage(imageInput, prompt, {
    maxTokens: 1024,
    temperature: 0.2,
  });

  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      if (Array.isArray(data)) {
        return data
          .map(obj => ({
            label: String(obj.label || ''),
            boundingBox: {
              x: Number(obj.boundingBox?.x) || 0,
              y: Number(obj.boundingBox?.y) || 0,
              width: Number(obj.boundingBox?.width) || 0,
              height: Number(obj.boundingBox?.height) || 0,
            },
            confidence: Number(obj.confidence) || 0,
          }))
          .filter(o => o.label && o.confidence >= minConfidence);
      }
    }
  } catch {
    // JSON parsing failed
  }

  return [];
}

/**
 * Detect text in an image using OCR
 */
async function detectText(
  imageBuffer: Buffer,
  minConfidence: number,
  adapter?: IVisionModelAdapter
): Promise<TextAnalysis[]> {
  if (!adapter) {
    throw new Error('Vision adapter is required for real analysis');
  }

  const imageInput = bufferToImageInput(imageBuffer);
  const ocrService = new OCRService({ adapter });
  const ocrResult = await ocrService.extractText(imageInput);

  return ocrResult.textBlocks
    .map(block => ({
      text: block.text,
      boundingBox: block.boundingBox,
      confidence: block.confidence,
    }))
    .filter(t => t.confidence >= minConfidence);
}

/**
 * Generate desensitization recommendations based on detections and scene
 */
function generateRecommendations(
  detections: DetectionResult[],
  sceneAnalysis: SceneAnalysis | null
): DesensitizationRecommendation[] {
  const recommendations: DesensitizationRecommendation[] = [];

  for (const detection of detections) {
    let recommendation: DesensitizationRecommendation;

    switch (detection.type) {
      case 'face':
        recommendation = {
          type: 'face',
          priority: 'high',
          reason: 'Personal identity protection required',
          suggestedMethod: 'blur',
          suggestedIntensity: 80,
        };
        break;
      case 'license_plate':
        recommendation = {
          type: 'license_plate',
          priority: 'high',
          reason: 'Vehicle registration information is sensitive',
          suggestedMethod: 'mosaic',
          suggestedIntensity: 90,
        };
        break;
      case 'address':
        recommendation = {
          type: 'address',
          priority: 'high',
          reason: 'Location privacy protection required',
          suggestedMethod: 'pixelate',
          suggestedIntensity: 85,
        };
        break;
      case 'text':
        recommendation = {
          type: 'text',
          priority: 'medium',
          reason: 'Text may contain sensitive information',
          suggestedMethod: 'blur',
          suggestedIntensity: 60,
        };
        break;
      case 'sensitive_object':
        recommendation = {
          type: 'sensitive_object',
          priority: 'high',
          reason: 'Sensitive document or object detected',
          suggestedMethod: 'replace_background',
          suggestedIntensity: 95,
        };
        break;
      case 'qr_code':
      case 'barcode':
        recommendation = {
          type: detection.type,
          priority: 'medium',
          reason: 'Code may contain encoded sensitive data',
          suggestedMethod: 'mosaic',
          suggestedIntensity: 85,
        };
        break;
      default:
        recommendation = {
          type: detection.type,
          priority: 'low',
          reason: 'General privacy protection',
          suggestedMethod: 'blur',
          suggestedIntensity: 50,
        };
    }

    // Adjust based on scene
    if (sceneAnalysis) {
      if (sceneAnalysis.scene === 'home' && detection.type === 'face') {
        recommendation.suggestedIntensity = 70; // Lower intensity for home photos
      }
      if (sceneAnalysis.scene === 'street' && detection.type === 'license_plate') {
        recommendation.suggestedIntensity = 95; // Higher intensity for street photos
      }
    }

    recommendations.push(recommendation);
  }

  return recommendations;
}

/**
 * Batch analyze multiple images
 */
export async function batchAnalyzeImages(
  imageBuffers: Buffer[],
  options?: VisionAnalysisOptions,
  adapter?: IVisionModelAdapter
): Promise<ComprehensiveVisionResult[]> {
  const results = await Promise.all(
    imageBuffers.map(buffer => analyzeImage(buffer, options, adapter))
  );
  return results;
}

/**
 * Get analysis statistics for a batch of images
 */
export function getBatchStatistics(results: ComprehensiveVisionResult[]) {
  const totalImages = results.length;
  const imagesWithSensitiveContent = results.filter(
    r => r.sensitiveContent.detections.length > 0
  ).length;
  const totalDetections = results.reduce((sum, r) => sum + r.sensitiveContent.detections.length, 0);
  const avgProcessingTime =
    results.reduce((sum, r) => sum + r.sensitiveContent.processingTime, 0) / totalImages;

  const detectionTypes = new Map<string, number>();
  for (const result of results) {
    for (const detection of result.sensitiveContent.detections) {
      detectionTypes.set(detection.type, (detectionTypes.get(detection.type) || 0) + 1);
    }
  }

  return {
    totalImages,
    imagesWithSensitiveContent,
    totalDetections,
    avgProcessingTime,
    detectionTypeCounts: Object.fromEntries(detectionTypes),
    sensitiveContentPercentage: Math.round((imagesWithSensitiveContent / totalImages) * 100),
  };
}
