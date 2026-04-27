/**
 * PhotoMetadataDisplay Component
 * Displays EXIF and photo metadata information
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { PhotoMetadataDisplayProps } from './types';

export const PhotoMetadataDisplay: React.FC<PhotoMetadataDisplayProps> = ({
  metadata,
  showLocation,
  showSettings,
}) => {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const rows: Array<{ label: string; value: string | number | undefined }> = [];

  if (metadata.capturedAt) {
    rows.push({ label: '拍摄时间', value: formatDate(metadata.capturedAt) });
  }
  if (metadata.device) {
    rows.push({ label: '拍摄设备', value: metadata.device });
  }
  if (showSettings && metadata.settings) {
    const { aperture, shutterSpeed, iso, focalLength } = metadata.settings;
    if (aperture) rows.push({ label: '光圈', value: `f/${aperture}` });
    if (shutterSpeed) rows.push({ label: '快门速度', value: shutterSpeed });
    if (iso) rows.push({ label: 'ISO', value: String(iso) });
    if (focalLength) rows.push({ label: '焦距', value: focalLength });
  }
  if (showLocation && metadata.location) {
    const { address, city, country } = metadata.location;
    const locationStr = [address, city, country].filter(Boolean).join(', ');
    if (locationStr) rows.push({ label: '拍摄地点', value: locationStr });
  }

  if (rows.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>暂无元数据</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {rows.map((row, index) => (
        <View key={index} style={styles.row}>
          <View style={styles.labelContainer}>
            <Ionicons name="information-circle-outline" size={16} color="#999" />
            <Text style={styles.label}>{row.label}</Text>
          </View>
          <Text style={styles.value}>{String(row.value ?? '—')}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fafafa',
    borderRadius: 8,
    padding: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  label: {
    fontSize: 13,
    color: '#999',
  },
  value: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  emptyText: {
    fontSize: 13,
    color: '#bbb',
    textAlign: 'center',
    paddingVertical: 8,
  },
});

export default PhotoMetadataDisplay;
