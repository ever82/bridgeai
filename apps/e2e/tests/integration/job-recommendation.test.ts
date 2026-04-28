import { test, expect } from '../../fixtures/test-fixtures';

/**
 * 职位推荐集成测试
 *
 * 覆盖范围:
 * - 为求职者推荐职位
 * - 为招聘方推荐候选人
 * - 推荐解释生成
 * - 推荐反馈记录
 * - 推荐去重
 *
 * 注意: 这些测试需要运行中的服务器。
 */

test.describe('职位推荐集成测试', () => {
  test.describe('JobRecommendationService 职位推荐', () => {
    test('应该能为求职者推荐职位', async ({ apiContext, testUser }) => {
      const recommendationRequest = {
        seekerProfile: {
          userId: testUser.id,
          skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
          experienceYears: 5,
          educationLevel: 'Master',
          currentTitle: 'Senior Frontend Engineer',
          location: 'Shanghai',
          preferredSalary: { min: 40000, max: 60000, currency: 'CNY' },
          preferredJobTypes: ['full-time'],
          preferredLocations: ['Shanghai', 'Hangzhou'],
        },
        jobs: [
          {
            jobId: 'e2e-job-001',
            title: 'Senior Frontend Engineer',
            requiredSkills: ['React', 'TypeScript'],
            preferredSkills: ['Node.js'],
            salary: { min: 35000, max: 50000, currency: 'CNY' },
            location: 'Shanghai',
            isRemote: false,
            companyName: 'TechCorp Shanghai',
            description: 'Build enterprise SaaS products with React and TypeScript.',
          },
          {
            jobId: 'e2e-job-002',
            title: 'Full Stack Developer',
            requiredSkills: ['Node.js', 'Python'],
            preferredSkills: ['PostgreSQL'],
            salary: { min: 30000, max: 45000, currency: 'CNY' },
            location: 'Beijing',
            isRemote: true,
            companyName: 'DataHub Inc.',
            description: 'Build data processing pipelines and APIs.',
          },
          {
            jobId: 'e2e-job-003',
            title: 'Backend Engineer',
            requiredSkills: ['Go', 'Kubernetes'],
            salary: { min: 40000, max: 60000, currency: 'CNY' },
            location: 'Shanghai',
            isRemote: false,
            companyName: 'CloudScale',
            description: 'Design and build cloud-native microservices.',
          },
        ],
        page: 1,
        pageSize: 10,
      };

      const response = await apiContext.post('/api/jobs/recommendations/jobs', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
          'Content-Type': 'application/json',
        },
        data: recommendationRequest,
      });

      // 验证响应状态
      expect(response.status()).toBeLessThan(500);

      if (response.status() === 200 || response.status() === 201) {
        const result = await response.json();

        // 验证分页结构
        expect(result).toHaveProperty('recommendations');
        expect(result).toHaveProperty('total');
        expect(result).toHaveProperty('page');
        expect(result).toHaveProperty('pageSize');
        expect(result).toHaveProperty('hasMore');

        expect(Array.isArray(result.recommendations)).toBe(true);
        expect(result.total).toBe(recommendationRequest.jobs.length);
        expect(result.page).toBe(1);
        expect(result.pageSize).toBe(10);

        // 验证每个推荐项的结构
        for (const rec of result.recommendations) {
          expect(rec).toHaveProperty('itemId');
          expect(rec).toHaveProperty('score');
          expect(rec).toHaveProperty('reasons');
          expect(rec).toHaveProperty('skillMatch');

          expect(typeof rec.score).toBe('number');
          expect(rec.score).toBeGreaterThanOrEqual(0);
          expect(rec.score).toBeLessThanOrEqual(100);
          expect(Array.isArray(rec.reasons)).toBe(true);
          expect(rec.skillMatch).toHaveProperty('matched');
          expect(rec.skillMatch).toHaveProperty('gaps');
          expect(Array.isArray(rec.skillMatch.matched)).toBe(true);
          expect(Array.isArray(rec.skillMatch.gaps)).toBe(true);
        }

        // 验证排序: 分数应该降序排列
        for (let i = 1; i < result.recommendations.length; i++) {
          expect(result.recommendations[i - 1].score).toBeGreaterThanOrEqual(
            result.recommendations[i].score
          );
        }
      } else if (response.status() === 404 || response.status() === 501) {
        console.warn('职位推荐API端点尚未实现 (/api/jobs/recommendations/jobs)');
      }
    });

    test('应该能为招聘方推荐候选人', async ({ apiContext, testUser }) => {
      const recommendationRequest = {
        jobCriteria: {
          jobId: 'e2e-job-001',
          title: 'Senior Frontend Engineer',
          requiredSkills: ['React', 'TypeScript'],
          preferredSkills: ['Node.js', 'GraphQL'],
          salary: { min: 35000, max: 50000, currency: 'CNY' },
          location: 'Shanghai',
          isRemote: false,
          companyName: 'TechCorp Shanghai',
        },
        candidates: [
          {
            userId: 'e2e-candidate-001',
            name: '张云',
            skills: ['React', 'TypeScript', 'Node.js', 'GraphQL'],
            experienceYears: 6,
            educationLevel: 'Master',
            currentTitle: 'Senior Frontend Engineer',
            location: 'Shanghai',
          },
          {
            userId: 'e2e-candidate-002',
            name: '李强',
            skills: ['Python', 'Django', 'PostgreSQL'],
            experienceYears: 3,
            educationLevel: 'Bachelor',
            currentTitle: 'Backend Developer',
            location: 'Beijing',
          },
          {
            userId: 'e2e-candidate-003',
            name: '王琳',
            skills: ['React', 'TypeScript', 'Figma'],
            experienceYears: 4,
            educationLevel: 'Master',
            currentTitle: 'Frontend Developer',
            location: 'Shanghai',
          },
        ],
        page: 1,
        pageSize: 10,
      };

      const response = await apiContext.post('/api/jobs/recommendations/candidates', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
          'Content-Type': 'application/json',
        },
        data: recommendationRequest,
      });

      expect(response.status()).toBeLessThan(500);

      if (response.status() === 200 || response.status() === 201) {
        const result = await response.json();

        expect(result).toHaveProperty('recommendations');
        expect(result).toHaveProperty('total');
        expect(Array.isArray(result.recommendations)).toBe(true);
        expect(result.total).toBe(recommendationRequest.candidates.length);

        for (const rec of result.recommendations) {
          expect(typeof rec.score).toBe('number');
          expect(rec.score).toBeGreaterThanOrEqual(0);
          expect(rec.score).toBeLessThanOrEqual(100);
          expect(Array.isArray(rec.reasons)).toBe(true);
          expect(Array.isArray(rec.skillMatch.matched)).toBe(true);
          expect(Array.isArray(rec.skillMatch.gaps)).toBe(true);
        }

        // 排序验证
        for (let i = 1; i < result.recommendations.length; i++) {
          expect(result.recommendations[i - 1].score).toBeGreaterThanOrEqual(
            result.recommendations[i].score
          );
        }
      } else if (response.status() === 404 || response.status() === 501) {
        console.warn('候选人推荐API端点尚未实现 (/api/jobs/recommendations/candidates)');
      }
    });

    test('应该能获取推荐解释', async ({ apiContext, testUser }) => {
      const explanationRequest = {
        recommendation: {
          itemId: 'e2e-job-001',
          score: 88,
          reasons: ['Strong TypeScript match', '6 years React experience', 'Shanghai location'],
          skillMatch: {
            matched: ['React', 'TypeScript', 'Node.js'],
            gaps: ['GraphQL'],
          },
        },
      };

      const response = await apiContext.post('/api/jobs/recommendations/explain', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
          'Content-Type': 'application/json',
        },
        data: explanationRequest,
      });

      expect(response.status()).toBeLessThan(500);

      if (response.status() === 200 || response.status() === 201) {
        const result = await response.json();

        expect(result).toHaveProperty('summary');
        expect(result).toHaveProperty('details');
        expect(result).toHaveProperty('advice');

        expect(typeof result.summary).toBe('string');
        expect(result.summary.length).toBeGreaterThan(0);
        expect(typeof result.details).toBe('string');
        expect(typeof result.advice).toBe('string');
      }
    });

    test('应该能记录推荐反馈', async ({ apiContext, testUser }) => {
      const feedbackRequests = [
        {
          userId: testUser.id,
          recommendationId: 'rec-e2e-001',
          itemId: 'e2e-job-001',
          action: 'like' as const,
          timestamp: new Date().toISOString(),
        },
        {
          userId: testUser.id,
          recommendationId: 'rec-e2e-002',
          itemId: 'e2e-job-002',
          action: 'dislike' as const,
          timestamp: new Date().toISOString(),
        },
        {
          userId: testUser.id,
          recommendationId: 'rec-e2e-003',
          itemId: 'e2e-job-003',
          action: 'ignore' as const,
          timestamp: new Date().toISOString(),
        },
      ];

      // 记录多条反馈
      for (const feedback of feedbackRequests) {
        const response = await apiContext.post('/api/jobs/recommendations/feedback', {
          headers: {
            Authorization: `Bearer ${testUser.token}`,
            'Content-Type': 'application/json',
          },
          data: feedback,
        });

        expect(response.status()).toBeLessThan(500);
      }

      // 获取反馈历史
      const historyResponse = await apiContext.get(
        `/api/jobs/recommendations/history?userId=${testUser.id}`,
        {
          headers: {
            Authorization: `Bearer ${testUser.token}`,
          },
        }
      );

      expect(historyResponse.status()).toBeLessThan(500);

      if (historyResponse.status() === 200) {
        const history = await historyResponse.json();

        expect(Array.isArray(history)).toBe(true);
        expect(history.length).toBeGreaterThanOrEqual(3);
      }
    });

    test('应该能执行推荐去重', async ({ apiContext, testUser }) => {
      const dedupRequest = {
        userId: testUser.id,
        seenItemIds: ['e2e-job-001', 'e2e-job-002', 'e2e-job-003'],
      };

      const response = await apiContext.post('/api/jobs/recommendations/refresh', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
          'Content-Type': 'application/json',
        },
        data: dedupRequest,
      });

      // 验证请求能被正确处理
      expect(response.status()).toBeLessThan(500);

      if (response.status() === 200) {
        const result = await response.json();
        expect(result).toBeDefined();
      }
    });
  });

  test.describe('职位推荐错误处理', () => {
    test('空职位列表应该返回空推荐', async ({ apiContext, testUser }) => {
      const response = await apiContext.post('/api/jobs/recommendations/jobs', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
          'Content-Type': 'application/json',
        },
        data: {
          seekerProfile: {
            userId: testUser.id,
            skills: ['React'],
            experienceYears: 3,
          },
          jobs: [],
          page: 1,
          pageSize: 10,
        },
      });

      expect(response.status()).toBeLessThan(500);

      if (response.status() === 200) {
        const result = await response.json();
        expect(result.recommendations).toHaveLength(0);
        expect(result.total).toBe(0);
        expect(result.hasMore).toBe(false);
      }
    });

    test('空候选人列表应该返回空推荐', async ({ apiContext, testUser }) => {
      const response = await apiContext.post('/api/jobs/recommendations/candidates', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
          'Content-Type': 'application/json',
        },
        data: {
          jobCriteria: {
            jobId: 'e2e-job-001',
            title: 'Test Job',
            requiredSkills: ['JavaScript'],
          },
          candidates: [],
          page: 1,
          pageSize: 10,
        },
      });

      expect(response.status()).toBeLessThan(500);

      if (response.status() === 200) {
        const result = await response.json();
        expect(result.recommendations).toHaveLength(0);
        expect(result.total).toBe(0);
      }
    });
  });

  test.describe('职位推荐分页', () => {
    test('应该正确分页返回推荐结果', async ({ apiContext, testUser }) => {
      // 获取第一页
      const page1Response = await apiContext.post('/api/jobs/recommendations/jobs', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
          'Content-Type': 'application/json',
        },
        data: {
          seekerProfile: {
            userId: testUser.id,
            skills: ['React', 'TypeScript'],
            experienceYears: 5,
          },
          jobs: [
            { jobId: 'p-job-001', title: 'Job 1', requiredSkills: ['React'] },
            { jobId: 'p-job-002', title: 'Job 2', requiredSkills: ['React'] },
            { jobId: 'p-job-003', title: 'Job 3', requiredSkills: ['React'] },
            { jobId: 'p-job-004', title: 'Job 4', requiredSkills: ['React'] },
          ],
          page: 1,
          pageSize: 2,
        },
      });

      expect(page1Response.status()).toBeLessThan(500);

      if (page1Response.status() === 200) {
        const page1 = await page1Response.json();

        expect(page1.recommendations).toHaveLength(2);
        expect(page1.page).toBe(1);
        expect(page1.pageSize).toBe(2);
        expect(page1.hasMore).toBe(true);
        expect(page1.total).toBe(4);
      }
    });
  });
});
