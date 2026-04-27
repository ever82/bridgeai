/**
 * ZoomControls Component
 * Zoom in/out/reset control buttons for photo viewer
 */

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { ZoomControlsProps } from './types';

export const ZoomControls: React.FC<ZoomControlsProps> = ({
  scale,
  minScale,
  maxScale,
  onZoomIn,
  onZoomOut,
  onReset,
}) => {
  const canZoomIn = scale < maxScale;
  const canZoomOut = scale > minScale;
  const isReset = scale !== 1;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, !canZoomOut && styles.buttonDisabled]}
        onPress={onZoomOut}
        disabled={!canZoomOut}
      >
        <Ionicons name="remove-circle-outline" size={28} color={canZoomOut ? '#007AFF' : '#ccc'} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.scaleIndicator, isReset && styles.scaleIndicatorActive]}
        onPress={onReset}
        disabled={!isReset}
      >
        <Text style={[styles.scaleText, isReset && styles.scaleTextActive]}>
          {Math.round(scale * 100)}%
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, !canZoomIn && styles.buttonDisabled]}
        onPress={onZoomIn}
        disabled={!canZoomIn}
      >
        <Ionicons name="add-circle-outline" size={28} color={canZoomIn ? '#007AFF' : '#ccc'} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    gap: 4,
  },
  button: {
    padding: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  scaleIndicator: {
    minWidth: 56,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    borderRadius: 16,
  },
  scaleIndicatorActive: {
    backgroundColor: '#f0f0f0',
  },
  scaleText: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  scaleTextActive: {
    color: '#333',
  },
});

export default ZoomControls;
