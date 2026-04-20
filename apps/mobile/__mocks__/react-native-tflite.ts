export const TFLite = {
  loadModel: jest.fn().mockResolvedValue('model-id'),
  runInference: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  unloadModel: jest.fn().mockResolvedValue(undefined),
};

export default {
  TFLite,
};
