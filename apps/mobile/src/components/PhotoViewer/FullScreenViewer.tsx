/**
 * FullScreenViewer Component
 * Full screen photo viewer with pinch-to-zoom and swipe navigation
 */

import React, { useCallback, useRef } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

import type { FullScreenViewerProps } from './types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

export const FullScreenViewer: React.FC<FullScreenViewerProps> = ({
  photo,
  isUnlocked,
  scale,
  onZoom,
  onSwipeLeft,
  onSwipeRight,
  onTap,
  onDoubleTap,
}) => {
  const animatedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const lastTap = useRef<number>(0);
  const _lastTapScale = useRef<number>(1);

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      onDoubleTap();
    } else {
      onTap();
    }
    lastTap.current = now;
  }, [onTap, onDoubleTap]);

  const handleSwipeLeft = useCallback(() => {
    onSwipeLeft();
  }, [onSwipeLeft]);

  const handleSwipeRight = useCallback(() => {
    onSwipeRight();
  }, [onSwipeRight]);

  const pinchGesture = Gesture.Pinch()
    .onUpdate(e => {
      animatedScale.value = scale * e.scale;
    })
    .onEnd(() => {
      const newScale = animatedScale.value;
      if (newScale < 1) {
        animatedScale.value = withSpring(1);
        runOnJS(onZoom)(1);
      } else if (newScale > 4) {
        animatedScale.value = withSpring(4);
        runOnJS(onZoom)(4);
      } else {
        runOnJS(onZoom)(newScale);
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate(e => {
      if (animatedScale.value <= 1) {
        translateX.value = e.translationX;
      } else {
        translateX.value = e.translationX;
        translateY.value = e.translationY;
      }
    })
    .onEnd(e => {
      if (animatedScale.value <= 1) {
        if (e.translationX < -SWIPE_THRESHOLD) {
          runOnJS(handleSwipeLeft)();
        } else if (e.translationX > SWIPE_THRESHOLD) {
          runOnJS(handleSwipeRight)();
        }
        translateX.value = withSpring(0);
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const tapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      runOnJS(handleTap)();
    });

  const composed = Gesture.Simultaneous(pinchGesture, Gesture.Race(panGesture, tapGesture));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: animatedScale.value },
    ],
  }));

  const imageUrl = isUnlocked ? photo.fullUrl : photo.previewUrl || photo.thumbnailUrl;

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={styles.container}>
        <Animated.Image
          source={{ uri: imageUrl }}
          style={[styles.image, animatedStyle]}
          resizeMode="contain"
        />
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
});

export default FullScreenViewer;
