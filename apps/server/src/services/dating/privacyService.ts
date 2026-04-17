import type {
  DatingProfile,
  PrivacySettings,
  VisibilityLevel,
  FieldVisibility,
} from '@bridgeai/shared';

/**
 * Field definitions with sensitivity levels
 */
export const FIELD_DEFINITIONS: Record<string, {
  category: string;
  sensitivity: 'high' | 'medium' | 'low';
  defaultVisibility: VisibilityLevel;
}> = {
  ageRange: { category: 'basicInfo', sensitivity: 'low', defaultVisibility: 'PUBLIC' },
  heightRange: { category: 'basicInfo', sensitivity: 'low', defaultVisibility: 'PUBLIC' },
  education: { category: 'basicInfo', sensitivity: 'low', defaultVisibility: 'PUBLIC' },
  photos: { category: 'photos', sensitivity: 'medium', defaultVisibility: 'PUBLIC' },
  income: { category: 'income', sensitivity: 'high', defaultVisibility: 'MATCHED_ONLY' },
  location: { category: 'location', sensitivity: 'medium', defaultVisibility: 'MATCHED_ONLY' },
  phone: { category: 'contactInfo', sensitivity: 'high', defaultVisibility: 'PRIVATE' },
  wechat: { category: 'contactInfo', sensitivity: 'high', defaultVisibility: 'PRIVATE' },
  address: { category: 'location', sensitivity: 'high', defaultVisibility: 'PRIVATE' },
  occupation: { category: 'basicInfo', sensitivity: 'low', defaultVisibility: 'PUBLIC' },
  company: { category: 'basicInfo', sensitivity: 'medium', defaultVisibility: 'MATCHED_ONLY' },
  personality: { category: 'personalDetails', sensitivity: 'low', defaultVisibility: 'PUBLIC' },
  interests: { category: 'personalDetails', sensitivity: 'low', defaultVisibility: 'PUBLIC' },
  lifestyle: { category: 'personalDetails', sensitivity: 'low', defaultVisibility: 'PUBLIC' },
  expectations: { category: 'personalDetails', sensitivity: 'low', defaultVisibility: 'PUBLIC' },
  description: { category: 'personalDetails', sensitivity: 'low', defaultVisibility: 'PUBLIC' },
};

/**
 * Sensitive fields that require special protection
 */
export const SENSITIVE_FIELDS = [
  'income',
  'phone',
  'email',
  'wechat',
  'address',
  'detailedLocation',
];

/**
 * Get visible fields based on relationship stage
 */
export function getVisibleFieldsAtStage(
  profile: DatingProfile,
  stage: 'initial' | 'matched' | 'chatting' | 'meeting' | 'committed',
  isOwner: boolean,
  isMatched: boolean
): string[] {
  if (isOwner) {
    return Object.keys(FIELD_DEFINITIONS);
  }

  const visibility = profile.privacySettings;
  const visibleFields: string[] = [];

  // Always visible fields
  const alwaysVisible = ['ageRange', 'education', 'personality', 'interests'];
  visibleFields.push(...alwaysVisible);

  // Check profile visibility setting
  if (visibility.profileVisibility === 'PRIVATE') {
    return visibleFields;
  }

  if (visibility.profileVisibility === 'MATCHED_ONLY' && !isMatched) {
    return visibleFields;
  }

  // Check field-level visibility
  Object.entries(visibility.fieldVisibility || {}).forEach(([field, level]) => {
    if (shouldFieldBeVisible(level as VisibilityLevel, stage, isMatched)) {
      visibleFields.push(field);
    }
  });

  // Add fields based on disclosure stages
  if (visibility.disclosureStages) {
    const currentStage = visibility.disclosureStages.find(s => s.stage === stage);
    if (currentStage) {
      visibleFields.push(...currentStage.fields);
    }
  }

  return [...new Set(visibleFields)];
}

/**
 * Check if a field should be visible at the given level
 */
function shouldFieldBeVisible(
  visibility: VisibilityLevel,
  stage: string,
  isMatched: boolean
): boolean {
  switch (visibility) {
    case 'PUBLIC':
      return true;
    case 'MATCHED_ONLY':
      return isMatched;
    case 'VERIFIED_ONLY':
      // Would need to check if viewer is verified
      return isMatched;
    case 'PRIVATE':
      return false;
    default:
      return false;
  }
}

