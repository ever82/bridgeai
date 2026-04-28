"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TensorflowModel = void 0;
class TensorflowModel {
    static fromAssets = jest.fn(async () => new TensorflowModel());
    run = jest.fn(async () => ({
        embeddings: { data: new Float32Array(128) },
        scene: { data: new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5, 0.6]) },
        texture: { data: new Float32Array(128) },
        detections: { data: new Float32Array(12) },
    }));
}
exports.TensorflowModel = TensorflowModel;
exports.default = {
    TensorflowModel,
};
//# sourceMappingURL=react-native-fast-tflite.js.map