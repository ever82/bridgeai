import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  Image,
  Text,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

export interface AlbumPhoto {
  id: string;
  uri: string;
  width: number;
  height: number;
  timestamp: number;
  selected: boolean;
  source: 'camera' | 'album';
}

interface PhotoPickerProps {
  onSelect: (photos: AlbumPhoto[]) => void;
  onCancel: () => void;
  maxPhotos?: number;
  enableSecurityCheck?: boolean;
}

export const PhotoPicker: React.FC<PhotoPickerProps> = ({
  onSelect,
  onCancel,
  maxPhotos = 10,
  enableSecurityCheck = true,
}) => {
  const [photos, setPhotos] = useState<AlbumPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    requestPermission();
  }, []);

  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    setPermissionGranted(status === 'granted');
    if (status === 'granted') {
      loadPhotos();
    }
  };

  const loadPhotos = async () => {
    try {
      setLoading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: maxPhotos,
        quality: 0.8,
        exif: true,
      });

      if (!result.canceled && result.assets) {
        const loadedPhotos: AlbumPhoto[] = result.assets.map((asset, index) => ({
          id: `album-${Date.now()}-${index}`,
          uri: asset.uri,
          width: asset.width || 0,
          height: asset.height || 0,
          timestamp: asset.exif?.DateTimeOriginal
            ? new Date(asset.exif.DateTimeOriginal).getTime()
            : Date.now(),
          selected: true,
          source: 'album',
        }));
        setPhotos(loadedPhotos);
      }
    } catch (error) {
      Alert.alert('加载失败', '无法加载相册照片');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = useCallback((photoId: string) => {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === photoId);
      if (!photo) return prev;

      const selectedCount = prev.filter((p) => p.selected).length;

      // If trying to select and already at max
      if (!photo.selected && selectedCount >= maxPhotos) {
        Alert.alert('提示', `最多只能选择 ${maxPhotos} 张照片`);
        return prev;
      }

      return prev.map((p) =>
        p.id === photoId ? { ...p, selected: !p.selected } : p
      );
    });
  }, [maxPhotos]);

  const handleSecurityCheck = async (photoUri: string): Promise<boolean> => {
    if (!enableSecurityCheck) return true;

    try {
      // Check file size
      const response = await fetch(photoUri);
      const blob = await response.blob();
      const sizeInMB = blob.size / (1024 * 1024);

      if (sizeInMB > 50) {
        Alert.alert('文件过大', '单张照片大小不能超过50MB');
        return false;
      }

      // Additional security checks can be added here
      // - Image format validation
      // - Metadata analysis
      // - Content moderation API call

      return true;
    } catch (error) {
      console.error('Security check failed:', error);
      return false;
    }
  };

  const handleConfirm = async () => {
    const selectedPhotos = photos.filter((p) => p.selected);

    if (selectedPhotos.length === 0) {
      Alert.alert('提示', '请至少选择一张照片');
      return;
    }

    if (enableSecurityCheck) {
      setLoading(true);
      const checkResults = await Promise.all(
        selectedPhotos.map((p) => handleSecurityCheck(p.uri))
      );
      setLoading(false);

      const failedCount = checkResults.filter((r) => !r).length;
      if (failedCount > 0) {
        Alert.alert('安全检查', `${failedCount} 张照片未通过安全检查`);
        return;
      }
    }

    onSelect(selectedPhotos);
  };

  const handleReload = () => {
    loadPhotos();
  };

  const renderPhotoItem = ({ item }: { item: AlbumPhoto }) => (
    <TouchableOpacity
      style={[styles.photoItem, item.selected && styles.selectedPhotoItem]}
      onPress={() => handleToggleSelect(item.id)}
    >
      <Image source={{ uri: item.uri }} style={styles.photoImage} />
      <View style={styles.selectionOverlay}>
        {item.selected ? (
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={16} color="white" />
          </View>
        ) : (
          <View style={styles.uncheckCircle} />
        )}
      </View>
      <View style={styles.sourceBadge}>
        <Text style={styles.sourceText}>相册</Text>
      </View>
    </TouchableOpacity>
  );

  if (!permissionGranted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="images" size={64} color="#ccc" />
        <Text style={styles.permissionTitle}>需要相册权限</Text>
        <Text style={styles.permissionText}>请授予访问相册的权限以选择照片</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>授予权限</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const selectedCount = photos.filter((p) => p.selected).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel}>
          <Text style={styles.cancelText}>取消</Text>
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>选择照片</Text>
          <Text style={styles.subtitle}>
            {selectedCount} / {maxPhotos}
          </Text>
        </View>
        <TouchableOpacity onPress={handleConfirm}>
          <Text style={[styles.confirmText, selectedCount === 0 && styles.disabledText]}>
            确定
          </Text>
        </TouchableOpacity>
      </View>

      {/* Photo Grid */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      ) : photos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="images-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>相册为空</Text>
          <TouchableOpacity style={styles.reloadButton} onPress={handleReload}>
            <Text style={styles.reloadText}>重新加载</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={photos}
          renderItem={renderPhotoItem}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.photoGrid}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Preview Button */}
      {selectedCount > 0 && (
        <TouchableOpacity style={styles.previewButton} onPress={handleConfirm}>
          <Text style={styles.previewButtonText}>预览并导入 ({selectedCount})</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  subtitle: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  confirmText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  disabledText: {
    color: '#ccc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  reloadButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  reloadText: {
    fontSize: 14,
    color: '#007AFF',
  },
  photoGrid: {
    padding: 4,
  },
  photoItem: {
    flex: 1 / 3,
    aspectRatio: 1,
    margin: 2,
    position: 'relative',
  },
  selectedPhotoItem: {
    opacity: 0.8,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  selectionOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uncheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'white',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sourceBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sourceText: {
    fontSize: 10,
    color: 'white',
  },
  previewButton: {
    backgroundColor: '#007AFF',
    margin: 16,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  previewButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  permissionText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  permissionButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PhotoPicker;
