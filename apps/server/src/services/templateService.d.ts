/**
 * Scene Template Service
 * 场景模板服务
 */
import { SceneTemplate, SceneTemplateConfig, SceneId } from '@bridgeai/shared';
/**
 * Create a new template
 */
export declare function createTemplate(userId: string, sceneId: SceneId, config: Omit<SceneTemplateConfig, 'id' | 'isPreset'>, isPublic?: boolean): Promise<SceneTemplate>;
/**
 * Get template by ID
 */
export declare function getTemplate(id: string, userId?: string): Promise<SceneTemplate | null>;
/**
 * Get templates for a scene
 */
export declare function getTemplatesByScene(sceneId: SceneId, options?: {
    userId?: string;
    includePublic?: boolean;
    includePreset?: boolean;
    page?: number;
    limit?: number;
}): Promise<{
    items: SceneTemplate[];
    total: number;
}>;
/**
 * Get preset templates for a scene
 */
export declare function getPresetTemplates(sceneId: SceneId): Promise<SceneTemplate[]>;
/**
 * Update a template
 */
export declare function updateTemplate(id: string, userId: string, updates: Partial<SceneTemplateConfig & {
    isPublic?: boolean;
}>): Promise<SceneTemplate | null>;
/**
 * Delete a template
 */
export declare function deleteTemplate(id: string, userId: string): Promise<boolean>;
/**
 * Apply template to agent profile
 */
export declare function applyTemplate(templateId: string, agentId: string, userId: string): Promise<{
    success: boolean;
    appliedFields: string[];
    skippedFields: string[];
}>;
/**
 * Duplicate a template
 */
export declare function duplicateTemplate(id: string, userId: string, newName?: string): Promise<SceneTemplate | null>;
/**
 * Set default template for user
 */
export declare function setDefaultTemplate(templateId: string, userId: string, sceneId: SceneId): Promise<boolean>;
/**
 * Get default template for scene
 */
export declare function getDefaultTemplate(sceneId: SceneId, userId: string): Promise<SceneTemplate | null>;
/**
 * Share a template (make public)
 */
export declare function shareTemplate(id: string, userId: string): Promise<SceneTemplate | null>;
/**
 * Search templates
 */
export declare function searchTemplates(query: string, options?: {
    sceneId?: SceneId;
    page?: number;
    limit?: number;
}): Promise<{
    items: SceneTemplate[];
    total: number;
}>;
//# sourceMappingURL=templateService.d.ts.map