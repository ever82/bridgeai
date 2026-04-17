/**
 * Credit Threshold Configuration
 * 信用门槛配置
 */

import { CreditLevel } from '@bridgeai/shared';

export interface SceneCreditThreshold {
  sceneId: string;
  sceneName: string;
  minCreditScore: number;
  minCreditLevel: CreditLevel;
  description?: string;
  isActive: boolean;
  exemptions: ExemptionRule[];
  notifications: NotificationConfig;
}

export interface ExemptionRule {
  id: string;
  name: string;
  type: 'user' | 'agent' | 'promotion' | 'manual';
  targetIds?: string[];
  creditScoreOverride?: number;
  validUntil?: Date;
  reason?: string;
  grantedBy?: string;
}

export interface NotificationConfig {
  enabled: boolean;
  notifyOnThresholdChange: boolean;
  notifyOnExemption: boolean;
  notifyOnInsufficient: boolean;
  channels: ('in_app' | 'email' | 'sms')[];
}

/**
 * Default credit thresholds by scene
 */
export const DEFAULT_SCENE_THRESHOLDS: Record<string, SceneCreditThreshold> = {
  visionshare: {
    sceneId: 'visionshare',
    sceneName: '视觉分享',
    minCreditScore: 500,
    minCreditLevel: 'average',
    description: '视觉分享场景的默认信用门槛',
    isActive: true,
    exemptions: [],
    notifications: {
      enabled: true,
      notifyOnThresholdChange: true,
      notifyOnExemption: true,
      notifyOnInsufficient: true,
      channels: ['in_app', 'email'],
    },
  },
  agentdate: {
    sceneId: 'agentdate',
    sceneName: 'Agent约会',
    minCreditScore: 600,
    minCreditLevel: 'good',
    description: 'Agent约会场景的默认信用门槛（较高要求）',
    isActive: true,
    exemptions: [],
    notifications: {
      enabled: true,
      notifyOnThresholdChange: true,
      notifyOnExemption: true,
      notifyOnInsufficient: true,
      channels: ['in_app', 'email'],
    },
  },
  agentjob: {
    sceneId: 'agentjob',
    sceneName: 'Agent求职',
    minCreditScore: 400,
    minCreditLevel: 'average',
    description: 'Agent求职场景的默认信用门槛',
    isActive: true,
    exemptions: [],
    notifications: {
      enabled: true,
      notifyOnThresholdChange: false,
      notifyOnExemption: true,
      notifyOnInsufficient: true,
      channels: ['in_app'],
    },
  },
  agentad: {
    sceneId: 'agentad',
    sceneName: 'Agent广告',
    minCreditScore: 500,
    minCreditLevel: 'average',
    description: 'Agent广告场景的默认信用门槛',
    isActive: true,
    exemptions: [],
    notifications: {
      enabled: true,
      notifyOnThresholdChange: true,
      notifyOnExemption: true,
      notifyOnInsufficient: true,
      channels: ['in_app', 'email'],
    },
  },
};

// In-memory store for scene thresholds (in production, use database)
let sceneThresholds: Map<string, SceneCreditThreshold> = new Map(
  Object.entries(DEFAULT_SCENE_THRESHOLDS)
);

/**
 * Reset scene thresholds to defaults (for testing)
 */
export function resetSceneThresholds(): void {
  // Deep clone to avoid mutating the default thresholds
  const cloned = JSON.parse(JSON.stringify(DEFAULT_SCENE_THRESHOLDS));
  sceneThresholds = new Map(Object.entries(cloned));
}

/**
 * Get credit threshold for a scene
 */
export function getSceneThreshold(sceneId: string): SceneCreditThreshold | undefined {
  return sceneThresholds.get(sceneId);
}

/**
 * Get all scene thresholds
 */
export function getAllSceneThresholds(): SceneCreditThreshold[] {
  return Array.from(sceneThresholds.values());
}

/**
 * Update scene threshold
 */
export function updateSceneThreshold(
  sceneId: string,
  updates: Partial<Omit<SceneCreditThreshold, 'sceneId' | 'sceneName'>>
): SceneCreditThreshold | undefined {
  const existing = sceneThresholds.get(sceneId);
  if (!existing) return undefined;

  const updated: SceneCreditThreshold = {
    ...existing,
    ...updates,
    exemptions: updates.exemptions || existing.exemptions,
    notifications: updates.notifications || existing.notifications,
  };

  sceneThresholds.set(sceneId, updated);
  return updated;
}

/**
 * Add exemption rule
 */
