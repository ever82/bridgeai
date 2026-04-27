/**
 * Template Response Service
 * 模板回复服务 - 场景模板库、变量替换、模板匹配
 */

import { EventEmitter } from 'events';

import { ChatCompletionResponse } from '../types';

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
    message: { role: string; content: string };
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

const DEFAULT_TEMPLATES: Omit<Template, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'greeting-general',
    scene: 'general',
    intent: 'greeting',
    content: '你好！我是AI助手，很高兴为你服务。请问有什么可以帮助你的？',
    variables: [],
    priority: 10,
    tags: ['greeting', 'welcome'],
  },
  {
    id: 'greeting-visionshare',
    scene: 'visionshare',
    intent: 'greeting',
    content: '你好！我是VisionShare助手，可以帮你发布拍照任务或查找附近任务。你想做什么？',
    variables: [],
    priority: 10,
    tags: ['greeting', 'visionshare'],
  },
  {
    id: 'greeting-agentdate',
    scene: 'agentdate',
    intent: 'greeting',
    content: '你好！我是AgentDate助手，可以帮你配置交友画像或推荐匹配对象。你想做什么？',
    variables: [],
    priority: 10,
    tags: ['greeting', 'dating'],
  },
  {
    id: 'greeting-agentjob',
    scene: 'agentjob',
    intent: 'greeting',
    content: '你好！我是AgentJob助手，可以帮你创建简历或搜索职位。你想做什么？',
    variables: [],
    priority: 10,
    tags: ['greeting', 'job'],
  },
  {
    id: 'greeting-agentad',
    scene: 'agentad',
    intent: 'greeting',
    content: '你好！我是AgentAd助手，可以帮你配置消费需求或查找优惠信息。你想做什么？',
    variables: [],
    priority: 10,
    tags: ['greeting', 'ad'],
  },
  {
    id: 'degradation-partial',
    scene: 'general',
    intent: 'degradation',
    content: '抱歉，AI服务目前响应较慢，我先为你提供一个简化的回复。{{original_summary}}',
    variables: ['original_summary'],
    priority: 5,
    tags: ['degradation', 'partial'],
  },
  {
    id: 'degradation-full',
    scene: 'general',
    intent: 'degradation',
    content: '抱歉，AI服务暂时不可用，请稍后再试。你的请求已记录，服务恢复后我们会尽快处理。',
    variables: [],
    priority: 1,
    tags: ['degradation', 'full'],
  },
  {
    id: 'clarification-request',
    scene: 'general',
    intent: 'clarification',
    content: '为了更好地帮助你，我需要了解更多信息：{{clarification_question}}',
    variables: ['clarification_question'],
    priority: 8,
    tags: ['clarification'],
  },
  {
    id: 'demand-extract-fallback',
    scene: 'general',
    intent: 'demand_extract',
    content:
      '我理解你的需求是：{{demand_summary}}。由于AI服务暂时受限，我将为你记录原始需求，待服务恢复后进行详细分析。',
    variables: ['demand_summary'],
    priority: 6,
    tags: ['demand', 'fallback'],
  },
  {
    id: 'negotiation-simplified',
    scene: 'agentad',
    intent: 'negotiation',
    content:
      '根据你的需求「{{demand}}」，我找到了以下优惠信息：{{offer_summary}}。当前AI深度分析暂时不可用，以上是基础匹配结果。',
    variables: ['demand', 'offer_summary'],
    priority: 7,
    tags: ['negotiation', 'ad', 'simplified'],
  },
  {
    id: 'match-basic',
    scene: 'agentdate',
    intent: 'match',
    content:
      '根据你的偏好「{{preferences}}」，我为你找到了一些潜在匹配。由于AI深度分析暂时受限，匹配基于基础条件筛选。',
    variables: ['preferences'],
    priority: 7,
    tags: ['match', 'dating'],
  },
  {
    id: 'job-search-basic',
    scene: 'agentjob',
    intent: 'job_search',
    content:
      '根据你的简历「{{resume_summary}}」，我搜索到以下职位。由于AI深度分析暂时受限，匹配基于关键词筛选。',
    variables: ['resume_summary'],
    priority: 7,
    tags: ['job', 'search'],
  },
];

export class TemplateResponseService extends EventEmitter {
  private templates: Map<string, Template> = new Map();
  private sceneIndex: Map<string, Set<string>> = new Map();
  private intentIndex: Map<string, Set<string>> = new Map();

  constructor() {
    super();
    this.loadDefaultTemplates();
  }

  private loadDefaultTemplates(): void {
    for (const tmpl of DEFAULT_TEMPLATES) {
      this.addTemplate(tmpl);
    }
  }

