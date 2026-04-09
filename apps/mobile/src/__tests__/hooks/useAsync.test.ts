import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAsync } from '../../hooks/useAsync';

describe('useAsync', () => {
  const mockAsyncFunction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns initial state', () => {
    const { result } = renderHook(() => useAsync(mockAsyncFunction));

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('executes async function successfully', async () => {
    const mockData = { id: 1, name: 'Test' };
    mockAsyncFunction.mockResolvedValue(mockData);

    const { result } = renderHook(() => useAsync(mockAsyncFunction));

    await act(async () => {
      await result.current.execute('arg1', 'arg2');
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(mockAsyncFunction).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('handles async function error', async () => {
    const mockError = new Error('Test error');
    mockAsyncFunction.mockRejectedValue(mockError);

    const { result } = renderHook(() => useAsync(mockAsyncFunction));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toEqual(mockError);
    expect(result.current.isLoading).toBe(false);
  });

  it('sets loading state during execution', async () => {
    let resolve: (value: unknown) => void;
    const promise = new Promise((r) => {
      resolve = r;
    });
    mockAsyncFunction.mockReturnValue(promise);

    const { result } = renderHook(() => useAsync(mockAsyncFunction));

    // Start execution
    act(() => {
      result.current.execute();
    });

    // Should be loading
    expect(result.current.isLoading).toBe(true);

    // Resolve the promise
    await act(async () => {
      resolve!('data');
      await promise;
    });

    // Should not be loading anymore
    expect(result.current.isLoading).toBe(false);
  });

  it('resets state', async () => {
    mockAsyncFunction.mockResolvedValue({ data: 'test' });

    const { result } = renderHook(() => useAsync(mockAsyncFunction));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.data).toEqual({ data: 'test' });

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('handles non-error rejections', async () => {
    mockAsyncFunction.mockRejectedValue('string error');

    const { result } = renderHook(() => useAsync(mockAsyncFunction));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('string error');
  });

  it('returns null when error occurs', async () => {
    mockAsyncFunction.mockRejectedValue(new Error('Test error'));

    const { result } = renderHook(() => useAsync(mockAsyncFunction));

    let returnValue: unknown;
    await act(async () => {
      returnValue = await result.current.execute();
    });

    expect(returnValue).toBeNull();
  });

  it('returns data when successful', async () => {
    const mockData = { success: true };
    mockAsyncFunction.mockResolvedValue(mockData);

    const { result } = renderHook(() => useAsync(mockAsyncFunction));

    let returnValue: unknown;
    await act(async () => {
      returnValue = await result.current.execute();
    });

    expect(returnValue).toEqual(mockData);
  });
});
