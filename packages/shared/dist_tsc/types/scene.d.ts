/**
 * Scene Types and Configuration
 * 场景类型和配置
 */
export type SceneId = 'visionshare' | 'agentdate' | 'agentjob' | 'agentad';
export declare const SCENE_IDS: SceneId[];
export interface SceneMetadata {
    id: SceneId;
    name: string;
    nameEn: string;
    description: string;
    icon: string;
    color: string;
    version: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface SceneConfig {
    id: SceneId;
    metadata: SceneMetadata;
    fields: SceneFieldDefinition[];
    capabilities: SceneCapability[];
    templates: SceneTemplateConfig[];
    validation: SceneValidationRules;
    ui: SceneUIConfig;
}
export type SceneFieldType = 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'multiselect' | 'date' | 'datetime' | 'time' | 'location' | 'range' | 'image' | 'file' | 'url' | 'email' | 'phone' | 'tags';
export interface SceneFieldDefinition {
    id: string;
    name: string;
    label: string;
    description?: string;
    type: SceneFieldType;
    required: boolean;
    defaultValue?: any;
    options?: SceneFieldOption[];
    validation?: FieldValidationRule[];
    dependencies?: FieldDependency[];
    ui?: FieldUIConfig;
    i18n?: Record<string, {
        label: string;
        description?: string;
    }>;
}
export interface SceneFieldOption {
    value: string;
    label: string;
    description?: string;
    icon?: string;
}
export interface FieldValidationRule {
    type: 'required' | 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
    value?: any;
    message: string;
}
export interface FieldDependency {
    field: string;
    operator: 'eq' | 'ne' | 'in' | 'exists';
    value?: any;
}
export interface FieldUIConfig {
    component?: string;
    placeholder?: string;
    helpText?: string;
    order: number;
    section?: string;
    hidden?: boolean;
    disabled?: boolean;
    width?: 'full' | 'half' | 'third';
}
export interface SceneCapability {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    version: string;
    dependencies: string[];
    config?: Record<string, any>;
}
export interface SceneTemplateConfig {
    id: string;
    name: string;
    description: string;
    isPreset: boolean;
    isDefault: boolean;
    fieldValues: Record<string, any>;
    preview?: string;
}
export interface SceneTemplate extends SceneTemplateConfig {
    sceneId: SceneId;
    userId?: string;
    isPublic: boolean;
    usageCount: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface SceneValidationRules {
    rules: SceneValidationRule[];
    preventSubmitOnError: boolean;
    showWarnings: boolean;
}
export interface SceneValidationRule {
    id: string;
    name: string;
    type: 'field' | 'crossField' | 'custom';
    condition: string;
    message: string;
    severity: 'error' | 'warning';
}
export interface SceneUIConfig {
    sections: SceneSection[];
    layout: 'single' | 'double' | 'tabs';
    theme?: SceneTheme;
}
export interface SceneSection {
    id: string;
    title: string;
    description?: string;
    icon?: string;
    order: number;
    fields: string[];
    collapsible?: boolean;
    defaultCollapsed?: boolean;
}
export interface SceneTheme {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
}
export interface SceneMigration {
    fromScene: SceneId;
    toScene: SceneId;
    fieldMappings: FieldMapping[];
    transformations: FieldTransformation[];
    warnings: string[];
}
export interface FieldMapping {
    sourceField: string;
    targetField: string;
    transform?: string;
}
export interface FieldTransformation {
    field: string;
    type: 'rename' | 'convert' | 'merge' | 'split';
    config: Record<string, any>;
}
export interface SceneState {
    sceneId: SceneId;
    agentId: string;
    config: Record<string, any>;
    isDirty: boolean;
    lastSaved?: Date;
    version: number;
}
export interface SceneRegistry {
    scenes: Map<SceneId, SceneConfig>;
    register(scene: SceneConfig): void;
    unregister(sceneId: SceneId): void;
    get(sceneId: SceneId): SceneConfig | undefined;
    getAll(): SceneConfig[];
    getActive(): SceneConfig[];
}
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
export declare const SCENE_DISPLAY_NAMES: Record<SceneId, {
    zh: string;
    en: string;
}>;
export declare const SCENE_DESCRIPTIONS: Record<SceneId, {
    zh: string;
    en: string;
}>;
//# sourceMappingURL=scene.d.ts.map