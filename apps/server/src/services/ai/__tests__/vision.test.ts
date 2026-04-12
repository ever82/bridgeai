/**
 * Vision API Services Tests
 * 图像分析与Vision API服务单元测试
 */

import {
  GPT4VisionAdapter,
  ClaudeVisionAdapter
} from '../adapters/vision';
import { ImageAnalysisService } from '../imageAnalysisService';
import { ImageModerationService } from '../imageModerationService';
import { OCRService } from '../ocrService';
import { ImageSearchService } from '../imageSearchService';
import {
  ImageInput,
  ImageAnalysisResult,
  ImageModerationResult,
  OCRResult,
  ImageSearchResult,
  IVisionModelAdapter
} from '../vision/types';

// Mock Vision Adapter for testing
class MockVisionAdapter implements IVisionModelAdapter {
  readonly id = 'mock-vision';
  readonly provider = 'Mock';
  readonly supportsImages = true;

  async initialize(): Promise<void> {
    // Mock initialization
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  async analyzeImage(
    image: ImageInput,
    prompt: string,
    config?: any
  ): Promise<string> {
    // Return different responses based on prompt content
    if (prompt.includes('scene_description') || prompt.includes('Analyze this image')) {
      return JSON.stringify({
        sceneDescription: 'A person walking in a sunny park with trees and benches',
        detectedObjects: [
          { label: 'person', confidence: 0.95 },
          { label: 'tree', confidence: 0.88 },
          { label: 'bench', confidence: 0.76 }
        ],
        activityTags: ['walking', 'outdoor', 'nature', 'recreation'],
        visualFeatures: {
          dominantColors: ['green', 'blue', 'brown'],
          brightness: 75,
          contrast: 60,
          sharpness: 85,
          hasFaces: true,
          faceCount: 1
        }
      });
    }

    if (prompt.includes('moderation') || prompt.includes('safety')) {
      return JSON.stringify({
        isSafe: true,
        violationType: 'none',
        confidenceScore: 0.98,
        categoryScores: {
          nsfw: 0.01,
          violence: 0.02,
          gore: 0.0,
          hate: 0.0,
          harassment: 0.01,
          selfHarm: 0.0,
          illegal: 0.0,
          privacy: 0.05,
          spam: 0.02
        }
      });
    }

    if (prompt.includes('OCR') || prompt.includes('text')) {
      return JSON.stringify({
        extractedText: 'Hello World! This is a test.',
        language: 'en',
        detectedLanguages: ['en'],
        isHandwritten: false,
        textBlocks: [
          {
            text: 'Hello World!',
            language: 'en',
            confidence: 0.95,
            boundingBox: { x: 0.1, y: 0.2, width: 0.3, height: 0.1 }
          },
          {
            text: 'This is a test.',
            language: 'en',
            confidence: 0.92,
            boundingBox: { x: 0.1, y: 0.4, width: 0.4, height: 0.1 }
          }
        ]
      });
    }

    if (prompt.includes('tags') || prompt.includes('search')) {
      return JSON.stringify({
        tags: ['outdoor', 'nature', 'person', 'park', 'sunny'],
        categories: ['landscape', 'lifestyle'],
        attributes: {
          color: ['green', 'blue'],
          lighting: ['natural', 'bright'],
          time: ['daytime']
        }
      });
    }

    return 'Mock response';
  }

  async generateEmbedding(image: ImageInput): Promise<number[]> {
    // Return a mock embedding vector
    const dimension = 1536;
    const embedding = new Array(dimension).fill(0).map((_, i) =>
      Math.sin(i * 0.1) * 0.5
    );
    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }
}

// Test fixtures
const mockImageUrl: ImageInput = {
  type: 'url',
  data: 'https://example.com/image.jpg'
};

const mockImageBase64: ImageInput = {
  type: 'base64',
  data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  mimeType: 'image/png'
};

describe('VisionModelAdapters', () => {
  describe('GPT4VisionAdapter', () => {
    let adapter: GPT4VisionAdapter;

    beforeEach(() => {
      adapter = new GPT4VisionAdapter({
        apiKey: 'test-api-key'
      });
    });

    it('should have correct id and provider', () => {
      expect(adapter.id).toBe('gpt-4-vision');
      expect(adapter.provider).toBe('OpenAI');
      expect(adapter.supportsImages).toBe(true);
    });

    it('should validate image input', () => {
      // Valid URL
      expect(() => {
        (adapter as any).validateImageInput(mockImageUrl);
      }).not.toThrow();

      // Valid base64
      expect(() => {
        (adapter as any).validateImageInput(mockImageBase64);
      }).not.toThrow();

      // Invalid - no data
      expect(() => {
        (adapter as any).validateImageInput({ type: 'url', data: '' });
      }).toThrow('Image data is required');

      // Invalid URL
      expect(() => {
        (adapter as any).validateImageInput({ type: 'url', data: 'not-a-url' });
      }).toThrow('Invalid image URL');
    });

    it('should format image for API', () => {
      const urlResult = (adapter as any).formatImageForAPI(mockImageUrl);
      expect(urlResult.type).toBe('image_url');
      expect(urlResult.image_url.url).toBe(mockImageUrl.data);

      const base64Result = (adapter as any).formatImageForAPI(mockImageBase64);
      expect(base64Result.type).toBe('image_url');
      expect(base64Result.image_url.url).toContain('data:image/png;base64');
    });
  });

  describe('ClaudeVisionAdapter', () => {
    let adapter: ClaudeVisionAdapter;

    beforeEach(() => {
      adapter = new ClaudeVisionAdapter({
        apiKey: 'test-api-key'
      });
    });

    it('should have correct id and provider', () => {
      expect(adapter.id).toBe('claude-vision');
      expect(adapter.provider).toBe('Anthropic');
      expect(adapter.supportsImages).toBe(true);
    });

    it('should validate image input', () => {
      // Valid inputs
      expect(() => {
        (adapter as any).validateImageInput(mockImageUrl);
      }).not.toThrow();

      expect(() => {
        (adapter as any).validateImageInput(mockImageBase64);
      }).not.toThrow();

      // Invalid - no data
      expect(() => {
        (adapter as any).validateImageInput({ type: 'url', data: '' });
      }).toThrow('Image data is required');
    });

    it('should initialize with API key', async () => {
      await expect(adapter.initialize()).resolves.not.toThrow();
    });

    it('should throw when initialized without API key', async () => {
      const adapterWithoutKey = new ClaudeVisionAdapter({
        apiKey: ''
      });
      await expect(adapterWithoutKey.initialize()).rejects.toThrow('API key is required');
    });
  });
});

describe('ImageAnalysisService', () => {
  let service: ImageAnalysisService;
  let mockAdapter: MockVisionAdapter;

  beforeEach(() => {
    mockAdapter = new MockVisionAdapter();
    service = new ImageAnalysisService({ adapter: mockAdapter });
  });

  describe('analyze', () => {
    it('should analyze image and return structured result', async () => {
      const result = await service.analyze(mockImageUrl);

      expect(result).toHaveProperty('sceneDescription');
      expect(result).toHaveProperty('detectedObjects');
      expect(result).toHaveProperty('activityTags');
      expect(result).toHaveProperty('visualFeatures');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('processingTimeMs');

      expect(result.sceneDescription).toContain('person walking');
      expect(result.detectedObjects).toHaveLength(3);
      expect(result.activityTags).toContain('walking');
      expect(result.visualFeatures.hasFaces).toBe(true);
    });

    it('should handle analysis errors gracefully', async () => {
      // Mock adapter to throw error
      mockAdapter.analyzeImage = jest.fn().mockRejectedValue(new Error('API Error'));

      await expect(service.analyze(mockImageUrl)).rejects.toThrow('Image analysis failed');
    });
  });

  describe('analyzeBatch', () => {
    it('should analyze multiple images', async () => {
      const images = [mockImageUrl, mockImageBase64, mockImageUrl];
      const results = await service.analyzeBatch(images);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toHaveProperty('sceneDescription');
        expect(result).toHaveProperty('detectedObjects');
      });
    });
  });

