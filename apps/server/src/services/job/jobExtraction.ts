/**
 * Job Extraction Service
 *
 * AI-powered service for extracting structured job information from natural language.
 * This is a stub implementation that will be connected to the AI extraction service (ISSUE-AI003a)
 * when it becomes available.
 */

import {
  type JobDescription,
  type JobPosting,
} from '@bridgeai/shared';

export interface ExtractionResult {
  structuredData: JobDescription;
  extractedSkills: string[];
  skillMatchScore: number;
  competitivenessScore: number;
  suggestions: string[];
  qualityScore: number;
}

export interface JobExtractionOptions {
  includeCompetitivenessAnalysis?: boolean;
  includeSalarySuggestion?: boolean;
  targetIndustry?: string;
}

/**
 * Extract structured job information from natural language description
 *
 * TODO: Connect to AI003a extraction service when available
 * Currently returns a mock extraction for development/testing
 */
export async function extractJobFromDescription(
  description: string,
  options: JobExtractionOptions = {}
): Promise<ExtractionResult> {
  // TODO: Replace with actual AI extraction from ISSUE-AI003a
  // This is a stub that extracts basic information using regex patterns

  const extractedSkills = extractSkills(description);
  const salaryInfo = extractSalaryInfo(description);
  const experienceInfo = extractExperienceInfo(description);

  return {
    structuredData: {
      summary: generateSummary(description),
      responsibilities: extractResponsibilities(description),
      requirements: extractRequirements(description),
      preferredQualifications: extractPreferredQualifications(description),
      benefits: extractBenefits(description),
    },
    extractedSkills,
    skillMatchScore: Math.floor(Math.random() * 30) + 60, // 60-90 placeholder
    competitivenessScore: Math.floor(Math.random() * 40) + 40, // 40-80 placeholder
    suggestions: generateSuggestions(description, extractedSkills),
    qualityScore: Math.floor(Math.random() * 30) + 60, // 60-90 placeholder
  };
}

/**
 * Evaluate job posting quality
 */
export async function evaluateJobQuality(
  jobData: Partial<JobPosting>
): Promise<{
  score: number;
  strengths: string[];
  improvements: string[];
  missingFields: string[];
}> {
  const strengths: string[] = [];
  const improvements: string[] = [];
  const missingFields: string[] = [];
  let score = 50;

  // Check required fields
  if (!jobData.title) missingFields.push('title');
  if (!jobData.description) missingFields.push('description');
  if (!jobData.salary) missingFields.push('salary');
  if (!jobData.location) missingFields.push('location');

  // Evaluate description quality
  if (jobData.description) {
    const summary = jobData.description.summary || '';
    if (summary.length > 100) {
      strengths.push('职位概述详细');
      score += 10;
    } else {
      improvements.push('建议补充更详细的职位概述');
    }

    if (jobData.description.responsibilities && jobData.description.responsibilities.length > 0) {
      strengths.push('职责描述清晰');
      score += 10;
    } else {
      improvements.push('建议添加具体的工作职责');
    }

    if (jobData.description.requirements && jobData.description.requirements.length > 0) {
      strengths.push('要求说明完整');
      score += 10;
    } else {
      improvements.push('建议明确职位要求');
    }
  }

  // Evaluate salary
  if (jobData.salary) {
    if (!jobData.salary.isNegotiable && jobData.salary.min > 0) {
      strengths.push('薪资范围明确');
      score += 10;
    } else if (jobData.salary.isNegotiable) {
      improvements.push('建议提供薪资范围以吸引更多候选人');
    }
  }

  // Evaluate benefits
  if (jobData.benefits) {
    const benefitCount = Object.values(jobData.benefits).filter(v => v === true).length;
    if (benefitCount > 3) {
      strengths.push('福利待遇丰富');
      score += 10;
    } else {
      improvements.push('建议增加更多福利待遇描述');
    }
  }

  return {
    score: Math.min(score, 100),
    strengths,
    improvements,
    missingFields,
  };
}

/**
 * Analyze competitiveness against similar jobs
 * TODO: Connect to AI003a when available
 */
