/**
 * Typing Indicator Component
 *
 * Displays typing status with animated dots and handles
 * typing detection, broadcast, timeout, and stop detection.
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, ViewStyle } from 'react-native';
import { socketClient } from '../../services/socketClient';

export interface TypingIndicatorProps {
  roomId: string;
  currentUserId: string;
  style?: ViewStyle;
  dotColor?: string;
  textColor?: string;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
}

interface TypingUser {
  userId: string;
  roomId: string;
  isTyping: boolean;
  timestamp: string;
}

// Typing timeout in milliseconds
const TYPING_TIMEOUT_MS = 3000;
// Debounce time for typing events
const TYPING_DEBOUNCE_MS = 500;

/**
 * Animated Dot Component
 */
const AnimatedDot: React.FC<{ delay: number; color: string }> = ({ delay, color }) => {
  const animation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(animation, {
          toValue: 1,
          duration: 400,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(animation, {
          toValue: 0.3,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => animate());
    };

    animate();
  }, [animation, delay]);

  return (
    <Animated.View
      style={[
        styles.dot,
        { backgroundColor: color },
        { opacity: animation },
      ]}
    />
  );
};

/**
 * Typing Indicator - Shows when others are typing
 */
export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  roomId,
  currentUserId,
  style,
  dotColor = '#999',
  textColor = '#666',
}) => {
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingUser>>(new Map());
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    if (!roomId) return;

    const handleTyping = (data: TypingUser) => {
      if (data.roomId !== roomId || data.userId === currentUserId) {
        return;
      }

      // Clear existing timeout for this user
      const existingTimeout = timeoutsRef.current.get(data.userId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      if (data.isTyping) {
        // Add user to typing list
        setTypingUsers(prev => {
          const next = new Map(prev);
          next.set(data.userId, data);
          return next;
        });

        // Set timeout to remove user after TYPING_TIMEOUT_MS
        const timeout = setTimeout(() => {
          setTypingUsers(prev => {
            const next = new Map(prev);
            next.delete(data.userId);
            return next;
          });
          timeoutsRef.current.delete(data.userId);
        }, TYPING_TIMEOUT_MS);

        timeoutsRef.current.set(data.userId, timeout);
      } else {
        // Remove user from typing list
        setTypingUsers(prev => {
          const next = new Map(prev);
          next.delete(data.userId);
          return next;
        });
      }
    };

    socketClient.on('user:typing', handleTyping);

    return () => {
      socketClient.off('user:typing', handleTyping);

      // Clear all timeouts
      for (const timeout of timeoutsRef.current.values()) {
        clearTimeout(timeout);
      }
      timeoutsRef.current.clear();
    };
  }, [roomId, currentUserId]);

  // Get typing users array (excluding current user)
  const users = Array.from(typingUsers.values()).filter(u => u.userId !== currentUserId);

  if (users.length === 0) {
    return null;
  }

  // Format typing text
  const getTypingText = () => {
    if (users.length === 1) {
      return '正在输入...';
    } else if (users.length === 2) {
      return '2人正在输入...';
    } else {
      return `${users.length}人正在输入...`;
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.dotsContainer}>
        <AnimatedDot delay={0} color={dotColor} />
        <AnimatedDot delay={200} color={dotColor} />
        <AnimatedDot delay={400} color={dotColor} />
      </View>
      <Text style={[styles.text, { color: textColor }]}>
        {getTypingText()}
      </Text>
    </View>
  );
};

/**
 * Typing Detector - Hook for detecting and broadcasting typing
 */
export interface UseTypingDetectorOptions {
  roomId: string;
  currentUserId: string;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
}

export interface UseTypingDetectorReturn {
  isTyping: boolean;
  handleTextChange: (text: string) => void;
  stopTyping: () => void;
}

export const useTypingDetector = ({
  roomId,
  currentUserId,
  onTypingStart,
  onTypingStop,
}: UseTypingDetectorOptions): UseTypingDetectorReturn => {
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingTimeRef = useRef<number>(0);

  const stopTyping = useCallback(() => {
    if (isTyping) {
      setIsTyping(false);
      socketClient.setTyping(roomId, false);
      onTypingStop?.();
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [roomId, isTyping, onTypingStop]);

  const handleTextChange = useCallback((text: string) => {
    const now = Date.now();

    // Debounce typing events
    if (now - lastTypingTimeRef.current < TYPING_DEBOUNCE_MS) {
      return;
    }

    lastTypingTimeRef.current = now;

    if (!isTyping && text.length > 0) {
      setIsTyping(true);
      socketClient.setTyping(roomId, true);
      onTypingStart?.();
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      if (text.length === 0) {
        stopTyping();
      } else {
        // Send typing indicator again to keep it active
        socketClient.setTyping(roomId, true);
        // Reset timeout
        typingTimeoutRef.current = setTimeout(() => {
          stopTyping();
        }, TYPING_TIMEOUT_MS);
      }
    }, TYPING_TIMEOUT_MS);
  }, [roomId, isTyping, onTypingStart, stopTyping]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTyping) {
        socketClient.setTyping(roomId, false);
      }
    };
  }, [roomId, isTyping]);

  return {
    isTyping,
    handleTextChange,
    stopTyping,
  };
};

/**
 * Typing Input - Input component with built-in typing detection
 */
export interface TypingInputProps {
  roomId: string;
  currentUserId: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: ViewStyle;
  onSubmit?: () => void;
}

export const TypingInput: React.FC<TypingInputProps> = ({
  roomId,
  currentUserId,
  value,
  onChangeText,
  placeholder = '输入消息...',
  style,
  onSubmit,
}) => {
  const { handleTextChange, stopTyping } = useTypingDetector({
    roomId,
    currentUserId,
  });

  const handleChange = (text: string) => {
    onChangeText(text);
    handleTextChange(text);
  };

  const handleSubmit = () => {
    stopTyping();
    onSubmit?.();
  };

  return (
    <View style={[styles.inputContainer, style]}>
      <Text
        style={styles.input}
        accessibilityLabel={placeholder}
      >
        {value || placeholder}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 2,
  },
  text: {
    fontSize: 12,
  },
  inputContainer: {
    flex: 1,
    padding: 8,
  },
  input: {
    fontSize: 16,
    color: '#333',
  },
});

export default TypingIndicator;
