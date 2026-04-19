import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { Modal } from '../../components/Modal/Modal';
import { theme } from '../../theme';

interface DeleteConfirmDialogProps {
  visible: boolean;
  conversationName: string;
  onCancel: () => void;
  onConfirm: () => void;
  testID?: string;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  visible,
  conversationName,
  onCancel,
  onConfirm,
  testID,
}) => {
  return (
    <Modal
      visible={visible}
      onClose={onCancel}
      animationType="scale"
      size="sm"
      showCloseButton={false}
      closeOnBackdropPress={false}
      testID={testID}
    >
      <View style={styles.container}>
        <Text style={styles.title}>删除会话</Text>
        <Text style={styles.message}>
          确定删除与<Text style={styles.highlight}>{conversationName}</Text>
          的会话吗？
        </Text>
        <Text style={styles.warning}>删除后聊天记录将无法恢复</Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onCancel}
            activeOpacity={0.8}
            testID={`${testID}-cancel`}
          >
            <Text style={styles.cancelText}>取消</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            onPress={onConfirm}
            activeOpacity={0.8}
            testID={`${testID}-confirm`}
          >
            <Text style={styles.deleteText}>删除</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: theme.fonts.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.base,
  },
  message: {
    fontSize: theme.fonts.sizes.base,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  highlight: {
    color: theme.colors.text,
    fontWeight: theme.fonts.weights.semibold,
  },
  warning: {
    fontSize: theme.fonts.sizes.sm,
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.base,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: theme.colors.backgroundSecondary,
  },
  cancelText: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.text,
  },
  deleteButton: {
    backgroundColor: theme.colors.error,
  },
  deleteText: {
    fontSize: theme.fonts.sizes.base,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textInverse,
  },
});

export default DeleteConfirmDialog;
