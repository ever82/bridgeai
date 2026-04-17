import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { captureMessage, addBreadcrumb, Sentry } from '../../utils/sentry';

export type FeedbackCategory = 'bug' | 'feature' | 'improvement' | 'other';

export interface FeedbackData {
  message: string;
  category: FeedbackCategory;
  email?: string;
  screenshot?: string;
  additionalInfo?: Record<string, unknown>;
}

interface FeedbackFormProps {
  onSubmit?: (data: FeedbackData) => void;
  onCancel?: () => void;
  userEmail?: string;
  allowScreenshots?: boolean;
}

const CATEGORIES: { value: FeedbackCategory; label: string; icon: string }[] = [
  { value: 'bug', label: 'Bug Report', icon: '🐛' },
  { value: 'feature', label: 'Feature Request', icon: '✨' },
  { value: 'improvement', label: 'Improvement', icon: '💡' },
  { value: 'other', label: 'Other', icon: '💬' },
];

/**
 * Feedback form component for collecting user feedback
 * Integrates with Sentry for error tracking
 */
export function FeedbackForm({
  onSubmit,
  onCancel,
  userEmail,
  allowScreenshots = true,
}: FeedbackFormProps) {
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<FeedbackCategory>('bug');
  const [email, setEmail] = useState(userEmail || '');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectCategory = useCallback((cat: FeedbackCategory) => {
    setCategory(cat);
    addBreadcrumb(
      `Feedback category selected: ${cat}`,
      'user.feedback',
      'info',
      { category: cat }
    );
  }, []);

  const handlePickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setScreenshot(result.assets[0].uri);
        addBreadcrumb(
          'Screenshot attached to feedback',
          'user.feedback',
          'info'
        );
      }
    } catch (error) {
      console.error('Failed to pick image:', error);
      Alert.alert('Error', 'Failed to attach screenshot');
    }
  }, []);

  const handleTakeScreenshot = useCallback(async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setScreenshot(result.assets[0].uri);
        addBreadcrumb(
          'Screenshot captured for feedback',
          'user.feedback',
          'info'
        );
      }
    } catch (error) {
      console.error('Failed to take photo:', error);
      Alert.alert('Error', 'Failed to capture screenshot');
    }
  }, []);

  const handleRemoveScreenshot = useCallback(() => {
    setScreenshot(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    setIsSubmitting(true);

    try {
      const feedbackData: FeedbackData = {
        message: message.trim(),
        category,
        email: email.trim() || undefined,
        screenshot: screenshot || undefined,
        additionalInfo: {
          timestamp: new Date().toISOString(),
          appVersion: process.env.npm_package_version,
          platform: 'mobile',
        },
      };

      // Add breadcrumb for feedback submission
      addBreadcrumb(
        'User feedback submitted',
        'user.feedback',
        'info',
        {
          category,
          hasScreenshot: !!screenshot,
          hasEmail: !!email,
        }
      );

      // Capture as Sentry message with feedback
      const eventId = captureMessage(
        `User Feedback: ${category} - ${message.slice(0, 100)}`,
        'info'
      );

      // If screenshot is provided, attach it to the event
      if (screenshot && eventId) {
        // Note: Sentry React Native handles screenshot attachments automatically
        // when attachScreenshot is enabled in init config
        Sentry.withScope((scope) => {
          scope.setExtra('feedback_category', category);
          scope.setExtra('feedback_message', message);
          scope.setExtra('feedback_email', email);
          scope.setTag('feedback_type', category);
          scope.setTag('has_screenshot', 'true');
          Sentry.captureMessage('User Feedback with Screenshot');
        });
      }

      // Call custom submit handler
      if (onSubmit) {
        await onSubmit(feedbackData);
      }

      Alert.alert(
        'Thank You!',
        'Your feedback has been submitted successfully.',
        [{ text: 'OK', onPress: onCancel }]
      );
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [message, category, email, screenshot, onSubmit, onCancel]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Send Feedback</Text>
      <Text style={styles.subtitle}>
        Help us improve VisionShare by sharing your thoughts
      </Text>

      {/* Category Selection */}
      <Text style={styles.label}>Category</Text>
      <View style={styles.categories}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.value}
            style={[
              styles.categoryButton,
              category === cat.value && styles.categoryButtonActive,
            ]}
            onPress={() => handleSelectCategory(cat.value)}
          >
            <Text style={styles.categoryIcon}>{cat.icon}</Text>
            <Text
              style={[
                styles.categoryText,
                category === cat.value && styles.categoryTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Message Input */}
      <Text style={styles.label}>Message</Text>
      <TextInput
        style={styles.messageInput}
        multiline
        numberOfLines={4}
        placeholder="Describe your feedback..."
        value={message}
        onChangeText={setMessage}
        textAlignVertical="top"
      />

      {/* Email Input */}
      <Text style={styles.label}>Email (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="your@email.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      {/* Screenshot */}
      {allowScreenshots && (
        <>
          <Text style={styles.label}>Screenshot (optional)</Text>
          {screenshot ? (
            <View style={styles.screenshotContainer}>
              <Image source={{ uri: screenshot }} style={styles.screenshot} />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={handleRemoveScreenshot}
              >
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.screenshotButtons}>
              <TouchableOpacity
                style={styles.screenshotButton}
                onPress={handlePickImage}
              >
                <Text style={styles.screenshotButtonText}>Choose Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.screenshotButton}
                onPress={handleTakeScreenshot}
              >
                <Text style={styles.screenshotButtonText}>Take Photo</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.submitButtonText}>Submit Feedback</Text>
        )}
      </TouchableOpacity>

      {/* Cancel Button */}
      <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryText: {
    fontSize: 13,
    color: '#333',
  },
  categoryTextActive: {
    color: 'white',
  },
  messageInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    height: 120,
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 20,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 20,
  },
  screenshotContainer: {
    marginBottom: 20,
  },
  screenshot: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  removeButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FF3B30',
    borderRadius: 6,
  },
  removeButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '500',
  },
  screenshotButtons: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  screenshotButton: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  screenshotButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
  },
});

export default FeedbackForm;
