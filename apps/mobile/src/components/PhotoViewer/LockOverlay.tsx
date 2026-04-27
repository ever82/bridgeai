/**
 * LockOverlay Component
 * Overlay shown on locked photos with price and unlock action
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { Ionicons } from '@expo/vector-icons';

import type { LockOverlayProps } from './types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const LockOverlay: React.FC<LockOverlayProps> = ({
  price,
  onUnlock,
  previewBlur = true,
}) => {
  return (
    <View style={styles.container}>
      {previewBlur && (
        <View style={styles.blurContainer}>
          <BlurView
            style={styles.blur}
            blurType="dark"
            blurAmount={12}
            reducedTransparencyFallbackColor="rgba(0,0,0,0.6)"
          />
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="lock-closed" size={40} color="#fff" />
        </View>

        <Text style={styles.title}>此照片已加密</Text>
        <Text style={styles.subtitle}>解锁后可查看高清原图</Text>

        {price > 0 && (
          <View style={styles.priceContainer}>
            <Ionicons name="diamond" size={18} color="#FFD700" />
            <Text style={styles.priceText}>{price} 积分</Text>
          </View>
        )}

        <TouchableOpacity style={styles.unlockButton} onPress={onUnlock}>
          <Ionicons name="key-outline" size={18} color="#fff" />
          <Text style={styles.unlockButtonText}>立即解锁</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    overflow: 'hidden',
  },
  blurContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  blur: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    minWidth: SCREEN_WIDTH * 0.6,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 6,
  },
  priceText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  unlockButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default LockOverlay;
