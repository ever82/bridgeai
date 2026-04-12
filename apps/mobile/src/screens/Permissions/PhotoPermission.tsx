import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  photoLibraryPermission,
  PhotoPermissionState,
  PhotoPermissionStatus,
} from '../../permissions/photoLibrary';

interface PhotoPermissionScreenProps {
  onPermissionGranted?: () => void;
  onCancel?: () => void;
}

export const PhotoPermissionScreen: React.FC<PhotoPermissionScreenProps> = ({
  onPermissionGranted,
  onCancel,
}) => {
  const [permissionState, setPermissionState] = useState<PhotoPermissionState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    checkCurrentPermission();

    const unsubscribe = photoLibraryPermission.subscribe((state) => {
      setPermissionState(state);
      if (state.hasFullAccess || state.hasPartialAccess) {
        onPermissionGranted?.();
      }
    });

    return () => unsubscribe();
  }, []);

  const checkCurrentPermission = async () => {
    const state = await photoLibraryPermission.checkPermission();
    setPermissionState(state);
  };

  const handleRequestPermission = async () => {
    setIsLoading(true);
    try {
      const state = await photoLibraryPermission.requestPermission();
      setPermissionState(state);

      if (state.hasFullAccess || state.hasPartialAccess) {
        onPermissionGranted?.();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  const handleUpgradeToFullAccess = async () => {
    const state = await photoLibraryPermission.requestLimitedAccessUpgrade();
    setPermissionState(state);
  };

  const getStatusContent = () => {
    switch (permissionState?.status) {
      case 'granted':
        return {
          icon: 'check-circle',
          color: '#34C759',
          title: 'Full Access Granted',
          description: 'You have granted full access to your photo library. All features are available.',
        };
      case 'limited':
        return {
          icon: 'photo-library',
          color: '#FF9500',
          title: 'Limited Access',
          description: 'You have granted limited access. Some features may not work with all photos.',
        };
      case 'denied':
        return {
          icon: 'block',
          color: '#FF3B30',
          title: 'Permission Denied',
          description: 'Access was denied. Please enable photo access in Settings to use this feature.',
        };
      case 'blocked':
        return {
          icon: 'settings',
          color: '#8E8E93',
          title: 'Permission Blocked',
          description: 'Access is blocked. Please go to Settings and enable photo library access.',
        };
      default:
        return {
          icon: 'photo-library',
          color: '#007AFF',
          title: 'Photo Library Access',
          description: 'To search your local photos with AI, we need access to your photo library. Your photos will be analyzed on-device and your privacy is protected.',
        };
    }
  };

  const content = getStatusContent();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
          <Icon name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Icon name={content.icon} size={80} color={content.color} />

        <Text style={styles.title}>{content.title}</Text>
        <Text style={styles.description}>{content.description}</Text>

        {permissionState?.status === 'limited' && (
          <View style={styles.limitedAccessContainer}>
            <Text style={styles.limitedAccessText}>
              iOS 14+ allows you to grant access to selected photos only.
              Upgrade to full access to search all your photos.
            </Text>
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={handleUpgradeToFullAccess}
            >
              <Text style={styles.upgradeButtonText}>Upgrade to Full Access</Text>
            </TouchableOpacity>
          </View>
        )}

        {(permissionState?.status === 'denied' || permissionState?.status === 'blocked') && (
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={handleOpenSettings}
          >
            <Icon name="settings" size={20} color="#007AFF" />
            <Text style={styles.settingsButtonText}>Open Settings</Text>
          </TouchableOpacity>
        )}

        {(!permissionState ||
          permissionState.status === 'unavailable' ||
          permissionState.status === 'denied') && (
          <TouchableOpacity
            style={[styles.grantButton, isLoading && styles.grantButtonDisabled]}
            onPress={handleRequestPermission}
            disabled={isLoading}
          >
            {isLoading ? (
              <Text style={styles.grantButtonText}>Requesting...</Text>
            ) : (
              <>
                <Icon name="photo-library" size={20} color="#fff" />
                <Text style={styles.grantButtonText}>Grant Photo Access</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <View style={styles.privacyInfo}>
          <Icon name="security" size={16} color="#34C759" />
          <Text style={styles.privacyText}>
            Your photos are analyzed on-device. They never leave your device without your permission.
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  limitedAccessContainer: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: '100%',
  },
  limitedAccessText: {
    fontSize: 14,
    color: '#8B6914',
    marginBottom: 12,
    textAlign: 'center',
  },
  upgradeButton: {
    backgroundColor: '#FF9500',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
  },
  settingsButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  grantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
  },
  grantButtonDisabled: {
    backgroundColor: '#ccc',
  },
  grantButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  privacyInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 32,
    paddingHorizontal: 16,
  },
  privacyText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
    lineHeight: 18,
  },
});

export default PhotoPermissionScreen;
