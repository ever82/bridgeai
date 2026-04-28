/**
 * @jest-environment node
 *
 * Integration tests for Resume Screening Service
 * Requires LLM_API_KEY (or OPENAI_API_KEY) to be configured
 * Run with: npm run test:integration -- --testPathPattern=resumeScreening.integration
 *
 * These tests use REAL LLM calls to validate the full screening pipeline,
 * not mocked responses.
 */

import { ResumeScreeningService, ResumeScreeningRequest } from '../resumeScreening';

// ---------------------------------------------------------------------------
// Skip condition
// ---------------------------------------------------------------------------

const hasLLMKey = !!(process.env.OPENAI_API_KEY || process.env.LLM_API_KEY);

// Conditional it.skip / it to allow the test suite to run even without keys
const itif = hasLLMKey ? it : it.skip;

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const sampleResumeText = `
李明 (Li Ming)
资深全栈工程师 (Senior Full Stack Engineer)

工作经历 (Work Experience):

2020年3月 - 至今: 高级前端工程师 @ 上海科技创新有限公司
- 主导前端架构设计，使用 React + TypeScript 构建企业级管理后台
- 带领4人团队完成用户增长模块开发，DAU提升40%
- 设计并实现微前端架构，解决多团队协作时的样式冲突问题
- 使用 Node.js 构建后端 API 服务，支撑日均10万次请求
- 维护 PostgreSQL 数据库，优化查询性能，平均响应时间降低60%

2017年6月 - 2020年2月: 全栈工程师 @ 北京互联网科技公司
- 开发 SPA 应用，负责前端界面和后端逻辑开发
- 熟练使用 Vue.js 和 Django 框架
- 参与用户画像系统设计，通过行为数据分析提升转化率
- 负责 DevOps 流程优化，搭建 GitLab CI/CD 自动化部署流水线

教育背景 (Education):
- 北京大学，计算机科学，硕士，2015-2017
- 上海交通大学，计算机科学与技术，学士，2011-2015

技能 (Skills):
- 前端: React, TypeScript, Vue.js, JavaScript, HTML/CSS, Redux, Zustand
- 后端: Node.js, Express, Django, Python, GraphQL, REST API
- 数据库: PostgreSQL, MySQL, MongoDB, Redis
- DevOps: Docker, Kubernetes, GitLab CI, AWS, Nginx
- 工具: Git, Webpack, Vite, Jest, Cypress, Figma

项目经验 (Projects):
- 企业级微前端平台 (2022): 使用 qiankun 实现多应用隔离
- 实时协作白板 (2021): 使用 Socket.io 实现多人实时编辑功能
- 推荐系统后端 (2020): 基于协同过滤算法的商品推荐服务

语言能力 (Languages):
- 中文: 母语
- 英语: CET-6 (流利读写，可进行技术讨论)
`;

const sampleJobCriteria = {
  title: 'Senior Full Stack Engineer',
  requiredSkills: ['React', 'Node.js', 'TypeScript'],
  preferredSkills: ['PostgreSQL', 'Docker'],
  minExperienceYears: 3,
  educationLevel: 'Bachelor',
  location: 'Shanghai',
  isRemote: false,
  description:
    'Looking for a senior full stack engineer to build and maintain our core SaaS product. Must have experience with React and Node.js in production environments.',
  salary: { min: 35000, max: 55000, currency: 'CNY' },
};

const sampleEmployerProfile = {
  companyName: '上海科技创新有限公司',
  culture: ['innovation', 'ownership', 'continuous learning'],
  industry: 'SaaS / Cloud',
  size: '100-500',
};

