import { useCallback, useRef, type RefObject } from 'react';
import { FlatList } from 'react-native';

interface UseScrollPositionReturn {
  scrollToBottom: () => void;
  scrollToIndex: (index: number) => void;
  scrollToOffset: (offset: number, animated?: boolean) => void;
  scrollToMessage: (messageId: string, findIndex: (id: string) => number) => void;
  resetPosition: () => void;
}

export function useScrollPosition(listRef: RefObject<FlatList<unknown>>): UseScrollPositionReturn {
  const isAtBottomRef = useRef(true);

  const scrollToBottom = useCallback(() => {
    listRef.current?.scrollToOffset?.({ offset: 0, animated: true });
    isAtBottomRef.current = true;
  }, [listRef]);

  const scrollToIndex = useCallback(
    (index: number) => {
      listRef.current?.scrollToIndex?.({ index, animated: true, viewPosition: 0 });
    },
    [listRef]
  );

  const scrollToOffset = useCallback(
    (offset: number, animated = true) => {
      listRef.current?.scrollToOffset?.({ offset, animated });
    },
    [listRef]
  );

  const scrollToMessage = useCallback(
    (messageId: string, findIndex: (id: string) => number) => {
      const index = findIndex(messageId);
      if (index >= 0) {
        scrollToIndex(index);
      }
    },
    [scrollToIndex]
  );

  const resetPosition = useCallback(() => {
    isAtBottomRef.current = true;
  }, []);

  return {
    scrollToBottom,
    scrollToIndex,
    scrollToOffset,
    scrollToMessage,
    resetPosition,
  };
}
