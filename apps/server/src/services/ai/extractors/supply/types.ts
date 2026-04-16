/**
 * Supply Scene Extractor Types
 * 供给场景提取器类型定义 - 供给方(服务提供者)的信息提取
 */

/**
 * Supply Scene Types
 * 供给场景类型
 */
export type SupplySceneType = 'visionshare' | 'agentjob' | 'agentad' | 'unknown';

/**
 * Supply Qualification Level
 * 供给方资质等级
 */
export type QualificationLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'master';

/**
 * Supply Quality Metrics
 * 供给质量指标
 */
export interface SupplyQualityMetrics {
  completeness: number;     // 信息完整度 0-1
  credibility: number;      // 信息可信度 0-1
  competitiveness: number;  // 竞争力评分 0-1
}

/**
 * Supply Qualification
 * 供给方资质
 */
export interface SupplyQualification {
  certifications: string[];   // 认证/证书
  experienceYears?: number;   // 经验年限
  level: QualificationLevel;  // 资质等级
  specializations: string[];  // 专长领域
  awards?: string[];          // 获奖/成就
}

/**
 * Base Supply Extracted Data
 * 供给提取数据基类
 */
export interface SupplyExtractedData {
  scene: SupplySceneType;
  /** 供给方描述原文 */
  rawText: string;
  /** 供给方资质 */
  qualification: SupplyQualification;
  /** 质量评估 */
  qualityMetrics: SupplyQualityMetrics;
  /** 提取置信度 */
  confidence: number;
  /** 关键词 */
  keywords: string[];
}

/**
 * VisionShare Supply Data
 * VisionShare 供给数据 - 摄影师/服务提供者
 */
export interface VisionShareSupplyData extends SupplyExtractedData {
  scene: 'visionshare';
  equipment: {
    cameras: string[];       // 相机设备
    lenses: string[];        // 镜头
    lighting: string[];      // 灯光设备
    other: string[];         // 其他设备
  };
  experience: {
    years: number;           // 从业年限
    photographyTypes: string[]; // 擅长类型
    portfolio: string[];     // 作品集描述
    notableProjects: string[];  // 代表项目
  };
  style: {
    primary: string;         // 主要风格
    secondary: string[];     // 辅助风格
    techniques: string[];    // 技法
  };
  pricing?: {
    portrait?: { min: number; max: number; currency: string };
    wedding?: { min: number; max: number; currency: string };
    commercial?: { min: number; max: number; currency: string };
    other?: { min: number; max: number; currency: string };
  };
  availability?: {
    weekdays: boolean;
    weekends: boolean;
    evenings: boolean;
    travel: boolean;
  };
}

/**
 * Job Supply Data
 * AgentJob 供给数据 - 求职者
 */
export interface JobSupplyData extends SupplyExtractedData {
  scene: 'agentjob';
  skills: {
    technical: string[];     // 技术技能
    soft: string[];          // 软技能
    languages: string[];     // 语言能力
    certifications: string[]; // 证书
  };
  experience: {
    totalYears: number;      // 总工作年限
    level: 'junior' | 'mid' | 'senior' | 'expert';
    industries: string[];    // 行业经历
    companies: string[];     // 公司经历
    roles: string[];         // 职位经历
  };
  expectations: {
    salaryRange?: { min: number; max: number; currency: string; period: 'monthly' | 'yearly' };
    jobTypes: string[];      // 全职/兼职/远程
    location?: string;
    remote: boolean;
    startDate?: string;
  };
  education?: {
    degree: string;
    major: string;
    school?: string;
  };
}

/**
 * Ad Supply Data
 * AgentAd 供给数据 - 商家
 */
export interface AdSupplyData extends SupplyExtractedData {
  scene: 'agentad';
  products: Array<{
    name: string;
    category: string;
    description?: string;
    condition: 'new' | 'used' | 'refurbished';
    pricing?: { price: number; currency: string; unit?: string };
    inventory?: number;
    features?: string[];
  }>;
  offers: Array<{
    type: string;            // 折扣/赠品/包邮等
    description: string;
    conditions?: string;
    validUntil?: string;
  }>;
  business: {
    name?: string;
    category?: string;
    rating?: number;
    verified: boolean;
    location?: string;
    platforms: string[];     // 销售平台
  };
}

/**
 * Supply Scene Detection Result
 * 供给场景检测结果
 */
export interface SupplySceneDetectionResult {
  scene: SupplySceneType;
  confidence: number;
  keywords: string[];
  alternativeScenes: Array<{ scene: SupplySceneType; confidence: number }>;
}

/**
 * Supply Extractor Interface
 * 供给提取器接口
 */
export interface SupplyExtractor<T extends SupplyExtractedData = SupplyExtractedData> {
  /** 获取场景类型 */
  getSceneType(): SupplySceneType;

  /** 从文本提取供给信息 */
  extract(text: string, context?: Record<string, any>): Promise<T>;

  /** 检查是否可以处理该文本 */
  canHandle(text: string): Promise<{ canHandle: boolean; confidence: number }>;

  /** 获取必填字段 */
  getRequiredFields(): string[];

  /** 获取可选字段 */
  getOptionalFields(): string[];

  /** 验证提取结果 */
  validate(data: T): { valid: boolean; missingFields: string[] };

  /** 生成澄清问题 */
  generateClarificationQuestions(missingFields: string[]): string[];
}
