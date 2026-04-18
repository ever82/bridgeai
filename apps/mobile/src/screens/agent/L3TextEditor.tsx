import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';

interface L3TextEditorProps {
  initialText?: string;
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  onChangeText?: (text: string) => void;
  onAutoSave?: (text: string) => void;
  autoSaveInterval?: number;
  loading?: boolean;
}

export const L3TextEditor: React.FC<L3TextEditorProps> = ({
  initialText = '',
  placeholder = '请用自然语言描述您的需求或供给...',
  minLength = 50,
  maxLength = 2000,
  onChangeText,
  onAutoSave,
  autoSaveInterval = 3000,
  loading = false,
}) => {
  const [text, setText] = useState(initialText);
  const [charCount, setCharCount] = useState(initialText.length);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showTips, setShowTips] = useState(true);

  // Auto-save effect
  useEffect(() => {
    if (!onAutoSave || text === initialText) return;

    const timer = setTimeout(() => {
      handleAutoSave();
    }, autoSaveInterval);

    return () => clearTimeout(timer);
  }, [text, autoSaveInterval, onAutoSave]);

  const handleAutoSave = useCallback(async () => {
    if (!onAutoSave || text.trim().length === 0) return;

    setIsSaving(true);
    try {
      await onAutoSave(text);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [text, onAutoSave]);

  const handleChange = useCallback(
    (newText: string) => {
      if (newText.length <= maxLength) {
        setText(newText);
        setCharCount(newText.length);
        onChangeText?.(newText);
      }
    },
    [maxLength, onChangeText]
  );

  const getProgressColor = () => {
    const ratio = charCount / minLength;
    if (ratio >= 1) return '#4CAF50';
    if (ratio >= 0.5) return '#FFC107';
    return '#FF5722';
  };

  const getProgressPercentage = () => {
    return Math.min((charCount / minLength) * 100, 100);
  };

  const getSuggestion = () => {
    if (charCount === 0) {
      return '开始输入您的描述...';
    } else if (charCount < minLength * 0.3) {
      return '继续描述，让AI更好地理解您的需求';
    } else if (charCount < minLength * 0.6) {
      return '描述得很好，再详细一些会更好';
    } else if (charCount < minLength) {
      return '快要完成了，再补充一些细节';
    } else {
      return '描述很详细！AI可以很好地理解您的需求';
    }
  };

  const handleClear = () => {
    Alert.alert('确认清除', '确定要清除所有内容吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '清除',
        style: 'destructive',
        onPress: () => {
          setText('');
          setCharCount(0);
          onChangeText?.('');
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${getProgressPercentage()}%`,
                backgroundColor: getProgressColor(),
              },
            ]}
          />
        </View>
        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>
            {charCount} / {minLength} 字符
          </Text>
          {charCount >= minLength && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </View>

      {/* Tips */}
      {showTips && (
        <View style={styles.tipsContainer}>
          <TouchableOpacity style={styles.tipsClose} onPress={() => setShowTips(false)}>
            <Text style={styles.tipsCloseText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.tipsTitle}>💡 写作提示</Text>
          <Text style={styles.tipsText}>
            • 描述您的具体需求或供给{'\n'}• 说明您期望的结果{'\n'}• 提及您的偏好和限制{'\n'}•
            可以举例说明
          </Text>
        </View>
      )}

      {/* Text Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          multiline
          value={text}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor="#999"
          textAlignVertical="top"
          maxLength={maxLength}
          editable={!loading}
        />

        {/* Character Count */}
        <View style={styles.charCountContainer}>
          <Text style={[styles.charCount, charCount > maxLength * 0.9 && styles.charCountWarning]}>
            {charCount} / {maxLength}
          </Text>
        </View>
      </View>

      {/* Suggestion */}
      <Text style={[styles.suggestion, { color: getProgressColor() }]}>{getSuggestion()}</Text>

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={handleClear}
          disabled={text.length === 0 || loading}
        >
          <Text
            style={[styles.toolbarButtonText, text.length === 0 && styles.toolbarButtonDisabled]}
          >
            清除
          </Text>
        </TouchableOpacity>

        <View style={styles.saveStatus}>
          {isSaving ? (
            <>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.saveStatusText}>保存中...</Text>
            </>
          ) : lastSaved ? (
            <Text style={styles.saveStatusText}>已保存 {lastSaved.toLocaleTimeString()}</Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={[
            styles.toolbarButton,
            styles.primaryButton,
            charCount < minLength && styles.primaryButtonDisabled,
          ]}
          onPress={handleAutoSave}
          disabled={charCount < minLength || loading}
        >
          <Text style={styles.primaryButtonText}>{loading ? 'AI提炼中...' : '保存并提炼'}</Text>
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
  progressContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
  },
  checkmark: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  tipsContainer: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    margin: 12,
    borderRadius: 8,
  },
  tipsClose: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
  },
  tipsCloseText: {
    fontSize: 16,
    color: '#666',
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 4,
  },
  tipsText: {
    fontSize: 13,
    color: '#424242',
    lineHeight: 20,
  },
  inputContainer: {
    flex: 1,
    margin: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    minHeight: 200,
  },
  charCountContainer: {
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    alignItems: 'flex-end',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
  },
  charCountWarning: {
    color: '#FF5722',
  },
  suggestion: {
    fontSize: 14,
    textAlign: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  toolbarButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  toolbarButtonText: {
    fontSize: 14,
    color: '#666',
  },
  toolbarButtonDisabled: {
    color: '#ccc',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  primaryButtonDisabled: {
    backgroundColor: '#ccc',
  },
  primaryButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  saveStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveStatusText: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
});
