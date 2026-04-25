/**
 * Stub for react-native-fast-tflite (package not installed)
 */
export interface Tensor {
  data: Float32Array;
  shape: number[];
}

export class TensorflowModel {
  static async fromAssets(_path: string): Promise<TensorflowModel> {
    throw new Error('react-native-fast-tflite is not installed');
  }
  async run(_input: any): Promise<Record<string, Tensor>> {
    throw new Error('react-native-fast-tflite is not installed');
  }
}
