import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Agent,
  AgentType,
  SceneId,
  AGENT_TYPE_LABELS,
  AGENT_TYPE_COLORS,
  CreateAgentRequest,
  UpdateAgentRequest,
} from '@bridgeai/shared';

const AGENT_TYPE_TO_SCENE_ID: Record<string, SceneId> = {
  [AgentType.VISIONSHARE]: 'visionshare',
  [AgentType.AGENTDATE]: 'agentdate',
  [AgentType.AGENTJOB]: 'agentjob',
  [AgentType.AGENTAD]: 'agentad',
};

import { agentsApi } from '../../services/api/agents';
import { ProfileStackParamList } from '../../types/navigation';
import { useAsyncStorage } from '../../hooks/useAsyncStorage';
import { AvatarPicker } from '../../components/AvatarPicker';

import { SceneConfigForm } from './components/SceneConfigForm';
import { AIConfigSection } from './components/AIConfigSection';
import { AgentPreview } from './components/AgentPreview';

// NP-272: AC specifies 4 scene types — exclude DEMAND/SUPPLY from the wizard.
const SCENE_TYPES: AgentType[] = [
  AgentType.VISIONSHARE,
  AgentType.AGENTDATE,
  AgentType.AGENTJOB,
  AgentType.AGENTAD,
];

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList>;
type CreateAgentRouteProp = RouteProp<ProfileStackParamList, 'CreateAgent'>;

interface DraftState {
  name: string;
  description: string;
  avatar: string | undefined;
  selectedType: AgentType | null;
  sceneConfig: Record<string, string | number | boolean>;
  aiConfig: Record<string, string | number | boolean>;
  step: number;
  isPublic: boolean;
}

const DRAFT_KEY = 'create_agent_draft';

