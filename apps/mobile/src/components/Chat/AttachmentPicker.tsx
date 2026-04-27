import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  Platform,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

import { theme } from '../../theme';

export interface AttachmentData {
  type: 'image' | 'file';
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
}

export interface AttachmentPickerProps {
  visible: boolean;
  onClose: () => void;
  onSend: (attachment: AttachmentData) => void;
}

type PickerStep = 'menu' | 'preview' | 'uploading';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export const AttachmentPicker: React.FC<AttachmentPickerProps> = ({ visible, onClose, onSend }) => {
  const [step, setStep] = useState<PickerStep>('menu');
  const [attachment, setAttachment] = useState<AttachmentData | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setStep('menu');
    setAttachment(null);
    setUploadProgress(0);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const handlePickImage = useCallback(async () => {
    try {
      setError(null);
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        setError('需要相册访问权限才能选择图片');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      if (!asset) {
        return;
      }

      const fileName = asset.fileName || asset.uri.split('/').pop() || 'image.jpg';
      const newAttachment: AttachmentData = {
        type: 'image',
        uri: asset.uri,
        name: fileName,
        mimeType: asset.mimeType || 'image/jpeg',
        size: asset.fileSize,
      };

      setAttachment(newAttachment);
      setStep('preview');
    } catch {
      setError('选择图片失败，请重试');
    }
  }, []);

  const handlePickFile = useCallback(async () => {
    try {
      setError(null);
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const pickedFile = result.assets[0];
      if (!pickedFile) {
        return;
      }

      const newAttachment: AttachmentData = {
        type: 'file',
        uri: pickedFile.uri,
        name: pickedFile.name,
        mimeType: pickedFile.mimeType,
        size: pickedFile.size,
      };

      setAttachment(newAttachment);
      setStep('preview');
    } catch {
      setError('选择文件失败，请重试');
    }
  }, []);

  const handleSend = useCallback(async () => {
    if (!attachment) return;

    setStep('uploading');
    setUploadProgress(0);
    setError(null);

    // Upload endpoint — replace with your actual API endpoint.
    const uploadUrl = 'https://api.example.com/api/upload';

    return new Promise<void>((resolve, _reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', event => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Upload succeeded. onSend is called with the local attachment data.
          // If the server returns a URL or file ID, merge it here.
          onSend(attachment);
          handleClose();
          resolve();
        } else {
          setError(`上传失败 (${xhr.status})`);
          setStep('preview');
          resolve();
        }
      });

      xhr.addEventListener('error', () => {
        setError('上传失败，请检查网络连接');
        setStep('preview');
        resolve();
      });

      xhr.addEventListener('abort', () => {
        setError('上传已取消');
        setStep('preview');
        resolve();
      });

      xhr.open('POST', uploadUrl);
      xhr.setRequestHeader('Accept', 'application/json');

      const formData = new FormData();
      formData.append('file', {
        uri: attachment.uri,
        name: attachment.name,
        type: attachment.mimeType || 'application/octet-stream',
      } as unknown as Blob);

      xhr.send(formData);
    });
  }, [attachment, onSend, handleClose]);

  const handleCancelUpload = useCallback(() => {
    handleClose();
  }, [handleClose]);

  const getFileName = useCallback((att: AttachmentData) => {
    return att.name || att.uri.split('/').pop() || 'unknown';
  }, []);

  const formatFileSize = useCallback((bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, []);

  const renderMenu = () => (
    <View style={styles.sheetContent}>
      <View style={styles.handleBar} />
      <Text style={styles.sheetTitle}>选择附件</Text>

      <TouchableOpacity
        style={styles.menuItem}
        onPress={handlePickImage}
        testID="pick-image-button"
      >
        <Text style={styles.menuIcon}>🖼️</Text>
        <View style={styles.menuTextContainer}>
          <Text style={styles.menuLabel}>选择图片</Text>
          <Text style={styles.menuDescription}>从相册中选择图片</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem} onPress={handlePickFile} testID="pick-file-button">
        <Text style={styles.menuIcon}>📄</Text>
        <View style={styles.menuTextContainer}>
          <Text style={styles.menuLabel}>选择文件</Text>
          <Text style={styles.menuDescription}>从文件中选择文档</Text>
        </View>
      </TouchableOpacity>

      {error && (
        <Text style={styles.errorText} testID="attachment-error">
          {error}
        </Text>
      )}

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={handleClose}
        testID="attachment-cancel-button"
      >
        <Text style={styles.cancelButtonText}>取消</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPreview = () => {
    if (!attachment) return null;

    return (
      <View style={styles.sheetContent}>
        <View style={styles.handleBar} />
        <Text style={styles.sheetTitle}>附件预览</Text>

        <View style={styles.previewContainer}>
          {attachment.type === 'image' ? (
            <Image
              source={{ uri: attachment.uri }}
              style={styles.previewImage}
              resizeMode="contain"
              testID="attachment-image-preview"
            />
          ) : (
            <View style={styles.filePreview} testID="attachment-file-preview">
              <Text style={styles.fileIcon}>📄</Text>
              <Text style={styles.fileName} numberOfLines={2}>
                {getFileName(attachment)}
              </Text>
            </View>
          )}

          <View style={styles.previewInfo}>
            <Text style={styles.previewName} numberOfLines={1}>
              {getFileName(attachment)}
            </Text>
            {attachment.size ? (
              <Text style={styles.previewSize}>{formatFileSize(attachment.size)}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.previewActions}>
          <TouchableOpacity
            style={styles.previewCancelButton}
            onPress={resetState}
            testID="preview-back-button"
          >
            <Text style={styles.previewCancelText}>重新选择</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSend}
            testID="preview-send-button"
          >
            <Text style={styles.sendButtonText}>发送</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
          <Text style={styles.cancelButtonText}>取消</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderUploading = () => (
    <View style={styles.sheetContent}>
      <View style={styles.handleBar} />
      <Text style={styles.sheetTitle}>正在发送</Text>

      <View style={styles.uploadingContainer}>
        {attachment?.type === 'image' ? (
          <Image
            source={{ uri: attachment.uri }}
            style={styles.uploadingThumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.uploadingFileIcon}>
            <Text style={styles.fileIcon}>📄</Text>
          </View>
        )}

        <View style={styles.uploadingInfo}>
          <Text style={styles.uploadingName} numberOfLines={1}>
            {attachment ? getFileName(attachment) : ''}
          </Text>

          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${uploadProgress}%` }]}
                testID="upload-progress-bar"
              />
            </View>
            <Text style={styles.progressText} testID="upload-progress-text">
              {uploadProgress}%
            </Text>
          </View>

          <ActivityIndicator
            size="small"
            color={theme.colors.primary}
            style={styles.activityIndicator}
          />
        </View>
      </View>

      <TouchableOpacity
        style={styles.cancelUploadButton}
        onPress={handleCancelUpload}
        testID="cancel-upload-button"
      >
        <Text style={styles.cancelUploadText}>取消发送</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      testID="attachment-picker-modal"
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.overlayTouchable} activeOpacity={1} onPress={handleClose} />
        <View style={styles.sheet}>
          {step === 'menu' && renderMenu()}
          {step === 'preview' && renderPreview()}
          {step === 'uploading' && renderUploading()}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: theme.colors.overlay,
  },
  overlayTouchable: {
    flex: 1,
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: SCREEN_HEIGHT * 0.7,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  sheetContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  handleBar: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: theme.colors.backgroundTertiary,
    alignSelf: 'center',
    marginBottom: theme.spacing.md,
  },
  sheetTitle: {
    fontSize: theme.fonts.sizes.md,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.backgroundSecondary,
    marginBottom: theme.spacing.sm,
  },
  menuIcon: {
    fontSize: 28,
    marginRight: theme.spacing.md,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuLabel: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.medium,
    color: theme.colors.text,
  },
  menuDescription: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  errorText: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.error,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  cancelButton: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  cancelButtonText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textSecondary,
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  filePreview: {
    width: '100%',
    height: 120,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  fileIcon: {
    fontSize: 40,
    marginBottom: theme.spacing.sm,
  },
  fileName: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  previewInfo: {
    width: '100%',
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  previewName: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.medium,
    color: theme.colors.text,
  },
  previewSize: {
    fontSize: theme.fonts.sizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  previewActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  previewCancelButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
  },
  previewCancelText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textSecondary,
  },
  sendButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  sendButtonText: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textInverse,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  uploadingThumbnail: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.backgroundTertiary,
  },
  uploadingFileIcon: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.backgroundTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  uploadingName: {
    fontSize: theme.fonts.sizes.sm,
    fontWeight: theme.fonts.weights.medium,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.backgroundTertiary,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
  },
  progressText: {
    fontSize: theme.fonts.sizes.xs,
    fontWeight: theme.fonts.weights.medium,
    color: theme.colors.textSecondary,
    minWidth: 36,
    textAlign: 'right',
  },
  activityIndicator: {
    marginTop: theme.spacing.sm,
    alignSelf: 'flex-start',
  },
  cancelUploadButton: {
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
  },
  cancelUploadText: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.error,
    fontWeight: theme.fonts.weights.medium,
  },
});

export default AttachmentPicker;
