/**
 * PhotoGridItem Component
 * Individual photo thumbnail with price overlay and credit score badge
 */

import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';

import type { PhotoGridItemProps } from './types';

export const PhotoGridItem: React.FC<PhotoGridItemProps> = ({
  photo,
  isSelected,
  isUnlocked,
  onPress,
  onLongPress,
}) => {
  return (
    <TouchableOpacity
      style={[styles.container, isSelected && styles.selected]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: photo.thumbnailUrl }}
        style={[styles.image, { height: 120 }]}
        resizeMode="cover"
      />

      {/* Price overlay */}
      {!isUnlocked && (
        <View style={styles.priceOverlay}>
          <Text style={styles.priceText}>
            {photo.credit.creditCost > 0 ? `${photo.credit.creditCost}积分` : '免费'}
          </Text>
        </View>
      )}

      {/* Credit score badge */}
      {isUnlocked && (
        <View style={styles.unlockedBadge}>
          <Text style={styles.unlockedText}>已解锁</Text>
        </View>
      )}

      {/* Lock icon for locked photos */}
      {!isUnlocked && (
        <View style={styles.lockIcon}>
          <Text style={styles.lockEmoji}>🔒</Text>
        </View>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <View style={styles.selectionIndicator}>
          <Text style={styles.selectionText}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  selected: {
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  image: {
    width: '100%',
    backgroundColor: '#e0e0e0',
  },
  priceOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priceText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  unlockedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  unlockedText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  lockIcon: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockEmoji: {
    fontSize: 12,
  },
  selectionIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default PhotoGridItem;