export const CreateAgentScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<CreateAgentRouteProp>();
  const editingAgent = route.params?.agent ?? null;
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  // Draft storage
  const {
    value: draft,
    setValue: saveDraft,
    removeValue: clearDraft,
  } = useAsyncStorage<DraftState | null>(DRAFT_KEY, null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatar, setAvatar] = useState<string | undefined>(undefined);
  const [selectedType, setSelectedType] = useState<AgentType | null>(null);
  const [sceneConfig, setSceneConfig] = useState<Record<string, string | number | boolean>>({});
  const [aiConfig, setAiConfig] = useState<Record<string, string | number | boolean>>({});
  const [isPublic, setIsPublic] = useState(true);

  // Restore draft on mount, or pre-fill from editing agent
  useEffect(() => {
    if (editingAgent) {
      setName(editingAgent.name || '');
      setDescription(editingAgent.description || '');
      setAvatar(undefined);
      setSelectedType(editingAgent.type || null);
      setSceneConfig(
        (editingAgent.config?.scene as Record<string, string | number | boolean>) || {}
      );
      setAiConfig((editingAgent.config?.ai as Record<string, string | number | boolean>) || {});
      setIsPublic(editingAgent.isPublic ?? true);
      setStep(1);
    } else if (draft) {
      setName(draft.name);
      setDescription(draft.description);
      setAvatar(draft.avatar);
      setSelectedType(draft.selectedType);
      setSceneConfig(draft.sceneConfig);
      setAiConfig(draft.aiConfig);
      setStep(draft.step);
      if (draft.isPublic !== undefined) {
        setIsPublic(draft.isPublic);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save draft on step change (only in create mode)
  useEffect(() => {
    if (editingAgent) return;
    const draftState: DraftState = {
      name,
      description,
      avatar,
      selectedType,
      sceneConfig,
      aiConfig,
      step,
      isPublic,
    };
    saveDraft(draftState);
  }, [
    step,
    name,
    description,
    avatar,
    selectedType,
    sceneConfig,
    aiConfig,
    saveDraft,
    isPublic,
    editingAgent,
  ]);

  const validateStep1 = useCallback(() => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter an agent name');
      return false;
    }
    if (name.length > 100) {
      Alert.alert('Error', 'Agent name must be less than 100 characters');
      return false;
    }
    return true;
  }, [name]);

  const validateStep2 = useCallback(() => {
    if (!selectedType) {
      Alert.alert('Error', 'Please select an agent type');
      return false;
    }
    return true;
  }, [selectedType]);

  const validateStep3 = useCallback(() => {
    // Validate scene-specific config
    if (selectedType === AgentType.VISIONSHARE && !sceneConfig.range) {
      Alert.alert('Error', 'Please select a range');
      return false;
    }
    return true;
  }, [selectedType, sceneConfig]);

  const handleNext = useCallback(() => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    } else if (step === 3 && validateStep3()) {
      setStep(4);
    } else if (step === 4) {
      setStep(5);
    }
  }, [step, validateStep1, validateStep2, validateStep3]);

  const handleBack = useCallback(() => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      clearDraft();
      navigation.goBack();
    }
  }, [step, navigation, clearDraft]);

  const handleSubmit = useCallback(async () => {
    if (!selectedType) return;

    try {
      setLoading(true);

      if (editingAgent) {
        // Update existing agent
        const updateData: UpdateAgentRequest = {
          name: name.trim(),
          description: description.trim() || undefined,
          avatar: avatar,
          config: {
            scene: sceneConfig,
            ai: aiConfig,
          },
          isPublic: isPublic,
        };

        await agentsApi.updateAgent(editingAgent.id, updateData);

        Alert.alert('成功', 'Agent已更新', [
          {
            text: '确定',
            onPress: () => {
              clearDraft();
              navigation.navigate('AgentList');
            },
          },
        ]);
      } else {
        // Create new agent
        const agentData: CreateAgentRequest = {
          type: selectedType,
          name: name.trim(),
          description: description.trim() || undefined,
          avatar: avatar,
          config: {
            scene: sceneConfig,
            ai: aiConfig,
          },
          isPublic: isPublic,
        };

        await agentsApi.createAgent(agentData);

        // NP-269: Allow user to create multiple agents (one per scene) without
        // architectural changes — addresses the "multi-select scenes" AC.
        Alert.alert('Success', 'Agent创建成功！是否继续创建其他场景的Agent？', [
          {
            text: '完成',
            onPress: () => {
              clearDraft();
              navigation.navigate('AgentList');
            },
          },
          {
            text: '继续创建',
            onPress: () => {
              clearDraft();
              setSelectedType(null);
              setName('');
              setDescription('');
              setAvatar(undefined);
              setSceneConfig({});
              setAiConfig({});
              setStep(2);
              setIsPublic(true);
            },
          },
        ]);
      }
    } catch (err) {
      Alert.alert('Error', (err as Error)?.message || 'Failed to save agent');
    } finally {
      setLoading(false);
    }
  }, [
    selectedType,
    name,
    description,
    sceneConfig,
    aiConfig,
    avatar,
    isPublic,
    clearDraft,
    navigation,
    editingAgent,
  ]);

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Step 1: Basic Information</Text>
      <Text style={styles.stepDescription}>Give your agent a name, description and avatar</Text>

      {/* Avatar Picker */}
      <View style={styles.avatarSection}>
        <Text style={styles.label}>Agent Avatar</Text>
        <AvatarPicker value={avatar} onChange={setAvatar} size={100} />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Agent Name *</Text>
        <TextInput
          style={styles.input}
          testID="create-agent-name-input"
          value={name}
          onChangeText={setName}
          placeholder="Enter agent name"
          placeholderTextColor="#999"
          maxLength={100}
        />
        <Text style={styles.characterCount}>{name.length}/100</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          testID="create-agent-description-input"
          value={description}
          onChangeText={setDescription}
          placeholder="Describe what this agent does..."
          placeholderTextColor="#999"
          multiline
          numberOfLines={4}
          maxLength={500}
        />
        <Text style={styles.characterCount}>{description.length}/500</Text>
      </View>

      {/* Visibility Toggle */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Visibility</Text>
        <View style={styles.visibilityContainer}>
          <TouchableOpacity
            style={[styles.visibilityOption, !isPublic && styles.visibilityOptionSelected]}
            onPress={() => setIsPublic(false)}
            testID="visibility-private"
          >
            <Text
              style={[
                styles.visibilityOptionText,
                !isPublic && styles.visibilityOptionTextSelected,
              ]}
            >
              Private
            </Text>
            <Text
              style={[
                styles.visibilityOptionDesc,
                !isPublic && styles.visibilityOptionTextSelected,
              ]}
            >
              Only you can see this agent
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.visibilityOption, isPublic && styles.visibilityOptionSelected]}
            onPress={() => setIsPublic(true)}
            testID="visibility-public"
          >
            <Text
              style={[styles.visibilityOptionText, isPublic && styles.visibilityOptionTextSelected]}
            >
              Public
            </Text>
            <Text
              style={[styles.visibilityOptionDesc, isPublic && styles.visibilityOptionTextSelected]}
            >
              Visible to others
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Step 2: Select Agent Type</Text>
      <Text style={styles.stepDescription}>
        选择你感兴趣的场景类型（可创建多个不同类型的 Agent）
      </Text>

      {SCENE_TYPES.map(type => (
        <TouchableOpacity
          key={type}
          style={[styles.typeCard, selectedType === type && styles.typeCardSelected]}
          onPress={() => setSelectedType(type)}
          testID={`create-agent-type-${type}`}
        >
          <View style={[styles.typeIndicator, { backgroundColor: AGENT_TYPE_COLORS[type] }]} />
          <View style={styles.typeContent}>
            <Text style={styles.typeName}>{AGENT_TYPE_LABELS[type]}</Text>
            <Text style={styles.typeDescription}>{getTypeDescription(type)}</Text>
          </View>
          {selectedType === type && (
            <View style={styles.checkmark}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Step 3: Scene Configuration</Text>
      <Text style={styles.stepDescription}>Configure scene-specific settings for your agent</Text>

      {selectedType && (
        <SceneConfigForm
          sceneId={AGENT_TYPE_TO_SCENE_ID[selectedType]}
          config={sceneConfig}
          onConfigChange={(key, value) => setSceneConfig(prev => ({ ...prev, [key]: value }))}
        />
      )}
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Step 4: AI Behavior Settings</Text>
      <Text style={styles.stepDescription}>Configure how the AI responds and interacts</Text>

      <AIConfigSection
        config={aiConfig}
        onConfigChange={(key, value) => setAiConfig(prev => ({ ...prev, [key]: value }))}
      />
    </View>
  );

  const renderStep5 = () => {
    const previewAgent: Agent = {
      id: 'preview',
      userId: 'current',
      type: selectedType!,
      name: name,
      description: description || null,
      status: 'DRAFT',
      config: { scene: sceneConfig, ai: aiConfig },
      latitude: null,
      longitude: null,
      isActive: false,
      isPublic: isPublic,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Step 5: Preview & Test</Text>
        <Text style={styles.stepDescription}>
          Review your agent configuration and test the conversation
        </Text>

        <AgentPreview
          agent={previewAgent}
          onResetDefaults={() => {
            setAiConfig({});
            setSceneConfig({});
          }}
        />
      </View>
    );
  };

  const getTypeDescription = (type: AgentType): string => {
    switch (type) {
      case AgentType.VISIONSHARE:
        return 'Share and discover visual content with AI-powered matching';
      case AgentType.AGENTDATE:
        return 'Find and connect with people for dating and social activities';
      case AgentType.AGENTJOB:
        return 'Match job seekers with employers based on skills and requirements';
      case AgentType.AGENTAD:
        return 'Create and manage advertising campaigns with intelligent targeting';
      default:
        return '';
    }
  };

  const getProgressWidth = () => {
    return `${(step / 5) * 100}%`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton} testID="back-button">
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{editingAgent ? 'Edit Agent' : 'Create Agent'}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer} testID="create-agent-step-indicator">
        <View style={[styles.progressBar, { width: getProgressWidth() }]} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handleBack}>
          <Text style={styles.secondaryButtonText}>{step === 1 ? 'Cancel' : 'Back'}</Text>
        </TouchableOpacity>

        {step < 5 ? (
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleNext}
            testID="create-agent-next-button"
          >
            <Text style={styles.primaryButtonText}>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            testID="create-agent-submit"
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>{editingAgent ? 'Save' : 'Create Agent'}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backButtonText: { fontSize: 24, color: '#007AFF' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#000' },
  placeholder: { width: 40 },
  progressBarContainer: { height: 3, backgroundColor: '#e0e0e0' },
  progressBar: { height: '100%', backgroundColor: '#007AFF' },
  content: { flex: 1 },
  stepContainer: { padding: 20 },
  stepTitle: { fontSize: 24, fontWeight: 'bold', color: '#000', marginBottom: 8 },
  stepDescription: { fontSize: 16, color: '#666', marginBottom: 24 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  characterCount: { fontSize: 12, color: '#999', textAlign: 'right', marginTop: 4 },
  visibilityContainer: { flexDirection: 'row', gap: 12 },
  visibilityOption: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  visibilityOptionSelected: { borderColor: '#007AFF', backgroundColor: '#f0f7ff' },
  visibilityOptionText: { fontSize: 16, fontWeight: '600', color: '#666', marginBottom: 4 },
  visibilityOptionTextSelected: { color: '#007AFF' },
  visibilityOptionDesc: { fontSize: 12, color: '#999' },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  typeCardSelected: { borderColor: '#007AFF' },
  typeIndicator: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  typeContent: { flex: 1 },
  typeName: { fontSize: 18, fontWeight: '600', color: '#000', marginBottom: 4 },
  typeDescription: { fontSize: 14, color: '#666' },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reviewRow: { marginBottom: 16 },
  reviewLabel: { fontSize: 14, color: '#666', marginBottom: 4 },
  reviewValue: { fontSize: 16, fontWeight: '600', color: '#000' },
  reviewTypeBadge: { flexDirection: 'row', alignItems: 'center' },
  reviewTypeIndicator: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    marginHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: { backgroundColor: '#007AFF' },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryButton: { backgroundColor: '#f0f0f0' },
  secondaryButtonText: { color: '#333', fontSize: 16, fontWeight: '600' },
});
