import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { promoCodeApi } from '../../services/api/promoCodeApi';
import { RootStackParamList } from '../../types/navigation';
import Icon from '../../components/Icon/Icon';

type RatingScreenRouteProp = RouteProp<RootStackParamList, 'Rating'>;

const RatingScreen: React.FC = () => {
  const route = useRoute<RatingScreenRouteProp>();
  const navigation = useNavigation();
  const { couponId, rateeId, raterType, merchantName } = route.params || {};

  const [score, setScore] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (score < 1 || score > 5) {
      Alert.alert('提示', '请选择评分');
      return;
    }

    try {
      setSubmitting(true);
      const response = await promoCodeApi.createRating({
        couponId,
        rateeId,
        raterType,
        score,
        comment: comment.trim() || undefined,
      });

      if (response.data.success) {
        Alert.alert('成功', '评价已提交，感谢您的反馈！', [
          {
            text: '确定',
            onPress: () => navigation.goBack(),
          },
        ]);
      }
    } catch (error: any) {
      Alert.alert('错误', error.message || '提交评价失败');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            style={styles.starButton}
            onPress={() => setScore(star)}
          >
            <Icon
              name={star <= score ? 'star' : 'star-outline'}
              size={40}
              color={star <= score ? '#FFC107' : '#ccc'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const getRatingText = () => {
    switch (score) {
      case 1:
        return '非常不满意';
      case 2:
        return '不满意';
      case 3:
        return '一般';
      case 4:
        return '满意';
      case 5:
        return '非常满意';
      default:
        return '';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          评价{raterType === 'CONSUMER' ? '商家' : '顾客'}
        </Text>
      </View>

      <View style={styles.content}>
        {/* Merchant/Consumer Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>
            您正在评价：
          </Text>
          <Text style={styles.infoName}>{merchantName}</Text>
        </View>

        {/* Rating */}
        <View style={styles.ratingCard}>
          <Text style={styles.ratingLabel}>请给出您的评分</Text>
          {renderStars()}
          <Text style={styles.ratingText}>{getRatingText()}</Text>
        </View>

        {/* Comment */}
        <View style={styles.commentCard}>
          <Text style={styles.commentLabel}>评价内容（可选）</Text>
          <TextInput
            style={styles.commentInput}
            placeholder="请输入您的评价..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            maxLength={500}
            value={comment}
            onChangeText={setComment}
          />
          <Text style={styles.commentCount}>{comment.length}/500</Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>提交评价</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    padding: 16,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  infoName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  ratingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
  },
  commentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  commentLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  commentCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RatingScreen;
