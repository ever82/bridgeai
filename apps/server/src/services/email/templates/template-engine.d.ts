export interface TemplateVariable {
    key: string;
    value: string | number | boolean;
}
export interface TemplateVersion {
    version: number;
    createdAt: Date;
    createdBy: string;
    content: string;
}
export interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    htmlContent: string;
    textContent?: string;
    variables: string[];
    i18n: Record<string, {
        subject: string;
        htmlContent: string;
        textContent?: string;
    }>;
    versions: TemplateVersion[];
    createdAt: Date;
    updatedAt: Date;
}
export declare class TemplateEngine {
    render(template: string, variables: TemplateVariable[]): string;
    renderWithObject(template: string, data: Record<string, unknown>): string;
    extractVariables(template: string): string[];
}
export declare class TemplateStore {
    private templates;
    private templateEngine;
    constructor();
    create(template: Omit<EmailTemplate, 'id' | 'versions' | 'createdAt' | 'updatedAt'>): Promise<EmailTemplate>;
    get(id: string): Promise<EmailTemplate | null>;
    update(id: string, updates: Partial<Omit<EmailTemplate, 'id' | 'versions' | 'createdAt'>>): Promise<EmailTemplate | null>;
    render(id: string, variables: TemplateVariable[], locale?: string): Promise<{
        subject: string;
        html: string;
        text: string;
    } | null>;
    getVersion(id: string, version: number): Promise<string | null>;
    private variablesToObject;
    private htmlToText;
}
//# sourceMappingURL=template-engine.d.ts.map