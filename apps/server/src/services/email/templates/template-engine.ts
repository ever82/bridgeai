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

export class TemplateEngine {
  render(template: string, variables: TemplateVariable[]): string {
    let rendered = template;

    for (const { key, value } of variables) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      rendered = rendered.replace(regex, String(value));
    }

    return rendered;
  }

  renderWithObject(template: string, data: Record<string, unknown>): string {
    const variables = Object.entries(data).map(([key, value]) => ({
      key,
      value: value as string | number | boolean,
    }));
    return this.render(template, variables);
  }

  extractVariables(template: string): string[] {
    const regex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
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
  private templates: Map<string, EmailTemplate> = new Map();
  private templateEngine: TemplateEngine;

  constructor() {
    this.templateEngine = new TemplateEngine();
  }

  async create(template: Omit<EmailTemplate, 'id' | 'versions' | 'createdAt' | 'updatedAt'>): Promise<EmailTemplate> {
    const id = `tmpl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();

    const fullTemplate: EmailTemplate = {
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

  async get(id: string): Promise<EmailTemplate | null> {
    return this.templates.get(id) || null;
  }

  async update(id: string, updates: Partial<Omit<EmailTemplate, 'id' | 'versions' | 'createdAt'>>): Promise<EmailTemplate | null> {
    const template = this.templates.get(id);
    if (!template) return null;

    const updated: EmailTemplate = {
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

  async render(id: string, variables: TemplateVariable[], locale?: string): Promise<{ subject: string; html: string; text: string } | null> {
    const template = this.templates.get(id);
    if (!template) return null;

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

  async getVersion(id: string, version: number): Promise<string | null> {
    const template = this.templates.get(id);
    if (!template) return null;

    const versionData = template.versions.find((v) => v.version === version);
    return versionData?.content || null;
  }

  private variablesToObject(variables: TemplateVariable[]): Record<string, unknown> {
    return variables.reduce((acc, { key, value }) => {
      acc[key] = value;
      return acc;
    }, {} as Record<string, unknown>);
  }

  private htmlToText(html: string): string {
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