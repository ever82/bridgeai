import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { addBreadcrumb } from '../../utils/sentry';

type RootStackParamList = {
  Main: undefined;
  Feedback: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface FeedbackButtonProps {
  title?: string;
  style?: object;
  textStyle?: object;
}

/**
 * Feedback Button Component
 * Navigate to feedback screen when pressed
 */
export function FeedbackButton({
  title = 'Send Feedback',
  style,
  textStyle,
}: FeedbackButtonProps) {
  const navigation = useNavigation<NavigationProp>();

  const handlePress = () => {
    addBreadcrumb(
      'Feedback button pressed',
      'user.interaction',
      'info'
    );
    navigation.navigate('Feedback');
  };

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <Text style={[styles.text, textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FeedbackButton;
