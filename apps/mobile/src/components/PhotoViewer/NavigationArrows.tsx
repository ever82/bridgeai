/**
 * NavigationArrows Component
 * Left/right navigation arrows for photo browsing
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { NavigationArrowsProps } from './types';

export const NavigationArrows: React.FC<NavigationArrowsProps> = ({
  showPrev,
  showNext,
  onPrev,
  onNext,
}) => {
  return (
    <View style={styles.container} pointerEvents="box-none">
      {showPrev && (
        <TouchableOpacity
          style={[styles.arrow, styles.prevArrow]}
          onPress={onPrev}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {showNext && (
        <TouchableOpacity
          style={[styles.arrow, styles.nextArrow]}
          onPress={onNext}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-forward" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  arrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  prevArrow: {},
  nextArrow: {},
});

export default NavigationArrows;
