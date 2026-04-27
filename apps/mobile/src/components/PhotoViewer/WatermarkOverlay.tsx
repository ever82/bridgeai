/**
 * WatermarkOverlay Component
 * Watermark overlay on photos (center, bottom-right, or tiled)
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

import type { WatermarkOverlayProps } from './types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const WatermarkOverlay: React.FC<WatermarkOverlayProps> = ({
  text,
  opacity = 0.15,
  position = 'center',
}) => {
  if (!text) return null;

  if (position === 'tile') {
    return (
      <View style={styles.tileContainer} pointerEvents="none">
        {Array.from({ length: 6 }).map((_, rowIndex) => (
          <View key={rowIndex} style={styles.tileRow}>
            {Array.from({ length: 4 }).map((__, colIndex) => (
              <Text
                key={colIndex}
                style={[
                  styles.watermarkText,
                  {
                    opacity,
                    transform: [{ rotate: `${-30 + (colIndex % 2) * 20}deg` }],
                  },
                ]}
              >
                {text}
              </Text>
            ))}
          </View>
        ))}
      </View>
    );
  }

  return (
    <View
      style={[styles.container, position === 'center' ? styles.center : styles.bottomRight]}
      pointerEvents="none"
    >
      <Text style={[styles.watermarkText, { opacity }]}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bottomRight: {
    bottom: 40,
    right: 20,
    top: undefined,
    left: undefined,
  },
  tileContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  tileRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: SCREEN_WIDTH,
  },
  watermarkText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});

export default WatermarkOverlay;