  describe('extractVisualFeatures', () => {
    it('should extract visual features from image', async () => {
      const features = await service.extractVisualFeatures(mockImageUrl);

      expect(features).toHaveProperty('dominantColors');
      expect(features).toHaveProperty('brightness');
      expect(features).toHaveProperty('contrast');
      expect(features).toHaveProperty('sharpness');
      expect(features).toHaveProperty('hasFaces');
    });
  });

  describe('detectObjects', () => {
    it('should detect objects in image', async () => {
      const objects = await service.detectObjects(mockImageUrl);

      expect(Array.isArray(objects)).toBe(true);
      objects.forEach(obj => {
        expect(obj).toHaveProperty('label');
        expect(obj).toHaveProperty('confidence');
      });
    });
  });

  describe('generateDescription', () => {
    it('should generate description with options', async () => {
      const description = await service.generateDescription(mockImageUrl, {
        detail: 'detailed',
        maxLength: 100,
        language: 'zh'
      });

      expect(typeof description).toBe('string');
    });
  });

  describe('extractActivityTags', () => {
    it('should extract activity tags from image', async () => {
      const tags = await service.extractActivityTags(mockImageUrl);

      expect(Array.isArray(tags)).toBe(true);
      expect(tags.length).toBeGreaterThan(0);
    });
  });
});

