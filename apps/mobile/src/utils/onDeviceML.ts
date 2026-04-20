import { TensorflowModel } from 'react-native-fast-tflite';
import { Platform } from 'react-native';

export interface ModelInfo {
  name: string;
  version: string;
  size: number;
  inputShape: number[];
  outputShape: number[];
  supportedOps: string[];
}

export interface InferenceResult {
  output: Float32Array;
  inferenceTime: number;
}

export class OnDeviceML {
  private static instance: OnDeviceML;
  private loadedModels: Map<string, TensorflowModel> = new Map();
  private isGpuDelegateAvailable = false;
  private isNnApiAvailable = false;

  static getInstance(): OnDeviceML {
    if (!OnDeviceML.instance) {
      OnDeviceML.instance = new OnDeviceML();
    }
    return OnDeviceML.instance;
  }

  async initialize(): Promise<void> {
    // Check for GPU delegate availability
    this.isGpuDelegateAvailable = await this.checkGpuDelegate();
    this.isNnApiAvailable = Platform.OS === 'android' && Platform.Version >= 27;
  }

  private async checkGpuDelegate(): Promise<boolean> {
    try {
      // GPU delegate check would be implemented here
      return Platform.OS === 'ios' || (Platform.OS === 'android' && Platform.Version >= 26);
    } catch {
      return false;
    }
  }

  async loadModel(modelName: string, modelPath: string): Promise<void> {
    if (this.loadedModels.has(modelName)) {
      return;
    }

    try {
      const model = await TensorflowModel.fromAssets(modelPath);
      this.loadedModels.set(modelName, model);
    } catch (error) {
      console.error(`Failed to load model ${modelName}:`, error);
      throw new Error(`Model loading failed: ${modelName}`);
    }
  }

  async runInference(
    modelName: string,
    input: Float32Array,
  ): Promise<InferenceResult> {
    const model = this.loadedModels.get(modelName);
    if (!model) {
      throw new Error(`Model not loaded: ${modelName}`);
    }

    const startTime = performance.now();

    try {
      const inputTensor = {
        data: input,
        shape: [1, 224, 224, 3],
      };

      const output = await model.run(inputTensor);
      const inferenceTime = performance.now() - startTime;

      return {
        output: output[0] as Float32Array,
        inferenceTime,
      };
    } catch (error) {
      console.error(`Inference failed for ${modelName}:`, error);
      throw new Error(`Inference failed: ${modelName}`);
    }
  }

  isModelLoaded(modelName: string): boolean {
    return this.loadedModels.has(modelName);
  }

  unloadModel(modelName: string): void {
    this.loadedModels.delete(modelName);
  }

  getLoadedModels(): string[] {
    return Array.from(this.loadedModels.keys());
  }

  getDeviceCapabilities(): {
    gpuDelegate: boolean;
    nnApi: boolean;
    supportsQuantizedModels: boolean;
    maxModelSize: number;
  } {
    return {
      gpuDelegate: this.isGpuDelegateAvailable,
      nnApi: this.isNnApiAvailable,
      supportsQuantizedModels: true,
      maxModelSize: 200 * 1024 * 1024, // 200MB
    };
  }

  async estimatePowerConsumption(_modelName: string): number {
    // Estimate power consumption based on model size and complexity
    return 0.5; // Watts
  }

  getOptimalBatchSize(_modelName: string): number {
    const capabilities = this.getDeviceCapabilities();

    if (capabilities.gpuDelegate) {
      return 4;
    }

    if (capabilities.nnApi) {
      return 2;
    }

    return 1;
  }
}

export const onDeviceML = OnDeviceML.getInstance();
