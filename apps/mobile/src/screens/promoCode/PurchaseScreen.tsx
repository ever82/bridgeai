import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import PromoCodeDisplay from '../../components/PromoCode/PromoCodeDisplay';
import { promoCodeApi } from '../../services/api/promoCodeApi';
import { Coupon } from '../../types/promoCode';
import { RootStackParamList } from '../../types/navigation';

type PurchaseScreenRouteProp = RouteProp<RootStackParamList, 'Purchase'>;

const PurchaseScreen: React.FC = () => {
  const route = useRoute<PurchaseScreenRouteProp>();
  const navigation = useNavigation();
  const { couponId } = route.params || {};

  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  React.useEffect(() => {
    loadCoupon();
  }, [couponId]);

  const loadCoupon = async () => {
    try {
      setLoading(true);
      const response = await promoCodeApi.getCoupon(couponId);
      if (response.data.success) {
        setCoupon(response.data.data);
      }
    } catch (error: any) {
      Alert.alert('错误', error.message || '加载优惠码失败');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleUseOnline = useCallback(async () => {
    if (!coupon) return;

    try {
      setProcessing(true);
      const response = await promoCodeApi.getOnlineUrl(coupon.id);

      if (response.data.success) {
        const { onlineUrl } = response.data.data;

        // Confirm with user
        Alert.alert(
          '即将跳转',
          '您将跳转到商家页面完成支付，是否继续？',
          [
            {
              text: '取消',
              style: 'cancel',
            },
            {
              text: '继续',
              onPress: async () => {
                // Open the URL
                const supported = await Linking.canOpenURL(onlineUrl);
                if (supported) {
                  await Linking.openURL(onlineUrl);
                } else {
                  Alert.alert('错误', '无法打开商家页面');
                }
              },
            },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert('错误', error.message || '获取支付链接失败');
    } finally {
      setProcessing(false);
    }
  }, [coupon]);

  const handleShare = useCallback(() => {
    // Analytics tracking
    console.log('Coupon shared:', coupon?.code);
  }, [coupon]);

  const handleSaveToAlbum = useCallback(() => {
    // Analytics tracking
    console.log('Coupon saved to album:', coupon?.code);
  }, [coupon]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>加载中...</Text>
      </SafeAreaView>
    );
  }

  if (!coupon) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>优惠码不存在</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {processing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.processingText}>处理中...</Text>
        </View>
      )}
      <PromoCodeDisplay
        coupon={coupon}
        onUseOnline={handleUseOnline}
        onShare={handleShare}
        onSaveToAlbum={handleSaveToAlbum}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  processingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#fff',
  },
});

export default PurchaseScreen;