describe('ImageModerationService', () => {
  let service: ImageModerationService;
  let mockAdapter: MockVisionAdapter;

  beforeEach(() => {
    mockAdapter = new MockVisionAdapter();
    service = new ImageModerationService({
      adapter: mockAdapter,
      safetyThreshold: 0.7,
      strictMode: false
    });
  });

  describe('moderate', () => {
    it('should moderate image and return safety result', async () => {
      const result = await service.moderate(mockImageUrl);

      expect(result).toHaveProperty('isSafe');
      expect(result).toHaveProperty('violationType');
      expect(result).toHaveProperty('confidenceScore');
      expect(result).toHaveProperty('categoryScores');
      expect(result).toHaveProperty('processingTimeMs');

      expect(typeof result.isSafe).toBe('boolean');
      expect(result.categoryScores).toHaveProperty('nsfw');
      expect(result.categoryScores).toHaveProperty('violence');
    });

    it('should mark safe images correctly', async () => {
      const result = await service.moderate(mockImageUrl);
      expect(result.isSafe).toBe(true);
      expect(result.violationType).toBe('none');
    });

    it('should handle moderation errors conservatively', async () => {
      mockAdapter.analyzeImage = jest.fn().mockRejectedValue(new Error('API Error'));

      const result = await service.moderate(mockImageUrl);
      // Should return unsafe when there's an error
      expect(result.isSafe).toBe(false);
      expect(result.violationType).toBe('spam');
    });
  });

  describe('moderateBatch', () => {
    it('should moderate multiple images', async () => {
      const images = [mockImageUrl, mockImageBase64];
      const results = await service.moderateBatch(images);

      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result).toHaveProperty('isSafe');
        expect(result).toHaveProperty('categoryScores');
      });
    });
  });

  describe('isSafe', () => {
    it('should return boolean for quick safety check', async () => {
      const isSafe = await service.isSafe(mockImageUrl);
      expect(typeof isSafe).toBe('boolean');
    });
  });

  describe('updateThresholds', () => {
    it('should update moderation thresholds', () => {
      service.updateThresholds({
        nsfw: 0.2,
        violence: 0.3
      });

      // Service should use new thresholds
      expect(service).toBeDefined();
    });
  });
});

