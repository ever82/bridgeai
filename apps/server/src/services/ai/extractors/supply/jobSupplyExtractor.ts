/**
 * Job Supply Extractor
 * AgentJob 供给提取器 - 求职者供给信息提取
 */

import { logger } from '../../../../utils/logger';

import { BaseSupplyExtractor } from './baseSupplyExtractor';
import { JobSupplyData, SupplySceneType, SupplyQualification } from './types';

/**
 * Job Supply Extractor
 * Extracts job seeker supply information (skills, experience, expectations)
 */
export class JobSupplyExtractor extends BaseSupplyExtractor<JobSupplyData> {
  private readonly sceneTypeValue: SupplySceneType = 'agentjob';

  protected readonly detectionKeywords = [
    '求职', '找工作', '应聘', '简历',
    '技能', '经验', '项目经验',
    '薪资期望', '期望薪资', '期望待遇',
    '求职意向', '个人优势',
    '技术栈', '技术能力', '专业能力',
    '教育背景', '学历',
    '开发', '工程师', '设计师', '经理',
  ];

  protected readonly requiredFields = [
    'skills',
    'experience',
  ];

  protected readonly optionalFields = [
    'expectations',
    'education',
    'qualification',
  ];

  getSceneType(): SupplySceneType {
    return this.sceneTypeValue;
  }

  /**
   * Extract Job supply data from text
   */
  async extract(text: string, context?: Record<string, any>): Promise<JobSupplyData> {
    logger.info('Extracting Job supply', { textLength: text.length });

    const keywords = this.extractKeywords(text);
    const skills = this.extractSkills(text);
    const experience = this.extractExperience(text);
    const expectations = this.extractExpectations(text);
    const education = this.extractEducation(text);
    const qualification = this.extractQualification(text, skills, experience);

    let extractedFields = 0;
    const totalFields = 4;
    if (skills.technical.length > 0 || skills.soft.length > 0) extractedFields++;
    if (experience.totalYears > 0 || experience.roles.length > 0) extractedFields++;
    if (expectations.jobTypes.length > 0) extractedFields++;
    if (education) extractedFields++;

    const qualityMetrics = this.calculateQualityMetrics(
      extractedFields,
      totalFields,
      expectations.salaryRange !== undefined,
      experience.companies.length > 0,
    );

    const confidence = this.calculateConfidence(skills, experience, expectations);

    const data: JobSupplyData = {
      scene: 'agentjob',
      rawText: text,
      qualification,
      qualityMetrics,
      confidence,
      keywords,
      skills,
      experience,
      expectations,
      education,
    };

    logger.info('Job supply extraction completed', {
      confidence,
      skillCount: skills.technical.length + skills.soft.length,
      experienceYears: experience.totalYears,
    });

    return data;
  }

