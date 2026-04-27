/**
 * Dating Profile Setup Screen
 * 约会资料设置向导屏幕
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  AgeRangePreference,
  HeightRange,
  EducationPreference,
  IncomeRange,
  MBTIType,
  PersonalityTrait,
  InterestCategory,
  SmokingHabit,
  DrinkingHabit,
  PetPreference,
  ExerciseFrequency,
  DietPreference,
  DatingPurpose,
  RelationshipPace,
  LivingArrangement,
  FamilyPlan,
  // Labels
  DATING_AGE_RANGE_LABELS,
  HEIGHT_RANGE_LABELS,
  DATING_EDUCATION_LABELS,
  INCOME_LABELS,
  DATING_PURPOSE_LABELS,
  // Types
  BasicConditions,
  PersonalityPreferences,
  InterestPreferences,
  Lifestyle,
  RelationshipExpectations,
  LocationPreference,
  AIExtractionResult,
  CreateDatingProfileRequest,
} from '@bridgeai/shared';

// ============================================
// Step definitions
// ============================================

const TOTAL_STEPS = 7; // 6 content steps + 1 summary

const STEP_TITLES: Record<number, string> = {
  1: '基础条件',
  2: '性格偏好',
  3: '兴趣爱好',
  4: '生活方式',
  5: '关系期望',
  6: 'AI 智能提炼',
  7: '资料预览',
};

// Local label maps for enums not covered in shared labels
const MBTI_LABELS: Record<string, string> = {
  [MBTIType.INTJ]: 'INTJ', [MBTIType.INTP]: 'INTP',
  [MBTIType.ENTJ]: 'ENTJ', [MBTIType.ENTP]: 'ENTP',
  [MBTIType.INFJ]: 'INFJ', [MBTIType.INFP]: 'INFP',
  [MBTIType.ENFJ]: 'ENFJ', [MBTIType.ENFP]: 'ENFP',
  [MBTIType.ISTJ]: 'ISTJ', [MBTIType.ISFJ]: 'ISFJ',
  [MBTIType.ESTJ]: 'ESTJ', [MBTIType.ESFJ]: 'ESFJ',
  [MBTIType.ISTP]: 'ISTP', [MBTIType.ISFP]: 'ISFP',
  [MBTIType.ESTP]: 'ESTP', [MBTIType.ESFP]: 'ESFP',
};

const PERSONALITY_TRAIT_LABELS: Record<string, string> = {
  [PersonalityTrait.INTROVERTED]: '内向',
  [PersonalityTrait.EXTROVERTED]: '外向',
  [PersonalityTrait.AMBIVERT]: '中间型',
  [PersonalityTrait.OPTIMISTIC]: '乐观',
  [PersonalityTrait.RATIONAL]: '理性',
  [PersonalityTrait.EMOTIONAL]: '感性',
  [PersonalityTrait.PRACTICAL]: '务实',
  [PersonalityTrait.CREATIVE]: '有创意',
  [PersonalityTrait.ADVENTUROUS]: '爱冒险',
  [PersonalityTrait.STABLE]: '稳重',
  [PersonalityTrait.HUMOROUS]: '幽默',
  [PersonalityTrait.GENTLE]: '温柔',
  [PersonalityTrait.INDEPENDENT]: '独立',
  [PersonalityTrait.DEPENDABLE]: '可靠',
};

const INTEREST_CATEGORY_LABELS: Record<string, string> = {
  [InterestCategory.SPORTS]: '运动',
  [InterestCategory.MUSIC]: '音乐',
  [InterestCategory.READING]: '阅读',
  [InterestCategory.TRAVEL]: '旅行',
  [InterestCategory.FOOD]: '美食',
  [InterestCategory.MOVIES]: '电影',
  [InterestCategory.GAMING]: '游戏',
  [InterestCategory.PHOTOGRAPHY]: '摄影',
  [InterestCategory.ARTS]: '艺术',
  [InterestCategory.TECH]: '科技',
  [InterestCategory.FASHION]: '时尚',
  [InterestCategory.OUTDOOR]: '户外',
  [InterestCategory.PETS]: '宠物',
  [InterestCategory.COOKING]: '烹饪',
  [InterestCategory.DANCING]: '舞蹈',
  [InterestCategory.FITNESS]: '健身',
};

const SMOKING_LABELS: Record<string, string> = {
  [SmokingHabit.NEVER]: '不吸烟',
  [SmokingHabit.OCCASIONALLY]: '偶尔',
  [SmokingHabit.REGULARLY]: '经常',
  [SmokingHabit.QUITTING]: '戒烟中',
  [SmokingHabit.NO_PREFERENCE]: '不限',
};

const DRINKING_LABELS: Record<string, string> = {
  [DrinkingHabit.NEVER]: '不喝酒',
  [DrinkingHabit.SOCIALLY]: '社交饮酒',
  [DrinkingHabit.REGULARLY]: '经常',
  [DrinkingHabit.NO_PREFERENCE]: '不限',
};

const PET_LABELS: Record<string, string> = {
  [PetPreference.DOGS]: '喜欢狗',
  [PetPreference.CATS]: '喜欢猫',
  [PetPreference.OTHER]: '其他宠物',
  [PetPreference.NO_PETS]: '不养宠物',
  [PetPreference.ALLERGIC]: '过敏',
  [PetPreference.NO_PREFERENCE]: '不限',
};

const EXERCISE_LABELS: Record<string, string> = {
  [ExerciseFrequency.NEVER]: '不运动',
  [ExerciseFrequency.OCCASIONALLY]: '偶尔',
  [ExerciseFrequency.REGULARLY]: '经常',
  [ExerciseFrequency.DAILY]: '每天',
  [ExerciseFrequency.NO_PREFERENCE]: '不限',
};

const DIET_LABELS: Record<string, string> = {
  [DietPreference.OMNIVORE]: '杂食',
  [DietPreference.VEGETARIAN]: '素食',
  [DietPreference.VEGAN]: '纯素',
  [DietPreference.HALAL]: '清真',
  [DietPreference.KOSHER]: '犹太洁食',
  [DietPreference.GLUTEN_FREE]: '无麸质',
  [DietPreference.NO_PREFERENCE]: '不限',
};

const PACE_LABELS: Record<string, string> = {
  [RelationshipPace.TAKE_IT_SLOW]: '慢慢来',
  [RelationshipPace.MODERATE]: '适中',
  [RelationshipPace.READY_TO_COMMIT]: '准备承诺',
};

const LIVING_LABELS: Record<string, string> = {
  [LivingArrangement.LIVE_ALONE]: '独居',
  [LivingArrangement.WITH_FAMILY]: '和家人住',
  [LivingArrangement.WITH_ROOMMATES]: '和室友住',
  [LivingArrangement.OPEN_TO_MOVE]: '愿意搬家',
};

const FAMILY_PLAN_LABELS: Record<string, string> = {
  [FamilyPlan.WANT_CHILDREN]: '想要孩子',
  [FamilyPlan.DO_NOT_WANT_CHILDREN]: '不想要孩子',
  [FamilyPlan.OPEN_MINDED]: '随缘',
  [FamilyPlan.HAVE_CHILDREN]: '已有孩子',
  [FamilyPlan.NOT_SURE]: '不确定',
};

// ============================================
// Form state interfaces
// ============================================

interface ProfileFormData {
  // Step 1
  ageRange: AgeRangePreference | null;
  heightRange: HeightRange | null;
  education: EducationPreference | null;
  income: IncomeRange | null;
  locationRadius: number;
  sameCity: boolean;
  // Step 2
  mbti: MBTIType[];
  traits: PersonalityTrait[];
  preferredTraits: PersonalityTrait[];
  dislikedTraits: PersonalityTrait[];
  // Step 3
  interestCategories: InterestCategory[];
  customInterests: string[];
  // Step 4
  smoking: SmokingHabit | null;
  drinking: DrinkingHabit | null;
  pets: PetPreference | null;
  exercise: ExerciseFrequency | null;
  diet: DietPreference | null;
  // Step 5
  purpose: DatingPurpose | null;
  pace: RelationshipPace | null;
  living: LivingArrangement | null;
  familyPlan: FamilyPlan | null;
  // Step 6
  description: string;
}

const initialFormData: ProfileFormData = {
  ageRange: null,
  heightRange: null,
  education: null,
  income: null,
  locationRadius: 30,
  sameCity: false,
  mbti: [],
  traits: [],
  preferredTraits: [],
  dislikedTraits: [],
  interestCategories: [],
  customInterests: [],
  smoking: null,
  drinking: null,
  pets: null,
  exercise: null,
  diet: null,
  purpose: null,
  pace: null,
  living: null,
  familyPlan: null,
  description: '',
};

// ============================================
// Reusable components
// ============================================

/** Horizontal pill selector that supports single or multi-select */
const PillSelector: React.FC<{
  options: { value: string; label: string }[];
  selected: string[];
  onSelect: (value: string) => void;
  multi?: boolean;
}> = ({ options, selected, onSelect, multi = false }) => (
  <View style={localStyles.pillRow}>
    {options.map((opt) => {
      const isSelected = selected.includes(opt.value);
      return (
        <TouchableOpacity
          key={opt.value}
          style={[localStyles.pill, isSelected && localStyles.pillSelected]}
          onPress={() => onSelect(opt.value)}
          activeOpacity={0.7}
        >
          <Text style={[localStyles.pillText, isSelected && localStyles.pillTextSelected]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

/** Simple labelled slider approximation using +/- buttons */
const StepperControl: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, step, unit = '', onChange }) => (
  <View style={localStyles.stepperRow}>
    <Text style={localStyles.fieldLabel}>{label}</Text>
    <View style={localStyles.stepperControls}>
      <TouchableOpacity
        style={localStyles.stepperBtn}
        onPress={() => onChange(Math.max(min, value - step))}
        disabled={value <= min}
      >
        <Text style={localStyles.stepperBtnText}>-</Text>
      </TouchableOpacity>
      <Text style={localStyles.stepperValue}>
        {value}{unit}
      </Text>
      <TouchableOpacity
        style={localStyles.stepperBtn}
        onPress={() => onChange(Math.min(max, value + step))}
        disabled={value >= max}
      >
        <Text style={localStyles.stepperBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  </View>
);

// ============================================
// Interests step sub-component (needs own state)
// ============================================

const InterestsStepComponent: React.FC<{
  interestCategories: InterestCategory[];
  customInterests: string[];
  onUpdateField: <K extends keyof ProfileFormData>(key: K, value: ProfileFormData[K]) => void;
  toggleInArray: <T extends string>(arr: T[], item: T) => T[];
}> = ({ interestCategories, customInterests, onUpdateField, toggleInArray }) => {
  const [newCustomInterest, setNewCustomInterest] = useState('');

  const addCustomInterest = () => {
    const trimmed = newCustomInterest.trim();
    if (trimmed && !customInterests.includes(trimmed)) {
      onUpdateField('customInterests', [...customInterests, trimmed]);
      setNewCustomInterest('');
    }
  };

  const removeCustomInterest = (item: string) => {
    onUpdateField(
      'customInterests',
      customInterests.filter((v) => v !== item),
    );
  };

  return (
    <View style={localStyles.stepContainer}>
      <Text style={localStyles.stepDescription}>选择您感兴趣的领域</Text>

      <Text style={localStyles.fieldLabel}>兴趣类别（可多选）</Text>
      <PillSelector
        options={(Object.values(InterestCategory) as string[]).map((v) => ({ value: v, label: INTEREST_CATEGORY_LABELS[v] || v }))}
        selected={interestCategories}
        onSelect={(v) => onUpdateField('interestCategories', toggleInArray(interestCategories, v as InterestCategory))}
        multi
      />

      <Text style={localStyles.fieldLabel}>自定义兴趣</Text>
      <View style={localStyles.inputRow}>
        <TextInput
          style={localStyles.textInput}
          placeholder="输入自定义兴趣"
          value={newCustomInterest}
          onChangeText={setNewCustomInterest}
          onSubmitEditing={addCustomInterest}
          returnKeyType="done"
        />
        <TouchableOpacity style={localStyles.addBtn} onPress={addCustomInterest}>
          <Text style={localStyles.addBtnText}>添加</Text>
        </TouchableOpacity>
      </View>

      {customInterests.length > 0 && (
        <View style={localStyles.pillRow}>
          {customInterests.map((item) => (
            <TouchableOpacity
              key={item}
              style={[localStyles.pill, localStyles.pillSelected]}
              onPress={() => removeCustomInterest(item)}
            >
              <Text style={[localStyles.pillText, localStyles.pillTextSelected]}>
                {item} x
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

// ============================================
// Main screen component
// ============================================

const DatingProfileSetupScreen: React.FC = () => {
  const navigation = useNavigation();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ProfileFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState<AIExtractionResult | null>(null);

  // ---- helpers ----

  const updateField = <K extends keyof ProfileFormData>(key: K, value: ProfileFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const toggleInArray = <T extends string>(arr: T[], item: T): T[] =>
    arr.includes(item) ? arr.filter((v) => v !== item) : [...arr, item];

  // ---- navigation ----

  const goNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((s) => s + 1);
    }
  };

  const goPrev = () => {
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
    } else {
      navigation.goBack();
    }
  };

  // ---- AI extraction ----

  const handleExtract = useCallback(async () => {
    if (!formData.description.trim()) {
      Alert.alert('提示', '请先输入自然语言描述');
      return;
    }
    try {
      setExtracting(true);
      const response = await fetch('/api/v1/dating/profile/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: formData.description }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      setExtractionResult(data.extracted as AIExtractionResult);

      // Merge extracted data into form
      if (data.profile) {
        const p = data.profile;
        if (p.basicConditions) {
          const bc = p.basicConditions;
          if (bc.ageRange) updateField('ageRange', bc.ageRange);
          if (bc.heightRange) updateField('heightRange', bc.heightRange);
          if (bc.education) updateField('education', bc.education);
          if (bc.income) updateField('income', bc.income);
        }
        if (p.personality) {
          const ps = p.personality;
          if (ps.mbti) updateField('mbti', ps.mbti as MBTIType[]);
          if (ps.preferredTraits) updateField('preferredTraits', ps.preferredTraits as PersonalityTrait[]);
          if (ps.dislikedTraits) updateField('dislikedTraits', ps.dislikedTraits as PersonalityTrait[]);
        }
        if (p.interests) {
          const ip = p.interests;
          if (ip.interests) {
            updateField('interestCategories', ip.interests.map((i: any) => i.category) as InterestCategory[]);
          }
          if (ip.customInterests) updateField('customInterests', ip.customInterests);
        }
        if (p.lifestyle) {
          const ls = p.lifestyle;
          if (ls.smoking) updateField('smoking', ls.smoking);
          if (ls.drinking) updateField('drinking', ls.drinking);
          if (ls.pets) updateField('pets', ls.pets);
          if (ls.exercise) updateField('exercise', ls.exercise);
          if (ls.diet) updateField('diet', ls.diet);
        }
        if (p.expectations) {
          const ex = p.expectations;
          if (ex.purpose) updateField('purpose', ex.purpose);
          if (ex.pace) updateField('pace', ex.pace);
          if (ex.living) updateField('living', ex.living);
          if (ex.familyPlan) updateField('familyPlan', ex.familyPlan);
        }
      }

      Alert.alert('成功', 'AI 已从描述中提取偏好信息');
    } catch (error) {
      Alert.alert('错误', 'AI 提取失败，请重试');
    } finally {
      setExtracting(false);
    }
  }, [formData.description]);

  // ---- submit ----

  const handleSubmit = useCallback(async () => {
    try {
      setSubmitting(true);

      const location: LocationPreference = {
        radiusKm: formData.locationRadius,
        sameCity: formData.sameCity,
      };

      const payload: CreateDatingProfileRequest = {
        agentId: '', // populated server-side
        basicConditions: {
          ageRange: formData.ageRange || undefined,
          heightRange: formData.heightRange || undefined,
          education: formData.education || undefined,
          income: formData.income || undefined,
          location,
        },
        personality: {
          mbti: formData.mbti.length > 0 ? formData.mbti : undefined,
          traits: formData.traits.length > 0 ? formData.traits : undefined,
          preferredTraits: formData.preferredTraits.length > 0 ? formData.preferredTraits : undefined,
          dislikedTraits: formData.dislikedTraits.length > 0 ? formData.dislikedTraits : undefined,
        },
        interests: {
          interests: formData.interestCategories.map((cat) => ({ category: cat, name: INTEREST_CATEGORY_LABELS[cat] || cat })),
          customInterests: formData.customInterests.length > 0 ? formData.customInterests : undefined,
        },
        lifestyle: {
          smoking: formData.smoking || undefined,
          drinking: formData.drinking || undefined,
          pets: formData.pets || undefined,
          exercise: formData.exercise || undefined,
          diet: formData.diet || undefined,
        },
        expectations: {
          purpose: formData.purpose || DatingPurpose.NOT_SURE,
          pace: formData.pace || undefined,
          living: formData.living || undefined,
          familyPlan: formData.familyPlan || undefined,
        },
        description: formData.description || undefined,
      };

      const response = await fetch('/api/v1/dating/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      Alert.alert('成功', '约会资料已创建', [
        { text: '确定', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('错误', '提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  }, [formData, navigation]);

  // ---- step renderers ----

  const renderStepIndicator = () => (
    <View style={localStyles.stepIndicator}>
      {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
        <View
          key={step}
          style={[
            localStyles.stepDot,
            step === currentStep && localStyles.stepDotActive,
            step < currentStep && localStyles.stepDotCompleted,
          ]}
        />
      ))}
    </View>
  );

  const renderHeader = () => (
    <View style={localStyles.header}>
      <TouchableOpacity onPress={goPrev} style={localStyles.backButton}>
        <Text style={localStyles.backButtonText}>{'<'}</Text>
      </TouchableOpacity>
      <Text style={localStyles.headerTitle}>{STEP_TITLES[currentStep]}</Text>
      <View style={localStyles.headerSpacer} />
    </View>
  );

  // -- Step 1: Basic Conditions --
  const renderBasicConditions = () => (
    <View style={localStyles.stepContainer}>
      <Text style={localStyles.stepDescription}>设置您对潜在匹配对象的基本条件要求</Text>

      <Text style={localStyles.fieldLabel}>年龄范围</Text>
      <PillSelector
        options={(Object.values(AgeRangePreference) as string[]).map((v) => ({ value: v, label: DATING_AGE_RANGE_LABELS[v as AgeRangePreference] }))}
        selected={formData.ageRange ? [formData.ageRange] : []}
        onSelect={(v) => updateField('ageRange', formData.ageRange === v ? null : (v as AgeRangePreference))}
      />

      <Text style={localStyles.fieldLabel}>身高范围</Text>
      <PillSelector
        options={(Object.values(HeightRange) as string[]).map((v) => ({ value: v, label: HEIGHT_RANGE_LABELS[v as HeightRange] }))}
        selected={formData.heightRange ? [formData.heightRange] : []}
        onSelect={(v) => updateField('heightRange', formData.heightRange === v ? null : (v as HeightRange))}
      />

      <Text style={localStyles.fieldLabel}>学历要求</Text>
      <PillSelector
        options={(Object.values(EducationPreference) as string[]).map((v) => ({ value: v, label: DATING_EDUCATION_LABELS[v as EducationPreference] }))}
        selected={formData.education ? [formData.education] : []}
        onSelect={(v) => updateField('education', formData.education === v ? null : (v as EducationPreference))}
      />

      <Text style={localStyles.fieldLabel}>收入范围</Text>
      <PillSelector
        options={(Object.values(IncomeRange) as string[]).map((v) => ({ value: v, label: INCOME_LABELS[v as IncomeRange] }))}
        selected={formData.income ? [formData.income] : []}
        onSelect={(v) => updateField('income', formData.income === v ? null : (v as IncomeRange))}
      />

      <StepperControl
        label="搜索半径"
        value={formData.locationRadius}
        min={5}
        max={200}
        step={5}
        unit="km"
        onChange={(v) => updateField('locationRadius', v)}
      />

      <View style={localStyles.switchRow}>
        <Text style={localStyles.fieldLabel}>仅同城</Text>
        <Switch
          value={formData.sameCity}
          onValueChange={(v) => updateField('sameCity', v)}
          trackColor={{ false: '#E0E0E0', true: '#4CAF50' }}
        />
      </View>
    </View>
  );

  // -- Step 2: Personality --
  const renderPersonality = () => (
    <View style={localStyles.stepContainer}>
      <Text style={localStyles.stepDescription}>描述您的性格特征和偏好</Text>

      <Text style={localStyles.fieldLabel}>MBTI 类型（可多选）</Text>
      <PillSelector
        options={(Object.values(MBTIType) as string[]).filter((v) => v !== MBTIType.NO_PREFERENCE).map((v) => ({ value: v, label: MBTI_LABELS[v] || v }))}
        selected={formData.mbti}
        onSelect={(v) => updateField('mbti', toggleInArray(formData.mbti, v as MBTIType))}
        multi
      />

      <Text style={localStyles.fieldLabel}>您的性格特质</Text>
      <PillSelector
        options={(Object.values(PersonalityTrait) as string[]).map((v) => ({ value: v, label: PERSONALITY_TRAIT_LABELS[v] || v }))}
        selected={formData.traits}
        onSelect={(v) => updateField('traits', toggleInArray(formData.traits, v as PersonalityTrait))}
        multi
      />

      <Text style={localStyles.fieldLabel}>期望对方的特质</Text>
      <PillSelector
        options={(Object.values(PersonalityTrait) as string[]).map((v) => ({ value: v, label: PERSONALITY_TRAIT_LABELS[v] || v }))}
        selected={formData.preferredTraits}
        onSelect={(v) => updateField('preferredTraits', toggleInArray(formData.preferredTraits, v as PersonalityTrait))}
        multi
      />

      <Text style={localStyles.fieldLabel}>不喜欢的特质</Text>
      <PillSelector
        options={(Object.values(PersonalityTrait) as string[]).map((v) => ({ value: v, label: PERSONALITY_TRAIT_LABELS[v] || v }))}
        selected={formData.dislikedTraits}
        onSelect={(v) => updateField('dislikedTraits', toggleInArray(formData.dislikedTraits, v as PersonalityTrait))}
        multi
      />
    </View>
  );

  // -- Step 3: Interests (rendered via InterestsStepComponent) --

  // -- Step 4: Lifestyle --
  const renderLifestyle = () => (
    <View style={localStyles.stepContainer}>
      <Text style={localStyles.stepDescription}>描述您的生活习惯</Text>

      <Text style={localStyles.fieldLabel}>吸烟</Text>
      <PillSelector
        options={(Object.values(SmokingHabit) as string[]).map((v) => ({ value: v, label: SMOKING_LABELS[v] || v }))}
        selected={formData.smoking ? [formData.smoking] : []}
        onSelect={(v) => updateField('smoking', formData.smoking === v ? null : (v as SmokingHabit))}
      />

      <Text style={localStyles.fieldLabel}>饮酒</Text>
      <PillSelector
        options={(Object.values(DrinkingHabit) as string[]).map((v) => ({ value: v, label: DRINKING_LABELS[v] || v }))}
        selected={formData.drinking ? [formData.drinking] : []}
        onSelect={(v) => updateField('drinking', formData.drinking === v ? null : (v as DrinkingHabit))}
      />

      <Text style={localStyles.fieldLabel}>宠物</Text>
      <PillSelector
        options={(Object.values(PetPreference) as string[]).map((v) => ({ value: v, label: PET_LABELS[v] || v }))}
        selected={formData.pets ? [formData.pets] : []}
        onSelect={(v) => updateField('pets', formData.pets === v ? null : (v as PetPreference))}
      />

      <Text style={localStyles.fieldLabel}>运动频率</Text>
      <PillSelector
        options={(Object.values(ExerciseFrequency) as string[]).map((v) => ({ value: v, label: EXERCISE_LABELS[v] || v }))}
        selected={formData.exercise ? [formData.exercise] : []}
        onSelect={(v) => updateField('exercise', formData.exercise === v ? null : (v as ExerciseFrequency))}
      />

      <Text style={localStyles.fieldLabel}>饮食习惯</Text>
      <PillSelector
        options={(Object.values(DietPreference) as string[]).map((v) => ({ value: v, label: DIET_LABELS[v] || v }))}
        selected={formData.diet ? [formData.diet] : []}
        onSelect={(v) => updateField('diet', formData.diet === v ? null : (v as DietPreference))}
      />
    </View>
  );

  // -- Step 5: Expectations --
  const renderExpectations = () => (
    <View style={localStyles.stepContainer}>
      <Text style={localStyles.stepDescription}>设定您对关系的期望</Text>

      <Text style={localStyles.fieldLabel}>约会目的</Text>
      <PillSelector
        options={(Object.values(DatingPurpose) as string[]).map((v) => ({ value: v, label: DATING_PURPOSE_LABELS[v as DatingPurpose] }))}
        selected={formData.purpose ? [formData.purpose] : []}
        onSelect={(v) => updateField('purpose', formData.purpose === v ? null : (v as DatingPurpose))}
      />

      <Text style={localStyles.fieldLabel}>关系节奏</Text>
      <PillSelector
        options={(Object.values(RelationshipPace) as string[]).map((v) => ({ value: v, label: PACE_LABELS[v] || v }))}
        selected={formData.pace ? [formData.pace] : []}
        onSelect={(v) => updateField('pace', formData.pace === v ? null : (v as RelationshipPace))}
      />

      <Text style={localStyles.fieldLabel}>居住情况</Text>
      <PillSelector
        options={(Object.values(LivingArrangement) as string[]).map((v) => ({ value: v, label: LIVING_LABELS[v] || v }))}
        selected={formData.living ? [formData.living] : []}
        onSelect={(v) => updateField('living', formData.living === v ? null : (v as LivingArrangement))}
      />

      <Text style={localStyles.fieldLabel}>家庭计划</Text>
      <PillSelector
        options={(Object.values(FamilyPlan) as string[]).map((v) => ({ value: v, label: FAMILY_PLAN_LABELS[v] || v }))}
        selected={formData.familyPlan ? [formData.familyPlan] : []}
        onSelect={(v) => updateField('familyPlan', formData.familyPlan === v ? null : (v as FamilyPlan))}
      />
    </View>
  );

  // -- Step 6: AI Natural Language --
  const renderAINLInput = () => (
    <View style={localStyles.stepContainer}>
      <Text style={localStyles.stepDescription}>
        用自然语言描述您理想中的伴侣，AI 将自动提取关键偏好
      </Text>

      <TextInput
        style={localStyles.multilineInput}
        multiline
        textAlignVertical="top"
        placeholder="例如：我希望找一个26-30岁、本科以上学历的女生，性格温柔但有主见，喜欢旅行和美食，不抽烟，偶尔小酌，有运动习惯..."
        value={formData.description}
        onChangeText={(v) => updateField('description', v)}
        maxLength={2000}
      />

      <Text style={localStyles.charCount}>{formData.description.length}/2000</Text>

      <TouchableOpacity
        style={[localStyles.extractButton, extracting && localStyles.extractButtonDisabled]}
        onPress={handleExtract}
        disabled={extracting}
      >
        {extracting ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={localStyles.extractButtonText}>智能提炼</Text>
        )}
      </TouchableOpacity>

      {extractionResult && (
        <View style={localStyles.extractionResult}>
          <Text style={localStyles.extractionTitle}>提取结果</Text>
          <Text style={localStyles.extractionConfidence}>
            置信度: {Math.round(extractionResult.confidence * 100)}%
          </Text>
          {extractionResult.suggestions.length > 0 && (
            <View>
              <Text style={localStyles.extractionSubtitle}>建议:</Text>
              {extractionResult.suggestions.map((s, i) => (
                <Text key={i} style={localStyles.extractionItem}>- {s}</Text>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );

  // -- Step 7: Summary --
  const renderSummary = () => {
    const summaryItems: { label: string; value: string }[] = [];

    if (formData.ageRange) summaryItems.push({ label: '年龄范围', value: DATING_AGE_RANGE_LABELS[formData.ageRange] });
    if (formData.heightRange) summaryItems.push({ label: '身高范围', value: HEIGHT_RANGE_LABELS[formData.heightRange] });
    if (formData.education) summaryItems.push({ label: '学历', value: DATING_EDUCATION_LABELS[formData.education] });
    if (formData.income) summaryItems.push({ label: '收入', value: INCOME_LABELS[formData.income] });
    summaryItems.push({ label: '搜索半径', value: `${formData.locationRadius}km` });
    if (formData.sameCity) summaryItems.push({ label: '同城', value: '是' });

    if (formData.mbti.length > 0) summaryItems.push({ label: 'MBTI', value: formData.mbti.join(', ') });
    if (formData.traits.length > 0) summaryItems.push({ label: '性格特质', value: formData.traits.map((t) => PERSONALITY_TRAIT_LABELS[t] || t).join('、') });
    if (formData.preferredTraits.length > 0) summaryItems.push({ label: '期望特质', value: formData.preferredTraits.map((t) => PERSONALITY_TRAIT_LABELS[t] || t).join('、') });
    if (formData.dislikedTraits.length > 0) summaryItems.push({ label: '不喜欢的特质', value: formData.dislikedTraits.map((t) => PERSONALITY_TRAIT_LABELS[t] || t).join('、') });

    if (formData.interestCategories.length > 0) summaryItems.push({ label: '兴趣', value: formData.interestCategories.map((c) => INTEREST_CATEGORY_LABELS[c] || c).join('、') });
    if (formData.customInterests.length > 0) summaryItems.push({ label: '自定义兴趣', value: formData.customInterests.join('、') });

    if (formData.smoking) summaryItems.push({ label: '吸烟', value: SMOKING_LABELS[formData.smoking] || formData.smoking });
    if (formData.drinking) summaryItems.push({ label: '饮酒', value: DRINKING_LABELS[formData.drinking] || formData.drinking });
    if (formData.pets) summaryItems.push({ label: '宠物', value: PET_LABELS[formData.pets] || formData.pets });
    if (formData.exercise) summaryItems.push({ label: '运动', value: EXERCISE_LABELS[formData.exercise] || formData.exercise });
    if (formData.diet) summaryItems.push({ label: '饮食', value: DIET_LABELS[formData.diet] || formData.diet });

    if (formData.purpose) summaryItems.push({ label: '约会目的', value: DATING_PURPOSE_LABELS[formData.purpose] });
    if (formData.pace) summaryItems.push({ label: '关系节奏', value: PACE_LABELS[formData.pace] || formData.pace });
    if (formData.living) summaryItems.push({ label: '居住', value: LIVING_LABELS[formData.living] || formData.living });
    if (formData.familyPlan) summaryItems.push({ label: '家庭计划', value: FAMILY_PLAN_LABELS[formData.familyPlan] || formData.familyPlan });

    if (formData.description) summaryItems.push({ label: '自我描述', value: formData.description });

    return (
      <View style={localStyles.stepContainer}>
        <Text style={localStyles.stepDescription}>请确认以下资料信息</Text>

        {summaryItems.length === 0 ? (
          <Text style={localStyles.emptySummary}>尚未填写任何信息，请返回之前的步骤完善资料。</Text>
        ) : (
          summaryItems.map((item, idx) => (
            <View key={idx} style={localStyles.summaryRow}>
              <Text style={localStyles.summaryLabel}>{item.label}</Text>
              <Text style={localStyles.summaryValue} numberOfLines={3}>{item.value}</Text>
            </View>
          ))
        )}
      </View>
    );
  };

  // ---- render ----

  const stepRenderers: Record<number, () => React.ReactNode> = {
    1: renderBasicConditions,
    2: renderPersonality,
    3: () => (
      <InterestsStepComponent
        interestCategories={formData.interestCategories}
        customInterests={formData.customInterests}
        onUpdateField={updateField}
        toggleInArray={toggleInArray}
      />
    ),
    4: renderLifestyle,
    5: renderExpectations,
    6: renderAINLInput,
    7: renderSummary,
  };

  return (
    <View style={localStyles.container}>
      {renderHeader()}
      {renderStepIndicator()}
      <ScrollView style={localStyles.scrollView} keyboardShouldPersistTaps="handled">
        {stepRenderers[currentStep]?.()}

        <View style={localStyles.navButtons}>
          {currentStep > 1 && (
            <TouchableOpacity style={localStyles.prevButton} onPress={goPrev}>
              <Text style={localStyles.prevButtonText}>上一步</Text>
            </TouchableOpacity>
          )}
          {currentStep < TOTAL_STEPS ? (
            <TouchableOpacity style={localStyles.nextButton} onPress={goNext}>
              <Text style={localStyles.nextButtonText}>下一步</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[localStyles.submitButton, submitting && localStyles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={localStyles.submitButtonText}>提交资料</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

// ============================================
// Styles
// ============================================

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },

  // Header
  header: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 22,
    color: '#007AFF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  headerSpacer: {
    width: 38,
  },

  // Step indicator
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D0D0D0',
    marginHorizontal: 6,
  },
  stepDotActive: {
    backgroundColor: '#007AFF',
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  stepDotCompleted: {
    backgroundColor: '#4CAF50',
  },

  // Step container
  stepContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 20,
  },

  // Field label
  fieldLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333333',
    marginTop: 16,
    marginBottom: 8,
  },

  // Pill selector
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pill: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  pillSelected: {
    backgroundColor: '#007AFF',
  },
  pillText: {
    fontSize: 13,
    color: '#555555',
  },
  pillTextSelected: {
    color: '#FFFFFF',
  },

  // Stepper
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperBtnText: {
    fontSize: 20,
    color: '#333333',
    fontWeight: '600',
  },
  stepperValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginHorizontal: 16,
    minWidth: 60,
    textAlign: 'center',
  },

  // Switch
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },

  // Text input
  textInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333333',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 8,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Multiline input
  multilineInput: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14,
    color: '#333333',
    minHeight: 160,
    lineHeight: 20,
  },
  charCount: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 12,
  },

  // Extract button
  extractButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  extractButtonDisabled: {
    opacity: 0.6,
  },
  extractButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Extraction result
  extractionResult: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F0FFF0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  extractionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 4,
  },
  extractionConfidence: {
    fontSize: 13,
    color: '#388E3C',
    marginBottom: 8,
  },
  extractionSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  extractionItem: {
    fontSize: 13,
    color: '#555555',
    lineHeight: 18,
    marginBottom: 2,
  },

  // Navigation buttons
  navButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  prevButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D0D0D0',
    marginRight: 8,
  },
  prevButtonText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#007AFF',
    marginLeft: 8,
  },
  nextButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    marginLeft: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666666',
    width: 100,
    fontWeight: '500',
  },
  summaryValue: {
    flex: 1,
    fontSize: 14,
    color: '#333333',
    textAlign: 'right',
  },
  emptySummary: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    paddingVertical: 24,
  },
});

export default DatingProfileSetupScreen;