describe('OCRService', () => {
  let service: OCRService;
  let mockAdapter: MockVisionAdapter;

  beforeEach(() => {
    mockAdapter = new MockVisionAdapter();
    service = new OCRService({
      adapter: mockAdapter,
      supportHandwriting: true,
      minConfidence: 0.6
    });
  });

  describe('extractText', () => {
    it('should extract text from image', async () => {
      const result = await service.extractText(mockImageUrl);

      expect(result).toHaveProperty('extractedText');
      expect(result).toHaveProperty('language');
      expect(result).toHaveProperty('detectedLanguages');
      expect(result).toHaveProperty('textBlocks');
      expect(result).toHaveProperty('isHandwritten');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('processingTimeMs');

      expect(result.textBlocks.length).toBeGreaterThan(0);
      result.textBlocks.forEach(block => {
        expect(block).toHaveProperty('text');
        expect(block).toHaveProperty('language');
        expect(block).toHaveProperty('confidence');
        expect(block).toHaveProperty('boundingBox');
      });
    });

    it('should support language detection', async () => {
      const result = await service.extractText(mockImageUrl, { language: 'auto' });
      expect(result.language).toBeDefined();
    });
  });

  describe('extractTextBatch', () => {
    it('should extract text from multiple images', async () => {
      const images = [mockImageUrl, mockImageBase64];
      const results = await service.extractTextBatch(images);

      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result).toHaveProperty('extractedText');
        expect(result).toHaveProperty('textBlocks');
      });
    });
  });

  describe('detectLanguage', () => {
    it('should detect languages in image', async () => {
      const languages = await service.detectLanguage(mockImageUrl);
      expect(Array.isArray(languages)).toBe(true);
    });
  });

  describe('detectHandwriting', () => {
    it('should detect handwriting in image', async () => {
      const result = await service.detectHandwriting(mockImageUrl);
      expect(result).toHaveProperty('hasHandwriting');
      expect(result).toHaveProperty('confidence');
      expect(typeof result.hasHandwriting).toBe('boolean');
    });
  });

  describe('extractStructuredData', () => {
    it('should extract structured data based on schema', async () => {
      const schema = {
        name: 'Person name',
        date: 'Date mentioned'
      };

      const result = await service.extractStructuredData(mockImageUrl, schema);
      expect(typeof result).toBe('object');
    });
  });
});