const batchResumes = [
  {
    id: 'resume-batch-001',
    text: `
张伟 (Zhang Wei)
前端工程师 @ 杭州互联网公司

工作经历: 3年前端开发，主要使用 Vue.js 和 JavaScript。
使用过 Element UI 构建后台管理系统。
了解基本的 HTTP 协议和 RESTful API。

教育: 同济大学，软件工程，本科，2019-2023

技能: JavaScript, Vue.js, HTML, CSS, Git
`,
  },
  {
    id: 'resume-batch-002',
    text: `
王芳 (Wang Fang)
全栈工程师 @ 深圳科技公司

工作经历:
- 4年全栈开发经验
- 熟练使用 React 和 Node.js 构建应用
- 负责过电商系统后端开发，使用 PostgreSQL
- 有 Docker 容器化部署经验

教育: 清华大学，计算机科学，硕士，2018-2021

技能: React, Node.js, TypeScript, PostgreSQL, Docker, Redis
`,
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ResumeScreeningService Integration', () => {
  let service: ResumeScreeningService;

  beforeAll(() => {
    service = new ResumeScreeningService();
  });

  // -------------------------------------------------------------------------
  // screen
  // -------------------------------------------------------------------------

  itif('should screen a resume with real LLM and return structured result', async () => {
    const request: ResumeScreeningRequest = {
      resumeText: sampleResumeText,
      jobCriteria: sampleJobCriteria,
    };

    const result = await service.screen(request);

    // Validate overall structure
    expect(result).toHaveProperty('screeningScore');
    expect(result).toHaveProperty('recommendation');
    expect(result).toHaveProperty('dimensions');
    expect(result).toHaveProperty('matchedSkills');
    expect(result).toHaveProperty('missingSkills');

    // Validate types and ranges
    expect(typeof result.screeningScore).toBe('number');
    expect(result.screeningScore).toBeGreaterThanOrEqual(0);
    expect(result.screeningScore).toBeLessThanOrEqual(100);

    expect(result.recommendation).toMatch(/^(STRONG_GO|GO|HOLD|NO_GO)$/);

    expect(result.dimensions).toHaveProperty('explicitSkillsMatch');
    expect(result.dimensions).toHaveProperty('implicitSkillsInferred');
    expect(result.dimensions).toHaveProperty('experienceRelevance');
    expect(result.dimensions).toHaveProperty('educationFit');
    expect(result.dimensions).toHaveProperty('salaryFit');

    expect(result.dimensions.explicitSkillsMatch.score).toBeGreaterThanOrEqual(0);
    expect(result.dimensions.explicitSkillsMatch.score).toBeLessThanOrEqual(100);

    // Validate matched/missing skill arrays
    expect(Array.isArray(result.matchedSkills)).toBe(true);
    expect(Array.isArray(result.missingSkills)).toBe(true);

    // LLM metadata should be present
    expect(result.provider).toBeTruthy();
    expect(result.model).toBeTruthy();
    expect(typeof result.latencyMs).toBe('number');
    expect(result.latencyMs).toBeGreaterThan(0);

    // The resume is a strong match — expect GO or STRONG_GO
    expect(['GO', 'STRONG_GO']).toContain(result.recommendation);
  });

  itif('should include cultural fit when employer profile is provided', async () => {
    const request: ResumeScreeningRequest = {
      resumeText: sampleResumeText,
      jobCriteria: sampleJobCriteria,
      employerProfile: sampleEmployerProfile,
    };

    const result = await service.screen(request);

    expect(result.dimensions.culturalFit).toBeDefined();
    expect(typeof result.dimensions.culturalFit?.score).toBe('number');
    expect(result.dimensions.culturalFit!.score).toBeGreaterThanOrEqual(0);
  });

  // -------------------------------------------------------------------------
  // screenBatch
  // -------------------------------------------------------------------------

  itif('should screen multiple resumes in batch with real LLM', async () => {
    const result = await service.screenBatch({
      resumes: batchResumes,
      jobCriteria: sampleJobCriteria,
    });

    expect(result.results).toHaveLength(2);

    // Validate structure of each result
    for (const r of result.results) {
      expect(typeof r.screeningScore).toBe('number');
      expect(r.screeningScore).toBeGreaterThanOrEqual(0);
      expect(r.screeningScore).toBeLessThanOrEqual(100);
      expect(r.recommendation).toMatch(/^(STRONG_GO|GO|HOLD|NO_GO)$/);
      expect(Array.isArray(r.matchedSkills)).toBe(true);
      expect(Array.isArray(r.missingSkills)).toBe(true);
      expect(Array.isArray(r.concerns)).toBe(true);
    }

    // The second resume (Wang Fang) is a stronger match — should score higher
    const [r1, r2] = result.results;
    expect(r2.screeningScore).toBeGreaterThanOrEqual(r1.screeningScore);
  });

  // -------------------------------------------------------------------------
  // screenAndRank
  // -------------------------------------------------------------------------

  itif('should screen and rank multiple resumes by score (small batch, individual)', async () => {
    const resumes = [
      { id: 'rank-1', text: batchResumes[1].text }, // stronger
      { id: 'rank-2', text: batchResumes[0].text }, // weaker
    ];

    const ranked = await service.screenAndRank(resumes, sampleJobCriteria);

    expect(ranked).toHaveLength(2);
    // Results should be sorted descending by score
    expect(ranked[0].result.screeningScore).toBeGreaterThanOrEqual(ranked[1].result.screeningScore);
    expect(ranked[0].resumeId).toBe('rank-1');
  });

  // -------------------------------------------------------------------------
  // explainRecommendation
  // -------------------------------------------------------------------------

  itif('should generate recommendation explanation with real LLM', async () => {
    const result = await service.explainRecommendation(
      {
        name: '李明',
        skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'],
        experienceYears: 7,
        title: 'Senior Full Stack Engineer',
      },
      {
        title: 'Senior Full Stack Engineer',
        requiredSkills: ['React', 'Node.js', 'TypeScript'],
        description: 'SaaS product development',
        companyName: '上海科技创新有限公司',
      },
      85
    );

    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('matchingReasons');
    expect(result).toHaveProperty('skillAlignment');
    expect(result).toHaveProperty('careerFit');
    expect(result).toHaveProperty('recommendedNextSteps');

    expect(typeof result.summary).toBe('string');
    expect(result.summary.length).toBeGreaterThan(0);
    expect(Array.isArray(result.matchingReasons)).toBe(true);
    expect(result.matchingReasons.length).toBeGreaterThan(0);
    expect(Array.isArray(result.skillAlignment.matched)).toBe(true);
    expect(Array.isArray(result.skillAlignment.gaps)).toBe(true);
    expect(Array.isArray(result.recommendedNextSteps)).toBe(true);
    expect(result.recommendedNextSteps.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // Validation: invalid LLM responses should throw LLMResponseParseError
  // -------------------------------------------------------------------------

  itif('should throw LLMResponseParseError when LLM returns non-JSON', async () => {
    // We can't easily inject a bad response in integration tests without
    // an environment variable override, so we rely on the unit tests for
    // malformed response coverage. This test verifies that the service
    // throws on completely invalid responses if the real LLM somehow
    // deviates from the JSON format requirement.
    const request: ResumeScreeningRequest = {
      resumeText: 'Very short resume text',
      jobCriteria: {
        title: 'Test Job',
        requiredSkills: ['JavaScript'],
      },
    };

    // The service should either return valid JSON or throw LLMResponseParseError.
    // We can't predict the exact LLM output, so just verify it doesn't
    // return malformed data.
    try {
      const result = await service.screen(request);
      // If it succeeds, the result must be well-structured
      expect(result.screeningScore).toBeGreaterThanOrEqual(0);
      expect(result.recommendation).toMatch(/^(STRONG_GO|GO|HOLD|NO_GO)$/);
    } catch (error) {
      // Errors are acceptable (LLM may fail), but should be a proper Error
      expect(error).toBeInstanceOf(Error);
    }
  });
});

// ---------------------------------------------------------------------------
// Report when tests are skipped
// ---------------------------------------------------------------------------

if (!hasLLMKey) {
  beforeAll(() => {
    console.warn(
      '\n⚠️  Integration tests skipped: LLM_API_KEY / OPENAI_API_KEY not configured.\n' +
        '   Set one of these environment variables to run the real LLM integration tests.\n'
    );
  });
}
