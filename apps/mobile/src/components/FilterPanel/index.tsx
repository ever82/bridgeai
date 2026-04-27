import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
} from 'react-native';
import {
  FilterCondition,
  FilterOperator,
  FilterExpression,
  OPERATOR_METADATA,
} from '@bridgeai/shared';

interface FilterPanelProps {
  fields: Array<{
    name: string;
    label: string;
    type: 'string' | 'number' | 'date' | 'enum' | 'boolean';
    operators?: FilterOperator[];
    enumValues?: Array<{ value: string; label: string }>;
  }>;
  value: FilterExpression;
  onChange: (filter: FilterExpression) => void;
}

let _conditionIdCounter = 0;
function generateConditionId(): string {
  return `cond-${++_conditionIdCounter}-${Date.now()}`;
}

interface ConditionRowProps {
  condition: FilterCondition & { _id?: string; _fromNot?: boolean };
  onChange: (condition: FilterCondition & { _id?: string; _fromNot?: boolean }) => void;
  onRemove: () => void;
  fields: FilterPanelProps['fields'];
}

const ConditionRow: React.FC<ConditionRowProps> = ({ condition, onChange, onRemove, fields }) => {
  const [showOperatorPicker, setShowOperatorPicker] = useState(false);
  const field = fields.find(f => f.name === condition.field);

  const getOperatorsForField = () => {
    if (!field) return ['eq'];
    if (field.operators) return field.operators;

    switch (field.type) {
      case 'string':
        return ['eq', 'ne', 'contains', 'startsWith', 'endsWith'];
      case 'number':
        return ['eq', 'ne', 'gt', 'gte', 'lt', 'lte'];
      case 'date':
        return ['eq', 'ne', 'gt', 'gte', 'lt', 'lte'];
      case 'enum':
        return ['eq', 'ne', 'in', 'nin'];
      case 'boolean':
        return ['eq'];
      default:
        return ['eq'];
    }
  };

  const renderValueInput = () => {
    if (!field) return null;

    const operator = condition.operator;

    // Multi-select for 'in' and 'nin' operators
    if (operator === 'in' || operator === 'nin') {
      if (field.enumValues) {
        return (
          <View style={styles.multiSelectContainer}>
            {field.enumValues.map(opt => {
              const values = Array.isArray(condition.value) ? condition.value : [];
              const selected = values.includes(opt.value);
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.multiSelectOption, selected && styles.multiSelectSelected]}
                  onPress={() => {
                    const newValues = selected
                      ? values.filter(v => v !== opt.value)
                      : [...values, opt.value];
                    onChange({ ...condition, value: newValues });
                  }}
                >
                  <Text
                    style={[styles.multiSelectText, selected && styles.multiSelectTextSelected]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        );
      }
      return (
        <TextInput
          style={styles.valueInput}
          value={Array.isArray(condition.value) ? condition.value.join(', ') : ''}
          onChangeText={text => {
            const values = text
              .split(',')
              .map(v => v.trim())
              .filter(Boolean);
            onChange({ ...condition, value: values });
          }}
          placeholder="输入值，用逗号分隔"
        />
      );
    }

    // Boolean type
    if (field.type === 'boolean') {
      return (
        <View style={styles.booleanContainer}>
          <TouchableOpacity
            style={[styles.booleanOption, condition.value === true && styles.booleanSelected]}
            onPress={() => onChange({ ...condition, value: true })}
          >
            <Text
              style={[styles.booleanText, condition.value === true && styles.booleanTextSelected]}
            >
              是
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.booleanOption, condition.value === false && styles.booleanSelected]}
            onPress={() => onChange({ ...condition, value: false })}
          >
            <Text
              style={[styles.booleanText, condition.value === false && styles.booleanTextSelected]}
            >
              否
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Enum type
    if (field.enumValues) {
      return (
        <View style={styles.enumContainer}>
          {field.enumValues.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.enumOption, condition.value === opt.value && styles.enumSelected]}
              onPress={() => onChange({ ...condition, value: opt.value })}
            >
              <Text
                style={[styles.enumText, condition.value === opt.value && styles.enumTextSelected]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    // Default text/number input
    return (
      <TextInput
        style={styles.valueInput}
        value={condition.value?.toString() || ''}
        onChangeText={text => {
          const parsedValue = field.type === 'number' ? parseFloat(text) || 0 : text;
          onChange({ ...condition, value: parsedValue });
        }}
        placeholder="输入值"
        keyboardType={field.type === 'number' ? 'numeric' : 'default'}
      />
    );
  };

  return (
    <View style={styles.conditionRow}>
      {/* NOT indicator badge */}
      {condition._fromNot && (
        <View style={styles.notBadge}>
          <Text style={styles.notBadgeText}>NOT (取反)</Text>
        </View>
      )}

      {/* Field selector */}
      <View style={styles.fieldSection}>
        <Text style={styles.sectionLabel}>字段</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {fields.map(f => (
            <TouchableOpacity
              key={f.name}
              style={[styles.fieldChip, condition.field === f.name && styles.fieldChipSelected]}
              onPress={() => onChange({ ...condition, field: f.name })}
            >
              <Text
                style={[
                  styles.fieldChipText,
                  condition.field === f.name && styles.fieldChipTextSelected,
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Operator selector */}
      <View style={styles.operatorSection}>
        <Text style={styles.sectionLabel}>操作符</Text>
        <TouchableOpacity style={styles.operatorButton} onPress={() => setShowOperatorPicker(true)}>
          <Text style={styles.operatorText}>
            {OPERATOR_METADATA[condition.operator]?.label || condition.operator}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Operator picker modal */}
      <Modal
        visible={showOperatorPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowOperatorPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>选择操作符</Text>
            {getOperatorsForField().map((op: FilterOperator) => (
              <TouchableOpacity
                key={op}
                style={styles.operatorOption}
                onPress={() => {
                  onChange({ ...condition, operator: op });
                  setShowOperatorPicker(false);
                }}
              >
                <Text style={styles.operatorOptionText}>{OPERATOR_METADATA[op]?.label || op}</Text>
                <Text style={styles.operatorDescription}>{OPERATOR_METADATA[op]?.description}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowOperatorPicker(false)}
            >
              <Text style={styles.cancelButtonText}>取消</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Value input */}
      <View style={styles.valueSection}>
        <Text style={styles.sectionLabel}>值</Text>
        {renderValueInput()}
      </View>

      {/* Remove button */}
      <TouchableOpacity style={styles.removeButton} onPress={onRemove}>
        <Text style={styles.removeButtonText}>删除</Text>
      </TouchableOpacity>
    </View>
  );
};

export const FilterPanel: React.FC<FilterPanelProps> = ({ fields, value, onChange }) => {
  const [logicMode, setLogicMode] = useState<'and' | 'or'>('and');

  // Track top-level logic mode and whether any condition came from a NOT
  const conditions: (FilterCondition & { _id?: string; _fromNot?: boolean })[] = (() => {
    const extractConditions = (
      expr: FilterExpression,
      fromNot = false
    ): (FilterCondition & { _id?: string; _fromNot?: boolean })[] => {
      // Direct condition
      if ('field' in expr) {
        const withId = expr as FilterCondition & { _id?: string };
        return [{ ...withId, _id: withId._id || generateConditionId(), _fromNot: fromNot }];
      }
      // AND/OR - recursively extract all conditions, preserving NOT flag
      if ('and' in expr && Array.isArray(expr.and)) {
        return expr.and.flatMap(child => extractConditions(child, fromNot));
      }
      if ('or' in expr && Array.isArray(expr.or)) {
        return expr.or.flatMap(child => extractConditions(child, fromNot));
      }
      // NOT - propagate NOT flag to children
      if ('not' in expr) {
        return extractConditions(expr.not, true);
      }
      return [];
    };
    return extractConditions(value);
  })();

  // Whether any condition was nested inside a NOT - requires preserving NOT on update
  const hasNotConditions = conditions.some(c => c._fromNot);

  const handleAddCondition = () => {
    const newCondition: FilterCondition & { _id: string } = {
      field: fields[0]?.name || '',
      operator: 'eq',
      value: '',
      _id: generateConditionId(),
    };

    const newConditions = [...conditions, newCondition];
    const baseFilter: FilterExpression =
      newConditions.length === 1
        ? newConditions[0]
        : logicMode === 'and'
          ? { and: newConditions }
          : { or: newConditions };

    onChange(hasNotConditions && newConditions.length > 0 ? { not: baseFilter } : baseFilter);
  };

  const handleUpdateCondition = (index: number, condition: FilterCondition) => {
    const newConditions = [...conditions];
    newConditions[index] = condition;

    const baseFilter: FilterExpression =
      newConditions.length === 1
        ? newConditions[0]
        : logicMode === 'and'
          ? { and: newConditions }
          : { or: newConditions };

    onChange(hasNotConditions && newConditions.length > 0 ? { not: baseFilter } : baseFilter);
  };

  const handleRemoveCondition = (index: number) => {
    const newConditions = conditions.filter((_, i) => i !== index);

    if (newConditions.length === 0) {
      onChange({ and: [] });
    } else if (newConditions.length === 1) {
      onChange(hasNotConditions ? { not: newConditions[0] } : newConditions[0]);
    } else {
      const baseFilter: FilterExpression =
        logicMode === 'and' ? { and: newConditions } : { or: newConditions };
      onChange(hasNotConditions ? { not: baseFilter } : baseFilter);
    }
  };

  const handleClear = () => {
    onChange({ and: [] });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>筛选条件</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>清除</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleAddCondition} style={styles.addButton}>
            <Text style={styles.addButtonText}>+ 添加条件</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Logic mode selector */}
      {conditions.length > 1 && (
        <View style={styles.logicSelector}>
          <Text style={styles.logicLabel}>条件组合:</Text>
          <TouchableOpacity
            style={[styles.logicButton, logicMode === 'and' && styles.logicButtonActive]}
            onPress={() => {
              setLogicMode('and');
              const baseFilter: FilterExpression = { and: conditions };
              onChange(hasNotConditions ? { not: baseFilter } : baseFilter);
            }}
          >
            <Text
              style={[styles.logicButtonText, logicMode === 'and' && styles.logicButtonTextActive]}
            >
              满足全部
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.logicButton, logicMode === 'or' && styles.logicButtonActive]}
            onPress={() => {
              setLogicMode('or');
              const baseFilter: FilterExpression = { or: conditions };
              onChange(hasNotConditions ? { not: baseFilter } : baseFilter);
            }}
          >
            <Text
              style={[styles.logicButtonText, logicMode === 'or' && styles.logicButtonTextActive]}
            >
              满足任一
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Conditions list */}
      <ScrollView style={styles.conditionsList}>
        {conditions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>暂无筛选条件</Text>
            <Text style={styles.emptySubtext}>点击&quot;添加条件&quot;开始筛选</Text>
          </View>
        ) : (
          conditions.map((condition, index) => (
            <View key={condition._id} style={styles.conditionWrapper}>
              {index > 0 && (
                <View style={styles.logicIndicator}>
                  <Text style={styles.logicIndicatorText}>{logicMode === 'and' ? '且' : '或'}</Text>
                </View>
              )}
              <ConditionRow
                condition={condition}
                onChange={c => handleUpdateCondition(index, c)}
                onRemove={() => handleRemoveCondition(index)}
                fields={fields}
              />
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#999',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  logicSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  logicLabel: {
    fontSize: 14,
    color: '#666',
  },
  logicButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
  },
  logicButtonActive: {
    backgroundColor: '#007AFF',
  },
  logicButtonText: {
    fontSize: 13,
    color: '#666',
  },
  logicButtonTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  conditionsList: {
    maxHeight: 400,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
  },
  conditionWrapper: {
    marginBottom: 12,
  },
  logicIndicator: {
    alignItems: 'center',
    marginBottom: 8,
  },
  logicIndicatorText: {
    fontSize: 12,
    color: '#999',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  conditionRow: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  fieldSection: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  fieldChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#fff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  fieldChipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  fieldChipText: {
    fontSize: 13,
    color: '#666',
  },
  fieldChipTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  operatorSection: {
    marginBottom: 12,
  },
  operatorButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  operatorText: {
    fontSize: 14,
    color: '#333',
  },
  valueSection: {
    marginBottom: 12,
  },
  valueInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  booleanContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  booleanOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  booleanSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  booleanText: {
    fontSize: 14,
    color: '#666',
  },
  booleanTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  enumContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  enumOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  enumSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  enumText: {
    fontSize: 13,
    color: '#666',
  },
  enumTextSelected: {
    color: '#fff',
  },
  multiSelectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  multiSelectOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  multiSelectSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  multiSelectText: {
    fontSize: 13,
    color: '#666',
  },
  multiSelectTextSelected: {
    color: '#fff',
  },
  removeButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  removeButtonText: {
    fontSize: 14,
    color: '#FF5722',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  operatorOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  operatorOptionText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  operatorDescription: {
    fontSize: 12,
    color: '#999',
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  notBadge: {
    backgroundColor: '#FFF3E0',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  notBadgeText: {
    fontSize: 11,
    color: '#E65100',
    fontWeight: '500',
  },
});

export default FilterPanel;
