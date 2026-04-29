/**
 * GPT-4 Vision Adapter
 * OpenAI GPT-4 Vision模型适配器
 */
import { BaseVisionAdapter } from './base';
export class GPT4VisionAdapter extends BaseVisionAdapter {
    id = 'gpt-4-vision';
    provider = 'OpenAI';
    supportsImages = true;
    apiConfig;
    baseUrl;
    constructor(apiConfig, modelConfig) {
        super({
            provider: 'openai',
            model: 'gpt-4-vision-preview',
            maxTokens: 4096,
            temperature: 0.7,
            ...modelConfig
        });
        this.apiConfig = {
            timeoutMs: 60000,
            ...apiConfig
        };
        this.baseUrl = apiConfig.apiUrl || 'https://api.openai.com/v1';
    }
    async initialize() {
        await super.initialize();
        // 验证API密钥
        if (!this.apiConfig.apiKey) {
            throw new Error('OpenAI API key is required');
        }
    }
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseUrl}/models`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiConfig.apiKey}`,
                    ...(this.apiConfig.organization && {
                        'OpenAI-Organization': this.apiConfig.organization
                    })
                }
            });
            return response.ok;
        }
        catch {
            return false;
        }
    }
    async analyzeImage(image, prompt, config) {
        this.validateImageInput(image);
        const mergedConfig = { ...this.config, ...config };
        const imageContent = this.formatImageForAPI(image);
        const response = await this.makeRequest('/chat/completions', {
            model: mergedConfig.model || 'gpt-4-vision-preview',
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        imageContent
                    ]
                }
            ],
            max_tokens: mergedConfig.maxTokens || 4096,
            temperature: mergedConfig.temperature ?? 0.7
        });
        const data = await response.json();
        if (!data.choices || data.choices.length === 0) {
            throw new Error('No response from GPT-4 Vision');
        }
        return data.choices[0].message.content;
    }
    /**
     * 批量分析多张图像
     */
    async analyzeMultipleImages(images, prompt, config) {
        if (images.length === 0) {
            throw new Error('At least one image is required');
        }
        // 验证所有图像
        images.forEach(img => this.validateImageInput(img));
        const mergedConfig = { ...this.config, ...config };
        // 构建包含多张图像的消息内容
        const content = [
            { type: 'text', text: prompt }
        ];
        images.forEach(image => {
            content.push(this.formatImageForAPI(image));
        });
        const response = await this.makeRequest('/chat/completions', {
            model: mergedConfig.model || 'gpt-4-vision-preview',
            messages: [
                {
                    role: 'user',
                    content
                }
            ],
            max_tokens: mergedConfig.maxTokens || 4096,
            temperature: mergedConfig.temperature ?? 0.7
        });
        const data = await response.json();
        if (!data.choices || data.choices.length === 0) {
            throw new Error('No response from GPT-4 Vision');
        }
        return data.choices[0].message.content;
    }
    /**
     * GPT-4 Vision不支持图像嵌入，使用文本描述生成嵌入
     */
    async generateEmbedding(image, config) {
        // 首先生成图像描述
        const description = await this.analyzeImage(image, 'Describe this image in detail for semantic search.', { maxTokens: 512 });
        // 使用文本嵌入API
        const response = await this.makeRequest('/embeddings', {
            model: 'text-embedding-3-large',
            input: description
        });
        const data = await response.json();
        if (!data.data || data.data.length === 0) {
            throw new Error('Failed to generate embedding');
        }
        return data.data[0].embedding;
    }
    async makeRequest(endpoint, body) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.apiConfig.timeoutMs);
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiConfig.apiKey}`,
                    ...(this.apiConfig.organization && {
                        'OpenAI-Organization': this.apiConfig.organization
                    })
                },
                body: JSON.stringify(body),
                signal: controller.signal
            });
            if (!response.ok) {
                const error = await response.text();
                throw new Error(`OpenAI Vision API error: ${response.status} - ${error}`);
            }
            return response;
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
}
//# sourceMappingURL=gpt4Vision.js.map