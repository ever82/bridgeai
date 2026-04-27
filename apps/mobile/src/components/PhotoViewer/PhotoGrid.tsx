/**
 * PhotoGrid Component
 * Grid display of photo thumbnails with selection and price overlays
 */

import React, { useCallback } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import type { Photo } from '@bridgeai/shared';

import { PhotoGridItem } from './PhotoGridItem';
import type { PhotoGridProps } from './types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const PhotoGrid: React.FC<PhotoGridProps> = ({
  photos,
  columns = 2,
  selectedIds = [],
  unlockedIds = [],
  onPhotoPress,
  onPhotoLongPress,
  onEndReached,
  isLoading = false,
  hasMore = true,
}) => {
  const itemWidth = (SCREEN_WIDTH - 16 * 2 - 8 * (columns - 1)) / columns;

  const handlePress = useCallback(
    (photo: Photo, index: number) => {
      onPhotoPress(photo, index);
    },
    [onPhotoPress]
  );

  const handleLongPress = useCallback(
    (photo: Photo) => {
      onPhotoLongPress?.(photo);
    },
    [onPhotoLongPress]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Photo; index: number }) => (
      <View style={[styles.itemContainer, { width: itemWidth }]}>
        <PhotoGridItem
          photo={item}
          isSelected={selectedIds.includes(item.id)}
          isUnlocked={unlockedIds.includes(item.id)}
          onPress={() => handlePress(item, index)}
          onLongPress={() => handleLongPress(item)}
        />
      </View>
    ),
    [itemWidth, selectedIds, unlockedIds, handlePress, handleLongPress]
  );

  const keyExtractor = useCallback((item: Photo) => item.id, []);

  const ListFooter = isLoading ? (
    <View style={styles.footer}>
      <ActivityIndicator size="small" color="#007AFF" />
    </View>
  ) : null;

  return (
    <FlatList
      data={photos}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={columns}
      key={`grid-${columns}`}
      contentContainerStyle={styles.container}
      columnWrapperStyle={styles.row}
      showsVerticalScrollIndicator={false}
      onEndReached={hasMore ? onEndReached : undefined}
      onEndReachedThreshold={0.5}
      ListFooterComponent={ListFooter}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  row: {
    justifyContent: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  itemContainer: {
    marginBottom: 0,
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});

export default PhotoGrid;
