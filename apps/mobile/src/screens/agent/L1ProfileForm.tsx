import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import {
  L1Profile,
  AgeRange,
  Gender,
  EducationLevel,
  AGE_RANGE_LABELS,
  GENDER_LABELS,
  EDUCATION_LABELS,
  L1_FIELD_LABELS,
} from '@visionshare/shared';

interface L1ProfileFormProps {
  initialData?: L1Profile;
  onSubmit: (data: L1Profile) => void;
  onCancel?: () => void;
  loading?: boolean;
}

// Simple picker component
interface PickerProps {
  label: string;
  value: string | undefined;
  options: Array<{ label: string; value: string }>;
  onSelect: (value: string) => void;
  placeholder?: string;
}

const SimplePicker: React.FC<PickerProps> = ({
  label,
  value,
  options,
  onSelect,
  placeholder = '请选择',
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const selectedLabel = options.find(o => o.value === value)?.label || placeholder;

  return (
    <View style={styles.pickerContainer}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.pickerButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={value ? styles.pickerValue : styles.pickerPlaceholder}>
          {selectedLabel}
        </Text>
        <Text style={styles.pickerArrow}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {options.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionItem,
                    value === option.value && styles.optionItemSelected,
                  ]}
                  onPress={() => {
                    onSelect(option.value);
                    setModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      value === option.value && styles.optionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {value === option.value && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Location input component
interface LocationInputProps {
  value: { province?: string; city?: string; district?: string };
  onChange: (location: { province: string; city: string; district?: string }) => void;
}

const LocationInput: React.FC<LocationInputProps> = ({ value, onChange }) => {
  return (
    <View style={styles.locationContainer}>
      <Text style={styles.label}>{L1_FIELD_LABELS.location}</Text>
      <View style={styles.locationRow}>
        <TextInput
          style={[styles.input, styles.locationInput]}
          value={value?.province}
          onChangeText={text =>
            onChange({
              province: text,
              city: value?.city || '',
              district: value?.district,
            })
          }
          placeholder="省份"
          placeholderTextColor="#999"
        />
        <TextInput
          style={[styles.input, styles.locationInput]}
          value={value?.city}
          onChangeText={text =>
            onChange({
              province: value?.province || '',
              city: text,
              district: value?.district,
            })
          }
          placeholder="城市"
          placeholderTextColor="#999"
        />
      </View>
    </View>
  );
};

// Progress bar component
interface ProgressBarProps {
  percentage: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ percentage }) => (
  <View style={styles.progressContainer}>
    <View style={styles.progressBar}>
      <View
        style={[
          styles.progressFill,
          { width: `${percentage}%` },
          percentage === 100 && styles.progressFillComplete,
        ]}
      />
    </View>
    <Text style={styles.progressText}>{percentage}% 完成</Text>
  </View>
);

export const L1ProfileForm: React.FC<L1ProfileFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [formData, setFormData] = useState<L1Profile>({
    age: initialData?.age,
    gender: initialData?.gender,
    location: initialData?.location,
    occupation: initialData?.occupation,
    education: initialData?.education,
  });

  const handleChange = useCallback(<K extends keyof L1Profile>(
    field: K,
    value: L1Profile[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const calculateCompletion = useCallback(() => {
    const fields: (keyof L1Profile)[] = ['age', 'gender', 'location', 'occupation', 'education'];
    const filled = fields.filter(field => {
      const value = formData[field];
      return value !== undefined && value !== null && value !== '';
    });
    return Math.round((filled.length / fields.length) * 100);
  }, [formData]);

  const handleSubmit = useCallback(() => {
    onSubmit(formData);
  }, [formData, onSubmit]);

  const completion = calculateCompletion();

  // Prepare options for pickers
  const ageOptions = Object.values(AgeRange).map(value => ({
    value,
    label: AGE_RANGE_LABELS[value],
  }));

  const genderOptions = Object.values(Gender).map(value => ({
    value,
    label: GENDER_LABELS[value],
  }));

  const educationOptions = Object.values(EducationLevel).map(value => ({
    value,
    label: EDUCATION_LABELS[value],
  }));

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <ProgressBar percentage={completion} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>基本信息</Text>

        <SimplePicker
          label={L1_FIELD_LABELS.age}
          value={formData.age}
          options={ageOptions}
          onSelect={value => handleChange('age', value as AgeRange)}
        />

        <SimplePicker
          label={L1_FIELD_LABELS.gender}
          value={formData.gender}
          options={genderOptions}
          onSelect={value => handleChange('gender', value as Gender)}
        />

        <LocationInput
          value={formData.location || {}}
          onChange={location => handleChange('location', location)}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>职业与教育</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{L1_FIELD_LABELS.occupation}</Text>
          <TextInput
            style={styles.input}
            value={formData.occupation}
            onChangeText={text => handleChange('occupation', text)}
            placeholder="请输入职业"
            placeholderTextColor="#999"
            maxLength={100}
          />
        </View>

        <SimplePicker
          label={L1_FIELD_LABELS.education}
          value={formData.education}
          options={educationOptions}
          onSelect={value => handleChange('education', value as EducationLevel)}
        />
      </View>

      <View style={styles.buttonContainer}>
        {onCancel && (
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onCancel}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>取消</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.button, styles.submitButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? '保存中...' : '保存'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  progressContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  progressFillComplete: {
    backgroundColor: '#4CAF50',
  },
  progressText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  pickerContainer: {
    marginBottom: 16,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  pickerValue: {
    fontSize: 16,
    color: '#333',
  },
  pickerPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  pickerArrow: {
    fontSize: 12,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalClose: {
    fontSize: 20,
    color: '#999',
    padding: 4,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionItemSelected: {
    backgroundColor: '#f0f8ff',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  optionTextSelected: {
    color: '#007AFF',
    fontWeight: '500',
  },
  checkmark: {
    color: '#007AFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  locationContainer: {
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: 'row',
    gap: 12,
  },
  locationInput: {
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