export function addExemptionRule(
  sceneId: string,
  rule: Omit<ExemptionRule, 'id'>
): ExemptionRule | null {
  const threshold = sceneThresholds.get(sceneId);
  if (!threshold) return null;

  const newRule: ExemptionRule = {
    ...rule,
    id: `exemption-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };

  threshold.exemptions.push(newRule);
  sceneThresholds.set(sceneId, threshold);

  return newRule;
}

/**
 * Remove exemption rule
 */
export function removeExemptionRule(sceneId: string, ruleId: string): boolean {
  const threshold = sceneThresholds.get(sceneId);
  if (!threshold) return false;

  const index = threshold.exemptions.findIndex(r => r.id === ruleId);
  if (index === -1) return false;

  threshold.exemptions.splice(index, 1);
  sceneThresholds.set(sceneId, threshold);

  return true;
}

/**
 * Check if user is exempted
 */
export function isUserExempted(
  sceneId: string,
  userId: string,
  agentId?: string
): { exempted: boolean; rule?: ExemptionRule } {
  const threshold = sceneThresholds.get(sceneId);
  if (!threshold) return { exempted: false };

  for (const rule of threshold.exemptions) {
    // Check if exemption has expired
    if (rule.validUntil && new Date() > rule.validUntil) {
      continue;
    }

    // Check user exemption
    if (rule.type === 'user' && rule.targetIds?.includes(userId)) {
      return { exempted: true, rule };
    }

    // Check agent exemption
    if (rule.type === 'agent' && agentId && rule.targetIds?.includes(agentId)) {
      return { exempted: true, rule };
    }

    // Check promotion exemption (applies to all)
    if (rule.type === 'promotion') {
      return { exempted: true, rule };
    }
  }

  return { exempted: false };
}

/**
 * Check if credit score meets scene threshold
 */
export function checkSceneCreditThreshold(
  sceneId: string,
  creditScore: number | null | undefined,
  userId: string,
  agentId?: string
): {
  meetsThreshold: boolean;
  requiredScore: number;
  requiredLevel: CreditLevel;
  exempted: boolean;
  exemptionRule?: ExemptionRule;
} {
  const threshold = sceneThresholds.get(sceneId);

  if (!threshold || !threshold.isActive) {
    return {
      meetsThreshold: true,
      requiredScore: 0,
      requiredLevel: 'poor',
      exempted: false,
    };
  }

  // Check exemption
  const exemption = isUserExempted(sceneId, userId, agentId);
  if (exemption.exempted) {
    return {
      meetsThreshold: true,
      requiredScore: threshold.minCreditScore,
      requiredLevel: threshold.minCreditLevel,
      exempted: true,
      exemptionRule: exemption.rule,
    };
  }

  // Check credit score
  const meetsThreshold = creditScore !== null &&
    creditScore !== undefined &&
    creditScore >= threshold.minCreditScore;

  return {
    meetsThreshold,
    requiredScore: threshold.minCreditScore,
    requiredLevel: threshold.minCreditLevel,
    exempted: false,
  };
}

/**
 * Get threshold change notification message
 */
export function getThresholdChangeNotification(
  sceneId: string,
  oldThreshold: number,
  newThreshold: number
): { title: string; message: string } {
  const threshold = sceneThresholds.get(sceneId);
  const sceneName = threshold?.sceneName || sceneId;

  if (newThreshold > oldThreshold) {
    return {
      title: `${sceneName}信用门槛提高`,
      message: `${sceneName}的最低信用分要求已从 ${oldThreshold} 提高到 ${newThreshold}。请保持良好的信用记录以继续使用该场景。`,
    };
  } else {
    return {
      title: `${sceneName}信用门槛降低`,
      message: `好消息！${sceneName}的最低信用分要求已从 ${oldThreshold} 降低到 ${newThreshold}。`,
    };
  }
}

/**
 * Get insufficient credit notification
 */
export function getInsufficientCreditNotification(
  sceneId: string,
  currentScore: number | null,
  requiredScore: number
): { title: string; message: string } {
  const threshold = sceneThresholds.get(sceneId);
  const sceneName = threshold?.sceneName || sceneId;

  const scoreText = currentScore !== null ? currentScore : '无';
  const gap = requiredScore - (currentScore || 0);

  return {
    title: `信用分不足 - ${sceneName}`,
    message: `您的信用分为 ${scoreText}，${sceneName} 要求最低 ${requiredScore} 分。还需要 ${gap} 分才能使用该场景。`,
  };
}
