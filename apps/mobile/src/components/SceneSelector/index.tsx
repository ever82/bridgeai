import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated,
} from 'react-native';
import {
  SceneConfig,
  SceneId,
  SCENE_IDS,
  SceneSection,
  SCENE_DISPLAY_NAMES,
  SCENE_DESCRIPTIONS,
} from '@visionshare/shared';

interface SceneSelectorProps {
  selectedScene?: SceneId;
  onSelectScene: (sceneId: SceneId) => void;
  disabled?: boolean;
}

interface SceneCardProps {
  sceneId: SceneId;
  isSelected: boolean;
  onPress: () => void;
}

const SCENE_COLORS: Record<SceneId, string> = {
  visionshare: '#9C27B0',
  agentdate: '#E91E63',
  agentjob: '#2196F3',
  agentad: '#FF9800',
};

const SCENE_ICONS: Record<SceneId, string> = {
  visionshare: '🎨',
  agentdate: '💕',
  agentjob: '💼',
  agentad: '📢',
};

const SceneCard: React.FC<SceneCardProps> = ({ sceneId, isSelected, onPress }) => {
  const color = SCENE_COLORS[sceneId];
  const icon = SCENE_ICONS[sceneId];
  const name = SCENE_DISPLAY_NAMES[sceneId].zh;
  const description = SCENE_DESCRIPTIONS[sceneId].zh;

  return (
    <TouchableOpacity
      style={[
        styles.sceneCard,
        isSelected && { borderColor: color, backgroundColor: color + '10' },
      ]}
      onPress={onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: color }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.sceneInfo}>
        <Text style={[styles.sceneName, isSelected && { color }]}>{name}</Text>
        <Text style={styles.sceneDescription} numberOfLines={2}>
          {description}
        </Text>
      </View>
      {isSelected && (
        <View style={[styles.checkmark, { backgroundColor: color }]}>
          <Text style={styles.checkmarkText}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export const SceneSelector: React.FC<SceneSelectorProps> = ({
  selectedScene,
  onSelectScene,
  disabled = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelect = useCallback((sceneId: SceneId) => {
    onSelectScene(sceneId);
    setModalVisible(false);
  }, [onSelectScene]);

  const getSelectedSceneInfo = () => {
    if (!selectedScene) return null;
    return {
      id: selectedScene,
      name: SCENE_DISPLAY_NAMES[selectedScene].zh,
      icon: SCENE_ICONS[selectedScene],
      color: SCENE_COLORS[selectedScene],
    };
  };

  const selectedInfo = getSelectedSceneInfo();

  return (
    <>
      {/* Selected Scene Display */}
      <TouchableOpacity
        style={[styles.selector, disabled && styles.disabled]}
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
      >
        {selectedInfo ? (
          <View style={styles.selectedContainer}>
            <View
              style={[
                styles.selectedIcon,
                { backgroundColor: selectedInfo.color },
              ]}
            >
              <Text style={styles.selectedIconText}>{selectedInfo.icon}</Text>
            </View>
            <View style={styles.selectedInfo}>
              <Text style={styles.selectedLabel}>当前场景</Text>
              <Text style={styles.selectedName}>{selectedInfo.name}</Text>
            </View>
            <Text style={styles.changeText}>切换 ▼</Text>
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderText}>选择场景</Text>
            <Text style={styles.placeholderArrow}>▼</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Scene Selection Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>选择场景</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              选择适合你需求的场景类型
            </Text>

            <ScrollView style={styles.scenesList}>
              {SCENE_IDS.map((sceneId) => (
                <SceneCard
                  key={sceneId}
                  sceneId={sceneId}
                  isSelected={selectedScene === sceneId}
                  onPress={() => handleSelect(sceneId)}
                />
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

interface SceneConfigPreviewProps {
  sceneConfig: SceneConfig;
  onFieldPress?: (fieldId: string) => void;
  completedFields?: string[];
}

export const SceneConfigPreview: React.FC<SceneConfigPreviewProps> = ({
  sceneConfig,
  onFieldPress,
  completedFields = [],
}) => {
  const { metadata, fields, ui } = sceneConfig;

  const renderSection = (section: SceneSection) => {
    const sectionFields = fields.filter((f) =>
      section.fields.includes(f.name)
    );

    return (
      <View key={section.id} style={styles.section}>
        <View style={styles.sectionHeader}>
          {section.icon && <Text style={styles.sectionIcon}>{section.icon}</Text>}
          <Text style={styles.sectionTitle}>{section.title}</Text>
        </View>
        {section.description && (
          <Text style={styles.sectionDescription}>{section.description}</Text>
        )}
        <View style={styles.fieldsList}>
          {sectionFields.map((field) => {
            const isCompleted = completedFields.includes(field.name);
            return (
              <TouchableOpacity
                key={field.id}
                style={[
                  styles.fieldItem,
                  isCompleted && styles.fieldItemCompleted,
                ]}
                onPress={() => onFieldPress?.(field.id)}
              >
                <View style={styles.fieldHeader}>
                  <Text style={styles.fieldLabel}>
                    {field.label}
                    {field.required && (
                      <Text style={styles.requiredMark}> *</Text>
                    )}
                  </Text>
                  {isCompleted && (
                    <Text style={styles.completedMark}>✓</Text>
                  )}
                </View>
                {field.description && (
                  <Text style={styles.fieldDescription}>
                    {field.description}
                  </Text>
                )}
                <Text style={styles.fieldType}>{getFieldTypeLabel(field.type)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.previewContainer}>
      {/* Scene Header */}
      <View
        style={[
          styles.previewHeader,
          { backgroundColor: metadata.color + '15' },
        ]}
      >
        <Text style={styles.previewIcon}>{metadata.icon}</Text>
        <Text style={styles.previewName}>{metadata.name}</Text>
        <Text style={styles.previewDescription}>{metadata.description}</Text>
      </View>

      {/* Sections */}
      <View style={styles.sectionsContainer}>
        {ui.sections.map(renderSection)}
      </View>
    </ScrollView>
  );
};

function getFieldTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    text: '文本',
    textarea: '多行文本',
    number: '数字',
    boolean: '是/否',
    select: '单选',
    multiselect: '多选',
    date: '日期',
    datetime: '日期时间',
    time: '时间',
    location: '位置',
    range: '范围',
    image: '图片',
    file: '文件',
    url: '链接',
    email: '邮箱',
    phone: '电话',
    tags: '标签',
  };
  return labels[type] || type;
}

const styles = StyleSheet.create({
  selector: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  disabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#d0d0d0',
  },
  selectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  selectedIconText: {
    fontSize: 24,
  },
  selectedInfo: {
    flex: 1,
  },
  selectedLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  selectedName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  changeText: {
    fontSize: 14,
    color: '#007AFF',
  },
  placeholderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
  },
  placeholderArrow: {
    fontSize: 14,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#999',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  scenesList: {
    maxHeight: 400,
  },
  sceneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  sceneInfo: {
    flex: 1,
  },
  sceneName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  sceneDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  previewContainer: {
    flex: 1,
  },
  previewHeader: {
    padding: 20,
    alignItems: 'center',
  },
  previewIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  previewName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  previewDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  sectionsContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  sectionDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  fieldsList: {
    gap: 8,
  },
  fieldItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#e0e0e0',
  },
  fieldItemCompleted: {
    borderLeftColor: '#4CAF50',
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  requiredMark: {
    color: '#FF5722',
  },
  completedMark: {
    fontSize: 14,
    color: '#4CAF50',
  },
  fieldDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  fieldType: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
});

export default SceneSelector;
