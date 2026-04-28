import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { L2Schema, L2SchemaField, L2FieldType, L2Data } from '@bridgeai/shared';

interface L2ProfileFormProps {
  schema: L2Schema;
  initialData?: L2Data;
  onSubmit: (data: L2Data) => void;
  onCancel?: () => void;
  loading?: boolean;
}

// Simple progress bar
const ProgressBar: React.FC<{ percentage: number }> = ({ percentage }) => (
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

// Single select picker
interface SinglePickerProps {
  label: string;
  value: string | undefined;
  options: Array<{ value: string; label: string; description?: string; icon?: string }>;
  onSelect: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

const SinglePicker: React.FC<SinglePickerProps> = ({
  label,
  value,
  options,
  onSelect,
  placeholder = '请选择',
  required,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const selectedOption = options.find(o => o.value === value);

  return (
    <View style={styles.pickerContainer}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <TouchableOpacity style={styles.pickerButton} onPress={() => setModalVisible(true)}>
        <Text style={value ? styles.pickerValue : styles.pickerPlaceholder}>
          {selectedOption?.label ||
            (selectedOption?.icon ? `${selectedOption.icon} ${selectedOption.label}` : placeholder)}
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
                  style={[styles.optionItem, value === option.value && styles.optionItemSelected]}
                  onPress={() => {
                    onSelect(option.value);
                    setModalVisible(false);
                  }}
                >
                  <View style={styles.optionContent}>
                    {option.icon && <Text style={styles.optionIcon}>{option.icon}</Text>}
                    <View style={styles.optionTextContainer}>
                      <Text
                        style={[
                          styles.optionText,
                          value === option.value && styles.optionTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                      {option.description && (
                        <Text style={styles.optionDescription}>{option.description}</Text>
                      )}
                    </View>
                  </View>
                  {value === option.value && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Multi-select picker
interface MultiPickerProps {
  label: string;
  values: string[] | undefined;
  options: Array<{ value: string; label: string; icon?: string; color?: string }>;
  onSelect: (values: string[]) => void;
  placeholder?: string;
  maxItems?: number;
  required?: boolean;
}

const MultiPicker: React.FC<MultiPickerProps> = ({
  label,
  values = [],
  options,
  onSelect,
  placeholder = '请选择',
  maxItems,
  required,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const toggleValue = useCallback(
    (value: string) => {
      const currentValues = values || [];
      if (currentValues.includes(value)) {
        onSelect(currentValues.filter(v => v !== value));
      } else {
        if (maxItems && currentValues.length >= maxItems) {
          return; // Don't add more than maxItems
        }
        onSelect([...currentValues, value]);
      }
    },
    [values, onSelect, maxItems]
  );

  return (
    <View style={styles.pickerContainer}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
        {maxItems && <Text style={styles.hint}>（最多{maxItems}个）</Text>}
      </Text>
      <TouchableOpacity style={styles.pickerButton} onPress={() => setModalVisible(true)}>
        <Text style={values?.length ? styles.pickerValue : styles.pickerPlaceholder}>
          {values?.length
            ? values
                .map(v => options.find(o => o.value === v)?.label)
                .filter(Boolean)
                .join(', ')
            : placeholder}
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
                    values?.includes(option.value) && styles.optionItemSelected,
                  ]}
                  onPress={() => toggleValue(option.value)}
                >
                  <View style={styles.optionContent}>
                    {option.icon && <Text style={styles.optionIcon}>{option.icon}</Text>}
                    <Text
                      style={[
                        styles.optionText,
                        values?.includes(option.value) && styles.optionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </View>
                  {values?.includes(option.value) && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalDoneButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalDoneText}>完成</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Range input (min/max)
interface RangeInputProps {
  label: string;
  value: { min?: number; max?: number } | undefined;
  onChange: (value: { min: number; max: number }) => void;
  min?: number;
  max?: number;
  unit?: string;
  required?: boolean;
}

const RangeInput: React.FC<RangeInputProps> = ({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  unit = '',
  required,
}) => {
  return (
    <View style={styles.pickerContainer}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <View style={styles.rangeRow}>
        <View style={styles.rangeInputContainer}>
          <Text style={styles.rangeLabel}>最小值</Text>
          <TextInput
            style={styles.rangeInput}
            value={value?.min?.toString() || ''}
            onChangeText={text => {
              const num = parseInt(text, 10);
              if (!isNaN(num)) {
                onChange({ min: num, max: value?.max || max });
              }
            }}
            keyboardType="numeric"
            placeholder={min.toString()}
          />
          {unit && <Text style={styles.rangeUnit}>{unit}</Text>}
        </View>
        <Text style={styles.rangeSeparator}>-</Text>
        <View style={styles.rangeInputContainer}>
          <Text style={styles.rangeLabel}>最大值</Text>
          <TextInput
            style={styles.rangeInput}
            value={value?.max?.toString() || ''}
            onChangeText={text => {
              const num = parseInt(text, 10);
              if (!isNaN(num)) {
                onChange({ min: value?.min || min, max: num });
              }
            }}
            keyboardType="numeric"
            placeholder={max.toString()}
          />
          {unit && <Text style={styles.rangeUnit}>{unit}</Text>}
        </View>
      </View>
    </View>
  );
};

// Boolean toggle
interface BooleanToggleProps {
  label: string;
  value: boolean | undefined;
  onChange: (value: boolean) => void;
  description?: string;
}

const BooleanToggle: React.FC<BooleanToggleProps> = ({
  label,
  value = false,
  onChange,
  description,
}) => {
  return (
    <View style={styles.booleanContainer}>
      <View style={styles.booleanContent}>
        <Text style={styles.label}>{label}</Text>
        {description && <Text style={styles.description}>{description}</Text>}
      </View>
      <TouchableOpacity
        style={[styles.toggle, value && styles.toggleActive]}
        onPress={() => onChange(!value)}
      >
        <View style={[styles.toggleKnob, value && styles.toggleKnobActive]} />
      </TouchableOpacity>
    </View>
  );
};

// Render field based on type
const renderField: React.FC<{
  field: L2SchemaField;
  value: unknown;
  onChange: (value: unknown) => void;
}> = ({ field, value, onChange }) => {
  switch (field.type) {
    case L2FieldType.ENUM:
      return (
        <SinglePicker
          label={field.label}
          value={value as string | undefined}
          options={field.options || []}
          onSelect={onChange}
          placeholder={field.placeholder || '请选择'}
          required={field.required}
        />
      );

    case L2FieldType.MULTI_SELECT:
    case L2FieldType.TAGS:
      return (
        <MultiPicker
          label={field.label}
          values={value as string[] | undefined}
          options={field.options || []}
          onSelect={onChange}
          placeholder={field.placeholder || '请选择'}
          maxItems={field.maxItems}
          required={field.required}
        />
      );

    case L2FieldType.RANGE:
      return (
        <RangeInput
          label={field.label}
          value={value as { min?: number; max?: number } | undefined}
          onChange={onChange}
          min={field.min}
          max={field.max}
          unit={field.unit}
          required={field.required}
        />
      );

    case L2FieldType.BOOLEAN:
      return (
        <BooleanToggle
          label={field.label}
          value={value as boolean | undefined}
          onChange={onChange}
          description={field.description}
        />
      );

    case L2FieldType.TEXT:
    case L2FieldType.LOCATION:
      return (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            {field.label}
            {field.required && <Text style={styles.required}> *</Text>}
          </Text>
          <TextInput
            style={styles.input}
            value={(value as string) || ''}
            onChangeText={onChange}
            placeholder={field.placeholder || `请输入${field.label}`}
            placeholderTextColor="#999"
            maxLength={field.maxLength}
          />
        </View>
      );

    case L2FieldType.LONG_TEXT:
      return (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            {field.label}
            {field.required && <Text style={styles.required}> *</Text>}
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={(value as string) || ''}
            onChangeText={onChange}
            placeholder={field.placeholder || `请输入${field.label}`}
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            maxLength={field.maxLength}
            textAlignVertical="top"
          />
          {field.maxLength && (
            <Text style={styles.charCount}>
              {((value as string) || '').length}/{field.maxLength}
            </Text>
          )}
        </View>
      );

    case L2FieldType.NUMBER:
      return (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            {field.label}
            {field.required && <Text style={styles.required}> *</Text>}
          </Text>
          <View style={styles.numberRow}>
            <TextInput
              style={[styles.input, styles.numberInput]}
              value={value?.toString() || ''}
              onChangeText={text => {
                const num = parseFloat(text);
                onChange(isNaN(num) ? text : num);
              }}
              keyboardType="numeric"
              placeholder={field.placeholder || '0'}
              placeholderTextColor="#999"
            />
            {field.unit && <Text style={styles.unit}>{field.unit}</Text>}
          </View>
        </View>
      );

    case L2FieldType.DATE:
    case L2FieldType.TIME:
    case L2FieldType.DATETIME:
      return (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            {field.label}
            {field.required && <Text style={styles.required}> *</Text>}
          </Text>
          <TextInput
            style={styles.input}
            value={(value as string) || ''}
            onChangeText={onChange}
            placeholder={field.placeholder || 'YYYY-MM-DD'}
            placeholderTextColor="#999"
          />
        </View>
      );

    default:
      return (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{field.label}</Text>
          <Text style={styles.unsupportedType}>不支持的字段类型: {field.type}</Text>
        </View>
      );
  }
};

export const L2ProfileForm: React.FC<L2ProfileFormProps> = ({
  schema,
  initialData = {},
  onSubmit,
  onCancel,
  loading = false,
}) => {
  const [formData, setFormData] = useState<L2Data>(initialData);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = schema.steps || [
    { id: 'default', title: '填写', fields: schema.fields.map(f => f.id) },
  ];

  const handleChange = useCallback((fieldId: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  }, []);

  const calculateCompletion = useMemo(() => {
    const requiredFields = schema.fields.filter(f => f.required);
    if (requiredFields.length === 0) return 100;

    const filled = requiredFields.filter(f => {
      const value = formData[f.id];
      return value !== undefined && value !== null && value !== '';
    }).length;

    return Math.round((filled / requiredFields.length) * 100);
  }, [formData, schema]);

  const handleSubmit = useCallback(() => {
    onSubmit(formData);
  }, [formData, onSubmit]);

  const currentStepData = steps[currentStep] || steps[0];
  const currentFields = currentStepData?.fields
    .map(fieldId => schema.fields.find(f => f.id === fieldId))
    .filter(Boolean) as L2SchemaField[];

  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <View style={styles.container}>
      <ProgressBar percentage={calculateCompletion} />

      {/* Step indicator */}
      {steps.length > 1 && (
        <View style={styles.stepIndicator}>
          {steps.map((step, index) => (
            <TouchableOpacity
              key={step.id}
              style={[
                styles.stepDot,
                index === currentStep && styles.stepDotActive,
                index < currentStep && styles.stepDotCompleted,
              ]}
              onPress={() => setCurrentStep(index)}
            >
              <Text style={[styles.stepText, index === currentStep && styles.stepTextActive]}>
                {index + 1}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          {currentStepData?.title && (
            <Text style={styles.sectionTitle}>{currentStepData.title}</Text>
          )}
          {currentStepData?.description && (
            <Text style={styles.sectionDescription}>{currentStepData.description}</Text>
          )}

          {currentFields.map(field => (
            <View key={field.id}>
              {field.description && (
                <Text style={styles.fieldDescription}>{field.description}</Text>
              )}
              {renderField({
                field,
                value: formData[field.id],
                onChange: value => handleChange(field.id, value),
              })}
            </View>
          ))}
        </View>

        <View style={styles.buttonContainer}>
          {!isFirstStep && (
            <TouchableOpacity
              style={[styles.button, styles.prevButton]}
              onPress={() => setCurrentStep(currentStep - 1)}
            >
              <Text style={styles.prevButtonText}>上一步</Text>
            </TouchableOpacity>
          )}
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
            style={[
              styles.button,
              styles.submitButton,
              isLastStep ? styles.submitButtonPrimary : styles.submitButtonSecondary,
            ]}
            onPress={isLastStep ? handleSubmit : () => setCurrentStep(currentStep + 1)}
            disabled={loading}
          >
            <Text
              style={[
                styles.submitButtonText,
                isLastStep ? styles.submitButtonTextPrimary : styles.submitButtonTextSecondary,
              ]}
            >
              {loading ? '保存中...' : isLastStep ? '保存' : '下一步'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
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
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  stepDotActive: {
    backgroundColor: '#007AFF',
  },
  stepDotCompleted: {
    backgroundColor: '#4CAF50',
  },
  stepText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  stepTextActive: {
    color: '#fff',
  },
  scrollContent: {
    flex: 1,
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
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  fieldDescription: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
    marginTop: -8,
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
  required: {
    color: '#FF3B30',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    fontWeight: 'normal',
  },
  description: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  numberInput: {
    flex: 1,
  },
  unit: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
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
    flex: 1,
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
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  optionTextSelected: {
    color: '#007AFF',
    fontWeight: '500',
  },
  optionDescription: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  checkmark: {
    color: '#007AFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modalDoneButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  modalDoneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rangeInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rangeLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  rangeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    minWidth: 80,
  },
  rangeUnit: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  rangeSeparator: {
    marginHorizontal: 16,
    fontSize: 18,
    color: '#666',
  },
  booleanContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 16,
  },
  booleanContent: {
    flex: 1,
    marginRight: 12,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e0e0e0',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#007AFF',
  },
  toggleKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
  },
  toggleKnobActive: {
    transform: [{ translateX: 20 }],
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
  prevButton: {
    backgroundColor: '#f0f0f0',
  },
  prevButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
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
    flex: 2,
  },
  submitButtonPrimary: {
    backgroundColor: '#007AFF',
  },
  submitButtonSecondary: {
    backgroundColor: '#34C759',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonTextPrimary: {
    color: '#fff',
  },
  submitButtonTextSecondary: {
    color: '#fff',
  },
  unsupportedType: {
    fontSize: 14,
    color: '#FF3B30',
    fontStyle: 'italic',
  },
});
