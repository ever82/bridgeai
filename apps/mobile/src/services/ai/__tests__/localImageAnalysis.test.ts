import {
  LocalImageAnalysis,
  AnalysisProgress,
  ImageAnalysisResult,
  AnalysisOptions,
} from '../localImageAnalysis';

// Mock react-native-vision-camera
jest.mock('react-native-vision-camera', () => ({
  VisionCameraProxy: {
    getFrameProcessorPlugin: jest.fn(() => ({
      call: jest.fn(),
    })),
  },
}));

// Mock react-native-worklets-core
jest.mock('react-native-worklets-core', () => ({
  Worklets: {
    createRunInJsFn: jest.fn((fn) => fn),
    createRunOnJS: jest.fn((fn) => fn),
  },
}));

// Mock TensorFlow Lite
jest.mock('react-native-tflite', () => ({
  loadTensorflowModel: jest.fn().mockResolvedValue({
    run: jest.fn().mockResolvedValue({
      output: new Float32Array(1000),
    }),
  }),
  TensorflowModel: jest.Mock,
}));

describe('LocalImageAnalysis', () => {
  let analyzer: LocalImageAnalysis;

  beforeEach(() => {
    jest.clearAllMocks();
    (LocalImageAnalysis as unknown as { instance: LocalImageAnalysis | null }).instance = null;
    analyzer = LocalImageAnalysis.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('returns the same instance', () => {
      const instance1 = LocalImageAnalysis.getInstance();
      const instance2 = LocalImageAnalysis.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Model Initialization', () => {
    it('initializes the analysis model', async () => {
      await expect(analyzer.initialize()).resolves.not.toThrow();
      expect(analyzer.isModelLoaded()).toBe(true);
    });

    it('handles initialization errors gracefully', async () => {
      const { loadTensorflowModel } = require('react-native-tflite');
      loadTensorflowModel.mockRejectedValueOnce(new Error('Model load failed'));

      await expect(analyzer.initialize()).rejects.toThrow('Model load failed');
      expect(analyzer.isModelLoaded()).toBe(false);
    });
  });

  describe('Single Image Analysis', () => {
    const mockImageUri = 'file:///path/to/image.jpg';

    beforeEach(async () => {
      await analyzer.initialize();
    });

    it('analyzes a single image and returns results', async () => {
      const result = await analyzer.analyzeImage(mockImageUri);

      expect(result).toMatchObject({
        uri: mockImageUri,
        tags: expect.any(Array),
        embeddings: expect.any(Float32Array),
        sceneType: expect.any(String),
      });
    });

    it('respects analysis options', async () => {
      const options: AnalysisOptions = {
        generateEmbeddings: false,
        generateTags: true,
        sceneDetection: true,
      };

      const result = await analyzer.analyzeImage(mockImageUri, options);

      expect(result.tags.length).toBeGreaterThan(0);
      // Embeddings might be empty if disabled
    });

    it('handles analysis errors', async () => {
      const { loadTensorflowModel } = require('react-native-tflite');
      const mockModel = {
        run: jest.fn().mockRejectedValue(new Error('Analysis failed')),
      };
      loadTensorflowModel.mockResolvedValue(mockModel);
      await analyzer.initialize();

      await expect(analyzer.analyzeImage(mockImageUri)).rejects.toThrow('Analysis failed');
    });
  });

  describe('Batch Processing', () => {
    const mockImageUris = [
      'file:///path/to/image1.jpg',
      'file:///path/to/image2.jpg',
      'file:///path/to/image3.jpg',
    ];

    beforeEach(async () => {
      await analyzer.initialize();
    });

    it('processes multiple images in batch', async () => {
      const results: ImageAnalysisResult[] = [];
      const progressUpdates: AnalysisProgress[] = [];

      const onProgress = (progress: AnalysisProgress) => {
        progressUpdates.push(progress);
      };

      const onComplete = (result: ImageAnalysisResult) => {
        results.push(result);
      };

      await analyzer.analyzeBatch(mockImageUris, {
        onProgress,
        onComplete,
        batchSize: 2,
      });

      expect(results.length).toBe(mockImageUris.length);
      expect(progressUpdates.length).toBeGreaterThan(0);

      // Check progress updates
      const finalProgress = progressUpdates[progressUpdates.length - 1];
      expect(finalProgress.completed).toBe(mockImageUris.length);
      expect(finalProgress.total).toBe(mockImageUris.length);
    });

    it('shows correct progress during batch processing', async () => {
      const progressUpdates: AnalysisProgress[] = [];

      await analyzer.analyzeBatch(mockImageUris, {
        onProgress: (progress) => progressUpdates.push(progress),
      });

      // First progress should show 0 or 1 completed
      expect(progressUpdates[0].completed).toBeGreaterThanOrEqual(0);
      expect(progressUpdates[0].total).toBe(mockImageUris.length);

      // Progress should increment
      for (let i = 1; i < progressUpdates.length; i++) {
        expect(progressUpdates[i].completed).toBeGreaterThanOrEqual(
          progressUpdates[i - 1].completed
        );
      }
    });

    it('handles batch processing with errors', async () => {
      const { loadTensorflowModel } = require('react-native-tflite');
      const mockModel = {
        run: jest.fn()
          .mockResolvedValueOnce({ output: new Float32Array(1000) })
          .mockRejectedValueOnce(new Error('Analysis error'))
          .mockResolvedValueOnce({ output: new Float32Array(1000) }),
      };
      loadTensorflowModel.mockResolvedValue(mockModel);
      await analyzer.initialize();

      const errors: Error[] = [];
      const results: ImageAnalysisResult[] = [];

      await analyzer.analyzeBatch(mockImageUris, {
        onComplete: (result) => results.push(result),
        onError: (error) => errors.push(error),
        continueOnError: true,
      });

      // Should have some results and some errors
      expect(results.length + errors.length).toBe(mockImageUris.length);
    });

    it('allows cancellation of batch processing', async () => {
      let wasCancelled = false;

      const batchPromise = analyzer.analyzeBatch(mockImageUris, {
        onProgress: () => {
          analyzer.cancelBatch();
        },
        onCancelled: () => {
          wasCancelled = true;
        },
      });

      await batchPromise;

      expect(wasCancelled).toBe(true);
      expect(analyzer.isBatchProcessing()).toBe(false);
    });
  });

  describe('Feature Extraction', () => {
    beforeEach(async () => {
      await analyzer.initialize();
    });

    it('extracts image embeddings', async () => {
      const embeddings = await analyzer.extractEmbeddings('file:///image.jpg');

      expect(embeddings).toBeInstanceOf(Float32Array);
      expect(embeddings.length).toBeGreaterThan(0);
    });

    it('generates semantic tags', async () => {
      const tags = await analyzer.generateTags('file:///image.jpg');

      expect(Array.isArray(tags)).toBe(true);
      expect(tags.length).toBeGreaterThan(0);
      expect(tags[0]).toMatchObject({
        label: expect.any(String),
        confidence: expect.any(Number),
      });
    });

    it('detects scene type', async () => {
      const sceneType = await analyzer.detectScene('file:///image.jpg');

      expect(typeof sceneType).toBe('string');
      expect(sceneType.length).toBeGreaterThan(0);
    });
  });

  describe('Processing Progress', () => {
    it('provides progress callback during analysis', async () => {
      await analyzer.initialize();

      const progressCallback = jest.fn();
      const options: AnalysisOptions = {
        onProgress: progressCallback,
      };

      await analyzer.analyzeImage('file:///image.jpg', options);

      expect(progressCallback).toHaveBeenCalled();
    });

    it('reports processing stages', async () => {
      await analyzer.initialize();

      const stages: string[] = [];

      await analyzer.analyzeImage('file:///image.jpg', {
        onProgress: (progress) => {
          if (!stages.includes(progress.stage)) {
            stages.push(progress.stage);
          }
        },
      });

      expect(stages.length).toBeGreaterThan(0);
    });
  });

  describe('Privacy - On-device Processing', () => {
    it('processes images locally without uploading', async () => {
      await analyzer.initialize();

      const result = await analyzer.analyzeImage('file:///image.jpg');

      // Result should be processed locally
      expect(result).toBeDefined();
      expect(result.processedLocally).toBe(true);
    });

    it('does not make network requests during analysis', async () => {
      const fetchSpy = jest.spyOn(global, 'fetch');
      await analyzer.initialize();

      await analyzer.analyzeImage('file:///image.jpg');

      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });
  });
});
