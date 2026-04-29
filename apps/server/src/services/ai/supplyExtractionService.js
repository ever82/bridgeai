/**
 * Supply Extraction Service
 * 供给智能提炼服务 - 核心解析引擎
 *
 * 功能：
 * - 服务描述理解
 * - 供给实体识别
 * - 服务类型分类
 * - 供给结构化输出
 * - 能力评估评分
 */
import { logger } from '../../utils/logger';
import { LLMService } from './llmService';
import { LLMMetricsService } from './metricsService';
// LLM Service configuration from environment
function createLLMService() {
    return new LLMService({
        openai: {
            apiKey: process.env.OPENAI_API_KEY || '',
            apiUrl: process.env.OPENAI_API_URL,
            organization: process.env.OPENAI_ORGANIZATION,
        },
        claude: {
            apiKey: process.env.CLAUDE_API_KEY || '',
            apiUrl: process.env.CLAUDE_API_URL,
        },
        wenxin: {
            apiKey: process.env.WENXIN_API_KEY || '',
            secretKey: process.env.WENXIN_SECRET_KEY || '',
            apiUrl: process.env.WENXIN_API_URL,
        },
        defaultStrategy: process.env.LLM_ROUTING_STRATEGY || 'round-robin',
    });
}
// Metrics service instance
const metricsService = new LLMMetricsService();
/**
 * Supply Extraction Service 类
 * 供给智能提炼服务的核心解析引擎
 */
