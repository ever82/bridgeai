/**
 * Job Posting Screen
 *
 * Multi-step form for creating and editing job postings
 */

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
  JobPosting,
  JobType,
  WorkMode,
  ExperienceLevel,
  EducationLevel,
  SalaryPeriod,
  JOB_TYPE_LABELS,
  WORK_MODE_LABELS,
  EXPERIENCE_LEVEL_LABELS,
  EDUCATION_LEVEL_LABELS,
  SALARY_PERIOD_LABELS,
} from '@bridgeai/shared';
import { JobStackParamList } from '../../types/navigation';

type JobPostingScreenNavigationProp = NativeStackNavigationProp<JobStackParamList, 'JobPosting'>;

interface StepProps {
  title: string;
  isActive: boolean;
  isComplete: boolean;
  stepNumber: number;
}

const StepIndicator: React.FC<StepProps> = ({ title, isActive, isComplete, stepNumber }) => (
  <View style={[styles.step, isActive && styles.stepActive]}>
    <View style={[styles.stepCircle, isComplete && styles.stepComplete, isActive && styles.stepCircleActive]}>
      <Text style={[styles.stepNumber, (isComplete || isActive) && styles.stepNumberActive]}>
        {isComplete ? '✓' : stepNumber}
      </Text>
    </View>
    <Text style={[styles.stepTitle, isActive && styles.stepTitleActive]}>{title}</Text>
  </View>
);

