/**
 * Decision Buttons Component
 * 用户决策按钮组件
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface DecisionButtonsProps {
  onAccept: () => void;
  onDecline: () => void;
  loading?: boolean;
}

const DecisionButtons: React.FC<DecisionButtonsProps> = ({
  onAccept,
  onDecline,
  loading = false,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, styles.acceptButton, loading && styles.disabledButton]}
        onPress={onAccept}
        disabled={loading}
      >
        <Text style={styles.acceptButtonText}>接受匹配</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.declineButton, loading && styles.disabledButton]}
        onPress={onDecline}
        disabled={loading}
      >
        <Text style={styles.declineButtonText}>暂时不感兴趣</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingVertical: 8, gap: 12 },
  button: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  acceptButton: { backgroundColor: '#FF6B6B' },
  acceptButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  declineButton: { backgroundColor: '#F5F5F5' },
  declineButtonText: { color: '#666', fontSize: 16 },
  reportButton: { paddingVertical: 8, alignItems: 'center' },
  reportButtonText: { color: '#999', fontSize: 13 },
  disabledButton: { opacity: 0.5 },
});

export default DecisionButtons;
