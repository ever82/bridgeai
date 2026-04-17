import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  Image,
  Text,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { VisionShareStackParamList } from '../../navigation/types';
import { PhotoEditor, EditablePhoto } from '../../components/PhotoEditor/PhotoEditor';
import { PhotoCapture } from '../../components/Camera/VisionShareCamera';
import { photoUploader } from '../../services/upload/photoUploader';

type PhotoEditScreenNavigationProp = NativeStackNavigationProp<
  VisionShareStackParamList,
  'PhotoEdit'
>;

type PhotoEditScreenRouteProp = RouteProp<VisionShareStackParamList, 'PhotoEdit'>;

export const PhotoEditScreen: React.FC = () => {
  const navigation = useNavigation<PhotoEditScreenNavigationProp>();
  const route = useRoute<PhotoEditScreenRouteProp>();
  const { photos: initialPhotos, taskId, fromScreen } = route.params || {};

  const [photos, setPhotos] = useState<EditablePhoto[]>(
    initialPhotos.map((p: PhotoCapture, index: number) => ({
      uri: p.uri,
      id: `photo-${index}-${Date.now()}`,
    }))
  );
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(
    photos[0]?.id || null
  );
  const [editingPhoto, setEditingPhoto] = useState<EditablePhoto | null>(null);
  const [uploading, setUploading] = useState(false);

  const selectedPhoto = photos.find((p) => p.id === selectedPhotoId);

  const handlePhotoSelect = useCallback((photoId: string) => {
    setSelectedPhotoId(photoId);
  }, []);

  const handleEditPhoto = useCallback((photo: EditablePhoto) => {
    setEditingPhoto(photo);
  }, []);

  const handleSaveEdit = useCallback((editedPhoto: EditablePhoto) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === editedPhoto.id ? editedPhoto : p))
    );
    setEditingPhoto(null);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingPhoto(null);
  }, []);

  const handleRemovePhoto = useCallback((photoId: string) => {
    Alert.alert(
      '删除照片',
      '确定要删除这张照片吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            setPhotos((prev) => prev.filter((p) => p.id !== photoId));
            if (selectedPhotoId === photoId) {
              setSelectedPhotoId(null);
            }
          },
        },
      ]
    );
  }, [selectedPhotoId]);

  const handleUpload = useCallback(async () => {
    if (photos.length === 0) {
      Alert.alert('提示', '请先选择照片');
      return;
    }

    try {
      setUploading(true);

      // Perform security checks first
      const securityResults = await Promise.all(
        photos.map((photo) => photoUploader.checkSecurity(photo.uri))
      );

      const failedChecks = securityResults.filter((r) => !r.passed);
      if (failedChecks.length > 0) {
        Alert.alert(
          '安全检查未通过',
          `有 ${failedChecks.length} 张照片未通过安全检查，请检查后重试。`
        );
        return;
      }

      // Upload photos
      const uploadResults = await photoUploader.uploadBatch(
        photos.map((p) => p.uri),
        {
          taskId,
          onProgress: (progress) => {
            console.log('Upload progress:', progress);
          },
        }
      );

      Alert.alert('上传成功', `成功上传 ${uploadResults.length} 张照片`, [
        {
          text: '确定',
          onPress: () => {
            navigation.navigate(fromScreen || 'TaskDetail', { taskId });
          },
        },
      ]);
    } catch (error) {
      Alert.alert('上传失败', '请检查网络连接后重试');
    } finally {
      setUploading(false);
    }
  }, [photos, taskId, fromScreen, navigation]);

  const handleAddMore = useCallback(() => {
    navigation.navigate('Camera', { taskId, fromScreen });
  }, [navigation, taskId, fromScreen]);

  if (editingPhoto) {
    return (
      <PhotoEditor
        photo={editingPhoto}
        onSave={handleSaveEdit}
        onCancel={handleCancelEdit}
      />
    );
  }

  const renderPhotoItem = ({ item }: { item: EditablePhoto }) => (
    <TouchableOpacity
      style={[
        styles.photoItem,
        selectedPhotoId === item.id && styles.selectedPhotoItem,
      ]}
      onPress={() => handlePhotoSelect(item.id)}
      onLongPress={() => handleEditPhoto(item)}
    >
      <Image source={{ uri: item.uri }} style={styles.photoThumbnail} />
      {selectedPhotoId === item.id && (
        <View style={styles.selectedIndicator}>
          <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
        </View>
      )}
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemovePhoto(item.id)}
      >
        <Ionicons name="close-circle" size={24} color="#FF4444" />
      </TouchableOpacity>
      {(item.annotations?.length || 0) > 0 && (
        <View style={styles.annotationBadge}>
          <Ionicons name="create" size={12} color="white" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>照片预览 ({photos.length})</Text>
        <TouchableOpacity onPress={handleAddMore}>
          <Ionicons name="camera" size={28} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Selected Photo Preview */}
      {selectedPhoto ? (
        <View style={styles.previewContainer}>
          <Image
            source={{ uri: selectedPhoto.uri }}
            style={styles.previewImage}
            resizeMode="contain"
          />
          <View style={styles.previewActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEditPhoto(selectedPhoto)}
            >
              <Ionicons name="create" size={24} color="white" />
              <Text style={styles.actionButtonText}>编辑</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.emptyPreview}>
          <Text style={styles.emptyText}>请选择或拍摄照片</Text>
        </View>
      )}

      {/* Photo List */}
      <View style={styles.photoListContainer}>
        <FlatList
          data={photos}
          renderItem={renderPhotoItem}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photoList}
          ListFooterComponent={
            <TouchableOpacity style={styles.addButton} onPress={handleAddMore}>
              <Ionicons name="add" size={32} color="#007AFF" />
            </TouchableOpacity>
          }
        />
      </View>

      {/* Upload Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.uploadButton, uploading && styles.uploadingButton]}
          onPress={handleUpload}
          disabled={uploading || photos.length === 0}
        >
          <Text style={styles.uploadButtonText}>
            {uploading ? '上传中...' : `上传 ${photos.length} 张照片`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
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
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewActions: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
  },
  actionButton: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
  },
  emptyPreview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  photoListContainer: {
    backgroundColor: 'white',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  photoList: {
    paddingHorizontal: 12,
  },
  photoItem: {
    width: 80,
    height: 80,
    marginHorizontal: 4,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  selectedPhotoItem: {
    borderColor: '#007AFF',
  },
  photoThumbnail: {
    width: '100%',
    height: '100%',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  annotationBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 4,
  },
  addButton: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginLeft: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  footer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  uploadButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  uploadingButton: {
    backgroundColor: '#999',
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PhotoEditScreen;