export const JobPostingScreen: React.FC = () => {
  const navigation = useNavigation<JobPostingScreenNavigationProp>();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [description, setDescription] = useState('');
  const [jobType, setJobType] = useState<JobType>(JobType.FULL_TIME);
  const [positions, setPositions] = useState('1');
  const [workMode, setWorkMode] = useState<WorkMode>(WorkMode.ONSITE);
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(ExperienceLevel.JUNIOR);
  const [educationLevel, setEducationLevel] = useState<EducationLevel>(EducationLevel.BACHELOR);
  const [skills, setSkills] = useState('');
  const [minSalary, setMinSalary] = useState('');
  const [maxSalary, setMaxSalary] = useState('');
  const [salaryPeriod, setSalaryPeriod] = useState<SalaryPeriod>(SalaryPeriod.MONTHLY);
  const [isNegotiable, setIsNegotiable] = useState(false);

  const totalSteps = 4;

  const handleExtract = useCallback(async () => {
    if (!description.trim()) {
      Alert.alert('提示', '请先输入职位描述');
      return;
    }

    setIsExtracting(true);
    try {
      // TODO: Call API to extract job info
      // const response = await api.post('/jobs/extract', { description });
      // const { structuredData, extractedSkills } = response.data;

      // For now, simulate extraction
      await new Promise(resolve => setTimeout(resolve, 1000));

      Alert.alert('提取成功', 'AI已自动提取关键信息，请检查并完善');
    } catch (error) {
      Alert.alert('提取失败', '请手动填写职位信息');
    } finally {
      setIsExtracting(false);
    }
  }, [description]);

  const handleNext = useCallback(() => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  }, [currentStep, navigation]);

  const handleSubmit = useCallback(async () => {
    setIsLoading(true);
    try {
      // TODO: Call API to create job
      // const jobData = { ... };
      // await api.post('/jobs', jobData);

      Alert.alert('成功', '职位发布成功', [
        { text: '确定', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('错误', '发布失败，请重试');
    } finally {
      setIsLoading(false);
    }
  }, [navigation]);

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.sectionTitle}>基本信息</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>职位名称 *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="例如：高级前端工程师"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>所属部门</Text>
        <TextInput
          style={styles.input}
          value={department}
          onChangeText={setDepartment}
          placeholder="例如：技术部"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>职位类型</Text>
        <View style={styles.optionsRow}>
          {Object.values(JobType).map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.optionButton, jobType === type && styles.optionButtonActive]}
              onPress={() => setJobType(type)}
            >
              <Text style={[styles.optionText, jobType === type && styles.optionTextActive]}>
                {JOB_TYPE_LABELS[type]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>招聘人数</Text>
        <TextInput
          style={styles.input}
          value={positions}
          onChangeText={setPositions}
          keyboardType="number-pad"
          placeholder="1"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>职位描述 *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="详细描述职位职责、要求、福利等..."
          placeholderTextColor="#999"
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
        <TouchableOpacity style={styles.extractButton} onPress={handleExtract} disabled={isExtracting}>
          {isExtracting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.extractButtonText}>AI智能提取</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.sectionTitle}>工作地点</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>工作方式</Text>
        <View style={styles.optionsRow}>
          {Object.values(WorkMode).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.optionButton, workMode === mode && styles.optionButtonActive]}
              onPress={() => setWorkMode(mode)}
            >
              <Text style={[styles.optionText, workMode === mode && styles.optionTextActive]}>
                {WORK_MODE_LABELS[mode]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {workMode !== WorkMode.REMOTE && (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>工作城市 *</Text>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="例如：北京"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>详细地址</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="例如：朝阳区望京SOHO"
              placeholderTextColor="#999"
            />
          </View>
        </>
      )}

      <Text style={styles.sectionTitle}>经验要求</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>经验水平</Text>
        <View style={styles.optionsColumn}>
          {Object.values(ExperienceLevel).map((level) => (
            <TouchableOpacity
              key={level}
              style={[styles.optionButtonWide, experienceLevel === level && styles.optionButtonActive]}
              onPress={() => setExperienceLevel(level)}
            >
              <Text style={[styles.optionText, experienceLevel === level && styles.optionTextActive]}>
                {EXPERIENCE_LEVEL_LABELS[level]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>学历要求</Text>
        <View style={styles.optionsRow}>
          {Object.values(EducationLevel).map((edu) => (
            <TouchableOpacity
              key={edu}
              style={[styles.optionButton, educationLevel === edu && styles.optionButtonActive]}
              onPress={() => setEducationLevel(edu)}
            >
              <Text style={[styles.optionText, educationLevel === edu && styles.optionTextActive]}>
                {EDUCATION_LEVEL_LABELS[edu]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.sectionTitle}>技能要求</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>所需技能 *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={skills}
          onChangeText={setSkills}
          placeholder="输入技能标签，用逗号分隔，例如：JavaScript, React, Node.js"
          placeholderTextColor="#999"
          multiline
        />
      </View>

      <Text style={styles.sectionTitle}>薪资福利</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>薪资范围</Text>
        <View style={styles.salaryRow}>
          <TextInput
            style={[styles.input, styles.salaryInput]}
            value={minSalary}
            onChangeText={setMinSalary}
            keyboardType="number-pad"
            placeholder="最低"
            placeholderTextColor="#999"
          />
          <Text style={styles.salarySeparator}>-</Text>
          <TextInput
            style={[styles.input, styles.salaryInput]}
            value={maxSalary}
            onChangeText={setMaxSalary}
            keyboardType="number-pad"
            placeholder="最高"
            placeholderTextColor="#999"
          />
          <View style={styles.periodSelector}>
            {Object.values(SalaryPeriod).map((period) => (
              <TouchableOpacity
                key={period}
                style={[styles.periodButton, salaryPeriod === period && styles.periodButtonActive]}
                onPress={() => setSalaryPeriod(period)}
              >
                <Text style={[styles.periodText, salaryPeriod === period && styles.periodTextActive]}>
                  {SALARY_PERIOD_LABELS[period]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.checkboxRow}
        onPress={() => setIsNegotiable(!isNegotiable)}
      >
        <View style={[styles.checkbox, isNegotiable && styles.checkboxChecked]}>
          {isNegotiable && <Text style={styles.checkboxIcon}>✓</Text>}
        </View>
        <Text style={styles.checkboxLabel}>薪资面议</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.sectionTitle}>职位预览</Text>

      <View style={styles.previewCard}>
        <Text style={styles.previewTitle}>{title || '职位名称'}</Text>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>部门：</Text>
          <Text style={styles.previewValue}>{department || '-'}</Text>
        </View>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>类型：</Text>
          <Text style={styles.previewValue}>{JOB_TYPE_LABELS[jobType]}</Text>
        </View>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>人数：</Text>
          <Text style={styles.previewValue}>{positions}人</Text>
        </View>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>工作方式：</Text>
          <Text style={styles.previewValue}>{WORK_MODE_LABELS[workMode]}</Text>
        </View>
        {workMode !== WorkMode.REMOTE && (
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>地点：</Text>
            <Text style={styles.previewValue}>{city} {address}</Text>
          </View>
        )}
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>经验：</Text>
          <Text style={styles.previewValue}>{EXPERIENCE_LEVEL_LABELS[experienceLevel]}</Text>
        </View>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>学历：</Text>
          <Text style={styles.previewValue}>{EDUCATION_LEVEL_LABELS[educationLevel]}</Text>
        </View>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>技能：</Text>
          <Text style={styles.previewValue}>{skills || '-'}</Text>
        </View>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>薪资：</Text>
          <Text style={styles.previewValue}>
            {isNegotiable
              ? '面议'
              : `${minSalary || '0'}-${maxSalary || '0'} ${SALARY_PERIOD_LABELS[salaryPeriod]}`}
          </Text>
        </View>
      </View>

      <Text style={styles.notice}>
        确认发布前请仔细检查职位信息。发布后您可以随时编辑或暂停职位。
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>发布职位</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Step Indicator */}
      <View style={styles.stepIndicator}>
        <StepIndicator title="基本信息" stepNumber={1} isActive={currentStep === 1} isComplete={currentStep > 1} />
        <View style={styles.stepLine} />
        <StepIndicator title="工作地点" stepNumber={2} isActive={currentStep === 2} isComplete={currentStep > 2} />
        <View style={styles.stepLine} />
        <StepIndicator title="薪资福利" stepNumber={3} isActive={currentStep === 3} isComplete={currentStep > 3} />
        <View style={styles.stepLine} />
        <StepIndicator title="确认发布" stepNumber={4} isActive={currentStep === 4} isComplete={false} />
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {currentStep > 1 && (
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Text style={styles.backBtnText}>上一步</Text>
          </TouchableOpacity>
        )}
        {currentStep < totalSteps ? (
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextBtnText}>下一步</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.nextBtn, isLoading && styles.nextBtnDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.nextBtnText}>确认发布</Text>
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
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerRight: {
    width: 40,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  step: {
    alignItems: 'center',
  },
  stepActive: {
    opacity: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#2196F3',
  },
  stepComplete: {
    backgroundColor: '#4CAF50',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  stepNumberActive: {
    color: '#fff',
  },
  stepTitle: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  stepTitleActive: {
    color: '#2196F3',
    fontWeight: '500',
  },
  stepLine: {
    width: 30,
    height: 2,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 4,
  },
  scrollView: {
    flex: 1,
  },
  stepContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    marginTop: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
  },
  textArea: {
    height: 120,
    paddingTop: 12,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionsColumn: {
    flexDirection: 'column',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  optionButtonWide: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  optionButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  optionText: {
    fontSize: 13,
    color: '#666',
  },
  optionTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  extractButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  extractButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  salaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  salaryInput: {
    flex: 1,
  },
  salarySeparator: {
    fontSize: 16,
    color: '#666',
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 4,
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  periodButtonActive: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  periodText: {
    fontSize: 12,
    color: '#666',
  },
  periodTextActive: {
    color: '#fff',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  checkboxIcon: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
  previewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  previewRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  previewLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  previewValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  notice: {
    fontSize: 13,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  backBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  nextBtn: {
    flex: 2,
    paddingVertical: 12,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    alignItems: 'center',
  },
  nextBtnDisabled: {
    backgroundColor: '#ccc',
  },
  nextBtnText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default JobPostingScreen;
