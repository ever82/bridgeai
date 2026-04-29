import { renderHook, act } from '@testing-library/react-native';
import type { RefObject } from 'react';
import type { FlatList } from 'react-native';

import { useScrollPosition } from '../useScrollPosition';

interface ScrollableRef {
  scrollToOffset?: (params: { offset: number; animated?: boolean }) => void;
  scrollToIndex?: (params: { index: number; animated?: boolean; viewPosition?: number }) => void;
}

type MockRef = RefObject<FlatList<ScrollableRef>>;

const createMockRef = (): MockRef => {
  const ref = {
    current: {
      scrollToOffset: jest.fn(),
      scrollToIndex: jest.fn(),
    },
  };
  return ref as MockRef;
};

describe('useScrollPosition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('scrollToBottom', () => {
    it('calls scrollToOffset with offset 0 and animated true', () => {
      const mockRef = createMockRef();
      const { result } = renderHook(() => useScrollPosition(mockRef));

      act(() => {
        result.current.scrollToBottom();
      });

      expect(mockRef.current.scrollToOffset).toHaveBeenCalledWith({ offset: 0, animated: true });
    });

    it('does not throw when listRef.current is null', () => {
      const mockRef = { current: null } as unknown as MockRef;
      const { result } = renderHook(() =>
        useScrollPosition(mockRef as RefObject<FlatList<unknown>>)
      );

      expect(() =>
        act(() => {
          result.current.scrollToBottom();
        })
      ).not.toThrow();
    });
  });

  describe('scrollToIndex', () => {
    it('calls scrollToIndex on the list with correct params', () => {
      const mockRef = createMockRef();
      const { result } = renderHook(() => useScrollPosition(mockRef));

      act(() => {
        result.current.scrollToIndex(5);
      });

      expect(mockRef.current.scrollToIndex).toHaveBeenCalledWith({
        index: 5,
        animated: true,
        viewPosition: 0,
      });
    });

    it('does not throw when scrollToIndex is not available', () => {
      const mockRef = { current: { scrollToOffset: jest.fn() } } as unknown as MockListRef;
      const { result } = renderHook(() => useScrollPosition(mockRef));

      expect(() =>
        act(() => {
          result.current.scrollToIndex(0);
        })
      ).not.toThrow();
    });
  });

  describe('scrollToOffset', () => {
    it('calls scrollToOffset with default animated true', () => {
      const mockRef = createMockRef();
      const { result } = renderHook(() => useScrollPosition(mockRef));

      act(() => {
        result.current.scrollToOffset(100);
      });

      expect(mockRef.current.scrollToOffset).toHaveBeenCalledWith({ offset: 100, animated: true });
    });

    it('calls scrollToOffset with animated false when specified', () => {
      const mockRef = createMockRef();
      const { result } = renderHook(() => useScrollPosition(mockRef));

      act(() => {
        result.current.scrollToOffset(200, false);
      });

      expect(mockRef.current.scrollToOffset).toHaveBeenCalledWith({ offset: 200, animated: false });
    });
  });

  describe('scrollToMessage', () => {
    it('calls scrollToIndex with correct index when message found', () => {
      const mockRef = createMockRef();
      const { result } = renderHook(() => useScrollPosition(mockRef));
      const findIndex = jest.fn().mockReturnValue(3);

      act(() => {
        result.current.scrollToMessage('msg-5', findIndex);
      });

      expect(findIndex).toHaveBeenCalledWith('msg-5');
      expect(mockRef.current.scrollToIndex).toHaveBeenCalledWith({
        index: 3,
        animated: true,
        viewPosition: 0,
      });
    });

    it('does not call scrollToIndex when message not found (index < 0)', () => {
      const mockRef = createMockRef();
      const { result } = renderHook(() => useScrollPosition(mockRef));
      const findIndex = jest.fn().mockReturnValue(-1);

      act(() => {
        result.current.scrollToMessage('msg-missing', findIndex);
      });

      expect(mockRef.current.scrollToIndex).not.toHaveBeenCalled();
    });
  });

  describe('resetPosition', () => {
    it('returns an object with all expected methods', () => {
      const mockRef = createMockRef();
      const { result } = renderHook(() => useScrollPosition(mockRef));

      expect(typeof result.current.scrollToBottom).toBe('function');
      expect(typeof result.current.scrollToIndex).toBe('function');
      expect(typeof result.current.scrollToOffset).toBe('function');
      expect(typeof result.current.scrollToMessage).toBe('function');
      expect(typeof result.current.resetPosition).toBe('function');
    });
  });
});