export async function analyzeCompetitiveness(
  jobData: Partial<JobPosting>,
  similarJobs?: Partial<JobPosting>[]
): Promise<{
  score: number;
  marketPosition: 'high' | 'medium' | 'low';
  insights: string[];
}> {
  // Placeholder implementation
  return {
    score: Math.floor(Math.random() * 30) + 60,
    marketPosition: 'medium',
    insights: [
      '该职位在市场上属于中等竞争力水平',
      '建议在福利待遇方面提供更多优势',
      '薪资范围与市场平均水平相当',
    ],
  };
}

/**
 * Generate job description from structured data
 */
export async function generateJobDescription(
  structuredData: Partial<JobDescription>,
  tone: 'professional' | 'casual' | 'enthusiastic' = 'professional'
): Promise<string> {
  // TODO: Connect to AI003a for natural language generation
  const parts: string[] = [];

  if (structuredData.summary) {
    parts.push(structuredData.summary);
  }

  if (structuredData.responsibilities && structuredData.responsibilities.length > 0) {
    parts.push('\n\n工作职责：\n' + structuredData.responsibilities.map(r => `• ${r}`).join('\n'));
  }

  if (structuredData.requirements && structuredData.requirements.length > 0) {
    parts.push('\n\n任职要求：\n' + structuredData.requirements.map(r => `• ${r}`).join('\n'));
  }

  if (structuredData.preferredQualifications && structuredData.preferredQualifications.length > 0) {
    parts.push('\n\n优先条件：\n' + structuredData.preferredQualifications.map(p => `• ${p}`).join('\n'));
  }

  if (structuredData.benefits && structuredData.benefits.length > 0) {
    parts.push('\n\n福利待遇：\n' + structuredData.benefits.map(b => `• ${b}`).join('\n'));
  }

  return parts.join('\n');
}

// ============================================================================
// Helper Functions (to be replaced with AI extraction)
// ============================================================================

function extractSkills(description: string): string[] {
  const skillKeywords = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'C#',
    'React', 'Vue', 'Angular', 'Node.js', 'Express', 'Django', 'Spring',
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform',
    'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch',
    'Machine Learning', 'AI', 'Data Analysis', 'Product Management',
    'UI/UX Design', 'Figma', 'Sketch', 'Adobe XD',
    'Agile', 'Scrum', 'Kanban', 'Jira', 'Confluence',
    'Communication', 'Leadership', 'Problem Solving', 'Teamwork',
    'English', 'Chinese', 'Japanese', 'Korean',
  ];

  const found: string[] = [];
  const lowerDesc = description.toLowerCase();

  skillKeywords.forEach(skill => {
    if (lowerDesc.includes(skill.toLowerCase())) {
      found.push(skill);
    }
  });

  return found.slice(0, 10); // Limit to top 10
}

function extractSalaryInfo(description: string): { min?: number; max?: number; period?: string } {
  const salaryRegex = /(\d+)k?\s*[-~至到]\s*(\d+)k?/gi;
  const matches = description.match(salaryRegex);

  if (matches && matches.length > 0) {
    const nums = matches[0].match(/\d+/g);
    if (nums && nums.length >= 2) {
      return {
        min: parseInt(nums[0]) * (matches[0].includes('k') ? 1000 : 1),
        max: parseInt(nums[1]) * (matches[0].includes('k') ? 1000 : 1),
        period: 'MONTHLY',
      };
    }
  }

  return {};
}

function extractExperienceInfo(description: string): { level?: string; years?: number } {
  const patterns = [
    { regex: /(\d+)\s*[-~至到]?\s*(\d+)\s*年/, type: 'range' },
    { regex: /(\d+)\+?\s*年以上/, type: 'min' },
    { regex: /应届/, type: 'entry' },
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern.regex);
    if (match) {
      if (pattern.type === 'entry') {
        return { level: 'ENTRY', years: 0 };
      } else if (pattern.type === 'min') {
        return { level: 'MID', years: parseInt(match[1]) };
      } else if (pattern.type === 'range') {
        return { level: 'MID', years: parseInt(match[1]) };
      }
    }
  }

  return {};
}

