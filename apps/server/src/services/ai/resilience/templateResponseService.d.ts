/**
 * Template Response Service
 * 模板回复服务 - 场景模板库、变量替换、模板匹配
 */
import { EventEmitter } from 'events';
export interface Template {
    id: string;
    scene: string;
    intent: string;
    content: string;
    variables: string[];
    priority: number;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
}
export interface TemplateMatch {
    template: Template;
    score: number;
    variables: Record<string, string>;
}
export interface TemplateRenderResult {
    id: string;
    model: string;
    choices: Array<{
        index: number;
        message: {
            role: string;
            content: string;
        };
        finishReason: string;
    }>;
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    createdAt: Date;
    _meta: {
        templateId: string;
        scene: string;
        intent: string;
    };
}
export declare class TemplateResponseService extends EventEmitter {
    private templates;
    private sceneIndex;
    private intentIndex;
    constructor();
    private loadDefaultTemplates;
    /**
     * Add a new template
     */
    addTemplate(template: Omit<Template, 'createdAt' | 'updatedAt'>): void;
    /**
     * Update an existing template
     */
    updateTemplate(id: string, updates: Partial<Omit<Template, 'id' | 'createdAt'>>): boolean;
    /**
     * Remove a template
     */
    removeTemplate(id: string): boolean;
    /**
     * Render a template with variable interpolation
     */
    render(templateId: string, variables?: Record<string, string>): TemplateRenderResult | null;
    /**
     * Find the best matching template for a scene and intent
     */
    match(scene: string, intent: string, tags?: string[], variables?: Record<string, string>): TemplateMatch | null;
    /**
     * Render the best matching template
     */
    renderMatch(scene: string, intent: string, variables?: Record<string, string>, tags?: string[]): TemplateRenderResult | null;
    /**
     * Get all templates
     */
    getTemplates(): Template[];
    /**
     * Get templates by scene
     */
    getTemplatesByScene(scene: string): Template[];
    /**
     * Get a specific template
     */
    getTemplate(id: string): Template | undefined;
    /**
     * Get statistics
     */
    getStats(): {
        totalTemplates: number;
        scenes: number;
        intents: number;
    };
}
export declare const templateResponseService: TemplateResponseService;
//# sourceMappingURL=templateResponseService.d.ts.map