  /**
   * Extract skills
   */
  private extractSkills(text: string): JobSupplyData['skills'] {
    const technical: string[] = [];
    const soft: string[] = [];
    const languages: string[] = [];
    const certifications: string[] = [];

    // Technical skills
    const techSkills = [
      'Java', 'Python', 'JavaScript', 'TypeScript', 'Go', 'Rust', 'C++', 'C#',
      'React', 'Vue', 'Angular', 'Next.js', 'Nuxt.js',
      'Node.js', 'Spring', 'Django', 'Flask', 'Express',
      'SQL', 'MongoDB', 'Redis', 'PostgreSQL', 'MySQL',
      'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP',
      'Linux', 'Git', 'CI/CD', 'Jenkins', 'Terraform',
      '机器学习', '深度学习', '数据分析', '数据科学', 'NLP',
      '产品设计', 'UI设计', 'UX设计', 'Figma', 'Sketch',
    ];

    for (const skill of techSkills) {
      if (new RegExp(skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(text)) {
        technical.push(skill);
      }
    }

    // Soft skills
    const softPatterns = [
      { pattern: /沟通|表达能力/, skill: '沟通能力' },
      { pattern: /团队|协作|合作/, skill: '团队协作' },
      { pattern: /领导|管理|带队/, skill: '领导力' },
      { pattern: /项目管理/, skill: '项目管理' },
      { pattern: /问题解决|分析能力/, skill: '问题解决' },
      { pattern: /创新|创造力/, skill: '创新能力' },
      { pattern: /时间管理/, skill: '时间管理' },
      { pattern: /抗压|抗压能力/, skill: '抗压能力' },
      { pattern: /学习|快速学习/, skill: '学习能力' },
    ];

    for (const { pattern, skill } of softPatterns) {
      if (pattern.test(text) && !soft.includes(skill)) {
        soft.push(skill);
      }
    }

    // Languages
    const langPatterns = [
      { pattern: /英语|CET|CET-4|CET-6|雅思|IELTS|托福|TOEFL/, lang: '英语' },
      { pattern: /日语|JLPT|N1|N2/, lang: '日语' },
      { pattern: /韩语|TOPIK/, lang: '韩语' },
      { pattern: /法语|DELF/, lang: '法语' },
      { pattern: /德语|德福/, lang: '德语' },
    ];

    for (const { pattern, lang } of langPatterns) {
      if (pattern.test(text) && !languages.includes(lang)) {
        languages.push(lang);
      }
    }

    // Certifications
    const certPatterns = [
      { pattern: /PMP/, cert: 'PMP' },
      { pattern: /AWS\s*认证/, cert: 'AWS认证' },
      { pattern: /CPA|注册会计师/, cert: 'CPA' },
      { pattern: /CFA/, cert: 'CFA' },
      { pattern: /软考|高级工程师/, cert: '软考高级' },
    ];

    for (const { pattern, cert } of certPatterns) {
      if (pattern.test(text)) {
        certifications.push(cert);
      }
    }

    return { technical, soft, languages, certifications };
  }

  /**
   * Extract experience
   */
  private extractExperience(text: string): JobSupplyData['experience'] {
    const totalYears = this.parseExperienceYears(text);
    let level: 'junior' | 'mid' | 'senior' | 'expert' = 'mid';
    const industries: string[] = [];
    const companies: string[] = [];
    const roles: string[] = [];

    // Level
    if (/应届|毕业生|实习/.test(text)) {
      level = 'junior';
    } else if (/资深|高级|专家|总监|VP/.test(text)) {
      level = 'expert';
    } else if (/初级|入门|1-3年/.test(text)) {
      level = 'junior';
    } else if (/中级|3-5年|5-10年/.test(text)) {
      level = 'senior';
    } else if (totalYears >= 10) {
      level = 'expert';
    } else if (totalYears >= 5) {
      level = 'senior';
    } else if (totalYears >= 3) {
      level = 'mid';
    }

    // Industries
    const industryNames = [
      '互联网', '金融', '电商', '教育', '医疗', '制造业',
      '房地产', '汽车', '游戏', '广告', '咨询', '法律',
      '物流', '零售', '能源', '半导体', '通信',
    ];
    for (const industry of industryNames) {
      if (text.includes(industry)) industries.push(industry);
    }

    // Companies - extract from common patterns
    const companyPatterns = [
      /(?:曾在|任职于|就职于)\s*([\u4e00-\u9fa5\w]+(?:公司|集团|科技|网络|信息)?)/g,
      /(?:腾讯|阿里|阿里巴巴|字节跳动|百度|美团|京东|拼多多|华为|小米)/g,
    ];
    for (const pattern of companyPatterns) {
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        const company = match[1] || match[0];
        if (!companies.includes(company)) {
          companies.push(company);
        }
      }
    }

    // Roles
    const rolePatterns = [
      { pattern: /(前端|后端|全栈|移动端)\s*(?:开发|工程师)/, role: (m: RegExpMatchArray) => m[1] + '开发工程师' },
      { pattern: /(产品经理|产品总监)/, role: (m: RegExpMatchArray) => m[1] },
      { pattern: /(UI|UX)\s*(?:设计师|设计)/, role: (m: RegExpMatchArray) => m[1] + '设计师' },
      { pattern: /(项目经理|技术经理|技术总监|架构师|CTO)/, role: (m: RegExpMatchArray) => m[1] },
      { pattern: /(数据分析师|数据科学家|算法工程师|AI工程师)/, role: (m: RegExpMatchArray) => m[1] },
    ];

    for (const { pattern, role } of rolePatterns) {
      const match = text.match(pattern);
      if (match && !roles.includes(role(match))) {
        roles.push(role(match));
      }
    }

    return { totalYears, level, industries, companies, roles };
  }

