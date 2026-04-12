import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PromoCodeList from '../../components/PromoCode/PromoCodeList';
import { promoCodeApi } from '../../services/api/promoCodeApi';
import { Coupon, CouponStatus } from '../../types/promoCode';
import { RootStackNavigationProp } from '../../types/navigation';
import Icon from '../../components/Icon/Icon';

const CouponListScreen: React.FC = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<CouponStatus | undefined>(
    undefined
  );

  const loadCoupons = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const response = await promoCodeApi.getConsumerCoupons(
        selectedStatus,
        1,
        50
      );
      if (response.data.success) {
        setCoupons(response.data.data.coupons);
      }
    } catch (error: any) {
      Alert.alert('错误', error.message || '加载优惠码失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedStatus]);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadCoupons(false);
  }, [loadCoupons]);

  const handlePressCoupon = useCallback(
    (coupon: Coupon) => {
      navigation.navigate('Purchase', { couponId: coupon.id });
    },
    [navigation]
  );

  const statusFilters: {
    label: string;
    value: CouponStatus | undefined;
  }[] = [
    { label: '全部', value: undefined },
    { label: '未使用', value: CouponStatus.ACTIVE },
    { label: '已使用', value: CouponStatus.USED },
    { label: '已过期', value: CouponStatus.EXPIRED },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>我的优惠码</Text>
        <TouchableOpacity
          style={styles.statsButton}
          onPress={() => navigation.navigate('CouponStatistics')}
        >
          <Icon name="chart-bar" size={24} color="#2196F3" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {statusFilters.map((filter) => (
          <TouchableOpacity
            key={filter.label}
            style={[
              styles.filterTab,
              selectedStatus === filter.value && styles.filterTabActive,
            ]}
            onPress={() => setSelectedStatus(filter.value)}
          >
            <Text
              style={[
                styles.filterTabText,
                selectedStatus === filter.value && styles.filterTabTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Coupon List */}
      <PromoCodeList
        coupons={coupons}
        onPressCoupon={handlePressCoupon}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statsButton: {
    padding: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  filterTabActive: {
    backgroundColor: '#2196F3',
  },
  filterTabText: {
    fontSize: 14,
    color: '#666',
  },
  filterTabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default CouponListScreen;