export class SupplyExtractionService {
    llmService;
    constructor(llmService) {
        this.llmService = llmService || createLLMService();
    }
    /**
     * 初始化服务
     */
    async initialize() {
        await this.llmService.initialize();
        logger.info('SupplyExtractionService initialized');
    }
    /**
     * 从自然语言文本中提取供给信息
     */
    async extract(request) {
        const startTime = Date.now();
        const { text, scene, agentId, userId: _userId, options = {} } = request;
        try {
            logger.info(`Starting supply extraction`, { agentId, scene, textLength: text.length });
            // 构建提取提示词
            const prompt = this.buildExtractionPrompt(text, scene, options);
            // 调用 LLM
            const response = await this.llmService.generateText(prompt, {
                temperature: 0.3,
                maxTokens: 2500,
            });
            // 解析提取结果
            const extraction = this.parseExtractionResult(response.text);
            // 评估质量
            const quality = this.evaluateQuality(extraction, text, options);
            // 构建供给对象
            const supply = this.buildSupplyObject(extraction, quality, scene);
            // 获取提取和失败的字段
            const fieldsExtracted = this.getExtractedFields(extraction);
            const fieldsFailed = this.getFailedFields(extraction, options);
            const latencyMs = Date.now() - startTime;
            // 记录指标
            await metricsService.recordRequest({
                requestId: `supply-${agentId || 'unknown'}-${Date.now()}`,
                provider: response.provider,
                model: response.model,
                latencyMs,
                success: true,
                tokenUsage: response.usage || { input: 0, output: 0, total: 0 },
                costUsd: response.cost || 0,
            });
            logger.info(`Supply extraction completed`, {
                agentId,
                confidence: supply.quality.confidence,
                fieldsExtracted: fieldsExtracted.length,
                latencyMs,
            });
            return {
                success: true,
                supply,
                fieldsExtracted,
                fieldsFailed,
                provider: response.provider,
                model: response.model,
                latencyMs,
            };
        }
        catch (error) {
            const latencyMs = Date.now() - startTime;
            logger.error(`Supply extraction failed`, {
                agentId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            // 记录失败指标
            await metricsService.recordRequest({
                requestId: `supply-${agentId || 'unknown'}-${Date.now()}`,
                provider: 'unknown',
                model: 'unknown',
                latencyMs,
                success: false,
                errorType: error instanceof Error ? error.name : 'UnknownError',
                tokenUsage: { input: 0, output: 0, total: 0 },
                costUsd: 0,
            });
            throw error;
        }
    }
    /**
     * 批量提取供给信息
     */
    async extractBulk(request) {
        const { items, options = {} } = request;
        logger.info(`Starting bulk supply extraction`, { total: items.length });
        // Run all extractions concurrently for performance
        const settled = await Promise.allSettled(items.map(item => this.extract({
            ...item,
            options: { ...item.options, ...options },
        })));
        const results = [];
        let failed = 0;
        for (let i = 0; i < settled.length; i++) {
            const outcome = settled[i];
            if (outcome.status === 'fulfilled') {
                results.push(outcome.value);
            }
            else {
                failed++;
                logger.error(`Bulk extraction failed for item`, {
                    agentId: items[i].agentId,
                    error: outcome.reason instanceof Error ? outcome.reason.message : 'Unknown error',
                });
            }
        }
        // 生成质量报告
        const qualityReport = this.generateQualityReport(results);
        logger.info(`Bulk supply extraction completed`, {
            total: items.length,
            success: results.length,
            failed,
        });
        return {
            success: failed === 0,
            results,
            failed,
            total: items.length,
            qualityReport,
        };
    }
    /**
     * 构建提取提示词
     */
    buildExtractionPrompt(text, scene, options) {
        const sections = [];
        const normalizedScene = scene.toUpperCase().replace(/-/g, '_');
        // 基础指令
        sections.push(`You are an expert supply/service extraction system. Your task is to analyze service descriptions and extract structured supply information.`);
        // 场景信息
        sections.push(`\n## Scene: ${scene}`);
        // 输入文本
        sections.push(`\n## Service Description:\n"""${text}"""`);
        // 提取指令
        sections.push(`\n## Extraction Instructions:`);
        sections.push(`1. Extract the service title and description`);
        sections.push(`2. Identify the service type/category`);
        if (options.includeCapabilities !== false) {
            sections.push(`3. Extract capabilities with expertise levels`);
        }
        if (options.includePricing !== false) {
            sections.push(`4. Extract pricing information (hourly rate, fixed price, or range)`);
        }
        if (options.includeAvailability !== false) {
            sections.push(`5. Extract availability information`);
        }
        if (options.includeLocation !== false) {
            sections.push(`6. Extract location preferences (remote/onsite/hybrid)`);
        }
        if (options.includeExperience !== false) {
            sections.push(`7. Extract experience information`);
        }
        // Scene-specific extraction instructions
        if (normalizedScene === 'AGENT_DATE') {
            sections.push(`\n## Scene-Specific Instructions (AgentDate - Dating/Companion Scene):`);
            sections.push(`This is a dating/companion scene. You MUST extract these additional fields:`);
            sections.push(`- "age": The person's age or age range (number)`);
            sections.push(`- "interests": Array of hobbies and interests (e.g. ["travel", "photography", "cooking"])`);
            sections.push(`- "personality": Array of personality traits (e.g. ["outgoing", "kind", "humorous"])`);
            sections.push(`- "gender": Gender if mentioned`);
            sections.push(`- "occupation": Occupation if mentioned`);
            sections.push(`Map dating-related skills to the "skills" field. Map pricing to companion/dating service rates.`);
        }
        else if (normalizedScene === 'AGENT_JOB') {
            sections.push(`\n## Scene-Specific Instructions (AgentJob - Job/Recruitment Scene):`);
            sections.push(`This is a job/recruitment scene. You MUST extract these additional fields:`);
            sections.push(`- "skills": Array of professional skills required or offered (e.g. ["React", "Node.js", "SQL"])`);
            sections.push(`- "salary_min": Minimum salary expectation (number)`);
            sections.push(`- "salary_max": Maximum salary expectation (number)`);
            sections.push(`- "salary_currency": Currency for salary (e.g. "CNY", "USD")`);
            sections.push(`- "experience_years": Years of experience required or offered (number)`);
            sections.push(`- "education": Education level if mentioned`);
            sections.push(`- "company": Company name if mentioned`);
            sections.push(`- "job_title": Specific job title if mentioned`);
            sections.push(`Map salary info to the "pricing" field. Map professional qualifications to "capabilities".`);
        }
        else if (normalizedScene === 'AGENT_AD') {
            sections.push(`\n## Scene-Specific Instructions (AgentAd - Advertising Scene):`);
            sections.push(`This is an advertising/classified scene. You MUST extract these additional fields:`);
            sections.push(`- "ad_type": Type of advertisement (e.g. "product", "service", "event", "promotion")`);
            sections.push(`- "target_audience": Intended audience if mentioned`);
            sections.push(`- "valid_until": Expiry date if mentioned`);
            sections.push(`Map product/service details to "capabilities". Map promotional pricing to "pricing".`);
        }
        // 输出格式
        sections.push(`\n## Response Format (JSON):`);
        sections.push(`{\n  "title": "Service title",`);
        sections.push(`  "description": "Service description",`);
        sections.push(`  "service_type": "Primary service category",`);
        sections.push(`  "capabilities": [`);
        sections.push(`    {`);
        sections.push(`      "name": "Capability name",`);
        sections.push(`      "description": "What this capability entails",`);
        sections.push(`      "level": "beginner|intermediate|advanced|expert",`);
        sections.push(`      "category": "Category of capability",`);
        sections.push(`      "keywords": ["related", "keywords"]`);
        sections.push(`    }`);
        sections.push(`  ],`);
        sections.push(`  "pricing": {`);
        sections.push(`    "type": "hourly|fixed|range|negotiable",`);
        sections.push(`    "min_rate": 50,`);
        sections.push(`    "max_rate": 150,`);
        sections.push(`    "currency": "USD",`);
        sections.push(`    "unit": "hour",`);
        sections.push(`    "description": "Pricing details"`);
        sections.push(`  },`);
        sections.push(`  "skills": ["Skill 1", "Skill 2"],`);
        sections.push(`  "availability": {`);
        sections.push(`    "schedule": "Availability schedule",`);
        sections.push(`    "timezone": "Timezone",`);
        sections.push(`    "response_time": "Expected response time"`);
        sections.push(`  },`);
        sections.push(`  "location": {`);
        sections.push(`    "city": "City name",`);
        sections.push(`    "country": "Country",`);
        sections.push(`    "remote": true,`);
        sections.push(`    "onsite": false,`);
        sections.push(`    "hybrid": true`);
        sections.push(`  },`);
        sections.push(`  "experience": {`);
        sections.push(`    "years": 5,`);
        sections.push(`    "total_projects": 20,`);
        sections.push(`    "relevant_projects": 10,`);
        sections.push(`    "certifications": ["Cert 1"],`);
        sections.push(`    "portfolio": ["https://example.com/work1"]`);
        sections.push(`  },`);
        // Scene-specific output fields
        if (normalizedScene === 'AGENT_DATE') {
            sections.push(`  "age": 25,`);
            sections.push(`  "interests": ["interest1", "interest2"],`);
            sections.push(`  "personality": ["trait1", "trait2"],`);
            sections.push(`  "gender": "Gender if mentioned or null",`);
            sections.push(`  "occupation": "Occupation if mentioned or null",`);
        }
        else if (normalizedScene === 'AGENT_JOB') {
            sections.push(`  "salary_min": 10000,`);
            sections.push(`  "salary_max": 20000,`);
            sections.push(`  "salary_currency": "CNY",`);
            sections.push(`  "experience_years": 3,`);
            sections.push(`  "education": "Education level or null",`);
            sections.push(`  "company": "Company name or null",`);
            sections.push(`  "job_title": "Job title or null",`);
        }
        else if (normalizedScene === 'AGENT_AD') {
            sections.push(`  "ad_type": "product|service|event|promotion",`);
            sections.push(`  "target_audience": "Target audience or null",`);
            sections.push(`  "valid_until": "Expiry date ISO string or null",`);
        }
        sections.push(`  "quality_assessment": {`);
        sections.push(`    "completeness": 85,`);
        sections.push(`    "clarity": 90,`);
        sections.push(`    "relevance": 88,`);
        sections.push(`    "confidence": 87,`);
        sections.push(`    "issues": [`);
        sections.push(`      {`);
        sections.push(`        "type": "missing_field",`);
        sections.push(`        "field": "field_name",`);
        sections.push(`        "message": "Description of issue",`);
        sections.push(`        "severity": "low|medium|high"`);
        sections.push(`      }`);
        sections.push(`    ]`);
        sections.push(`  }`);
        sections.push(`}`);
        sections.push(`\nRespond with ONLY the JSON object, no additional text.`);
        return sections.join('\n');
    }
    /**
     * 解析提取结果
     */
    parseExtractionResult(text) {
        try {
            // 提取 JSON（处理 markdown 代码块）
            const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) ||
                text.match(/```\n?([\s\S]*?)\n?```/) ||
                text.match(/(\{[\s\S]*\})/);
            const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;
            return JSON.parse(jsonStr.trim());
        }
        catch (error) {
            logger.error('Failed to parse extraction result', { error, text });
            throw new Error('Failed to parse extraction result: invalid JSON');
        }
    }
    /**
     * 评估提取质量
     */
    evaluateQuality(extraction, originalText, _options) {
        const issues = [];
        let completeness = 0;
        let clarity = 0;
        let relevance = 0;
        // 评估完整性
        const requiredFields = ['title', 'description', 'service_type', 'capabilities', 'pricing'];
        const _optionalFields = ['skills', 'availability', 'location', 'experience'];
        const fieldsPresent = requiredFields.filter(f => {
            const value = extraction[f] || extraction[this.toSnakeCase(f)];
            return value !== undefined && value !== null && value !== '';
        }).length;
        completeness = Math.round((fieldsPresent / requiredFields.length) * 100);
        // 评估清晰度
        const textLength = originalText.length;
        if (textLength > 50)
            clarity += 30;
        if (textLength > 200)
            clarity += 30;
        if (extraction.description && extraction.description.length > 50)
            clarity += 40;
        // 评估相关性
        if (extraction.service_type)
            relevance += 25;
        if (extraction.capabilities && extraction.capabilities.length > 0)
            relevance += 25;
        if (extraction.skills && extraction.skills.length > 0)
            relevance += 25;
        if (extraction.pricing && extraction.pricing.type)
            relevance += 25;
        // 检查问题
        if (!extraction.title || extraction.title.length < 5) {
            issues.push({
                type: 'missing_field',
                field: 'title',
                message: 'Title is missing or too short',
                severity: 'high',
            });
        }
        if (!extraction.pricing || !extraction.pricing.type) {
            issues.push({
                type: 'missing_field',
                field: 'pricing',
                message: 'Pricing information is missing',
                severity: 'medium',
            });
        }
        // 计算置信度
        const confidence = extraction.quality_assessment?.confidence ||
            Math.round((completeness + clarity + relevance) / 3);
        return {
            completeness,
            clarity,
            relevance,
            confidence,
            issues,
        };
    }
    /**
     * 构建供给对象
     */
    buildSupplyObject(extraction, quality, scene) {
        const pricing = extraction.pricing || extraction.pricing_info || {};
        const location = extraction.location || {};
        const availability = extraction.availability || {};
        const experience = extraction.experience || {};
        return {
            title: extraction.title || 'Untitled Service',
            description: extraction.description || '',
            serviceType: extraction.service_type || extraction.serviceType || 'general',
            capabilities: (extraction.capabilities || []).map((c) => ({
                name: c.name || '',
                description: c.description || '',
                level: c.level || 'intermediate',
                category: c.category || 'general',
                keywords: c.keywords || [],
            })),
            pricing: {
                type: pricing.type || 'negotiable',
                minRate: pricing.min_rate || pricing.minRate,
                maxRate: pricing.max_rate || pricing.maxRate,
                currency: pricing.currency || 'CNY',
                unit: pricing.unit || 'hour',
                description: pricing.description || '',
            },
            skills: extraction.skills || [],
            availability: {
                schedule: availability.schedule || '',
                timezone: availability.timezone,
                responseTime: availability.response_time || availability.responseTime,
                leadTime: availability.lead_time || availability.leadTime,
            },
            location: {
                city: location.city,
                country: location.country,
                remote: location.remote ?? true,
                onsite: location.onsite ?? false,
                hybrid: location.hybrid ?? false,
                timezone: location.timezone,
            },
            experience: {
                years: experience.years,
                totalProjects: experience.total_projects || experience.totalProjects,
                relevantProjects: experience.relevant_projects || experience.relevantProjects,
                certifications: experience.certifications || [],
                portfolio: experience.portfolio || [],
            },
            quality: {
                overallScore: Math.round((quality.completeness + quality.clarity + quality.relevance) / 3),
                completenessScore: quality.completeness,
                clarityScore: quality.clarity,
                relevanceScore: quality.relevance,
                confidence: quality.confidence,
            },
            metadata: this.buildSceneMetadata(extraction, scene),
        };
    }
    /**
     * 获取已提取的字段
     */
    getExtractedFields(extraction) {
        const fields = [];
        if (extraction.title)
            fields.push('title');
        if (extraction.description)
            fields.push('description');
        if (extraction.service_type || extraction.serviceType)
            fields.push('serviceType');
        if (extraction.capabilities?.length > 0)
            fields.push('capabilities');
        if (extraction.pricing || extraction.pricing_info)
            fields.push('pricing');
        if (extraction.skills?.length > 0)
            fields.push('skills');
        if (extraction.availability)
            fields.push('availability');
        if (extraction.location)
            fields.push('location');
        if (extraction.experience)
            fields.push('experience');
        return fields;
    }
    /**
     * 获取失败的字段
     */
    getFailedFields(extraction, options) {
        const failed = [];
        if (!extraction.title)
            failed.push('title');
        if (!extraction.description)
            failed.push('description');
        if (!(extraction.service_type || extraction.serviceType))
            failed.push('serviceType');
        if (options.includeCapabilities !== false && !extraction.capabilities?.length) {
            failed.push('capabilities');
        }
        if (options.includePricing !== false) {
            const hasPricing = (extraction.pricing && Object.keys(extraction.pricing).length > 0) ||
                (extraction.pricing_info && Object.keys(extraction.pricing_info).length > 0);
            if (!hasPricing) {
                failed.push('pricing');
            }
        }
        return failed;
    }
    /**
     * 生成质量报告
     */
    generateQualityReport(results) {
        if (results.length === 0) {
            return {
                overallQuality: 0,
                averageConfidence: 0,
                averageCompleteness: 0,
                extractionRate: 0,
                issues: [],
                recommendations: ['No results to analyze'],
            };
        }
        const totalConfidence = results.reduce((sum, r) => sum + r.supply.quality.confidence, 0);
        const totalCompleteness = results.reduce((sum, r) => sum + r.supply.quality.completenessScore, 0);
        const allIssues = [];
        results.forEach(r => {
            // 收集所有质量问题
            if (r.fieldsFailed.length > 0) {
                r.fieldsFailed.forEach(field => {
                    allIssues.push({
                        type: 'missing_field',
                        field,
                        message: `Missing field in extraction`,
                        severity: 'medium',
                    });
                });
            }
        });
        const avgConfidence = Math.round(totalConfidence / results.length);
        const avgCompleteness = Math.round(totalCompleteness / results.length);
        const extractionRate = Math.round((results.filter(r => r.success).length / results.length) * 100);
        // 生成建议
        const recommendations = [];
        if (avgConfidence < 70) {
            recommendations.push('Consider providing more detailed service descriptions');
        }
        if (avgCompleteness < 80) {
            recommendations.push('Include pricing and availability information for better extraction');
        }
        if (extractionRate < 90) {
            recommendations.push('Review failed extractions for formatting issues');
        }
        return {
            overallQuality: Math.round((avgConfidence + avgCompleteness + extractionRate) / 3),
            averageConfidence: avgConfidence,
            averageCompleteness: avgCompleteness,
            extractionRate,
            issues: allIssues.slice(0, 10), // 限制问题数量
            recommendations,
        };
    }
    /**
     * Build scene-specific metadata from extraction results
     */
    buildSceneMetadata(extraction, scene) {
        if (!scene)
            return {};
        const normalizedScene = scene.toUpperCase().replace(/-/g, '_');
        const metadata = { scene };
        if (normalizedScene === 'AGENT_DATE') {
            if (extraction.age != null)
                metadata.age = extraction.age;
            if (extraction.interests)
                metadata.interests = extraction.interests;
            if (extraction.personality)
                metadata.personality = extraction.personality;
            if (extraction.gender)
                metadata.gender = extraction.gender;
            if (extraction.occupation)
                metadata.occupation = extraction.occupation;
        }
        else if (normalizedScene === 'AGENT_JOB') {
            if (extraction.salary_min != null)
                metadata.salaryMin = extraction.salary_min;
            if (extraction.salary_max != null)
                metadata.salaryMax = extraction.salary_max;
            if (extraction.salary_currency)
                metadata.salaryCurrency = extraction.salary_currency;
            if (extraction.experience_years != null)
                metadata.experienceYears = extraction.experience_years;
            if (extraction.education)
                metadata.education = extraction.education;
            if (extraction.company)
                metadata.company = extraction.company;
            if (extraction.job_title)
                metadata.jobTitle = extraction.job_title;
        }
        else if (normalizedScene === 'AGENT_AD') {
            if (extraction.ad_type)
                metadata.adType = extraction.ad_type;
            if (extraction.target_audience)
                metadata.targetAudience = extraction.target_audience;
            if (extraction.valid_until)
                metadata.validUntil = extraction.valid_until;
        }
        return metadata;
    }
    /**
     * 将 camelCase 转换为 snake_case
     */
    toSnakeCase(str) {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }
    /**
     * 获取置信度级别
     */
    getConfidenceLevel(confidence) {
        if (confidence >= 80)
            return 'high';
        if (confidence >= 50)
            return 'medium';
        return 'low';
    }
    /**
     * 获取质量等级
     */
    getQualityGrade(score) {
        if (score >= 90)
            return 'A';
        if (score >= 80)
            return 'B';
        if (score >= 70)
            return 'C';
        if (score >= 60)
            return 'D';
        return 'F';
    }
}
// 导出单例
export const supplyExtractionService = new SupplyExtractionService(createLLMService());
//# sourceMappingURL=supplyExtractionService.js.map