  /**
   * Extract expectations
   */
  private extractExpectations(text: string): JobSupplyData['expectations'] {
    const jobTypes: string[] = [];
    let remote = false;
    let location: string | undefined;
    let salaryRange: JobSupplyData['expectations']['salaryRange'] | undefined;
    let startDate: string | undefined;

    // Job types
    if (/全职/.test(text)) jobTypes.push('全职');
    if (/兼职/.test(text)) jobTypes.push('兼职');
    if (/实习/.test(text)) jobTypes.push('实习');
    if (/自由职业/.test(text)) jobTypes.push('自由职业');
    if (jobTypes.length === 0) jobTypes.push('全职');

    // Remote
    remote = /远程|在家|居家|remote/i.test(text);

    // Location
    const loc = this.parseLocation(text);
    location = loc.city || loc.district;

    // Salary range
    const salaryPricing = this.parsePricing(text);
    if (salaryPricing) {
      const period = /年薪|年/.test(text) ? 'yearly' : 'monthly';
      salaryRange = { ...salaryPricing, period };
    }

    // Start date
    const datePatterns = [
      { pattern: /随时|立即|马上| ASAP/i, date: '随时' },
      { pattern: /一个月内|下个月/, date: '一个月内' },
      { pattern: /年后|春节后/, date: '年后' },
      { pattern: /毕业后|应届/, date: '毕业后' },
    ];
    for (const { pattern, date } of datePatterns) {
      if (pattern.test(text)) {
        startDate = date;
        break;
      }
    }

    return { salaryRange, jobTypes, location, remote, startDate };
  }

  /**
   * Extract education
   */
  private extractEducation(text: string): JobSupplyData['education'] | undefined {
    let degree = '';
    let major = '';
    let school: string | undefined;

    // Degree
    if (/博士|PhD|Ph\.D/i.test(text)) degree = '博士';
    else if (/硕士|研究生|Master/i.test(text)) degree = '硕士';
    else if (/本科|学士|Bachelor/i.test(text)) degree = '本科';
    else if (/大专|专科|Associate/i.test(text)) degree = '大专';
    else return undefined;

    // Major
    const majorMatch = text.match(/(?:专业|毕业于)\s*([\u4e00-\u9fa5]{2,10})(?:专业|系|学院)/);
    if (majorMatch) {
      major = majorMatch[1];
    } else {
      const majorPatterns = [
        { pattern: /计算机|软件|信息/, major: '计算机科学' },
        { pattern: /电子|通信/, major: '电子信息' },
        { pattern: /金融|经济|会计/, major: '金融学' },
        { pattern: /机械|自动化/, major: '机械工程' },
        { pattern: /设计|美术|艺术/, major: '设计' },
      ];
      for (const { pattern, major: matchedMajor } of majorPatterns) {
        if (pattern.test(text)) {
          major = matchedMajor;
          break;
        }
      }
    }

    // School
    const schoolPatterns = [
      /(?:毕业于|就读于)\s*([\u4e00-\u9fa5]{2,15}(?:大学|学院|学校))/,
      /(清华大学|北京大学|复旦大学|上海交通大学|浙江大学|南京大学|中山大学)/,
      /(985|211)/,
    ];
    for (const pattern of schoolPatterns) {
      const match = text.match(pattern);
      if (match) {
        school = match[1];
        break;
      }
    }

    return { degree, major, school };
  }

  /**
   * Extract qualification
   */
  private extractQualification(
    text: string,
    skills: JobSupplyData['skills'],
    experience: JobSupplyData['experience'],
  ): SupplyQualification {
    const certifications = [...skills.certifications];
    const specializations = [...skills.technical.slice(0, 5), ...experience.industries];

    return this.buildQualification(text, certifications, specializations);
  }

  /**
   * Calculate confidence
   */
  private calculateConfidence(
    skills: JobSupplyData['skills'],
    experience: JobSupplyData['experience'],
    expectations: JobSupplyData['expectations'],
  ): number {
    let score = 0.3;

    if (skills.technical.length > 0) score += 0.2;
    if (skills.soft.length > 0) score += 0.1;
    if (experience.totalYears > 0) score += 0.15;
    if (experience.roles.length > 0) score += 0.1;
    if (expectations.jobTypes.length > 0) score += 0.05;
    if (expectations.salaryRange) score += 0.1;

    return Math.min(score, 1.0);
  }

  protected getClarificationQuestion(field: string): string {
    const questions: Record<string, string> = {
      'skills': '请列举您的核心技能和专业能力。',
      'experience': '请描述您的工作经验（年限、公司、职位）。',
      'expectations': '请说明您的求职期望（薪资、工作类型、地点等）。',
      'education': '请提供您的教育背景信息。',
      'skills.technical': '请列举您的技术技能。',
      'experience.totalYears': '请问您有多少年工作经验？',
    };

    return questions[field] || super.getClarificationQuestion(field);
  }
}