  /**
   * Add a new template
   */
  addTemplate(template: Omit<Template, 'createdAt' | 'updatedAt'>): void {
    const now = new Date();
    const fullTemplate: Template = {
      ...template,
      createdAt: now,
      updatedAt: now,
    };

    this.templates.set(template.id, fullTemplate);

    // Update indexes
    if (!this.sceneIndex.has(template.scene)) {
      this.sceneIndex.set(template.scene, new Set());
    }
    this.sceneIndex.get(template.scene)!.add(template.id);

    if (!this.intentIndex.has(template.intent)) {
      this.intentIndex.set(template.intent, new Set());
    }
    this.intentIndex.get(template.intent)!.add(template.id);

    this.emit('templateAdded', { id: template.id });
  }

  /**
   * Update an existing template
   */
  updateTemplate(id: string, updates: Partial<Omit<Template, 'id' | 'createdAt'>>): boolean {
    const existing = this.templates.get(id);
    if (!existing) return false;

    // Remove old indexes if scene/intent changed
    if (updates.scene && updates.scene !== existing.scene) {
      this.sceneIndex.get(existing.scene)?.delete(id);
      if (!this.sceneIndex.has(updates.scene)) {
        this.sceneIndex.set(updates.scene, new Set());
      }
      this.sceneIndex.get(updates.scene)!.add(id);
    }
    if (updates.intent && updates.intent !== existing.intent) {
      this.intentIndex.get(existing.intent)?.delete(id);
      if (!this.intentIndex.has(updates.intent)) {
        this.intentIndex.set(updates.intent, new Set());
      }
      this.intentIndex.get(updates.intent)!.add(id);
    }

    Object.assign(existing, updates, { updatedAt: new Date() });
    this.emit('templateUpdated', { id });
    return true;
  }

  /**
   * Remove a template
   */
  removeTemplate(id: string): boolean {
    const template = this.templates.get(id);
    if (!template) return false;

    this.sceneIndex.get(template.scene)?.delete(id);
    this.intentIndex.get(template.intent)?.delete(id);
    this.templates.delete(id);

    this.emit('templateRemoved', { id });
    return true;
  }

  /**
   * Render a template with variable interpolation
   */
  render(templateId: string, variables: Record<string, string> = {}): TemplateRenderResult | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    let content = template.content;

    // Replace {{variable}} placeholders
    for (const [key, value] of Object.entries(variables)) {
      content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }

    // Remove any unreplaced variables
    content = content.replace(/\{\{\w+\}\}/g, '');

    const response: ChatCompletionResponse = {
      id: `tmpl-${templateId}-${Date.now()}`,
      model: 'template-response',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content },
          finishReason: 'stop',
        },
      ],
      usage: {
        promptTokens: 0,
        completionTokens: content.length,
        totalTokens: content.length,
      },
      createdAt: new Date(),
    };

    return {
      ...response,
      _meta: {
        templateId: template.id,
        scene: template.scene,
        intent: template.intent,
      },
    };
  }

  /**
   * Find the best matching template for a scene and intent
   */
  match(
    scene: string,
    intent: string,
    tags?: string[],
    variables?: Record<string, string>
  ): TemplateMatch | null {
    const candidates: TemplateMatch[] = [];

    // Find templates matching scene and intent
    const sceneTemplates = this.sceneIndex.get(scene);
    const intentTemplates = this.intentIndex.get(intent);

    if (!sceneTemplates || !intentTemplates) return null;

    for (const id of sceneTemplates) {
      if (!intentTemplates.has(id)) continue;

      const template = this.templates.get(id)!;
      let score = template.priority;

      // Boost score for tag matches
      if (tags) {
        const tagOverlap = template.tags.filter(t => tags.includes(t)).length;
        score += tagOverlap * 2;
      }

      // Check variable availability
      const availableVars = variables ?? {};
      const missingVars = template.variables.filter(v => !(v in availableVars));
      if (missingVars.length > 0) {
        score -= missingVars.length;
      }

      candidates.push({
        template,
        score,
        variables: availableVars,
      });
    }

    if (candidates.length === 0) return null;

    // Sort by score descending and return best match
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0];
  }

  /**
   * Render the best matching template
   */
  renderMatch(
    scene: string,
    intent: string,
    variables: Record<string, string> = {},
    tags?: string[]
  ): TemplateRenderResult | null {
    const match = this.match(scene, intent, tags, variables);
    if (!match) return null;
    return this.render(match.template.id, variables);
  }

  /**
   * Get all templates
   */
  getTemplates(): Template[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates by scene
   */
  getTemplatesByScene(scene: string): Template[] {
    const ids = this.sceneIndex.get(scene);
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.templates.get(id)!)
      .filter(Boolean);
  }

  /**
   * Get a specific template
   */
  getTemplate(id: string): Template | undefined {
    return this.templates.get(id);
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalTemplates: this.templates.size,
      scenes: this.sceneIndex.size,
      intents: this.intentIndex.size,
    };
  }
}

export const templateResponseService = new TemplateResponseService();
