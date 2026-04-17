import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

import { Coupon, CouponStatus } from '../../types/promoCode';
import { promoCodeApi } from '../../services/api/promoCodeApi';
import Icon from '../Icon/Icon';

interface PromoCodeDisplayProps {
  coupon: Coupon;
  onUseOnline?: () => void;
  onShare?: () => void;
  onSaveToAlbum?: () => void;
  showActions?: boolean;
}

const PromoCodeDisplay: React.FC<PromoCodeDisplayProps> = ({
  coupon,
  onUseOnline,
  onShare,
  onSaveToAlbum,
  showActions = true,
}) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const validUntil = new Date(coupon.validUntil).getTime();
      const diff = validUntil - now;

      if (diff <= 0) {
        setTimeLeft('已过期');
        setIsExpired(true);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(`${days}天 ${hours}小时`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}小时 ${minutes}分钟`);
      } else {
        setTimeLeft(`${minutes}分钟`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [coupon.validUntil]);

  const handleShare = async () => {
    try {
      const message = `我在${coupon.merchant.name}获得了一个优惠码！\n优惠码：${coupon.code}\n原价¥${coupon.originalPrice}，现价¥${coupon.discountPrice}\n有效期至：${format(new Date(coupon.validUntil), 'yyyy-MM-dd HH:mm')}\n快来使用吧！`;

      await Share.share({
        message,
        title: '分享优惠码',
      });

      onShare?.();
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleSaveToAlbum = () => {
    // In a real app, this would use react-native-view-shot to capture the QR code
    // and react-native-cameraroll to save it
    Alert.alert('保存成功', '优惠码二维码已保存到相册');
    onSaveToAlbum?.();
  };

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

  const canUse = coupon.status === CouponStatus.ACTIVE && !isExpired;

  return (
    <ScrollView style={styles.container}>
      {/* Merchant Info */}
      <View style={styles.merchantCard}>
        <View style={styles.merchantInfo}>
          <View style={styles.merchantAvatar}>
            <Icon name="store" size={40} color="#666" />
          </View>
          <View style={styles.merchantDetails}>
            <Text style={styles.merchantName}>{coupon.merchant.name}</Text>
            <Text style={styles.merchantAddress}>{coupon.merchant.address}</Text>
          </View>
        </View>
      </View>

      {/* Offer Info */}
      <View style={styles.offerCard}>
        <Text style={styles.offerTitle}>{coupon.offer.title}</Text>
        <Text style={styles.offerDescription}>{coupon.offer.description}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.discountPrice}>¥{coupon.discountPrice}</Text>
          <Text style={styles.originalPrice}>原价 ¥{coupon.originalPrice}</Text>
        </View>
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>
            省 ¥{(parseFloat(coupon.originalPrice.toString()) - parseFloat(coupon.discountPrice.toString())).toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Promo Code */}
      <View style={styles.codeCard}>
        <View style={styles.statusBadge}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: getStatusColor(coupon.status) },
            ]}
          />
          <Text style={[styles.statusText, { color: getStatusColor(coupon.status) }]}>
            {getStatusText(coupon.status)}
          </Text>
        </View>

        <View style={styles.codeContainer}>
          <Text style={styles.codeLabel}>优惠码</Text>
          <Text style={styles.codeValue}>{coupon.code}</Text>
        </View>

        {/* QR Code */}
        {canUse && (
          <View style={styles.qrContainer}>
            <QRCode
              value={coupon.qrCodeData || coupon.code}
              size={200}
              backgroundColor="white"
              color="#333"
            />
            <Text style={styles.qrHint}>到店请出示二维码核销</Text>
          </View>
        )}

        {/* Timer */}
        {coupon.status === CouponStatus.ACTIVE && (
          <View style={styles.timerContainer}>
            <Icon name="clock-outline" size={16} color={isExpired ? '#F44336' : '#666'} />
            <Text style={[styles.timerText, isExpired && styles.expiredText]}>
              {isExpired ? '已过期' : `剩余时间: ${timeLeft}`}
            </Text>
          </View>
        )}

        {/* Validity Period */}
        <View style={styles.validityContainer}>
          <Text style={styles.validityText}>
            有效期: {format(new Date(coupon.validFrom), 'MM-dd HH:mm')} -{' '}
            {format(new Date(coupon.validUntil), 'MM-dd HH:mm', { locale: zhCN })}
          </Text>
        </View>
      </View>

      {/* Actions */}
      {showActions && canUse && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={onUseOnline}
          >
            <Icon name="cart" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>立即使用</Text>
          </TouchableOpacity>

          <View style={styles.secondaryActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={handleShare}
            >
              <Icon name="share-variant" size={20} color="#2196F3" />
              <Text style={styles.secondaryButtonText}>分享给好友</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={handleSaveToAlbum}
            >
              <Icon name="download" size={20} color="#2196F3" />
              <Text style={styles.secondaryButtonText}>保存到相册</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Usage Instructions */}
      <View style={styles.instructionsCard}>
        <Text style={styles.instructionsTitle}>使用说明</Text>
        <View style={styles.instructionItem}>
          <Text style={styles.instructionNumber}>1</Text>
          <Text style={styles.instructionText}>到店后向商家出示上方二维码</Text>
        </View>
        <View style={styles.instructionItem}>
          <Text style={styles.instructionNumber}>2</Text>
          <Text style={styles.instructionText}>商家扫描二维码完成核销</Text>
        </View>
        <View style={styles.instructionItem}>
          <Text style={styles.instructionNumber}>3</Text>
          <Text style={styles.instructionText}>或点击"立即使用"在线完成支付</Text>
        </View>
        <View style={styles.instructionItem}>
          <Text style={styles.instructionNumber}>4</Text>
          <Text style={styles.instructionText}>交易完成后可对商家进行评价</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  merchantCard: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  merchantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  merchantAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  merchantDetails: {
    flex: 1,
  },
  merchantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  merchantAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  offerCard: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  offerDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  discountPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F44336',
    marginRight: 12,
  },
  originalPrice: {
    fontSize: 16,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  discountText: {
    fontSize: 14,
    color: '#FF6F00',
    fontWeight: '600',
  },
  codeCard: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  codeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  codeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  codeValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    letterSpacing: 4,
  },
  qrContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    marginBottom: 16,
  },
  qrHint: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  timerText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  expiredText: {
    color: '#F44336',
  },
  validityContainer: {
    marginTop: 8,
  },
  validityText: {
    fontSize: 12,
    color: '#999',
  },
  actionsContainer: {
    margin: 16,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
  },
  primaryButton: {
    backgroundColor: '#2196F3',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  secondaryButton: {
    backgroundColor: '#E3F2FD',
    flex: 1,
    marginHorizontal: 4,
  },
  secondaryButtonText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  instructionsCard: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 8,
    marginBottom: 24,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2196F3',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 14,
    fontWeight: '600',
    marginRight: 12,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 24,
  },
});

export default PromoCodeDisplay;
