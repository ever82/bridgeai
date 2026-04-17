/**
 * VisionShare Publish Form Component
 * VisionShare任务发布表单组件
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import type { VisionSharePublishFormData } from '@packages/shared/types/visionShare';

import { LocationPicker } from '../../LocationPicker';
import { visionShareApi } from '../../../services/api/visionShare';

interface PublishFormProps {
  onSubmit: (data: VisionSharePublishFormData) => void;
  onSaveDraft: (data: VisionSharePublishFormData) => void;
  isLoading?: boolean;
  initialData?: Partial<VisionSharePublishFormData>;
}

// 预定义分类
const CATEGORIES = [
  '人像摄影',
  '风景摄影',
  '街拍',
  '美食摄影',
  '建筑摄影',
  '活动摄影',
  '夜景摄影',
  '商业摄影',
  '旅拍',
  '直播',
];

// 预定义标签
const POPULAR_TAGS = [
  '专业', '业余', '急', '修图', '原片', '高清',
  '创意', '自然', '棚拍', '外景', '跟拍', '摆拍',
  '抓拍', '无人机', '视频', '照片',
];

export const PublishForm: React.FC<PublishFormProps> = ({
  onSubmit,
  onSaveDraft,
  isLoading = false,
  initialData,
}) => {
  // 表单状态
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [budgetType, setBudgetType] = useState<'POINTS' | 'CASH'>(initialData?.budgetType || 'POINTS');
  const [budgetAmount, setBudgetAmount] = useState(
    initialData?.budgetAmount ? String(initialData.budgetAmount) : ''
  );
  const [budgetCurrency, setBudgetCurrency] = useState(initialData?.budgetCurrency || 'CNY');
  const [latitude, setLatitude] = useState<number | undefined>(initialData?.latitude);
  const [longitude, setLongitude] = useState<number | undefined>(initialData?.longitude);
  const [locationName, setLocationName] = useState(initialData?.locationName || '');
  const [locationAddress, setLocationAddress] = useState(initialData?.locationAddress || '');
  const [timeType, setTimeType] = useState<'IMMEDIATE' | 'SCHEDULED'>(initialData?.timeType || 'IMMEDIATE');
  const [startTime, setStartTime] = useState<Date | undefined>(initialData?.startTime);
  const [endTime, setEndTime] = useState<Date | undefined>(initialData?.endTime);
  const [validHours, setValidHours] = useState(initialData?.validHours ? String(initialData.validHours) : '24');
  const [category, setCategory] = useState(initialData?.category || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(initialData?.tags || []);
  const [customTag, setCustomTag] = useState('');

  // AI提炼状态
  const [isRefining, setIsRefining] = useState(false);
  const [refinementResult, setRefinementResult] = useState<{
    refinedDescription?: string;
    qualityScore?: number;
    generatedTags?: string[];
    suggestions?: string[];
  } | null>(null);

  // 位置选择器显示状态
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // 切换标签选择
  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  }, []);

  // 添加自定义标签
  const addCustomTag = useCallback(() => {
    if (customTag.trim() && !selectedTags.includes(customTag.trim())) {
      setSelectedTags(prev => [...prev, customTag.trim()]);
      setCustomTag('');
    }
  }, [customTag, selectedTags]);

  // 删除标签
  const removeTag = useCallback((tag: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tag));
  }, []);

  // AI提炼需求
  const handleRefine = async () => {
    if (!description || description.trim().length < 10) {
      return;
    }

    setIsRefining(true);
    try {
      const result = await visionShareApi.analyzeDescription(description);
      setRefinementResult(result);

      // 应用AI生成的标签
      if (result.generatedTags && result.generatedTags.length > 0) {
        setSelectedTags(prev => {
          const newTags = result.generatedTags!.filter(tag => !prev.includes(tag));
          return [...prev, ...newTags].slice(0, 8);
        });
      }

      // 应用分类建议
      if (result.extractedInfo?.category && !category) {
        setCategory(result.extractedInfo.category);
      }
    } catch (error) {
      console.error('Refinement failed', error);
    } finally {
      setIsRefining(false);
    }
  };

  // 处理位置选择
  const handleLocationSelect = (location: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  }) => {
    setLatitude(location.latitude);
    setLongitude(location.longitude);
    setLocationName(location.name || '');
    setLocationAddress(location.address || '');
    setShowLocationPicker(false);
  };

  // 构建表单数据
  const buildFormData = (): VisionSharePublishFormData => ({
    title: title.trim(),
    description: description.trim() || undefined,
    budgetType,
    budgetAmount: parseFloat(budgetAmount) || 0,
    budgetCurrency: budgetType === 'CASH' ? budgetCurrency : undefined,
    latitude,
    longitude,
    locationName: locationName || undefined,
    locationAddress: locationAddress || undefined,
    startTime,
    endTime,
    timeType,
    validHours: parseInt(validHours, 10) || 24,
    category: category || undefined,
    tags: selectedTags,
  });

  // 验证表单
  const validateForm = (): string[] => {
    const errors: string[] = [];

    if (!title.trim() || title.trim().length < 2) {
      errors.push('任务标题至少需要2个字符');
    }

    if (!budgetAmount || parseFloat(budgetAmount) <= 0) {
      errors.push('请输入有效的预算金额');
    }

    if (timeType === 'SCHEDULED') {
      if (!startTime) {
        errors.push('请选择开始时间');
      }
      if (!endTime) {
        errors.push('请选择结束时间');
      }
      if (startTime && endTime && startTime >= endTime) {
        errors.push('结束时间必须晚于开始时间');
      }
    }

    return errors;
  };

  // 提交表单
  const handleSubmit = () => {
    const errors = validateForm();
    if (errors.length > 0) {
      // 显示错误提示
      return;
    }

    onSubmit(buildFormData());
  };

  // 保存草稿
  const handleSaveDraft = () => {
    onSaveDraft(buildFormData());
  };

  return (
    <View style={styles.container}>
      {/* 任务标题 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>任务标题 *</Text>
        <TextInput
          style={styles.titleInput}
          value={title}
          onChangeText={setTitle}
          placeholder="请输入任务标题（如：寻找摄影师拍摄人像写真）"
          maxLength={100}
          testID="title-input"
        />
        <Text style={styles.characterCount}>{title.length}/100</Text>
      </View>

      {/* 任务描述 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>任务描述</Text>
          <TouchableOpacity
            onPress={handleRefine}
            disabled={isRefining || description.length < 10}
            style={[
              styles.refineButton,
              (isRefining || description.length < 10) && styles.refineButtonDisabled,
            ]}
            testID="refine-button"
          >
            {isRefining ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Text style={styles.refineButtonText}>AI优化</Text>
            )}
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.descriptionInput}
          value={description}
          onChangeText={setDescription}
          placeholder="详细描述你的需求，包括拍摄场景、风格要求、时间地点等..."
          multiline
          numberOfLines={4}
          maxLength={1000}
          testID="description-input"
        />
        <Text style={styles.characterCount}>{description.length}/1000</Text>

        {/* AI提炼结果 */}
        {refinementResult && (
          <View style={styles.refinementResult} testID="refinement-result">
            {refinementResult.qualityScore !== undefined && (
              <View style={styles.qualityScore}>
                <Text style={styles.qualityScoreLabel}>需求质量评分:</Text>
                <Text style={[
                  styles.qualityScoreValue,
                  refinementResult.qualityScore >= 80 ? styles.scoreHigh :
                  refinementResult.qualityScore >= 60 ? styles.scoreMedium :
                  styles.scoreLow,
                ]}>
                  {refinementResult.qualityScore}分
                </Text>
              </View>
            )}
            {refinementResult.suggestions && refinementResult.suggestions.length > 0 && (
              <View style={styles.suggestions}>
                <Text style={styles.suggestionsTitle}>优化建议:</Text>
                {refinementResult.suggestions.map((suggestion, index) => (
                  <Text key={index} style={styles.suggestionItem}>• {suggestion}</Text>
                ))}
              </View>
            )}
          </View>
        )}
      </View>

      {/* 预算设置 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>预算设置 *</Text>
        <View style={styles.budgetTypeContainer}>
          <TouchableOpacity
            style={[
              styles.budgetTypeButton,
              budgetType === 'POINTS' && styles.budgetTypeButtonActive,
            ]}
            onPress={() => setBudgetType('POINTS')}
            testID="budget-type-points"
          >
            <Text style={[
              styles.budgetTypeText,
              budgetType === 'POINTS' && styles.budgetTypeTextActive,
            ]}>积分</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.budgetTypeButton,
              budgetType === 'CASH' && styles.budgetTypeButtonActive,
            ]}
            onPress={() => setBudgetType('CASH')}
            testID="budget-type-cash"
          >
            <Text style={[
              styles.budgetTypeText,
              budgetType === 'CASH' && styles.budgetTypeTextActive,
            ]}>现金</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.budgetInputContainer}>
          <TextInput
            style={styles.budgetInput}
            value={budgetAmount}
            onChangeText={setBudgetAmount}
            placeholder="请输入预算金额"
            keyboardType="decimal-pad"
            testID="budget-amount-input"
          />
          <Text style={styles.currencyLabel}>
            {budgetType === 'POINTS' ? '积分' : budgetCurrency}
          </Text>
        </View>
      </View>

      {/* 地理位置 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>地理位置</Text>
        <TouchableOpacity
          style={styles.locationButton}
          onPress={() => setShowLocationPicker(true)}
          testID="location-picker-button"
        >
          <Text style={locationName ? styles.locationText : styles.locationPlaceholder}>
            {locationName || '选择地理位置'}
          </Text>
        </TouchableOpacity>
        {locationAddress ? (
          <Text style={styles.locationAddress}>{locationAddress}</Text>
        ) : null}
      </View>

      {/* 时间设置 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>时间设置</Text>
        <View style={styles.timeTypeContainer}>
          <TouchableOpacity
            style={[
              styles.timeTypeButton,
              timeType === 'IMMEDIATE' && styles.timeTypeButtonActive,
            ]}
            onPress={() => setTimeType('IMMEDIATE')}
            testID="time-type-immediate"
          >
            <Text style={[
              styles.timeTypeText,
              timeType === 'IMMEDIATE' && styles.timeTypeTextActive,
            ]}>立即</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.timeTypeButton,
              timeType === 'SCHEDULED' && styles.timeTypeButtonActive,
            ]}
            onPress={() => setTimeType('SCHEDULED')}
            testID="time-type-scheduled"
          >
            <Text style={[
              styles.timeTypeText,
              timeType === 'SCHEDULED' && styles.timeTypeTextActive,
            ]}>预约</Text>
          </TouchableOpacity>
        </View>
        {/* 时间选择器可以在这里添加 */}
      </View>

      {/* 有效期 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>任务有效期</Text>
        <View style={styles.validHoursContainer}>
          <TextInput
            style={styles.validHoursInput}
            value={validHours}
            onChangeText={setValidHours}
            keyboardType="number-pad"
            maxLength={3}
            testID="valid-hours-input"
          />
          <Text style={styles.validHoursLabel}>小时</Text>
        </View>
      </View>

      {/* 分类选择 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>需求分类</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
        >
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryButton,
                category === cat && styles.categoryButtonActive,
              ]}
              onPress={() => setCategory(cat)}
              testID={`category-${cat}`}
            >
              <Text style={[
                styles.categoryText,
                category === cat && styles.categoryTextActive,
              ]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 标签选择 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>标签</Text>
        <View style={styles.tagsContainer}>
          {POPULAR_TAGS.map(tag => (
            <TouchableOpacity
              key={tag}
              style={[
                styles.tagButton,
                selectedTags.includes(tag) && styles.tagButtonSelected,
              ]}
              onPress={() => toggleTag(tag)}
              testID={`tag-${tag}`}
            >
              <Text style={[
                styles.tagText,
                selectedTags.includes(tag) && styles.tagTextSelected,
              ]}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.customTagContainer}>
          <TextInput
            style={styles.customTagInput}
            value={customTag}
            onChangeText={setCustomTag}
            placeholder="添加自定义标签"
            maxLength={10}
          />
          <TouchableOpacity
            style={styles.addTagButton}
            onPress={addCustomTag}
            disabled={!customTag.trim()}
          >
            <Text style={styles.addTagButtonText}>添加</Text>
          </TouchableOpacity>
        </View>
        {selectedTags.length > 0 && (
          <View style={styles.selectedTagsContainer}>
            {selectedTags.map(tag => (
              <View key={tag} style={styles.selectedTag}>
                <Text style={styles.selectedTagText}>{tag}</Text>
                <TouchableOpacity
                  onPress={() => removeTag(tag)}
                  testID={`remove-tag-${tag}`}
                >
                  <Text style={styles.removeTagText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* 按钮区域 */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.saveDraftButton}
          onPress={handleSaveDraft}
          disabled={isLoading}
          testID="save-draft-button"
        >
          <Text style={styles.saveDraftButtonText}>保存草稿</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={isLoading}
          testID="submit-button"
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>发布任务</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* 位置选择器模态框 */}
      {showLocationPicker && (
        <LocationPicker
          onSelect={handleLocationSelect}
          onClose={() => setShowLocationPicker(false)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  titleInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    height: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  refineButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
  },
  refineButtonDisabled: {
    opacity: 0.5,
  },
  refineButtonText: {
    color: '#1976D2',
    fontSize: 12,
    fontWeight: '500',
  },
  refinementResult: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  qualityScore: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  qualityScoreLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  qualityScoreValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  scoreHigh: { color: '#4CAF50' },
  scoreMedium: { color: '#FF9800' },
  scoreLow: { color: '#F44336' },
  suggestions: {
    marginTop: 8,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  suggestionItem: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  budgetTypeContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  budgetTypeButton: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  budgetTypeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  budgetTypeText: {
    fontSize: 14,
    color: '#666',
  },
  budgetTypeTextActive: {
    color: '#fff',
  },
  budgetInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  budgetInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  currencyLabel: {
    marginLeft: 12,
    fontSize: 16,
    color: '#666',
    minWidth: 40,
  },
  locationButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
  },
  locationText: {
    fontSize: 14,
    color: '#333',
  },
  locationPlaceholder: {
    fontSize: 14,
    color: '#999',
  },
  locationAddress: {
    marginTop: 8,
    fontSize: 13,
    color: '#666',
  },
  timeTypeContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  timeTypeButton: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  timeTypeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  timeTypeText: {
    fontSize: 14,
    color: '#666',
  },
  timeTypeTextActive: {
    color: '#fff',
  },
  validHoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  validHoursInput: {
    width: 80,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  validHoursLabel: {
    marginLeft: 12,
    fontSize: 16,
    color: '#666',
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#007AFF',
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
  },
  categoryTextActive: {
    color: '#fff',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagButtonSelected: {
    backgroundColor: '#007AFF',
  },
  tagText: {
    fontSize: 13,
    color: '#666',
  },
  tagTextSelected: {
    color: '#fff',
  },
  customTagContainer: {
    flexDirection: 'row',
    marginTop: 12,
  },
  customTagInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  addTagButton: {
    marginLeft: 8,
    paddingHorizontal: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    justifyContent: 'center',
  },
  addTagButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  selectedTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  selectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedTagText: {
    fontSize: 13,
    color: '#1976D2',
    marginRight: 4,
  },
  removeTagText: {
    fontSize: 16,
    color: '#1976D2',
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingVertical: 16,
  },
  saveDraftButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  saveDraftButtonText: {
    fontSize: 16,
    color: '#666',
  },
  submitButton: {
    flex: 2,
    paddingVertical: 14,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default PublishForm;
