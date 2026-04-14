import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import {
  TaskFilter,
  DISTANCE_RANGE_OPTIONS,
  SORT_OPTIONS,
  PUBLISH_TIME_OPTIONS,
  TASK_TYPE_LABELS,
  TaskType,
} from '@visionshare/shared';

interface TaskFilterPanelProps {
  filter: TaskFilter;
  onChange: (filter: TaskFilter) => void;
  onClose: () => void;
}

export const TaskFilterPanel: React.FC<TaskFilterPanelProps> = ({
  filter,
  onChange,
  onClose,
}) => {
  const handleDistanceChange = (distance: number) => {
    onChange({ ...filter, distanceRange: distance as 1 | 5 | 10 | 0 });
  };

  const handleSortChange = (sortBy: string) => {
    onChange({ ...filter, sortBy: sortBy as 'distance' | 'time' | 'budget' | 'match' });
  };

  const handlePublishTimeChange = (range: string) => {
    onChange({ ...filter, publishTimeRange: range as 'today' | 'week' | 'month' | 'all' });
  };

  const handleTypeToggle = (type: TaskType) => {
    const currentTypes = filter.types || [];
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter((t) => t !== type)
      : [...currentTypes, type];
    onChange({ ...filter, types: newTypes });
  };

  const handleBudgetChange = (min: number, max: number) => {
    onChange({ ...filter, budgetMin: min, budgetMax: max });
  };

  const handleReset = () => {
    onChange({
      distanceRange: 5,
      sortBy: 'distance',
      sortOrder: 'asc',
      page: 1,
      limit: 20,
    });
  };

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>筛选</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Distance Range */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>距离范围</Text>
              <View style={styles.optionsRow}>
                {DISTANCE_RANGE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionButton,
                      filter.distanceRange === option.value && styles.optionButtonActive,
                    ]}
                    onPress={() => handleDistanceChange(option.value)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        filter.distanceRange === option.value && styles.optionTextActive,
                      ]}
                    >
                      {option.labelZh}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Sort By */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>排序方式</Text>
              <View style={styles.optionsColumn}>
                {SORT_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.sortOption,
                      filter.sortBy === option.value && styles.sortOptionActive,
                    ]}
                    onPress={() => handleSortChange(option.value)}
                  >
                    <Text
                      style={[
                        styles.sortOptionText,
                        filter.sortBy === option.value && styles.sortOptionTextActive,
                      ]}
                    >
                      {option.labelZh}
                    </Text>
                    {filter.sortBy === option.value && (
                      <Text style={styles.checkMark}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Publish Time */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>发布时间</Text>
              <View style={styles.optionsRow}>
                {PUBLISH_TIME_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionButton,
                      filter.publishTimeRange === option.value && styles.optionButtonActive,
                    ]}
                    onPress={() => handlePublishTimeChange(option.value)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        filter.publishTimeRange === option.value && styles.optionTextActive,
                      ]}
                    >
                      {option.labelZh}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Task Types */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>任务类型</Text>
              <View style={styles.optionsWrap}>
                {(Object.keys(TASK_TYPE_LABELS) as TaskType[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      filter.types?.includes(type) && styles.typeButtonActive,
                    ]}
                    onPress={() => handleTypeToggle(type)}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        filter.types?.includes(type) && styles.typeButtonTextActive,
                      ]}
                    >
                      {TASK_TYPE_LABELS[type].zh}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Budget Range */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>预算范围</Text>
              <View style={styles.optionsRow}>
                <TouchableOpacity
                  style={[styles.optionButton, filter.budgetMax === 1000 && styles.optionButtonActive]}
                  onPress={() => handleBudgetChange(0, 1000)}
                >
                  <Text style={[styles.optionText, filter.budgetMax === 1000 && styles.optionTextActive]}>
                    ¥1k以下
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.optionButton, filter.budgetMin === 1000 && filter.budgetMax === 5000 && styles.optionButtonActive]}
                  onPress={() => handleBudgetChange(1000, 5000)}
                >
                  <Text style={[styles.optionText, filter.budgetMin === 1000 && filter.budgetMax === 5000 && styles.optionTextActive]}>
                    ¥1k-5k
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.optionButton, filter.budgetMin === 5000 && styles.optionButtonActive]}
                  onPress={() => handleBudgetChange(5000, 100000)}
                >
                  <Text style={[styles.optionText, filter.budgetMin === 5000 && styles.optionButtonActive && styles.optionTextActive]}>
                    ¥5k以上
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>重置</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmButton} onPress={onClose}>
              <Text style={styles.confirmButtonText}>确定</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#262626',
  },
  closeButton: {
    fontSize: 20,
    color: '#8C8C8C',
    padding: 4,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#262626',
    marginBottom: 12,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionsColumn: {
    gap: 8,
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D9D9D9',
  },
  optionButtonActive: {
    backgroundColor: '#E6F7FF',
    borderColor: '#1890FF',
  },
  optionText: {
    fontSize: 13,
    color: '#595959',
  },
  optionTextActive: {
    color: '#1890FF',
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  sortOptionActive: {
    backgroundColor: '#E6F7FF',
  },
  sortOptionText: {
    fontSize: 14,
    color: '#595959',
  },
  sortOptionTextActive: {
    color: '#1890FF',
    fontWeight: '500',
  },
  checkMark: {
    fontSize: 16,
    color: '#1890FF',
    fontWeight: '600',
  },
  typeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D9D9D9',
  },
  typeButtonActive: {
    backgroundColor: '#E6F7FF',
    borderColor: '#1890FF',
  },
  typeButtonText: {
    fontSize: 12,
    color: '#595959',
  },
  typeButtonTextActive: {
    color: '#1890FF',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    gap: 12,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 15,
    color: '#595959',
  },
  confirmButton: {
    flex: 2,
    paddingVertical: 12,
    backgroundColor: '#1890FF',
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
  },
});
