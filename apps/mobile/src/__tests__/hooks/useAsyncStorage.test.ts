import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAsyncStorage } from '../../hooks/useAsyncStorage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('useAsyncStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns initial value when storage is empty', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() => useAsyncStorage('test-key', 'initial'));

    // Initially should show initial value and loading
    expect(result.current.value).toBe('initial');
    expect(result.current.isLoading).toBe(true);

    // Wait for effect to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.value).toBe('initial');
  });

  it('loads existing value from storage', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify('stored-value'));

    const { result } = renderHook(() => useAsyncStorage('test-key', 'initial'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.value).toBe('stored-value');
  });

  it('saves value to storage', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAsyncStorage('test-key', 'initial'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.setValue('new-value');
    });

    expect(result.current.value).toBe('new-value');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('test-key', JSON.stringify('new-value'));
  });

  it('removes value from storage', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify('stored-value'));
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAsyncStorage('test-key', 'initial'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.removeValue();
    });

    expect(result.current.value).toBe('initial');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('test-key');
  });

  it('handles object values', async () => {
    const initialValue = { count: 0 };
    const storedValue = { count: 5 };

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(storedValue));
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAsyncStorage('test-key', initialValue));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.value).toEqual(storedValue);

    const newValue = { count: 10 };
    await act(async () => {
      await result.current.setValue(newValue);
    });

    expect(result.current.value).toEqual(newValue);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('test-key', JSON.stringify(newValue));
  });

  it('handles storage errors gracefully', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

    const { result } = renderHook(() => useAsyncStorage('test-key', 'initial'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.value).toBe('initial');

    consoleError.mockRestore();
  });

  it('cleans up properly on unmount', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const { result, unmount } = renderHook(() => useAsyncStorage('test-key', 'initial'));

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Unmount should not throw
    expect(() => unmount()).not.toThrow();
  });

  it('does not update state after unmount during load', async () => {
    let resolveGetItem: (value: string | null) => void;
    const getItemPromise = new Promise<string | null>((r) => {
      resolveGetItem = r;
    });
    (AsyncStorage.getItem as jest.Mock).mockReturnValue(getItemPromise);

    const { result, unmount } = renderHook(() => useAsyncStorage('test-key', 'initial'));

    // Wait a tick for the effect to start
    await act(async () => {});

    expect(result.current.isLoading).toBe(true);

    // Unmount before the promise resolves
    unmount();

    // Resolve after unmount
    await act(async () => {
      resolveGetItem!(JSON.stringify('stored-value'));
      await getItemPromise;
    });

    // Should not have any errors from state updates on unmounted component
  });
});
