// Web stub for localImageAnalysis - native AI modules not available on web

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

export class LocalImageAnalysisService {
  private static instance: LocalImageAnalysisService;

  static getInstance(): LocalImageAnalysisService {
    if (!LocalImageAnalysisService.instance) {
      LocalImageAnalysisService.instance = new LocalImageAnalysisService();
    }
    return LocalImageAnalysisService.instance;
  }

  async initialize(): Promise<void> {
    // No-op on web
  }

  async analyzeImage(_imageUri: string, _imageId: string): Promise<ImageAnalysisResult> {
    throw new Error('Local image analysis is not available on web');
  }

  async analyzeBatch(
    _images: Array<{ uri: string; id: string }>,
    _onProgress?: (progress: AnalysisProgress) => void
  ): Promise<ImageAnalysisResult[]> {
    throw new Error('Local image analysis is not available on web');
  }

  cancelBatchProcessing(): void {
    // No-op on web
  }

  isAnalyzing(): boolean {
    return false;
  }

  getProgress(): AnalysisProgress | null {
    return null;
  }
}

export const localImageAnalysis = LocalImageAnalysisService.getInstance();
