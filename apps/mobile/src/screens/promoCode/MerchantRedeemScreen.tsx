import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, CameraType, BarCodeScanningResult } from 'expo-camera';
import { promoCodeApi } from '../../services/api/promoCodeApi';
import { Coupon } from '../../types/promoCode';
import Icon from '../../components/Icon/Icon';

const MerchantRedeemScreen: React.FC = () => {
  const navigation = useNavigation();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [scannedCoupon, setScannedCoupon] = useState<Coupon | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = useCallback(async (result: BarCodeScanningResult) => {
    if (!scanning || processing) return;

    const { data } = result;
    console.log('QR Code scanned:', data);

    try {
      setProcessing(true);

      // First validate the QR code
      const validateResponse = await promoCodeApi.validateQRCode(data);

      if (validateResponse.data.success) {
        setScannedCoupon(validateResponse.data.data);
        setScanning(false);

        Alert.alert(
          '确认核销',
          `优惠码: ${validateResponse.data.data.code}\n` +
          `商家: ${validateResponse.data.data.merchant.name}\n` +
          `优惠金额: ¥${validateResponse.data.data.discountPrice}\n\n` +
          '是否确认核销？',
          [
            {
              text: '取消',
              style: 'cancel',
              onPress: () => {
                setScanning(true);
                setScannedCoupon(null);
              },
            },
            {
              text: '确认核销',
              onPress: async () => {
                try {
                  const redeemResponse = await promoCodeApi.redeemCoupon(data);
                  if (redeemResponse.data.success) {
                    Alert.alert(
                      '核销成功',
                      `优惠码 ${redeemResponse.data.data.code} 已成功核销`,
                      [
                        {
                          text: '确定',
                          onPress: () => {
                            setScanning(true);
                            setScannedCoupon(null);
                          },
                        },
                      ]
                    );
                  }
                } catch (error: any) {
                  Alert.alert('核销失败', error.message || '核销过程中发生错误');
                  setScanning(true);
                  setScannedCoupon(null);
                }
              },
            },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert('验证失败', error.message || '无效或已过期的优惠码');
    } finally {
      setProcessing(false);
    }
  }, [scanning, processing]);

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>请求相机权限...</Text>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <Icon name="camera-off" size={64} color="#ccc" />
        <Text style={styles.errorText}>无法访问相机</Text>
        <Text style={styles.errorSubtext}>请在设置中允许应用访问相机</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>返回</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>扫码核销</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Camera */}
      <View style={styles.cameraContainer}>
        <Camera
          style={styles.camera}
          type={CameraType.back}
          barCodeScannerSettings={{
            barCodeTypes: ['qr'],
          }}
          onBarCodeScanned={scanning ? handleBarCodeScanned : undefined}
        >
          {/* Overlay */}
          <View style={styles.overlay}>
            <View style={styles.scanArea}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <Text style={styles.scanHint}>将二维码放入框内即可自动扫描</Text>
          </View>

          {processing && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.processingText}>处理中...</Text>
            </View>
          )}
        </Camera>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsCard}>
        <Text style={styles.instructionsTitle}>核销说明</Text>
        <View style={styles.instructionItem}>
          <Icon name="numeric-1-circle" size={20} color="#2196F3" />
          <Text style={styles.instructionText}>请顾客出示优惠码二维码</Text>
        </View>
        <View style={styles.instructionItem}>
          <Icon name="numeric-2-circle" size={20} color="#2196F3" />
          <Text style={styles.instructionText}>将二维码放入扫描框内</Text>
        </View>
        <View style={styles.instructionItem}>
          <Icon name="numeric-3-circle" size={20} color="#2196F3" />
          <Text style={styles.instructionText}>确认信息无误后完成核销</Text>
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#2196F3',
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanHint: {
    marginTop: 20,
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#fff',
  },
  instructionsCard: {
    backgroundColor: '#fff',
    padding: 20,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  instructionText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#666',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: '#666',
  },
  errorSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: '#2196F3',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MerchantRedeemScreen;
