/**
 * useAIExtraction Hook
 * Hook for AI-powered natural language extraction
 */

import { useState, useCallback } from 'react';

import { apiClient } from '../services/api/client';
import { ExtractionResult } from '../services/ai/extractionService';

interface UseAIExtractionOptions {
  /** Default scene for extraction */
  defaultScene?: string;
  /** Callback on successful extraction */
  onSuccess?: (result: ExtractionResult) => void;
  /** Callback on extraction error */
  onError?: (error: Error) => void;
}

interface ExtractionOptions {
  requireClarification?: boolean;
  extractEntities?: boolean;
  classifyIntent?: boolean;
  language?: string;
  context?: Record<string, unknown>;
}

export function useAIExtraction(options: UseAIExtractionOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastResult, setLastResult] = useState<ExtractionResult | null>(null);

  const extractFromText = useCallback(
    async (
      text: string,
      scene: string,
      extractionOptions?: ExtractionOptions
    ): Promise<ExtractionResult> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiClient.post('/api/v1/ai/extract-demand', {
          text,
          scene: scene || options.defaultScene,
          options: extractionOptions,
        });

        const data = response.data as {
          success: boolean;
          error?: { message: string };
          data: {
            l2Data: Record<string, unknown>;
            demand: { confidence: number; intent: unknown };
            mapping: { mappedFields: string[]; unmappedFields: string[] };
          };
          meta?: { latencyMs: number };
        };

        if (!data.success) {
          throw new Error(data.error?.message || 'Extraction failed');
        }

        const result: ExtractionResult = {
          success: true,
          data: data.data.l2Data,
          confidence: data.data.demand.confidence,
          fieldsExtracted: data.data.mapping.mappedFields,
          fieldsFailed: data.data.mapping.unmappedFields,
          reasoning: JSON.stringify(data.data.demand.intent),
          provider: 'auto',
          model: 'auto',
          latencyMs: data.meta?.latencyMs || 0,
        };

        setLastResult(result);
        options.onSuccess?.(result);

        return result;
      } catch (err) {
        const extractError = err instanceof Error ? err : new Error('Unknown error');
        setError(extractError);
        options.onError?.(extractError);
        throw extractError;
      } finally {
        setIsLoading(false);
      }
    },
    [options]
  );

  const clearResult = useCallback(() => {
    setLastResult(null);
    setError(null);
  }, []);

  return {
    extractFromText,
    isLoading,
    error,
    lastResult,
    clearResult,
  };
}

export default useAIExtraction;
