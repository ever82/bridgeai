/**
 * Scene Migration Screen
 * 场景迁移页面
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  SceneId,
  SCENE_DISPLAY_NAMES,
  SCENE_DESCRIPTIONS,
} from '@visionshare/shared';
import { SceneSelector } from '../../components/SceneSelector';
import { sceneApi } from '../../services/api/sceneApi';

interface SceneMigrationScreenProps {
  agentId: string;
  currentScene: SceneId;
}

export const SceneMigrationScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { agentId, currentScene } = route.params as SceneMigrationScreenProps;

  const [targetScene, setTargetScene] = useState<SceneId | undefined>();
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [estimate, setEstimate] = useState<any>(null);

  const handleTargetSceneChange = useCallback(async (sceneId: SceneId) => {
    if (sceneId === currentScene) {
      Alert.alert('提示', '不能迁移到当前场景');
      return;
    }

    setTargetScene(sceneId);
    setPreview(null);
    setEstimate(null);

    // Load estimate
    try {
      const estimateResponse = await sceneApi.estimateMigration(currentScene, sceneId);
      if (estimateResponse.success) {
        setEstimate(estimateResponse.data);
      }
    } catch (error) {
      console.error('Failed to estimate migration:', error);
    }
  }, [currentScene]);

  const handlePreview = async () => {
    if (!targetScene) return;

    setLoading(true);
    try {
      const response = await sceneApi.previewMigration(
        currentScene,
        targetScene,
        agentId
      );

      if (response.success) {
        setPreview(response.data);
      }
    } catch (error) {
      console.error('Failed to preview migration:', error);
      Alert.alert('错误', '预览迁移失败');
    } finally {
      setLoading(false);
    }
  };

  const handleMigrate = async () => {
    if (!targetScene || !preview) return;

    // Show confirmation if data will be lost
    if (preview.willLoseData.length > 0) {
      Alert.alert(
        '确认迁移',
        `迁移后以下字段数据将丢失：${preview.willLoseData.join(', ')}。是否继续？`,
        [
          { text: '取消', style: 'cancel' },
          {
            text: '继续',
            style: 'destructive',
            onPress: executeMigration,
          },
        ]
      );
    } else {
      executeMigration();
    }
  };

  const executeMigration = async () => {
    setMigrating(true);
    try {
      const response = await sceneApi.executeMigration(
        currentScene,
        targetScene!,
        agentId
      );

      if (response.success) {
        Alert.alert(
          '迁移成功',
          `场景迁移已完成！已迁移 ${response.data.migratedFields.length} 个字段。`,
          [
            {
              text: '确定',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Failed to execute migration:', error);
      Alert.alert('错误', '场景迁移失败');
    } finally {
      setMigrating(false);
    }
  };

  const renderCurrentScene = () => (
    <View style={styles.currentSceneCard}>
      <Text style={styles.currentSceneLabel}>当前场景</Text>
      <Text style={styles.currentSceneName}>
        {SCENE_DISPLAY_NAMES[currentScene].zh}
      </Text>
      <Text style={styles.currentSceneDescription}>
        {SCENE_DESCRIPTIONS[currentScene].zh}
      </Text>
    </View>
  );

  const renderTargetSceneSelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>选择目标场景</Text>
      <SceneSelector
        selectedScene={targetScene}
        onSelectScene={handleTargetSceneChange}
      />
    </View>
  );

  const renderEstimate = () => {
    if (!estimate) return null;

    return (
      <View style={styles.estimateCard}>
        <Text style={styles.estimateTitle}>数据迁移预估</Text>
        <View style={styles.estimateRow}>
          <Text style={styles.estimateLabel}>数据丢失风险:</Text>
          <Text
            style={[
              styles.estimateValue,
              estimate.willLoseData ? styles.estimateWarning : styles.estimateSuccess,
            ]}
          >
            {estimate.willLoseData ? '是' : '否'}
          </Text>
        </View>
        {estimate.willLoseData && (
          <>
            <View style={styles.estimateRow}>
              <Text style={styles.estimateLabel}>丢失比例:</Text>
              <Text style={styles.estimateValue}>
                {estimate.lossPercentage.toFixed(1)}%
              </Text>
            </View>
            <View style={styles.estimateRow}>
              <Text style={styles.estimateLabel}>丢失字段:</Text>
              <Text style={styles.estimateValue}>
                {estimate.lostFields.join(', ')}
              </Text>
            </View>
          </>
        )}
        {!estimate.willLoseData && (
          <Text style={styles.estimateSuccess}>✓ 数据可以完整迁移</Text>
        )}
      </View>
    );
  };

  const renderPreview = () => {
    if (!preview) return null;

    return (
      <View style={styles.previewCard}>
        <Text style={styles.previewTitle}>迁移预览</Text>

        {/* Field Mappings */}
        <View style={styles.previewSection}>
          <Text style={styles.previewSectionTitle}>字段映射</Text>
          {preview.migration.fieldMappings.map((mapping: any, index: number) => (
            <View key={index} style={styles.mappingItem}>
              <Text style={styles.mappingSource}>{mapping.sourceField}</Text>
              <Text style={styles.mappingArrow}>→</Text>
              <Text style={styles.mappingTarget}>{mapping.targetField}</Text>
            </View>
          ))}
        </View>

        {/* Warnings */}
        {preview.migration.warnings.length > 0 && (
          <View style={styles.previewSection}>
            <Text style={styles.previewSectionTitle}>⚠️ 警告</Text>
            {preview.migration.warnings.map((warning: string, index: number) => (
              <Text key={index} style={styles.warningText}>
                • {warning}
              </Text>
            ))}
          </View>
        )}

        {/* Data Loss */}
        {preview.willLoseData.length > 0 && (
          <View style={styles.previewSection}>
            <Text style={styles.previewSectionTitle}>🗑️ 将丢失的数据</Text>
            {preview.willLoseData.map((field: string, index: number) => (
              <Text key={index} style={styles.dataLossText}>
                • {field}
              </Text>
            ))}
          </View>
        )}

        {/* Needs Manual Input */}
        {preview.needsManualInput.length > 0 && (
          <View style={styles.previewSection}>
            <Text style={styles.previewSectionTitle}>✏️ 需要手动填写</Text>
            {preview.needsManualInput.map((field: string, index: number) => (
              <Text key={index} style={styles.manualInputText}>
                • {field}
              </Text>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>场景迁移</Text>
        <TouchableOpacity
          style={[styles.migrateButton, (!targetScene || !preview || migrating) && styles.migrateButtonDisabled]}
          onPress={handleMigrate}
          disabled={!targetScene || !preview || migrating}
        >
          <Text style={styles.migrateButtonText}>
            {migrating ? '迁移中...' : '确认迁移'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Current Scene */}
        {renderCurrentScene()}

        {/* Target Scene Selector */}
        {renderTargetSceneSelector()}

        {/* Estimate */}
        {renderEstimate()}

        {/* Preview Button */}
        {targetScene && !preview && (
          <TouchableOpacity
            style={styles.previewButton}
            onPress={handlePreview}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.previewButtonText}>预览迁移</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Preview */}
        {renderPreview()}
      </ScrollView>
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  migrateButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  migrateButtonDisabled: {
    backgroundColor: '#ccc',
  },
  migrateButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  currentSceneCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  currentSceneLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  currentSceneName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  currentSceneDescription: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  estimateCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  estimateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  estimateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  estimateLabel: {
    fontSize: 14,
    color: '#666',
  },
  estimateValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  estimateWarning: {
    color: '#FF5722',
  },
  estimateSuccess: {
    color: '#4CAF50',
  },
  previewButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  previewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  previewCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  previewSection: {
    marginBottom: 16,
  },
  previewSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  mappingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  mappingSource: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  mappingArrow: {
    fontSize: 16,
    color: '#999',
    marginHorizontal: 8,
  },
  mappingTarget: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  warningText: {
    fontSize: 14,
    color: '#FF9800',
    marginBottom: 4,
  },
  dataLossText: {
    fontSize: 14,
    color: '#FF5722',
    marginBottom: 4,
  },
  manualInputText: {
    fontSize: 14,
    color: '#2196F3',
    marginBottom: 4,
  },
});

export default SceneMigrationScreen;
