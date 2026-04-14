import React, { useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { CameraView, CameraType, FlashMode } from 'expo-camera';
import { useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

interface VisionShareCameraProps {
  onCapture: (photos: PhotoCapture[]) => void;
  onCancel: () => void;
  maxPhotos?: number;
  enableBurst?: boolean;
}

export interface PhotoCapture {
  uri: string;
  width: number;
  height: number;
  timestamp: number;
}

export const VisionShareCamera: React.FC<VisionShareCameraProps> = ({
  onCapture,
  onCancel,
  maxPhotos = 10,
  enableBurst = true,
}) => {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [zoom, setZoom] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<PhotoCapture[]>([]);
  const [burstMode, setBurstMode] = useState(false);
  const burstIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopBurstCapture = useCallback(() => {
    if (burstIntervalRef.current) {
      clearInterval(burstIntervalRef.current);
      burstIntervalRef.current = null;
    }
    setBurstMode(false);
  }, []);

  const capturePhoto = useCallback(async () => {
    if (!cameraRef.current || capturedPhotos.length >= maxPhotos) return;

    try {
      setCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        exif: true,
      });

      if (photo) {
        const newPhoto: PhotoCapture = {
          uri: photo.uri,
          width: photo.width,
          height: photo.height,
          timestamp: Date.now(),
        };
        setCapturedPhotos((prev) => [...prev, newPhoto]);
      }
    } catch {
      Alert.alert('拍照失败', '请重试');
    } finally {
      setCapturing(false);
    }
  }, [capturedPhotos.length, maxPhotos]);

  const startBurstCapture = useCallback(() => {
    if (!enableBurst) return;
    setBurstMode(true);
    let count = 0;
    const maxBurst = Math.min(5, maxPhotos - capturedPhotos.length);

    burstIntervalRef.current = setInterval(async () => {
      if (count >= maxBurst) {
        stopBurstCapture();
        return;
      }
      await capturePhoto();
      count++;
    }, 200);
  }, [enableBurst, maxPhotos, capturedPhotos.length, capturePhoto, stopBurstCapture]);

  const toggleCameraFacing = useCallback(() => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  }, []);

  const toggleFlash = useCallback(() => {
    setFlash((current) => {
      switch (current) {
        case 'off':
          return 'on';
        case 'on':
          return 'auto';
        default:
          return 'off';
      }
    });
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom((current) => Math.min(current + 0.1, 1));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((current) => Math.max(current - 0.1, 0));
  }, []);

  const handleLongPress = useCallback(() => {
    if (enableBurst) {
      startBurstCapture();
    }
  }, [enableBurst, startBurstCapture]);

  const handlePressOut = useCallback(() => {
    if (burstMode) {
      stopBurstCapture();
    }
  }, [burstMode, stopBurstCapture]);

  const handleConfirm = useCallback(() => {
    onCapture(capturedPhotos);
  }, [capturedPhotos, onCapture]);

  const handleRetake = useCallback(() => {
    setCapturedPhotos([]);
  }, []);

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>需要相机权限</Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>授予权限</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getFlashIcon = () => {
    switch (flash) {
      case 'on':
        return 'flash' as const;
      case 'auto':
        return 'flash-outline' as const;
      default:
        return 'flash-off' as const;
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        flash={flash}
        zoom={zoom}
        enableTorch={flash === 'on'}
      >
        <View style={styles.overlay}>
          {/* Top Controls */}
          <View style={styles.topControls}>
            <TouchableOpacity style={styles.controlButton} onPress={onCancel}>
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.controlButton} onPress={toggleFlash}>
              <Ionicons name={getFlashIcon()} size={28} color="white" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={toggleCameraFacing}
            >
              <Ionicons name="camera-reverse" size={28} color="white" />
            </TouchableOpacity>
          </View>

          {/* Zoom Controls */}
          <View style={styles.zoomControls}>
            <TouchableOpacity style={styles.zoomButton} onPress={handleZoomOut}>
              <Ionicons name="remove" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.zoomText}>{Math.round(zoom * 100)}%</Text>
            <TouchableOpacity style={styles.zoomButton} onPress={handleZoomIn}>
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Bottom Controls */}
          <View style={styles.bottomControls}>
            <View style={styles.photoCounter}>
              <Text style={styles.photoCounterText}>
                {capturedPhotos.length} / {maxPhotos}
              </Text>
            </View>

            <View style={styles.captureContainer}>
              {capturedPhotos.length > 0 && (
                <TouchableOpacity
                  style={styles.retakeButton}
                  onPress={handleRetake}
                >
                  <Text style={styles.retakeText}>重拍</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.captureButton, burstMode && styles.burstActive]}
                onPress={capturePhoto}
                onLongPress={handleLongPress}
                onPressOut={handlePressOut}
                disabled={capturing || capturedPhotos.length >= maxPhotos}
              >
                {capturing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <View style={styles.captureInner} />
                )}
              </TouchableOpacity>

              {capturedPhotos.length > 0 && (
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleConfirm}
                >
                  <Text style={styles.confirmText}>完成</Text>
                </TouchableOpacity>
              )}
            </View>

            {enableBurst && (
              <Text style={styles.burstHint}>长按连拍</Text>
            )}
          </View>
        </View>
      </CameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 50,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  zoomButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomControls: {
    padding: 20,
    paddingBottom: 40,
  },
  photoCounter: {
    alignSelf: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
  },
  photoCounterText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  captureContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  burstActive: {
    backgroundColor: '#ff4444',
  },
  captureInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'white',
    borderWidth: 3,
    borderColor: '#333',
  },
  retakeButton: {
    padding: 12,
  },
  retakeText: {
    color: 'white',
    fontSize: 16,
  },
  confirmButton: {
    padding: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  confirmText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  burstHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
  permissionText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default VisionShareCamera;