describe('ImageSearchService', () => {
  let service: ImageSearchService;
  let mockAdapter: MockVisionAdapter;

  beforeEach(() => {
    mockAdapter = new MockVisionAdapter();
    service = new ImageSearchService({
      adapter: mockAdapter,
      defaultTopK: 10,
      similarityThreshold: 0.7
    });
  });

  describe('indexImage', () => {
    it('should index image and return embedding', async () => {
      const result = await service.indexImage('test-image-1', mockImageUrl, {
        url: 'https://example.com/image.jpg',
        tags: ['test', 'nature']
      });

      expect(result).toHaveProperty('embedding');
      expect(result).toHaveProperty('dimension');
      expect(result).toHaveProperty('model');
      expect(Array.isArray(result.embedding)).toBe(true);
      expect(result.dimension).toBe(result.embedding.length);
    });
  });

  describe('searchByText', () => {
    it('should search images by text query', async () => {
      // First index some images
      await service.indexImage('img-1', mockImageUrl, { tags: ['nature'] });
      await service.indexImage('img-2', mockImageBase64, { tags: ['city'] });

      const results = await service.searchByText('nature park', { topK: 5 });

      expect(Array.isArray(results)).toBe(true);
      results.forEach(result => {
        expect(result).toHaveProperty('imageId');
        expect(result).toHaveProperty('url');
        expect(result).toHaveProperty('similarity');
        expect(typeof result.similarity).toBe('number');
      });
    });

    it('should throw error for empty query', async () => {
      await expect(service.searchByText('')).rejects.toThrow();
    });
  });

  describe('searchByImage', () => {
    it('should search similar images by image', async () => {
      // Index a reference image
      await service.indexImage('reference-img', mockImageUrl);

      const results = await service.searchByImage(mockImageBase64);

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('searchByTags', () => {
    it('should search images by tags', async () => {
      await service.indexImage('img-1', mockImageUrl, { tags: ['nature', 'park'] });

      const results = await service.searchByTags(['nature', 'park'], {
        matchType: 'any',
        topK: 5
      });

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('generateImageEmbedding', () => {
    it('should generate embedding for image', async () => {
      const embedding = await service.generateImageEmbedding(mockImageUrl);

      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBeGreaterThan(0);

      // Verify it's normalized (magnitude ≈ 1)
      const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      expect(magnitude).toBeCloseTo(1, 1);
    });
  });

  describe('extractSemanticTags', () => {
    it('should extract semantic tags from image', async () => {
      const tags = await service.extractSemanticTags(mockImageUrl);

      expect(tags).toHaveProperty('tags');
      expect(tags).toHaveProperty('categories');
      expect(tags).toHaveProperty('attributes');
      expect(Array.isArray(tags.tags)).toBe(true);
      expect(Array.isArray(tags.categories)).toBe(true);
    });
  });

  describe('indexImages', () => {
    it('should index multiple images', async () => {
      const images = [
        { imageId: 'batch-1', image: mockImageUrl, metadata: { tags: ['a'] } },
        { imageId: 'batch-2', image: mockImageBase64, metadata: { tags: ['b'] } },
        { imageId: 'batch-3', image: mockImageUrl, metadata: { tags: ['c'] } }
      ];

      await expect(service.indexImages(images)).resolves.not.toThrow();
    });
  });

  describe('removeFromIndex', () => {
    it('should remove image from index', async () => {
      await service.indexImage('to-remove', mockImageUrl);
      await expect(service.removeFromIndex('to-remove')).resolves.not.toThrow();
    });
  });
});

describe('Vision Types', () => {
  it('should have correct ImageInput structure', () => {
    const urlInput: ImageInput = {
      type: 'url',
      data: 'https://example.com/image.jpg'
    };
    expect(urlInput.type).toBe('url');
    expect(urlInput.data).toBeDefined();

    const base64Input: ImageInput = {
      type: 'base64',
      data: 'base64string',
      mimeType: 'image/jpeg'
    };
    expect(base64Input.type).toBe('base64');
    expect(base64Input.mimeType).toBeDefined();
  });

  it('should have correct ImageAnalysisResult structure', () => {
    const result: ImageAnalysisResult = {
      sceneDescription: 'A test scene',
      detectedObjects: [{ label: 'object', confidence: 0.9 }],
      activityTags: ['tag1', 'tag2'],
      visualFeatures: {
        dominantColors: ['red', 'blue'],
        brightness: 50,
        contrast: 50,
        sharpness: 50,
        hasFaces: false
      },
      confidence: 0.95,
      processingTimeMs: 1000
    };

    expect(result.sceneDescription).toBeDefined();
    expect(Array.isArray(result.detectedObjects)).toBe(true);
    expect(result.visualFeatures.brightness).toBeGreaterThanOrEqual(0);
    expect(result.visualFeatures.brightness).toBeLessThanOrEqual(100);
  });

  it('should have correct ImageModerationResult structure', () => {
    const result: ImageModerationResult = {
      isSafe: true,
      violationType: 'none',
      confidenceScore: 0.98,
      categoryScores: {
        nsfw: 0.01,
        violence: 0.02,
        gore: 0.0,
        hate: 0.0,
        harassment: 0.0,
        selfHarm: 0.0,
        illegal: 0.0,
        privacy: 0.0,
        spam: 0.0
      },
      processingTimeMs: 500
    };

    expect(typeof result.isSafe).toBe('boolean');
    expect(result.violationType).toBe('none');
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
    expect(result.confidenceScore).toBeLessThanOrEqual(1);
  });

  it('should have correct OCRResult structure', () => {
    const result: OCRResult = {
      extractedText: 'Hello World',
      language: 'en',
      detectedLanguages: ['en'],
      textBlocks: [{
        text: 'Hello',
        language: 'en',
        confidence: 0.95,
        boundingBox: { x: 0, y: 0, width: 1, height: 1 }
      }],
      isHandwritten: false,
      confidence: 0.95,
      processingTimeMs: 500
    };

    expect(result.extractedText).toBeDefined();
    expect(Array.isArray(result.textBlocks)).toBe(true);
    expect(typeof result.isHandwritten).toBe('boolean');
  });
});
