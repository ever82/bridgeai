import { LocalImageAnalysisService, AnalysisProgress } from '../localImageAnalysis';

// Mock react-native-vision-camera
jest.mock('react-native-vision-camera', () => ({
  VisionCameraProxy: {
    getFrameProcessorPlugin: jest.fn(() => ({
      call: jest.fn(),
    })),
    createTensorFromImage: jest.fn(() => ({
      data: new Float32Array(224 * 224 * 3),
      shape: [1, 224, 224, 3],
      dataType: 'float32',
    })),
  },
}));

// Mock react-native-worklets-core
jest.mock('react-native-worklets-core', () => ({
  Worklets: {
    createRunInJsFn: jest.fn(fn => fn),
    createRunOnJS: jest.fn(fn => fn),
  },
}));

// Mock expo-image-manipulator
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn().mockResolvedValue({
    uri: 'file:///resized.jpg',
  }),
  SaveFormat: { JPEG: 'jpeg' },
}));

// Mock react-native-fast-tflite
jest.mock('react-native-fast-tflite', () => {
  const mockRun = jest.fn().mockResolvedValue({
    embeddings: { data: new Float32Array(128).fill(0.5) },
    texture: { data: new Float32Array(128).fill(0.3) },
    detections: { data: new Float32Array(6).fill(0) },
    scene: { data: new Float32Array([0.1, 0.8, 0.05, 0.02, 0.02, 0.01]) },
  });

  return {
    Tensor: jest.fn(),
    TensorflowModel: {
      fromAssets: jest.fn().mockResolvedValue({ run: mockRun }),
    },
    __mockRun: mockRun,
  };
});

describe('LocalImageAnalysisService', () => {
  let analyzer: LocalImageAnalysisService;
  let mockRun: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    const tflite = jest.requireMock('react-native-fast-tflite');
    mockRun = tflite.__mockRun;
    mockRun.mockResolvedValue({
      embeddings: { data: new Float32Array(128).fill(0.5) },
      texture: { data: new Float32Array(128).fill(0.3) },
      detections: { data: new Float32Array(6).fill(0) },
      scene: { data: new Float32Array([0.1, 0.8, 0.05, 0.02, 0.02, 0.01]) },
    });
    (
      LocalImageAnalysisService as unknown as { instance: LocalImageAnalysisService | null }
    ).instance = null;
    analyzer = LocalImageAnalysisService.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('returns the same instance', () => {
      const instance1 = LocalImageAnalysisService.getInstance();
      const instance2 = LocalImageAnalysisService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Model Initialization', () => {
    it('initializes the analysis model', async () => {
      await expect(analyzer.initialize()).resolves.not.toThrow();
    });

    it('handles initialization errors gracefully', async () => {
      const { TensorflowModel } = jest.requireMock('react-native-fast-tflite');
      TensorflowModel.fromAssets.mockRejectedValueOnce(new Error('Model load failed'));

      await expect(analyzer.initialize()).rejects.toThrow(
        'Failed to initialize on-device AI model'
      );
    });
  });

  describe('Single Image Analysis', () => {
    const mockImageUri = 'file:///path/to/image.jpg';

    beforeEach(async () => {
      await analyzer.initialize();
    });

    it('analyzes a single image and returns results', async () => {
      const result = await analyzer.analyzeImage(mockImageUri, 'img-1');

      expect(result).toMatchObject({
        imageId: 'img-1',
        uri: mockImageUri,
        tags: expect.any(Array),
        confidence: expect.any(Number),
      });
      expect(result.features).toBeDefined();
      expect(result.features.sceneClassification).toBeDefined();
    });

    it('throws if model not initialized', async () => {
      (
        LocalImageAnalysisService as unknown as { instance: LocalImageAnalysisService | null }
      ).instance = null;
      const fresh = LocalImageAnalysisService.getInstance();

      const { TensorflowModel } = jest.requireMock('react-native-fast-tflite');
      TensorflowModel.fromAssets.mockRejectedValueOnce(new Error('No model'));

      await expect(fresh.analyzeImage(mockImageUri, 'img-2')).rejects.toThrow();
    });
  });

  describe('Batch Processing', () => {
    const mockImages = [
      { uri: 'file:///path/to/image1.jpg', id: 'img-1' },
      { uri: 'file:///path/to/image2.jpg', id: 'img-2' },
      { uri: 'file:///path/to/image3.jpg', id: 'img-3' },
    ];

    beforeEach(async () => {
      await analyzer.initialize();
    });

    it('processes multiple images in batch', async () => {
      const progressUpdates: AnalysisProgress[] = [];

      const results = await analyzer.analyzeBatch(mockImages, progress => {
        progressUpdates.push(progress);
      });

      expect(results.length).toBe(mockImages.length);
      expect(progressUpdates.length).toBeGreaterThan(0);

      const finalProgress = progressUpdates[progressUpdates.length - 1];
      expect(finalProgress.percentage).toBe(100);
      expect(finalProgress.total).toBe(mockImages.length);
    });

    it('shows correct progress during batch processing', async () => {
      const progressUpdates: AnalysisProgress[] = [];

      await analyzer.analyzeBatch(mockImages, progress => {
        progressUpdates.push(progress);
      });

      expect(progressUpdates[0].total).toBe(mockImages.length);

      for (let i = 1; i < progressUpdates.length; i++) {
        expect(progressUpdates[i].processed).toBeGreaterThanOrEqual(
          progressUpdates[i - 1].processed
        );
      }
    });

    it('throws if already processing', async () => {
      const batchPromise = analyzer.analyzeBatch(mockImages);

      await expect(analyzer.analyzeBatch(mockImages)).rejects.toThrow(
        'Another batch processing is already running'
      );

      await batchPromise;
    });

    it('allows cancellation of batch processing', async () => {
      const batchPromise = analyzer.analyzeBatch(mockImages);

      analyzer.cancelBatchProcessing();

      await batchPromise;

      expect(analyzer.isAnalyzing()).toBe(false);
    });
  });

  describe('Processing State', () => {
    it('reports analyzing state', async () => {
      await analyzer.initialize();
      expect(analyzer.isAnalyzing()).toBe(false);
    });
  });

  describe('Privacy - On-device Processing', () => {
    it('processes images locally without uploading', async () => {
      await analyzer.initialize();

      const result = await analyzer.analyzeImage('file:///image.jpg', 'img-test');

      expect(result).toBeDefined();
      expect(result.processedAt).toBeInstanceOf(Date);
    });

    it('does not make network requests during analysis', async () => {
      const mockFetch = jest.fn();
      global.fetch = mockFetch;
      await analyzer.initialize();

      await analyzer.analyzeImage('file:///image.jpg', 'img-test');

      expect(mockFetch).not.toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (global as any).fetch;
    });
  });
});
