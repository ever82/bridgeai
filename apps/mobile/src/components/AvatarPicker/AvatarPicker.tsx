import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Image,
  Text,
  Alert,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

interface AvatarPickerProps {
  value?: string;
  onChange: (uri: string | undefined) => void;
  size?: number;
}

export const AvatarPicker: React.FC<AvatarPickerProps> = ({ value, onChange, size = 100 }) => {
  const [loading, setLoading] = useState(false);

  const requestPermissions = async (): Promise<boolean> => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraPermission.status !== 'granted' || libraryPermission.status !== 'granted') {
      Alert.alert('权限不足', '需要相机和相册权限来选择头像', [{ text: '确定' }]);
      return false;
    }
    return true;
  };

  const showImageOptions = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['取消', '拍照', '从相册选择', value ? '移除头像' : '取消'],
          destructiveButtonIndex: value ? 3 : -1,
          cancelButtonIndex: 0,
        },
        async buttonIndex => {
          if (buttonIndex === 1) {
            await handleTakePhoto();
          } else if (buttonIndex === 2) {
            await handlePickFromGallery();
          } else if (buttonIndex === 3 && value) {
            onChange(undefined);
          }
        }
      );
    } else {
      // Android fallback - simple options
      Alert.alert('选择头像', '', [
        { text: '拍照', onPress: handleTakePhoto },
        { text: '从相册选择', onPress: handlePickFromGallery },
        ...(value
          ? [
              {
                text: '移除头像',
                onPress: () => onChange(undefined),
                style: 'destructive' as const,
              },
            ]
          : []),
        { text: '取消', style: 'cancel' as const },
      ]);
    }
  };

  const handleTakePhoto = async () => {
    try {
      setLoading(true);
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        onChange(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('错误', '无法打开相机');
    } finally {
      setLoading(false);
    }
  };

  const handlePickFromGallery = async () => {
    try {
      setLoading(true);
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        onChange(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('错误', '无法打开相册');
    } finally {
      setLoading(false);
    }
  };

  const avatarSize = size;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.avatarContainer,
          { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
        ]}
        onPress={showImageOptions}
        disabled={loading}
        activeOpacity={0.8}
        testID="avatar-picker-button"
      >
        {value ? (
          <Image
            source={{ uri: value }}
            style={[
              styles.avatar,
              { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
            ]}
            resizeMode="cover"
            testID="avatar-preview"
          />
        ) : (
          <View
            style={[
              styles.placeholder,
              { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
            ]}
          >
            <Ionicons name="camera-outline" size={avatarSize * 0.3} color="#999" />
            <Text style={[styles.placeholderText, { fontSize: avatarSize * 0.1 }]}>添加头像</Text>
          </View>
        )}

        {/* Edit overlay */}
        <View
          style={[
            styles.editOverlay,
            {
              width: avatarSize * 0.35,
              height: avatarSize * 0.35,
              borderRadius: avatarSize * 0.175,
            },
          ]}
        >
          <Ionicons name="pencil" size={avatarSize * 0.15} color="#fff" />
        </View>
      </TouchableOpacity>

      {loading && (
        <View
          style={[
            styles.loadingOverlay,
            { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
          ]}
        >
          <Ionicons name="reload" size={avatarSize * 0.2} color="#666" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
  },
  avatar: {
    backgroundColor: '#f0f0f0',
  },
  placeholder: {
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#999',
    marginTop: 4,
  },
  editOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  loadingOverlay: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AvatarPicker;