function generateSummary(description: string): string {
  // Extract first sentence or first 100 chars
  const sentences = description.split(/[。！？.!?]/);
  const first = sentences[0]?.trim();
  return first?.length > 10 ? first.substring(0, 200) : description.substring(0, 200);
}

function extractResponsibilities(description: string): string[] {
  const patterns = [
    /负责[：:]([^。！\n]+)/g,
    /职责[：:]([^。！\n]+)/g,
    /工作[：:]([^。！\n]+)/g,
    /([\u4e00-\u9fa5]+开发)/g,
    /([\u4e00-\u9fa5]+设计)/g,
    /([\u4e00-\u9fa5]+管理)/g,
  ];

  const responsibilities: string[] = [];

  patterns.forEach(pattern => {
    const matches = description.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].length > 2 && match[1].length < 100) {
        responsibilities.push(match[1].trim());
      }
    }
  });

  return responsibilities.slice(0, 10).length > 0
    ? responsibilities.slice(0, 10)
    : ['负责相关业务的开发和维护', '参与产品需求讨论和技术方案设计', '编写高质量的代码和技术文档'];
}

function extractRequirements(description: string): string[] {
  const patterns = [
    /要求[：:]([^。！\n]+)/g,
    /需要[：:]([^。！\n]+)/g,
    /具备([^。！\n]+)能力/g,
    /精通([\u4e00-\u9fa5a-zA-Z]+)/g,
    /熟悉([\u4e00-\u9fa5a-zA-Z]+)/g,
  ];

  const requirements: string[] = [];

  patterns.forEach(pattern => {
    const matches = description.matchAll(pattern);
    for (const match of matches) {
      const text = match[1] || match[0];
      if (text && text.length > 2 && text.length < 100) {
        requirements.push(text.replace(/要求[：:]|需要[：:]/, '').trim());
      }
    }
  });

  return requirements.slice(0, 10).length > 0
    ? requirements.slice(0, 10)
    : ['本科及以上学历', '良好的沟通能力和团队协作精神', '具备相关工作经验'];
}

function extractPreferredQualifications(description: string): string[] {
  const patterns = [
    /优先[：:]([^。！\n]+)/g,
    /加分[：:]([^。！\n]+)/g,
    /有([^。！\n]+)经验优先/g,
  ];

  const preferred: string[] = [];

  patterns.forEach(pattern => {
    const matches = description.matchAll(pattern);
    for (const match of matches) {
      const text = match[1] || match[0];
      if (text && text.length > 2 && text.length < 100) {
        preferred.push(text.replace(/优先[：:]|加分[：:]/, '').trim());
      }
    }
  });

  return preferred.slice(0, 5);
}

function extractBenefits(description: string): string[] {
  const benefitKeywords = [
    '五险一金', '补充医疗保险', '股票期权', '年终奖', '绩效奖金',
    '带薪年假', '弹性工作', '远程办公', '免费三餐', '健身房',
    '定期体检', '团队旅游', '节日福利', '生日福利', '培训机会',
    '晋升空间', '扁平管理', '技术大牛', '美女多', '帅哥多',
  ];

  const found: string[] = [];
  benefitKeywords.forEach(benefit => {
    if (description.includes(benefit)) {
      found.push(benefit);
    }
  });

  return found.length > 0 ? found : ['五险一金', '带薪年假', '弹性工作'];
}

function generateSuggestions(description: string, skills: string[]): string[] {
  const suggestions: string[] = [];

  if (description.length < 200) {
    suggestions.push('建议补充更详细的职位描述，帮助候选人更好地了解岗位');
  }

  if (skills.length < 3) {
    suggestions.push('建议明确列出所需的技能要求');
  }

  if (!description.includes('薪资') && !description.includes('待遇')) {
    suggestions.push('建议提供薪资范围或福利待遇信息');
  }

  if (suggestions.length === 0) {
    suggestions.push('职位描述质量良好，建议保持');
  }

  return suggestions;
}
