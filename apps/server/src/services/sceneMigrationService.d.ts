/**
 * Scene Migration Service
 * 场景迁移服务
 */
import { SceneMigration, SceneId } from '@bridgeai/shared';
/**
 * Generate migration plan between two scenes
 */
export declare function generateMigrationPlan(fromScene: SceneId, toScene: SceneId): SceneMigration;
/**
 * Preview migration result
 */
export declare function previewMigration(agentId: string, fromScene: SceneId, toScene: SceneId): Promise<{
    migration: SceneMigration;
    currentData: Record<string, any>;
    previewData: Record<string, any>;
    willLoseData: string[];
    needsManualInput: string[];
}>;
/**
 * Execute migration
 */
export declare function executeMigration(agentId: string, fromScene: SceneId, toScene: SceneId, manualData?: Record<string, any>): Promise<{
    success: boolean;
    newProfileId: string;
    migratedFields: string[];
    lostFields: string[];
}>;
/**
 * Get migration history
 */
export declare function getMigrationHistory(agentId: string): Promise<Array<{
    id: string;
    fromScene: SceneId;
    toScene: SceneId;
    status: 'pending' | 'completed' | 'failed';
    createdAt: Date;
}>>;
/**
 * Validate if migration is possible
 */
export declare function validateMigration(fromScene: SceneId, toScene: SceneId): {
    valid: boolean;
    reason?: string;
};
/**
 * Estimate data loss
 */
export declare function estimateDataLoss(fromScene: SceneId, toScene: SceneId): {
    willLoseData: boolean;
    lossPercentage: number;
    lostFields: string[];
};
//# sourceMappingURL=sceneMigrationService.d.ts.map