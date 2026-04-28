"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TFLite = void 0;
exports.TFLite = {
    loadModel: jest.fn().mockResolvedValue('model-id'),
    runInference: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
    unloadModel: jest.fn().mockResolvedValue(undefined),
};
exports.default = {
    TFLite: exports.TFLite,
};
//# sourceMappingURL=react-native-tflite.js.map