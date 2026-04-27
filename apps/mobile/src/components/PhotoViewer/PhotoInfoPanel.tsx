/**
 * PhotoInfoPanel Component
 * Slide-up panel showing photo info and metadata
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import type { PhotoInfoPanelProps } from './types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const COLLAPSED_HEIGHT = 60;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.5;

export const PhotoInfoPanel: React.FC<PhotoInfoPanelProps> = ({
  photo,
  metadata,
  isExpanded,
  onToggleExpand,
}) => {
  const panelHeight = useSharedValue(isExpanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT);

  React.useEffect(() => {
    panelHeight.value = withSpring(isExpanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT);
  }, [isExpanded, panelHeight]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: panelHeight.value,
  }));

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '未知时间';
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      {/* Handle bar */}
      <TouchableOpacity style={styles.handleArea} onPress={onToggleExpand}>
        <View style={styles.handle} />
        <View style={styles.headerRow}>
          <Text style={styles.title}>照片信息</Text>
          <Ionicons name={isExpanded ? 'chevron-down' : 'chevron-up'} size={20} color="#666" />
        </View>
      </TouchableOpacity>

      {/* Expanded content */}
      {isExpanded && (
        <View style={styles.content}>
          {/* Basic info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>基本信息</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>分辨率</Text>
              <Text style={styles.infoValue}>
                {photo.width} x {photo.height}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>文件大小</Text>
              <Text style={styles.infoValue}>{formatFileSize(photo.fileSize)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>格式</Text>
              <Text style={styles.infoValue}>{photo.format.toUpperCase()}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>拍摄时间</Text>
              <Text style={styles.infoValue}>{formatDate(metadata.capturedAt)}</Text>
            </View>
            {metadata.device && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>设备</Text>
                <Text style={styles.infoValue}>{metadata.device}</Text>
              </View>
            )}
          </View>

          {/* Camera settings */}
          {metadata.settings && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>拍摄参数</Text>
              {metadata.settings.aperture && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>光圈</Text>
                  <Text style={styles.infoValue}>f/{metadata.settings.aperture}</Text>
                </View>
              )}
              {metadata.settings.shutterSpeed && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>快门</Text>
                  <Text style={styles.infoValue}>{metadata.settings.shutterSpeed}</Text>
                </View>
              )}
              {metadata.settings.iso && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>ISO</Text>
                  <Text style={styles.infoValue}>{metadata.settings.iso}</Text>
                </View>
              )}
              {metadata.settings.focalLength && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>焦距</Text>
                  <Text style={styles.infoValue}>{metadata.settings.focalLength}</Text>
                </View>
              )}
            </View>
          )}

          {/* Tags */}
          {metadata.tags && metadata.tags.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>标签</Text>
              <View style={styles.tagsContainer}>
                {metadata.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  handleArea: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
    overflow: 'hidden',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#999',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 13,
    color: '#666',
  },
});

export default PhotoInfoPanel;