/**
 * Filter profile data based on visibility settings
 */
export function filterProfileForViewer(
  profile: DatingProfile,
  viewerUserId: string,
  relationshipStage: 'initial' | 'matched' | 'chatting' | 'meeting' | 'committed' = 'initial',
  isMatched: boolean = false
): Partial<DatingProfile> {
  const isOwner = profile.userId === viewerUserId;

  if (isOwner) {
    return profile;
  }

  const visibleFields = getVisibleFieldsAtStage(
    profile,
    relationshipStage,
    isOwner,
    isMatched
  );

  const filtered: Partial<DatingProfile> = {
    id: profile.id,
    agentId: profile.agentId,
    isActive: profile.isActive,
  };

  // Filter basic conditions
  if (profile.basicConditions && visibleFields.some(f => ['ageRange', 'heightRange', 'education', 'location'].includes(f))) {
    filtered.basicConditions = {};
    if (visibleFields.includes('ageRange')) {
      filtered.basicConditions.ageRange = profile.basicConditions.ageRange;
    }
    if (visibleFields.includes('heightRange')) {
      filtered.basicConditions.heightRange = profile.basicConditions.heightRange;
    }
    if (visibleFields.includes('education')) {
      filtered.basicConditions.education = profile.basicConditions.education;
    }
    if (visibleFields.includes('income')) {
      filtered.basicConditions.income = profile.basicConditions.income;
    }
    if (visibleFields.includes('location') && profile.basicConditions.location) {
      filtered.basicConditions.location = {
        province: profile.basicConditions.location.province,
        city: profile.basicConditions.location.city,
      };
    }
  }

  // Filter personality
  if (visibleFields.includes('personality')) {
    filtered.personality = profile.personality;
  }

  // Filter interests
  if (visibleFields.includes('interests')) {
    filtered.interests = profile.interests;
  }

  // Filter lifestyle
  if (visibleFields.includes('lifestyle')) {
    filtered.lifestyle = profile.lifestyle;
  }

  // Filter expectations
  if (visibleFields.includes('expectations')) {
    filtered.expectations = profile.expectations;
  }

  // Filter description
  if (visibleFields.includes('description')) {
    filtered.description = profile.description;
  }

  return filtered;
}

/**
 * Check if user can access specific field
 */
export function canAccessField(
  profile: DatingProfile,
  field: string,
  viewerUserId: string,
  relationshipStage: 'initial' | 'matched' | 'chatting' | 'meeting' | 'committed',
  isMatched: boolean,
  isVerified: boolean = false
): boolean {
  // Owner can always access
  if (profile.userId === viewerUserId) {
    return true;
  }

  // Check profile visibility
  const visibility = profile.privacySettings;

  if (visibility.profileVisibility === 'PRIVATE') {
    return false;
  }

  if (visibility.profileVisibility === 'MATCHED_ONLY' && !isMatched) {
    return false;
  }

  if (visibility.profileVisibility === 'VERIFIED_ONLY' && !isVerified) {
    return false;
  }

  // Check field-level visibility
  const fieldVisibility = visibility.fieldVisibility || {};
  const fieldLevel = (fieldVisibility as any)[field] || 'PUBLIC';

  return shouldFieldBeVisible(fieldLevel, relationshipStage, isMatched);
}

/**
 * Validate privacy settings
 */
