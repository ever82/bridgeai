/**
 * HDDownload Screen
 * Download HD photo after unlock
 */

import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';

import type { UnlockedPhotoInfo } from '../../../shared/types/payment.types';
import { visionShareApi } from '../../services/api/visionShare';

interface HDDownloadScreenProps {
  photoId: string;
  unlockInfo: UnlockedPhotoInfo;
  onDownloadComplete: () => void;
  onBack: () => void;
}

export const HDDownloadScreen: React.FC<HDDownloadScreenProps> = ({
  photoId,
  unlockInfo,
  onDownloadComplete,
  onBack,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadComplete, setDownloadComplete] = useState(false);

  const handleDownload = useCallback(async () => {
    if (isDownloading) return;

    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      // Validate and use download token
      const result = await visionShareApi.downloadHDPhoto(unlockInfo.downloadToken);

      if (result.success) {
        // Simulate download progress
        setDownloadProgress(50);
        await new Promise(resolve => setTimeout(resolve, 300));
        setDownloadProgress(100);

        setDownloadComplete(true);
        Alert.alert('下载成功', '高清照片已保存到相册', [
          { text: '确定', onPress: onDownloadComplete },
        ]);
      } else {
        Alert.alert('下载失败', result.error || '请稍后重试');
      }
    } catch (error) {
      Alert.alert('下载失败', '网络错误，请稍后重试');
    } finally {
      setIsDownloading(false);
    }
  }, [isDownloading, unlockInfo, onDownloadComplete]);

  const formatExpiry = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.title}>高清下载</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Photo preview placeholder */}
      <View style={styles.photoPreview}>
        <Text style={styles.photoIcon}>🖼️</Text>
        <Text style={styles.photoId}>照片 {photoId}</Text>
        <Text style={styles.photoStatus}>{downloadComplete ? '✅ 已下载' : '已解锁'}</Text>
      </View>

      {/* Download info */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>下载令牌有效期</Text>
          <Text style={styles.infoValue}>{formatExpiry(unlockInfo.expiresAt)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>最大下载次数</Text>
          <Text style={styles.infoValue}>{unlockInfo.downloadLimit} 次</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>剩余下载次数</Text>
          <Text
            style={[styles.infoValue, unlockInfo.downloadsRemaining === 0 && styles.warningText]}
          >
            {unlockInfo.downloadsRemaining} 次
          </Text>
        </View>
      </View>

      {/* Download progress */}
      {isDownloading && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${downloadProgress}%` }]} />
          </View>
          <Text style={styles.progressText}>{downloadProgress}%</Text>
        </View>
      )}

      {/* Download button */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.downloadButton,
            (isDownloading || unlockInfo.downloadsRemaining === 0) && styles.disabledButton,
          ]}
          onPress={handleDownload}
          disabled={isDownloading || unlockInfo.downloadsRemaining === 0}
        >
          {isDownloading ? (
            <ActivityIndicator color="#fff" />
          ) : downloadComplete ? (
            <Text style={styles.downloadButtonText}>再次下载</Text>
          ) : (
            <Text style={styles.downloadButtonText}>下载高清原图</Text>
          )}
        </TouchableOpacity>
      </View>

      {unlockInfo.downloadsRemaining === 0 && (
        <Text style={styles.limitHint}>已达下载次数上限</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 15,
    color: '#007AFF',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  headerSpacer: {
    width: 60,
  },
  photoPreview: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#f8f9fa',
    margin: 16,
    borderRadius: 12,
  },
  photoIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  photoId: {
    fontSize: 14,
    color: '#666',
  },
  photoStatus: {
    fontSize: 13,
    color: '#27ae60',
    marginTop: 4,
    fontWeight: '500',
  },
  infoCard: {
    marginHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  warningText: {
    color: '#e74c3c',
  },
  progressContainer: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e9ecef',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  progressText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  actions: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  downloadButton: {
    height: 50,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#b0c4de',
  },
  downloadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  limitHint: {
    textAlign: 'center',
    color: '#e74c3c',
    fontSize: 13,
    marginTop: 12,
  },
});
