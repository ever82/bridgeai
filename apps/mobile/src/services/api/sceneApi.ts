/**
 * Scene API Service
 * 场景 API 服务
 */

import { SceneId, SceneConfig, SceneCapability, SceneTemplate } from '@bridgeai/shared';

import { api } from './client';

export interface SceneInfo {
  id: SceneId;
  name: string;
  description: string;
  icon: string;
  color: string;
  isActive: boolean;
  fieldCount: number;
  capabilityCount: number;
}

export interface MigrationPreview {
  migration: {
    fromScene: SceneId;
    toScene: SceneId;
    fieldMappings: Array<{
      sourceField: string;
      targetField: string;
      transform?: string;
    }>;
    transformations: Array<{
      field: string;
      type: string;
      config: Record<string, any>;
    }>;
    warnings: string[];
  };
  currentData: Record<string, any>;
  previewData: Record<string, any>;
  willLoseData: string[];
  needsManualInput: string[];
}

export interface MigrationResult {
  success: boolean;
  newProfileId: string;
  migratedFields: string[];
  lostFields: string[];
}

export const sceneApi = {
  /**
   * Get all scenes
   */
  getScenes: async (): Promise<{ success: boolean; data: SceneInfo[] }> => {
    const response = await api.get<SceneInfo[]>('/scenes');
    return response.data;
  },

  /**
   * Get active scenes
   */
  getActiveScenes: async (): Promise<{ success: boolean; data: SceneInfo[] }> => {
    const response = await api.get<SceneInfo[]>('/scenes/active');
    return response.data;
  },

  /**
   * Get scene configuration
   */
  getSceneConfig: async (sceneId: SceneId): Promise<{ success: boolean; data: SceneConfig }> => {
    const response = await api.get<SceneConfig>(`/scenes/${sceneId}`);
    return response.data;
  },

  /**
   * Get scene fields
   */
  getSceneFields: async (sceneId: SceneId): Promise<{ success: boolean; data: any[] }> => {
    const response = await api.get<any[]>(`/scenes/${sceneId}/fields`);
    return response.data;
  },

  /**
   * Get scene UI configuration
   */
  getSceneUI: async (sceneId: SceneId): Promise<{ success: boolean; data: any }> => {
    const response = await api.get<any>(`/scenes/${sceneId}/ui`);
    return response.data;
  },

  /**
   * Get scene capabilities
   */
  getSceneCapabilities: async (sceneId: SceneId): Promise<{ success: boolean; data: SceneCapability[] }> => {
    const response = await api.get<SceneCapability[]>(`/scenes/${sceneId}/capabilities`);
    return response.data;
  },

  /**
   * Get all scene capabilities (including disabled)
   */
  getAllSceneCapabilities: async (sceneId: SceneId): Promise<{ success: boolean; data: any[] }> => {
    const response = await api.get<any[]>(`/scenes/${sceneId}/capabilities/all`);
    return response.data;
  },

  /**
   * Get specific capability status
   */
  getCapabilityStatus: async (
    sceneId: SceneId,
    capabilityId: string
  ): Promise<{ success: boolean; data: any }> => {
    const response = await api.get<any>(`/scenes/${sceneId}/capabilities/${capabilityId}`);
    return response.data;
  },

  /**
   * Get capabilities summary
   */
  getCapabilitiesSummary: async (sceneId: SceneId): Promise<{ success: boolean; data: any }> => {
    const response = await api.get<any>(`/scenes/${sceneId}/capabilities/summary`);
    return response.data;
  },

  /**
   * Get scene templates
   */
  getSceneTemplates: async (
    sceneId: SceneId,
    options?: { includePublic?: boolean; page?: number; limit?: number }
  ): Promise<{ success: boolean; data: { preset: any[]; user: any[] } }> => {
    const params = new URLSearchParams();
    if (options?.includePublic) params.append('includePublic', 'true');
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());

    const response = await api.get<{ preset: any[]; user: any[] }>(
      `/scenes/${sceneId}/templates?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Apply template to agent
   */
  applyTemplate: async (
    sceneId: SceneId,
    templateId: string,
    agentId: string
  ): Promise<{ success: boolean; data: { success: boolean; appliedFields: string[] } }> => {
    const response = await api.post(`/scenes/${sceneId}/templates/${templateId}/apply`, {
      agentId,
    });
    return response.data;
  },

  /**
   * Get default template
   */
  getDefaultTemplate: async (
    sceneId: SceneId
  ): Promise<{ success: boolean; data: SceneTemplate | null }> => {
    const response = await api.get<SceneTemplate | null>(`/scenes/${sceneId}/templates/default`);
    return response.data;
  },

  /**
   * Set default template
   */
  setDefaultTemplate: async (
    sceneId: SceneId,
    templateId: string
  ): Promise<{ success: boolean; data: { success: boolean } }> => {
    const response = await api.post(`/scenes/${sceneId}/templates/default`, {
      templateId,
    });
    return response.data;
  },

  /**
   * Validate migration
   */
  validateMigration: async (
    fromScene: SceneId,
    toScene: SceneId
  ): Promise<{ success: boolean; data: { valid: boolean; reason?: string } }> => {
    const response = await api.post('/scenes/migration/validate', {
      fromScene,
      toScene,
    });
    return response.data;
  },

  /**
   * Preview migration
   */
  previewMigration: async (
    fromScene: SceneId,
    toScene: SceneId,
    agentId: string
  ): Promise<{ success: boolean; data: MigrationPreview }> => {
    const response = await api.post(`/scenes/migration/preview?agentId=${agentId}`, {
      fromScene,
      toScene,
    });
    return response.data;
  },

  /**
   * Execute migration
   */
  executeMigration: async (
    fromScene: SceneId,
    toScene: SceneId,
    agentId: string,
    manualData?: Record<string, any>
  ): Promise<{ success: boolean; data: MigrationResult }> => {
    const response = await api.post(`/scenes/migration/execute?agentId=${agentId}`, {
      fromScene,
      toScene,
      manualData,
    });
    return response.data;
  },

  /**
   * Estimate migration data loss
   */
  estimateMigration: async (
    fromScene: SceneId,
    toScene: SceneId
  ): Promise<{
    success: boolean;
    data: {
      willLoseData: boolean;
      lossPercentage: number;
      lostFields: string[];
    };
  }> => {
    const response = await api.post('/scenes/migration/estimate', {
      fromScene,
      toScene,
    });
    return response.data;
  },

  /**
   * Generate migration plan
   */
  generateMigrationPlan: async (
    fromScene: SceneId,
    toScene: SceneId
  ): Promise<{ success: boolean; data: any }> => {
    const response = await api.post('/scenes/migration/plan', {
      fromScene,
      toScene,
    });
    return response.data;
  },
};

export default sceneApi;
