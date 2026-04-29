export class TemplateEngine {
    render(template, variables) {
        let rendered = template;
        for (const { key, value } of variables) {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            rendered = rendered.replace(regex, String(value));
        }
        return rendered;
    }
    renderWithObject(template, data) {
        const variables = Object.entries(data).map(([key, value]) => ({
            key,
            value: value,
        }));
        return this.render(template, variables);
    }
    extractVariables(template) {
        const regex = /\{\{(\w+)\}\}/g;
        const variables = [];
        let match;
        while ((match = regex.exec(template)) !== null) {
            if (!variables.includes(match[1])) {
                variables.push(match[1]);
            }
        }
        return variables;
    }
}
export class TemplateStore {
    templates = new Map();
    templateEngine;
    constructor() {
        this.templateEngine = new TemplateEngine();
    }
    async create(template) {
        const id = `tmpl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const now = new Date();
        const fullTemplate = {
            ...template,
            id,
            versions: [{
                    version: 1,
                    createdAt: now,
                    createdBy: 'system',
                    content: template.htmlContent,
                }],
            createdAt: now,
            updatedAt: now,
        };
        this.templates.set(id, fullTemplate);
        return fullTemplate;
    }
    async get(id) {
        return this.templates.get(id) || null;
    }
    async update(id, updates) {
        const template = this.templates.get(id);
        if (!template)
            return null;
        const updated = {
            ...template,
            ...updates,
            versions: [
                ...template.versions,
                {
                    version: template.versions.length + 1,
                    createdAt: new Date(),
                    createdBy: 'system',
                    content: updates.htmlContent || template.htmlContent,
                },
            ],
            updatedAt: new Date(),
        };
        this.templates.set(id, updated);
        return updated;
    }
    async render(id, variables, locale) {
        const template = this.templates.get(id);
        if (!template)
            return null;
        const localeData = locale ? template.i18n[locale] : undefined;
        const subject = localeData
            ? this.templateEngine.renderWithObject(localeData.subject, this.variablesToObject(variables))
            : this.templateEngine.renderWithObject(template.subject, this.variablesToObject(variables));
        const html = localeData
            ? this.templateEngine.renderWithObject(localeData.htmlContent, this.variablesToObject(variables))
            : this.templateEngine.renderWithObject(template.htmlContent, this.variablesToObject(variables));
        const text = localeData?.textContent
            ? this.templateEngine.renderWithObject(localeData.textContent, this.variablesToObject(variables))
            : template.textContent
                ? this.templateEngine.renderWithObject(template.textContent, this.variablesToObject(variables))
                : this.htmlToText(html);
        return { subject, html, text };
    }
    async getVersion(id, version) {
        const template = this.templates.get(id);
        if (!template)
            return null;
        const versionData = template.versions.find((v) => v.version === version);
        return versionData?.content || null;
    }
    variablesToObject(variables) {
        return variables.reduce((acc, { key, value }) => {
            acc[key] = value;
            return acc;
        }, {});
    }
    htmlToText(html) {
        return html
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .trim();
    }
}
//# sourceMappingURL=template-engine.js.map