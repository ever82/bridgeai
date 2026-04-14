import React, { ReactNode, useEffect, useState } from 'react';
import {
  View,
  Keyboard,
  KeyboardAvoidingView as RNKeyboardAvoidingView,
  Platform,
  KeyboardEvent,
  Animated,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface KeyboardAvoidingViewProps {
  children: ReactNode;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  behavior?: 'height' | 'position' | 'padding';
  keyboardVerticalOffset?: number;
  enabled?: boolean;
}

/**
 * Enhanced KeyboardAvoidingView component
 * Handles keyboard appearance with proper animations
 * Works with bottom tab navigation and safe areas
 */
export const KeyboardAvoidingView: React.FC<KeyboardAvoidingViewProps> = ({
  children,
  style,
  contentContainerStyle,
  behavior = Platform.OS === 'ios' ? 'padding' : 'height',
  keyboardVerticalOffset = 0,
  enabled = true,
}) => {
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const animatedValue = new Animated.Value(0);

  useEffect(() => {
    if (!enabled) return;

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onKeyboardShow = (event: KeyboardEvent) => {
      setKeyboardVisible(true);
      setKeyboardHeight(event.endCoordinates.height);

      Animated.timing(animatedValue, {
        toValue: event.endCoordinates.height - insets.bottom,
        duration: 250,
        useNativeDriver: false,
      }).start();
    };

    const onKeyboardHide = () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);

      Animated.timing(animatedValue, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }).start();
    };

    const showSubscription = Keyboard.addListener(showEvent as any, onKeyboardShow);
    const hideSubscription = Keyboard.addListener(hideEvent as any, onKeyboardHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [enabled, insets.bottom]);

  if (Platform.OS === 'ios') {
    return (
      <RNKeyboardAvoidingView
        style={style}
        contentContainerStyle={contentContainerStyle}
        behavior={behavior}
        keyboardVerticalOffset={keyboardVerticalOffset}
        enabled={enabled}
      >
        {children}
      </RNKeyboardAvoidingView>
    );
  }

  // Android implementation with animated padding
  return (
    <Animated.View
      style={[
        style,
        {
          paddingBottom: keyboardVisible ? keyboardHeight : 0,
        },
      ]}
    >
      <View style={contentContainerStyle}>{children}</View>
    </Animated.View>
  );
};
