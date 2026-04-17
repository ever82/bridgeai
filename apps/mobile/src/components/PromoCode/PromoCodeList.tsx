import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { format } from 'date-fns';

import { Coupon, CouponStatus } from '../../types/promoCode';
import Icon from '../Icon/Icon';

interface PromoCodeListProps {
  coupons: Coupon[];
  onPressCoupon: (coupon: Coupon) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}

const PromoCodeList: React.FC<PromoCodeListProps> = ({
  coupons,
  onPressCoupon,
  refreshing,
  onRefresh,
}) => {
  const getStatusColor = (status: CouponStatus) => {
    switch (status) {
      case CouponStatus.ACTIVE:
        return '#4CAF50';
      case CouponStatus.USED:
        return '#9E9E9E';
      case CouponStatus.EXPIRED:
        return '#F44336';
      case CouponStatus.CANCELLED:
        return '#FF9800';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusText = (status: CouponStatus) => {
    switch (status) {
      case CouponStatus.ACTIVE:
        return '未使用';
      case CouponStatus.USED:
        return '已使用';
      case CouponStatus.EXPIRED:
        return '已过期';
      case CouponStatus.CANCELLED:
        return '已取消';
      case CouponStatus.DISABLED:
        return '已禁用';
      default:
        return '未知';
    }
  };

  const renderItem = ({ item }: { item: Coupon }) => (
    <TouchableOpacity
      style={styles.couponCard}
      onPress={() => onPressCoupon(item)}
    >
      <View style={styles.couponHeader}>
        <View style={styles.merchantInfo}>
          <Text style={styles.merchantName}>{item.merchant.name}</Text>
          <Text style={styles.offerTitle} numberOfLines={1}>
            {item.offer.title}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: `${getStatusColor(item.status)}20` },
          ]}
        >
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.couponBody}>
        <View style={styles.codeSection}>
          <Text style={styles.codeLabel}>优惠码</Text>
          <Text style={styles.codeValue}>{item.code}</Text>
        </View>

        <View style={styles.priceSection}>
          <Text style={styles.discountPrice}>¥{item.discountPrice}</Text>
          <Text style={styles.originalPrice}>¥{item.originalPrice}</Text>
        </View>
      </View>

      <View style={styles.couponFooter}>
        <View style={styles.footerLeft}>
          <Icon name="clock-outline" size={14} color="#999" />
          <Text style={styles.validityText}>
            有效期至 {format(new Date(item.validUntil), 'MM-dd HH:mm')}
          </Text>
        </View>
        <Icon name="chevron-right" size={20} color="#ccc" />
      </View>
    </TouchableOpacity>
  );

  if (coupons.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="ticket-percent-outline" size={64} color="#ccc" />
        <Text style={styles.emptyText}>暂无优惠码</Text>
        <Text style={styles.emptySubtext}>快去发现优惠吧</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={coupons}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
      refreshing={refreshing}
      onRefresh={onRefresh}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  couponCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  couponHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  merchantInfo: {
    flex: 1,
    marginRight: 12,
  },
  merchantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  offerTitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  couponBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  codeSection: {
    flex: 1,
  },
  codeLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  codeValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    letterSpacing: 2,
  },
  priceSection: {
    alignItems: 'flex-end',
  },
  discountPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F44336',
  },
  originalPrice: {
    fontSize: 14,
    color: '#999',
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  couponFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  validityText: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
});

export default PromoCodeList;
