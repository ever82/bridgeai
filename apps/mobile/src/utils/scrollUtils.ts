import type { RefObject } from 'react';
import type { FlatList } from 'react-native';

export function scrollToBottom(ref: RefObject<FlatList<unknown>>): void {
  ref.current?.scrollToOffset?.({ offset: 0, animated: true });
}

export function scrollToIndex(ref: RefObject<FlatList<unknown>>, index: number): void {
  ref.current?.scrollToIndex?.({ index, animated: true, viewPosition: 0 });
}

export function scrollToOffset(
  ref: RefObject<FlatList<unknown>>,
  offset: number,
  animated = true
): void {
  ref.current?.scrollToOffset?.({ offset, animated });
}
