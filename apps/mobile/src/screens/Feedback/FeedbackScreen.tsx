import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FeedbackForm, FeedbackData } from '../../components/Feedback';
import { addBreadcrumb } from '../../utils/sentry';

type RootStackParamList = {
  Main: undefined;
  Feedback: undefined;
};

type FeedbackScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Feedback'>;

/**
 * Feedback Screen
 * Full-screen feedback form for user submissions
 */
export function FeedbackScreen() {
  const navigation = useNavigation<FeedbackScreenNavigationProp>();

  const handleSubmit = async (data: FeedbackData) => {
    // Log submission
    addBreadcrumb(
      'Feedback submitted from screen',
      'user.feedback',
      'info',
      {
        category: data.category,
        hasScreenshot: !!data.screenshot,
        hasEmail: !!data.email,
      }
    );

    // Here you would typically send to your backend
    // await api.submitFeedback(data);

    console.log('Feedback submitted:', data);
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <FeedbackForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          allowScreenshots
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
});

export default FeedbackScreen;
