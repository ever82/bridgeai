/**
 * PhotoPayment Screen
 * Payment confirmation for VisionShare photo purchases
 * Supports single and batch photo payment
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from 'react-native';

import type { Photo } from '../../../shared/types/photo.types';
import type { CreditBalance, UnlockedPhotoInfo } from '../../../shared/types/payment.types';
import { visionShareApi } from '../../services/api/visionShare';

interface PhotoPaymentScreenProps {
  photos: Photo[];
  balance: CreditBalance;
  onPaymentSuccess: (unlockedPhotos: UnlockedPhotoInfo[]) => void;
  onCancel: () => void;
}

const PHOTO_PRICE = 20; // points per photo

export const PhotoPaymentScreen: React.FC<PhotoPaymentScreenProps> = ({
  photos,
  balance,
  onPaymentSuccess,
  onCancel,
}) => {
  const [password, setPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const totalAmount = photos.length * PHOTO_PRICE;
  const canAfford = balance.available >= totalAmount;

  const handleConfirmPayment = useCallback(async () => {
    if (password.length < 4) {
      Alert.alert('错误', '请输入4位以上支付密码');
      return;
    }

    if (!canAfford) {
      Alert.alert('余额不足', `需要 ${totalAmount} 积分，当前可用 ${balance.available} 积分`);
      return;
    }

    setIsProcessing(true);

    try {
      const result = await visionShareApi.payForPhotos({
        photoIds: photos.map(p => p.id),
        totalAmount,
        password,
        metadata: { source: 'gallery' },
      });

      if (result.success && result.data) {
        Alert.alert('支付成功', `已解锁 ${photos.length} 张照片`, [
          {
            text: '确定',
            onPress: () => onPaymentSuccess(result.data!.unlockedPhotos),
          },
        ]);
      } else {
        Alert.alert('支付失败', result.error?.message || '请稍后重试');
      }
    } catch (error) {
      Alert.alert('支付失败', '网络错误，请稍后重试');
    } finally {
      setIsProcessing(false);
    }
  }, [password, canAfford, photos, totalAmount, balance, onPaymentSuccess]);

  const renderPhotoItem = ({ item }: { item: Photo }) => (
    <View style={styles.photoItem}>
      <View style={styles.photoThumbnail}>
        <Text style={styles.photoThumbnailText}>📷</Text>
      </View>
      <View style={styles.photoInfo}>
        <Text style={styles.photoId} numberOfLines={1}>
          {item.id}
        </Text>
        <Text style={styles.photoPrice}>{PHOTO_PRICE} 积分</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>确认支付</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Balance info */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>可用积分</Text>
        <Text style={[styles.balanceAmount, !canAfford && styles.insufficientBalance]}>
          {balance.available}
        </Text>
      </View>

      {/* Photo list */}
      <View style={styles.photoListSection}>
        <Text style={styles.sectionTitle}>待解锁照片 ({photos.length} 张)</Text>
        <FlatList
          data={photos}
          keyExtractor={item => item.id}
          renderItem={renderPhotoItem}
          scrollEnabled={false}
        />
      </View>

      {/* Total */}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>合计</Text>
        <Text style={styles.totalAmount}>{totalAmount} 积分</Text>
      </View>

      {/* Password input */}
      <View style={styles.passwordSection}>
        <Text style={styles.passwordLabel}>支付密码</Text>
        <TextInput
          style={styles.passwordInput}
          value={password}
          onChangeText={setPassword}
          placeholder="请输入支付密码"
          secureTextEntry={!showPassword}
          maxLength={20}
          editable={!isProcessing}
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.togglePassword}
        >
          <Text style={styles.togglePasswordText}>{showPassword ? '隐藏' : '显示'}</Text>
        </TouchableOpacity>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel} disabled={isProcessing}>
          <Text style={styles.cancelButtonText}>取消</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.confirmButton, (!canAfford || isProcessing) && styles.disabledButton]}
          onPress={handleConfirmPayment}
          disabled={!canAfford || isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmButtonText}>确认支付 {totalAmount} 积分</Text>
          )}
        </TouchableOpacity>
      </View>

      {!canAfford && <Text style={styles.insufficientHint}>余额不足，请先充值</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  headerSpacer: {
    width: 34,
  },
  balanceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
  },
  balanceAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  insufficientBalance: {
    color: '#e74c3c',
  },
  photoListSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  photoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  photoThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoThumbnailText: {
    fontSize: 20,
  },
  photoInfo: {
    marginLeft: 12,
    flex: 1,
  },
  photoId: {
    fontSize: 13,
    color: '#333',
  },
  photoPrice: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e74c3c',
  },
  passwordSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 16,
  },
  passwordLabel: {
    fontSize: 14,
    color: '#333',
    marginRight: 12,
  },
  passwordInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  togglePassword: {
    padding: 12,
  },
  togglePasswordText: {
    fontSize: 13,
    color: '#007AFF',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 15,
    color: '#666',
  },
  confirmButton: {
    flex: 1.5,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: '#b0c4de',
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  insufficientHint: {
    textAlign: 'center',
    color: '#e74c3c',
    fontSize: 13,
    marginTop: 12,
  },
});
