import React, { useEffect, useRef } from 'react';
import {
  Modal as RNModal,
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { theme } from '../../theme';

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  showCloseButton?: boolean;
  closeOnBackdropPress?: boolean;
  closeOnSwipeDown?: boolean;
  animationType?: 'none' | 'slide' | 'fade' | 'scale';
  size?: 'sm' | 'md' | 'lg' | 'full';
  testID?: string;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  children,
  showCloseButton = true,
  closeOnBackdropPress = true,
  closeOnSwipeDown = true,
  animationType = 'fade',
  size = 'md',
  testID,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      // Open animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Close animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim, scaleAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => closeOnSwipeDown,
      onMoveShouldSetPanResponder: (_, gestureState: PanResponderGestureState) => {
        return closeOnSwipeDown && gestureState.dy > 10;
      },
      onPanResponderMove: (_, gestureState: PanResponderGestureState) => {
        if (gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
          const opacity = 1 - gestureState.dy / (SCREEN_HEIGHT * 0.5);
          fadeAnim.setValue(Math.max(0, opacity));
        }
      },
      onPanResponderRelease: (_, gestureState: PanResponderGestureState) => {
        if (gestureState.dy > 100) {
          onClose();
        } else {
          // Snap back
          Animated.spring(slideAnim, {
            toValue: 0,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
          }).start();
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const getAnimationStyle = () => {
    switch (animationType) {
      case 'slide':
        return { transform: [{ translateY: slideAnim }] };
      case 'scale':
        return { transform: [{ scale: scaleAnim }], opacity: fadeAnim };
      case 'fade':
      default:
        return { opacity: fadeAnim };
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'sm':
        return { width: '70%', maxWidth: 300 };
      case 'lg':
        return { width: '90%', maxWidth: 500 };
      case 'full':
        return { width: '100%', height: '100%', margin: 0, borderRadius: 0 };
      case 'md':
      default:
        return { width: '80%', maxWidth: 400 };
    }
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      testID={testID}
    >
      <View style={styles.container}>
        {/* Backdrop */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={closeOnBackdropPress ? onClose : undefined}
        >
          <Animated.View
            style={[
              styles.backdropOverlay,
              { opacity: fadeAnim },
            ]}
          />
        </TouchableOpacity>

        {/* Modal Content */}
        <Animated.View
          style={[
            styles.modal,
            getSizeStyle(),
            getAnimationStyle(),
          ]}
          {...panResponder.panHandlers}
        >
          {/* Swipe Handle */}
          {closeOnSwipeDown && size !== 'full' && (
            <View style={styles.swipeHandle}>
              <View style={styles.swipeHandleBar} />
            </View>
          )}

          {/* Close Button */}
          {showCloseButton && size !== 'full' && (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <View style={styles.closeIcon}>
                <View style={[styles.closeIconLine, styles.closeIconLine1]} />
                <View style={[styles.closeIconLine, styles.closeIconLine2]} />
              </View>
            </TouchableOpacity>
          )}

          {/* Content */}
          <View style={styles.content}>{children}</View>
        </Animated.View>
      </View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.overlay,
  },
  modal: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.lg,
    maxHeight: '80%',
    margin: theme.spacing.base,
  },
  swipeHandle: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  swipeHandleBar: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: theme.borderRadius.full,
  },
  closeButton: {
    position: 'absolute',
    top: theme.spacing.base,
    right: theme.spacing.base,
    zIndex: 1,
  },
  closeIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIconLine: {
    position: 'absolute',
    width: 18,
    height: 2,
    backgroundColor: theme.colors.textTertiary,
    borderRadius: 1,
  },
  closeIconLine1: {
    transform: [{ rotate: '45deg' }],
  },
  closeIconLine2: {
    transform: [{ rotate: '-45deg' }],
  },
  content: {
    padding: theme.spacing.lg,
  },
});

export default Modal;
