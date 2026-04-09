import { useCallback, useState } from 'react';

interface UseAsyncReturn<T, P extends unknown[]> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  execute: (...params: P) => Promise<T | null>;
  reset: () => void;
}

/**
 * Custom hook for handling async operations
 */
export function useAsync<T, P extends unknown[]>(
  asyncFunction: (...params: P) => Promise<T>,
  immediate = false
): UseAsyncReturn<T, P> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(
    async (...params: P) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await asyncFunction(...params);
        setData(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [asyncFunction]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { data, error, isLoading, execute, reset };
}
