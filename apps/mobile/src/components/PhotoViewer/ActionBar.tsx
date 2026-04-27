/**
 * ActionBar Component
 * Bottom action bar with download/favorite/share/pay actions
 */

import React, { useCallback } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { ActionBarProps } from './types';

export const ActionBar: React.FC<ActionBarProps> = ({
  photo,
  isUnlocked,
  isFavorited,
  onDownload,
  onFavorite,
  onShare,
  onPay,
}) => {
  const handleDownload = useCallback(() => {
    if (!isUnlocked) {
      Alert.alert('提示', '请先解锁照片后再下载');
      return;
    }
    onDownload();
  }, [isUnlocked, onDownload]);

  const handleShare = useCallback(() => {
    onShare();
  }, [onShare]);

  const handleFavorite = useCallback(() => {
    onFavorite();
  }, [onFavorite]);

  const handlePay = useCallback(() => {
    onPay();
  }, [onPay]);

  return (
    <View style={styles.container}>
      {/* Download */}
      <TouchableOpacity style={styles.actionButton} onPress={handleDownload}>
        <Ionicons name="download-outline" size={24} color={isUnlocked ? '#007AFF' : '#bbb'} />
        <Text style={[styles.actionLabel, !isUnlocked && styles.labelDisabled]}>下载</Text>
      </TouchableOpacity>

      {/* Favorite */}
      <TouchableOpacity style={styles.actionButton} onPress={handleFavorite}>
        <Ionicons
          name={isFavorited ? 'heart' : 'heart-outline'}
          size={24}
          color={isFavorited ? '#FF3B30' : '#666'}
        />
        <Text style={styles.actionLabel}>收藏</Text>
      </TouchableOpacity>

      {/* Share */}
      <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
        <Ionicons name="share-outline" size={24} color="#666" />
        <Text style={styles.actionLabel}>分享</Text>
      </TouchableOpacity>

      {/* Pay / Unlock */}
      {!isUnlocked && (
        <TouchableOpacity style={styles.payButton} onPress={handlePay}>
          <Ionicons name="key-outline" size={20} color="#fff" />
          <Text style={styles.payButtonText}>
            {photo.price > 0 ? `${photo.price}积分解锁` : '免费解锁'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingBottom: 32, // Extra bottom padding for safe area
    gap: 8,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionLabel: {
    marginTop: 4,
    fontSize: 12,
    color: '#666',
  },
  labelDisabled: {
    color: '#bbb',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6,
  },
  payButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});

export default ActionBar;