export function validatePrivacySettings(settings: Partial<PrivacySettings>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate profile visibility
  if (settings.profileVisibility) {
    const validLevels = ['PUBLIC', 'MATCHED_ONLY', 'VERIFIED_ONLY', 'PRIVATE'];
    if (!validLevels.includes(settings.profileVisibility)) {
      errors.push('Invalid profile visibility level');
    }
  }

  // Validate field visibility
  if (settings.fieldVisibility) {
    const validLevels = ['PUBLIC', 'MATCHED_ONLY', 'VERIFIED_ONLY', 'PRIVATE'];
    Object.entries(settings.fieldVisibility).forEach(([field, level]) => {
      if (!validLevels.includes(level as string)) {
        errors.push(`Invalid visibility level for field ${field}`);
      }
    });
  }

  // Validate disclosure stages
  if (settings.disclosureStages) {
    const validStages = ['initial', 'matched', 'chatting', 'meeting', 'committed'];
    settings.disclosureStages.forEach(stage => {
      if (!validStages.includes(stage.stage)) {
        errors.push(`Invalid disclosure stage: ${stage.stage}`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get default privacy settings
 */
export function getDefaultPrivacySettings(): PrivacySettings {
  return {
    profileVisibility: 'PUBLIC',
    fieldVisibility: {
      basicInfo: 'PUBLIC',
      photos: 'PUBLIC',
      income: 'MATCHED_ONLY',
      location: 'MATCHED_ONLY',
      contactInfo: 'PRIVATE',
      personalDetails: 'PUBLIC',
    },
    allowScreenshot: false,
    showOnlineStatus: true,
    hideFromSearch: false,
  };
}

/**
 * Get recommended privacy settings for different privacy levels
 */
export function getRecommendedPrivacySettings(
  level: 'low' | 'medium' | 'high'
): PrivacySettings {
  const base: PrivacySettings = {
    profileVisibility: 'PUBLIC',
    fieldVisibility: {
      basicInfo: 'PUBLIC',
      photos: 'PUBLIC',
      income: 'MATCHED_ONLY',
      location: 'MATCHED_ONLY',
      contactInfo: 'PRIVATE',
      personalDetails: 'PUBLIC',
    },
    allowScreenshot: false,
    showOnlineStatus: true,
    hideFromSearch: false,
  };

  switch (level) {
    case 'low':
      return base;

    case 'medium':
      return {
        ...base,
        profileVisibility: 'MATCHED_ONLY',
        fieldVisibility: {
          ...base.fieldVisibility,
          photos: 'MATCHED_ONLY',
          personalDetails: 'MATCHED_ONLY',
        },
      };

    case 'high':
      return {
        ...base,
        profileVisibility: 'VERIFIED_ONLY',
        fieldVisibility: {
          basicInfo: 'MATCHED_ONLY',
          photos: 'MATCHED_ONLY',
          income: 'PRIVATE',
          location: 'PRIVATE',
          contactInfo: 'PRIVATE',
          personalDetails: 'MATCHED_ONLY',
        },
        showOnlineStatus: false,
      };

    default:
      return base;
  }
}

/**
 * Check if field contains sensitive information
 */
export function isSensitiveField(field: string): boolean {
  return SENSITIVE_FIELDS.includes(field);
}

/**
 * Mask sensitive field value
 */
export function maskFieldValue(field: string, value: string): string {
  if (!isSensitiveField(field)) {
    return value;
  }

  if (!value || value.length < 4) {
    return '***';
  }

  // Show first and last characters, mask middle
  const first = value.charAt(0);
  const last = value.charAt(value.length - 1);
  const masked = '*'.repeat(Math.min(value.length - 2, 8));

  return `${first}${masked}${last}`;
}

/**
 * Get disclosure recommendations
 */
export function getDisclosureRecommendations(
  profile: DatingProfile
): Array<{
  field: string;
  currentVisibility: VisibilityLevel;
  recommendedVisibility: VisibilityLevel;
  reason: string;
}> {
  const recommendations: Array<{
    field: string;
    currentVisibility: VisibilityLevel;
    recommendedVisibility: VisibilityLevel;
    reason: string;
  }> = [];

  const visibility = profile.privacySettings.fieldVisibility || {};

  // Recommend protecting income
  if (profile.basicConditions?.income && visibility.income === 'PUBLIC') {
    recommendations.push({
      field: 'income',
      currentVisibility: 'PUBLIC',
      recommendedVisibility: 'MATCHED_ONLY',
      reason: '收入信息属于敏感信息，建议仅匹配后可见',
    });
  }

  // Recommend protecting location
  if (profile.basicConditions?.location?.district && visibility.location === 'PUBLIC') {
    recommendations.push({
      field: 'location',
      currentVisibility: 'PUBLIC',
      recommendedVisibility: 'MATCHED_ONLY',
      reason: '详细地址信息建议仅匹配后可见，保护个人安全',
    });
  }

  return recommendations;
}
