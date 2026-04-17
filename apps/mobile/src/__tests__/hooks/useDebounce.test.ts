import { renderHook, act } from '@testing-library/react-native';

import { useDebounce } from '../../hooks/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));

    expect(result.current).toBe('initial');
  });

  it('debounces value changes', () => {
    let value = 'initial';
    const { result, rerender } = renderHook(() => useDebounce(value, 500));

    // Change the value
    value = 'changed';
    rerender();

    // Value should still be initial before delay
    expect(result.current).toBe('initial');

    // Fast-forward past the delay
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Value should now be updated
    expect(result.current).toBe('changed');
  });

  it('cancels previous timer on rapid changes', () => {
    let value = 'initial';
    const { result, rerender } = renderHook(() => useDebounce(value, 500));

    // First change
    value = 'change1';
    rerender();

    // Second change before delay
    act(() => {
      jest.advanceTimersByTime(200);
    });

    value = 'change2';
    rerender();

    // Third change before delay
    act(() => {
      jest.advanceTimersByTime(200);
    });

    value = 'change3';
    rerender();

    // Should still be initial
    expect(result.current).toBe('initial');

    // Fast-forward from last change
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Should only reflect the last change
    expect(result.current).toBe('change3');
  });

  it('handles number values', () => {
    let value = 0;
    const { result, rerender } = renderHook(() => useDebounce(value, 300));

    value = 100;
    rerender();

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current).toBe(100);
  });

  it('handles object values', () => {
    let value = { count: 0 };
    const { result, rerender } = renderHook(() => useDebounce(value, 300));

    value = { count: 5 };
    rerender();

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current).toEqual({ count: 5 });
  });

  it('cleans up timer on unmount', () => {
    jest.spyOn(global, 'clearTimeout');
    const { unmount } = renderHook(() => useDebounce('test', 500));

    // Unmount should not throw
    expect(() => unmount()).not.toThrow();

    // Verify clearTimeout was called during cleanup
    expect(clearTimeout).toHaveBeenCalled();
  });
});
