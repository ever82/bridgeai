/**
 * OCR Service
 * 光学字符识别服务
 */

import {
  ImageInput,
  OCRResult,
  TextBlock,
  BoundingBox,
  IVisionModelAdapter
} from './vision/types';

interface OCRServiceConfig {
  adapter: IVisionModelAdapter;
  defaultLanguage?: string;
  supportHandwriting?: boolean;
  minConfidence?: number;
}

export class OCRService {
  private adapter: IVisionModelAdapter;
  private config: OCRServiceConfig;

  // 支持的语言代码
  private readonly supportedLanguages = [
    'zh', 'zh-CN', 'zh-TW', 'en', 'ja', 'ko',
    'es', 'fr', 'de', 'it', 'pt', 'ru', 'ar', 'hi'
  ];

  constructor(config: OCRServiceConfig) {
    this.adapter = config.adapter;
    this.config = {
      defaultLanguage: 'auto',
      supportHandwriting: true,
      minConfidence: 0.6,
      ...config
    };
  }

  /**
   * 提取图像中的文字
   */
  async extractText(
    image: ImageInput,
    options?: {
      language?: string;
      detectHandwriting?: boolean;
      preserveLayout?: boolean;
    }
  ): Promise<OCRResult> {
    const startTime = Date.now();

    try {
      const language = options?.language || this.config.defaultLanguage || 'auto';
      const detectHandwriting = options?.detectHandwriting ?? this.config.supportHandwriting ?? true;

      // 构建OCR提示
      const ocrPrompt = this.buildOCRPrompt(language, detectHandwriting, options?.preserveLayout ?? false);

      // 调用Vision模型
      const response = await this.adapter.analyzeImage(image, ocrPrompt, {
        maxTokens: 2048,
        temperature: 0.1
      });

      // 解析OCR结果
      const result = this.parseOCRResponse(response);

      return {
        ...result,
        processingTimeMs: Date.now() - startTime
      };
    } catch (error) {
      throw new Error(`OCR extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 批量提取文字
   */
  async extractTextBatch(
    images: ImageInput[],
    options?: {
      language?: string;
      detectHandwriting?: boolean;
    }
  ): Promise<OCRResult[]> {
    const results: OCRResult[] = [];

    // 限制并发数
    const concurrency = 3;
    for (let i = 0; i < images.length; i += concurrency) {
      const batch = images.slice(i, i + concurrency);
      const batchPromises = batch.map(image =>
        this.extractText(image, options).catch(error => {
          console.error('Batch OCR error:', error);
          return this.createErrorResult(error);
        })
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * 检测图像中的语言
   */
  async detectLanguage(image: ImageInput): Promise<string[]> {
    const languagePrompt = `Analyze this image and identify all languages present in any text.
Return as a JSON array of ISO 639-1 language codes (e.g., ["zh", "en"]):
["lang1", "lang2", ...]

If no text is present, return an empty array [].`;

    const response = await this.adapter.analyzeImage(image, languagePrompt, {
      maxTokens: 256,
      temperature: 0.1
    });

    return this.parseLanguageResponse(response);
  }

  /**
   * 提取特定区域的文字
   */
  async extractTextInRegion(
    image: ImageInput,
    boundingBox: BoundingBox
  ): Promise<OCRResult> {
    const regionPrompt = `Extract all text visible in the specified region of this image.
Region coordinates: x=${boundingBox.x}, y=${boundingBox.y}, width=${boundingBox.width}, height=${boundingBox.height}

Return results in JSON format:
{
  "extractedText": "full text content",
  "language": "primary language code",
  "textBlocks": [
    {
      "text": "text content",
      "language": "language code",
      "confidence": 0.0-1.0,
      "boundingBox": {"x": 0, "y": 0, "width": 0, "height": 0}
    }
  ]
}`;

    const response = await this.adapter.analyzeImage(image, regionPrompt, {
      maxTokens: 1024,
      temperature: 0.1
    });

    const result = this.parseOCRResponse(response);
    return {
      ...result,
      processingTimeMs: 0 // Will be set by caller
    };
  }

  /**
   * 检查图像是否包含手写体
   */
  async detectHandwriting(image: ImageInput): Promise<{
    hasHandwriting: boolean;
    confidence: number;
  }> {
    const handwritingPrompt = `Analyze this image for handwritten text.

Return results in JSON format:
{
  "hasHandwriting": true/false,
  "confidence": 0.0-1.0
}`;

    const response = await this.adapter.analyzeImage(image, handwritingPrompt, {
      maxTokens: 256,
      temperature: 0.1
    });

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        return {
          hasHandwriting: Boolean(data.hasHandwriting),
          confidence: Number(data.confidence) || 0.5
        };
      }
    } catch {
      // 解析失败返回默认值
    }

    return { hasHandwriting: false, confidence: 0 };
  }

  /**
   * 结构化数据提取（如发票、名片等）
   */
  async extractStructuredData(
    image: ImageInput,
    schema: Record<string, string>
  ): Promise<Record<string, string>> {
    const schemaDescription = Object.entries(schema)
      .map(([key, description]) => `- ${key}: ${description}`)
      .join('\n');

    const structuredPrompt = `Extract structured data from this image.

Extract the following fields:
${schemaDescription}

Return results in JSON format:
{
  "field1": "extracted value",
  "field2": "extracted value",
  ...
}

If a field is not found, use null or empty string.`;

    const response = await this.adapter.analyzeImage(image, structuredPrompt, {
      maxTokens: 1024,
      temperature: 0.1
    });

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // 解析失败返回空对象
    }

    return {};
  }

  /**
   * 构建OCR提示
   */
  private buildOCRPrompt(
    language: string,
    detectHandwriting: boolean,
    preserveLayout?: boolean
  ): string {
    const languageHint = language === 'auto'
      ? 'Detect the language automatically'
      : `Primary language: ${language}`;

    const layoutHint = preserveLayout
      ? 'Preserve the original layout and formatting as much as possible'
      : 'Extract text in natural reading order';

    return `Extract all text visible in this image using OCR.

${languageHint}
${detectHandwriting ? 'Also detect and extract any handwritten text.' : ''}
${layoutHint}

Return results in JSON format:
{
  "extractedText": "full extracted text content",
  "language": "primary language code (ISO 639-1)",
  "detectedLanguages": ["lang1", "lang2", ...],
  "isHandwritten": true/false,
  "textBlocks": [
    {
      "text": "text content of this block",
      "language": "language code for this block",
      "confidence": 0.0-1.0,
      "boundingBox": {"x": 0, "y": 0, "width": 0, "height": 0}
    }
  ]
}

Requirements:
- Maintain text order (top to bottom, left to right)
- Include all visible text, including small text
- Provide confidence scores for each text block
- Estimate bounding boxes for text regions (relative coordinates 0-1)`;
  }

  /**
   * 解析OCR响应
   */
  private parseOCRResponse(response: string): Omit<OCRResult, 'processingTimeMs'> {
    const defaultResult: Omit<OCRResult, 'processingTimeMs'> = {
      extractedText: '',
      language: 'unknown',
      detectedLanguages: [],
      textBlocks: [],
      isHandwritten: false,
      confidence: 0
    };

    try {
      // 尝试提取JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // 没有JSON，将整个响应作为文本
        return {
          ...defaultResult,
          extractedText: response.trim()
        };
      }

      const data = JSON.parse(jsonMatch[0]);

      // 解析文本块
      const textBlocks: TextBlock[] = [];
      if (Array.isArray(data.textBlocks) || Array.isArray(data.text_blocks)) {
        const blocks = data.textBlocks || data.text_blocks;
        for (const block of blocks) {
          textBlocks.push({
            text: String(block.text || ''),
            language: String(block.language || data.language || 'unknown'),
            confidence: Number(block.confidence) || 0.8,
            boundingBox: this.parseBoundingBox(block.boundingBox || block.bounding_box)
          });
        }
      }

      // 如果没有文本块但有extractedText，创建一个默认块
      if (textBlocks.length === 0 && data.extractedText) {
        textBlocks.push({
          text: String(data.extractedText),
          language: String(data.language || 'unknown'),
          confidence: Number(data.confidence) || 0.8,
          boundingBox: { x: 0, y: 0, width: 1, height: 1 }
        });
      }

      return {
        extractedText: String(data.extractedText || data.text || ''),
        language: String(data.language || 'unknown'),
        detectedLanguages: Array.isArray(data.detectedLanguages)
          ? data.detectedLanguages
          : Array.isArray(data.detected_languages)
            ? data.detected_languages
            : data.language ? [data.language] : [],
        textBlocks,
        isHandwritten: Boolean(data.isHandwritten || data.is_handwritten),
        confidence: Number(data.confidence) || this.calculateAverageConfidence(textBlocks)
      };
    } catch (error) {
      // 解析失败，返回原始文本
      return {
        ...defaultResult,
        extractedText: response.trim()
      };
    }
  }

  /**
   * 解析边界框
   */
  private parseBoundingBox(box: any): BoundingBox {
    if (!box || typeof box !== 'object') {
      return { x: 0, y: 0, width: 1, height: 1 };
    }

    return {
      x: Number(box.x) || 0,
      y: Number(box.y) || 0,
      width: Number(box.width) || 1,
      height: Number(box.height) || 1
    };
  }

  /**
   * 解析语言响应
   */
  private parseLanguageResponse(response: string): string[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        if (Array.isArray(data)) {
          return data
            .map(lang => String(lang).toLowerCase())
            .filter(lang => this.supportedLanguages.includes(lang) || lang.length === 2);
        }
      }
    } catch {
      // 解析失败
    }

    return [];
  }

  /**
   * 计算平均置信度
   */
  private calculateAverageConfidence(textBlocks: TextBlock[]): number {
    if (textBlocks.length === 0) return 0;
    const sum = textBlocks.reduce((acc, block) => acc + block.confidence, 0);
    return sum / textBlocks.length;
  }

  /**
   * 创建错误结果
   */
  private createErrorResult(error: Error): OCRResult {
    return {
      extractedText: '',
      language: 'unknown',
      detectedLanguages: [],
      textBlocks: [],
      isHandwritten: false,
      confidence: 0,
      processingTimeMs: 0
    };
  }
}
