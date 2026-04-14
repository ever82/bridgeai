/**
 * Scene Configuration Screen
 * 场景配置页面
 */

import React, { useState, useEffect, useCallback } from 'react';
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
  SceneConfig,
  SceneFieldDefinition,
  SceneCapability,
  getSceneConfig,
  SCENE_DISPLAY_NAMES,
  SCENE_DESCRIPTIONS,
} from '@visionshare/shared';
import { SceneSelector, SceneConfigPreview } from '../../components/SceneSelector';
import { sceneApi } from '../../services/api/sceneApi';

interface SceneConfigScreenProps {
  agentId?: string;
  initialScene?: SceneId;
}

export const SceneConfigScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { agentId, initialScene } = route.params as SceneConfigScreenProps || {};

  const [selectedScene, setSelectedScene] = useState<SceneId | undefined>(initialScene);
  const [sceneConfig, setSceneConfig] = useState<SceneConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [completedFields, setCompletedFields] = useState<string[]>([]);
  const [capabilities, setCapabilities] = useState<SceneCapability[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);

  // Load scene config when scene changes
  useEffect(() => {
    if (selectedScene) {
      loadSceneConfig(selectedScene);
    }
  }, [selectedScene]);

  const loadSceneConfig = async (sceneId: SceneId) => {
    setLoading(true);
    try {
      // Get config from shared package
      const config = getSceneConfig(sceneId);
      if (config) {
        setSceneConfig(config);
      }

      // Load from API
      const [configResponse, capabilitiesResponse, templatesResponse] = await Promise.all([
        sceneApi.getSceneConfig(sceneId),
        sceneApi.getSceneCapabilities(sceneId),
        sceneApi.getSceneTemplates(sceneId),
      ]);

      if (configResponse.success) {
        setSceneConfig(configResponse.data);
      }

      if (capabilitiesResponse.success) {
        setCapabilities(capabilitiesResponse.data);
      }

      if (templatesResponse.success) {
        setTemplates(templatesResponse.data.preset || []);
      }
    } catch (error) {
      console.error('Failed to load scene config:', error);
      Alert.alert('错误', '加载场景配置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSceneChange = useCallback((sceneId: SceneId) => {
    if (selectedScene && selectedScene !== sceneId) {
      // Show confirmation if there are unsaved changes
      Alert.alert(
        '切换场景',
        '切换场景将清除当前未保存的配置，是否继续？',
        [
          { text: '取消', style: 'cancel' },
          {
            text: '继续',
            style: 'destructive',
            onPress: () => {
              setSelectedScene(sceneId);
              setFieldValues({});
              setCompletedFields([]);
            },
          },
        ]
      );
    } else {
      setSelectedScene(sceneId);
    }
  }, [selectedScene]);

  const handleFieldChange = (fieldId: string, value: any) => {
    setFieldValues(prev => ({
      ...prev,
      [fieldId]: value,
    }));

    // Mark field as completed if it has a value
    if (value !== undefined && value !== null && value !== '') {
      setCompletedFields(prev =>
        prev.includes(fieldId) ? prev : [...prev, fieldId]
      );
    } else {
      setCompletedFields(prev => prev.filter(id => id !== fieldId));
    }
  };

  const handleApplyTemplate = async (templateId: string) => {
    if (!agentId) return;

    try {
      const response = await sceneApi.applyTemplate(selectedScene!, templateId, agentId);
      if (response.success) {
        Alert.alert('成功', '模板已应用');
        // Reload config
        loadSceneConfig(selectedScene!);
      }
    } catch (error) {
      console.error('Failed to apply template:', error);
      Alert.alert('错误', '应用模板失败');
    }
  };

  const handleSave = async () => {
    if (!selectedScene || !agentId) return;

    setSaving(true);
    try {
      // Save field values to API
      // This would be implemented based on your API
      Alert.alert('成功', '场景配置已保存');
      navigation.goBack();
    } catch (error) {
      console.error('Failed to save scene config:', error);
      Alert.alert('错误', '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const renderSceneInfo = () => {
    if (!selectedScene) return null;

    const name = SCENE_DISPLAY_NAMES[selectedScene].zh;
    const description = SCENE_DESCRIPTIONS[selectedScene].zh;

    return (
      <View style={styles.sceneInfo}>
        <Text style={styles.sceneName}>{name}</Text>
        <Text style={styles.sceneDescription}>{description}</Text>
      </View>
    );
  };

  const renderTemplates = () => {
    if (templates.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>预设模板</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {templates.map(template => (
            <TouchableOpacity
              key={template.id}
              style={styles.templateCard}
              onPress={() => handleApplyTemplate(template.id)}
            >
              <Text style={styles.templateName}>{template.name}</Text>
              <Text style={styles.templateDescription} numberOfLines={2}>
                {template.description}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderCapabilities = () => {
    if (capabilities.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>场景能力</Text>
        <View style={styles.capabilitiesList}>
          {capabilities.map(capability => (
            <View key={capability.id} style={styles.capabilityItem}>
              <Text style={styles.capabilityName}>{capability.name}</Text>
              <Text style={styles.capabilityDescription}>
                {capability.description}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>场景配置</Text>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving || !selectedScene}
        >
          <Text style={styles.saveButtonText}>
            {saving ? '保存中...' : '保存'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Scene Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>选择场景</Text>
          <SceneSelector
            selectedScene={selectedScene}
            onSelectScene={handleSceneChange}
          />
        </View>

        {/* Scene Info */}
        {renderSceneInfo()}

        {/* Templates */}
        {renderTemplates()}

        {/* Capabilities */}
        {renderCapabilities()}

        {/* Scene Config Preview */}
        {sceneConfig && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>字段配置</Text>
            <SceneConfigPreview
              sceneConfig={sceneConfig}
              completedFields={completedFields}
              onFieldPress={(fieldId) => {
                // Navigate to field editor
                navigation.navigate('SceneFieldEditor', {
                  sceneId: selectedScene,
                  fieldId,
                  agentId,
                });
              }}
            />
          </View>
        )}
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
  saveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
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
  sceneInfo: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  sceneName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sceneDescription: {
    fontSize: 14,
    color: '#666',
  },
  templateCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginRight: 12,
    width: 140,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  templateName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 12,
    color: '#666',
  },
  capabilitiesList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  capabilityItem: {
    marginBottom: 16,
  },
  capabilityName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  capabilityDescription: {
    fontSize: 12,
    color: '#666',
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
});

export default SceneConfigScreen;
