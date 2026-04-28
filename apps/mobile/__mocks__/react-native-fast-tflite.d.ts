export interface Tensor {
    data: Float32Array;
    shape: number[];
}
export declare class TensorflowModel {
    static fromAssets: jest.Mock<Promise<TensorflowModel>, [], any>;
    run: jest.Mock<Promise<{
        embeddings: {
            data: Float32Array<ArrayBuffer>;
        };
        scene: {
            data: Float32Array<ArrayBuffer>;
        };
        texture: {
            data: Float32Array<ArrayBuffer>;
        };
        detections: {
            data: Float32Array<ArrayBuffer>;
        };
    }>, [], any>;
}
declare const _default: {
    TensorflowModel: typeof TensorflowModel;
};
export default _default;
//# sourceMappingURL=react-native-fast-tflite.d.ts.map