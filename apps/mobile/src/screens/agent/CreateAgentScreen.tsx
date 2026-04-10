import React, { useState, useCallback } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AgentType,
  AGENT_TYPE_LABELS,
  AGENT_TYPE_COLORS,
  CreateAgentRequest,
} from '@visionshare/shared';
import { ProfileStackParamList } from '../../types/navigation';

const AGENT_TYPES = Object.values(AgentType);

type NavigationProp = NativeStackNavigationProp<ProfileStackParamList>;

export const CreateAgentScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedType, setSelectedType] = useState<AgentType | null>(null);

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

  const handleNext = useCallback(() => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  }, [step, validateStep1, validateStep2]);

  const handleBack = useCallback(() => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigation.goBack();
    }
  }, [step, navigation]);

  const handleSubmit = useCallback(async () => {
    if (!selectedType) return;

    try {
      setLoading(true);

      const agentData: CreateAgentRequest = {
        type: selectedType,
        name: name.trim(),
        description: description.trim() || undefined,
      };

      // TODO: Replace with actual API call
      // await agentApi.createAgent(agentData);

      console.log('Creating agent:', agentData);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      Alert.alert('Success', 'Agent created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to create agent'
      );
    } finally {
      setLoading(false);
    }
  }, [selectedType, name, description, navigation]);

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Step 1: Basic Information</Text>
      <Text style={styles.stepDescription}>
        Give your agent a name and description
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Agent Name *</Text>
        <TextInput
          style={styles.input}
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
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Step 2: Select Agent Type</Text>
      <Text style={styles.stepDescription}>
        Choose the type of agent you want to create
      </Text>

      {AGENT_TYPES.map((type) => (
        <TouchableOpacity
          key={type}
          style={[
            styles.typeCard,
            selectedType === type && styles.typeCardSelected,
          ]}
          onPress={() => setSelectedType(type)}
        >
          <View
            style={[
              styles.typeIndicator,
              { backgroundColor: AGENT_TYPE_COLORS[type] },
            ]}
          />
          <View style={styles.typeContent}>
            <Text style={styles.typeName}>{AGENT_TYPE_LABELS[type]}</Text>
            <Text style={styles.typeDescription}>
              {getTypeDescription(type)}
            </Text>
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
      <Text style={styles.stepTitle}>Step 3: Review</Text>
      <Text style={styles.stepDescription}>
        Review your agent configuration
      </Text>

      <View style={styles.reviewCard}>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Name</Text>
          <Text style={styles.reviewValue}>{name}</Text>
        </View>

        {description && (
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Description</Text>
            <Text style={styles.reviewValue}>{description}</Text>
          </View>
        )}

        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Type</Text>
          <View style={styles.reviewTypeBadge}>
            <View
              style={[
                styles.reviewTypeIndicator,
                { backgroundColor: AGENT_TYPE_COLORS[selectedType!] },
              ]}
            />
            <Text style={styles.reviewValue}>
              {AGENT_TYPE_LABELS[selectedType!]}
            </Text>
          </View>
        </View>

        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Status</Text>
          <Text style={styles.reviewValue}>Draft (you can activate later)</Text>
        </View>
      </View>
    </View>
  );

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
    return `${(step / 3) * 100}%`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Agent</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: getProgressWidth() }]} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleBack}
        >
          <Text style={styles.secondaryButtonText}>
            {step === 1 ? 'Cancel' : 'Back'}
          </Text>
        </TouchableOpacity>

        {step < 3 ? (
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleNext}
          >
            <Text style={styles.primaryButtonText}>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Create Agent</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  placeholder: {
    width: 40,
  },
  progressBarContainer: {
    height: 3,
    backgroundColor: '#e0e0e0',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
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
  typeCardSelected: {
    borderColor: '#007AFF',
  },
  typeIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  typeContent: {
    flex: 1,
  },
  typeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  typeDescription: {
    fontSize: 14,
    color: '#666',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
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
  reviewRow: {
    marginBottom: 16,
  },
  reviewLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  reviewValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  reviewTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewTypeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
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
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
});
