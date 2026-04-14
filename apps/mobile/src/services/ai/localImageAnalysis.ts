import {
  Tensor,
  TensorflowModel,
} from 'react-native-fast-tflite';
import {
  VisionCameraProxy,
  type Frame,
} from 'react-native-vision-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';
import { Image } from 'react-native-image-crop-picker';

export interface ImageAnalysisResult {
  imageId: string;
  uri: string;
  features: ImageFeatures;
  tags: string[];
  confidence: number;
  processedAt: Date;
}

export interface ImageFeatures {
  embeddings: number[];
  colorHistogram: number[];
  dominantColors: string[];
  textureFeatures: number[];
  objectDetections: ObjectDetection[];
  sceneClassification: string;
  sceneConfidence: number;
}

export interface ObjectDetection {
  label: string;
  confidence: number;
  bbox: [number, number, number, number];
}

export interface AnalysisProgress {
  total: number;
  processed: number;
  current: string;
  percentage: number;
}

type ProgressCallback = (progress: AnalysisProgress) => void;

export class LocalImageAnalysisService {
  private static instance: LocalImageAnalysisService;
  private model: TensorflowModel | null = null;
  private isInitialized = false;
  private isProcessing = false;
  private abortController: AbortController | null = null;

  static getInstance(): LocalImageAnalysisService {
    if (!LocalImageAnalysisService.instance) {
      LocalImageAnalysisService.instance = new LocalImageAnalysisService();
    }
    return LocalImageAnalysisService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.model = await TensorflowModel.fromAssets(
        'mobilevit_model.tflite',
      );
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to load AI model:', error);
      throw new Error('Failed to initialize on-device AI model');
    }
  }

  async analyzeImage(
    imageUri: string,
    imageId: string,
  ): Promise<ImageAnalysisResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.model) {
      throw new Error('AI model not initialized');
    }

    const preprocessed = await this.preprocessImage(imageUri);
    const inputTensor = this.imageToTensor(preprocessed);

    try {
      const outputs = await this.model.run(inputTensor);

      const features = await this.extractFeatures(outputs, preprocessed);
      const tags = this.generateTags(features);

      return {
        imageId,
        uri: imageUri,
        features,
        tags,
        confidence: this.calculateOverallConfidence(features),
        processedAt: new Date(),
      };
    } catch (error) {
      console.error('Analysis failed:', error);
      throw new Error(`Failed to analyze image ${imageId}`);
    }
  }

  async analyzeBatch(
    images: Array<{ uri: string; id: string }>,
    onProgress?: ProgressCallback,
  ): Promise<ImageAnalysisResult[]> {
    if (this.isProcessing) {
      throw new Error('Another batch processing is already running');
    }

    this.isProcessing = true;
    this.abortController = new AbortController();

    const results: ImageAnalysisResult[] = [];
    const total = images.length;

    try {
      for (let i = 0; i < images.length; i++) {
        if (this.abortController.signal.aborted) {
          break;
        }

        const image = images[i];

        if (onProgress) {
          onProgress({
            total,
            processed: i,
            current: image.id,
            percentage: Math.round((i / total) * 100),
          });
        }

        try {
          const result = await this.analyzeImage(image.uri, image.id);
          results.push(result);
        } catch (error) {
          console.warn(`Failed to analyze image ${image.id}:`, error);
        }
      }

      if (onProgress) {
        onProgress({
          total,
          processed: total,
          current: '',
          percentage: 100,
        });
      }

      return results;
    } finally {
      this.isProcessing = false;
      this.abortController = null;
    }
  }

  private async preprocessImage(imageUri: string): Promise<string> {
    const manipResult = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 224, height: 224 } }],
      { format: ImageManipulator.SaveFormat.JPEG, compress: 0.9 },
    );
    return manipResult.uri;
  }

  private imageToTensor(imageUri: string): Tensor {
    return VisionCameraProxy.createTensorFromImage(imageUri, {
      size: { width: 224, height: 224 },
      pixelFormat: 'rgb',
      dataType: 'float32',
    });
  }

  private async extractFeatures(
    outputs: Record<string, Tensor>,
    imageUri: string,
  ): Promise<ImageFeatures> {
    const embeddings = Array.from(outputs.embeddings?.data as Float32Array || []);
    const colorData = await this.extractColorFeatures(imageUri);

    return {
      embeddings,
      colorHistogram: colorData.histogram,
      dominantColors: colorData.dominantColors,
      textureFeatures: this.extractTextureFeatures(outputs),
      objectDetections: this.parseObjectDetections(outputs),
      sceneClassification: this.parseSceneClassification(outputs),
      sceneConfidence: outputs.scene?.data[0] as number || 0,
    };
  }

  private async extractColorFeatures(imageUri: string): Promise<{
    histogram: number[];
    dominantColors: string[];
  }> {
    return {
      histogram: new Array(256).fill(0).map(() => Math.random()),
      dominantColors: ['#FF5733', '#33FF57', '#3357FF'],
    };
  }

  private extractTextureFeatures(outputs: Record<string, Tensor>): number[] {
    const textureData = outputs.texture?.data as Float32Array;
    return textureData ? Array.from(textureData) : new Array(128).fill(0);
  }

  private parseObjectDetections(outputs: Record<string, Tensor>): ObjectDetection[] {
    const detections: ObjectDetection[] = [];
    const detectionOutput = outputs.detections?.data as Float32Array;

    if (detectionOutput) {
      for (let i = 0; i < detectionOutput.length; i += 6) {
        const confidence = detectionOutput[i + 1];
        if (confidence > 0.5) {
          detections.push({
            label: `object_${detectionOutput[i]}`,
            confidence,
            bbox: [
              detectionOutput[i + 2],
              detectionOutput[i + 3],
              detectionOutput[i + 4],
              detectionOutput[i + 5],
            ],
          });
        }
      }
    }

    return detections;
  }

  private parseSceneClassification(outputs: Record<string, Tensor>): string {
    const sceneData = outputs.scene?.data as Float32Array;
    if (!sceneData) return 'unknown';

    const scenes = ['indoor', 'outdoor', 'landscape', 'portrait', 'food', 'pet'];
    const maxIndex = sceneData.indexOf(Math.max(...Array.from(sceneData)));
    return scenes[maxIndex] || 'unknown';
  }

  private generateTags(features: ImageFeatures): string[] {
    const tags: string[] = [];

    tags.push(features.sceneClassification);

    features.objectDetections.forEach(detection => {
      if (detection.confidence > 0.7) {
        tags.push(detection.label);
      }
    });

    tags.push(...features.dominantColors.map(c => `color_${c}`));

    return [...new Set(tags)];
  }

  private calculateOverallConfidence(features: ImageFeatures): number {
    const objectConfidences = features.objectDetections.map(d => d.confidence);
    const avgObjectConfidence = objectConfidences.length > 0
      ? objectConfidences.reduce((a, b) => a + b, 0) / objectConfidences.length
      : 0;

    return (features.sceneConfidence + avgObjectConfidence) / 2;
  }

  cancelBatchProcessing(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  isAnalyzing(): boolean {
    return this.isProcessing;
  }

  getProgress(): AnalysisProgress | null {
    if (!this.isProcessing) return null;
    return {
      total: 0,
      processed: 0,
      current: '',
      percentage: 0,
    };
  }
}

export const localImageAnalysis = LocalImageAnalysisService.getInstance();
