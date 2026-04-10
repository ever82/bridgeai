import { test, expect } from '../../fixtures/test-fixtures';

/**
 * AgentJob场景端到端测试
 *
 * 覆盖范围:
 * - 求职者画像与简历配置
 * - 招聘方职位发布流程
 * - 简历智能匹配筛选验证
 * - 薪资协商与面试安排流程
 * - 招聘场景人机切换测试
 */

test.describe('AgentJob场景', () => {
  test.describe('求职者画像配置', () => {
    test('求职者应该能创建完整画像', async ({ apiContext, testUser }) => {
      // 1. 创建求职Agent
      const agentResponse = await apiContext.post('/api/agents', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          name: '求职助手',
          scene: 'agentjob',
          type: 'jobseeker',
        },
      });

      expect(agentResponse.ok()).toBeTruthy();
      const agent = await agentResponse.json();

      // 2. 配置求职画像
      const profileResponse = await apiContext.post('/api/agentjob/profiles/jobseeker', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          agentId: agent.id,
          basicInfo: {
            name: '张三',
            age: 28,
            gender: 'male',
            location: '北京',
          },
          education: [
            {
              school: '清华大学',
              degree: '本科',
              major: '计算机科学',
              graduationYear: 2019,
            },
          ],
          experience: [
            {
              company: '某科技公司',
              position: '高级前端工程师',
              duration: '2019-2024',
              description: '负责前端架构设计',
            },
          ],
          skills: ['React', 'TypeScript', 'Node.js', '微前端'],
          expectations: {
            position: '前端技术负责人',
            salary: [35000, 50000],
            location: '北京',
            remote: true,
            industry: ['互联网', '人工智能'],
          },
        },
      });

      expect(profileResponse.ok()).toBeTruthy();
      const profile = await profileResponse.json();
      expect(profile).toHaveProperty('id');
      expect(profile.skills).toContain('React');
      expect(profile.expectations.salary).toEqual([35000, 50000]);
    });

    test('Agent应该能从简历提取结构化信息', async ({ apiContext, testUser }) => {
      // 1. 创建Agent
      const agentResponse = await apiContext.post('/api/agents', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          name: '简历解析Agent',
          scene: 'agentjob',
          type: 'jobseeker',
        },
      });

      const agent = await agentResponse.json();

      // 2. 上传简历并提取
      const extractResponse = await apiContext.post('/api/agentjob/resume/extract', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          agentId: agent.id,
          resumeText: `
            姓名：李四
            工作经验5年，曾在阿里巴巴担任Java开发工程师。
            熟练掌握Java、Spring Boot、MySQL、Redis等技术。
            期望薪资：30k-40k，工作地点：杭州。
          `,
        },
      });

      expect(extractResponse.ok()).toBeTruthy();
      const extracted = await extractResponse.json();
      expect(extracted).toHaveProperty('structuredData');
      expect(extracted.structuredData).toHaveProperty('skills');
      expect(extracted.structuredData).toHaveProperty('experience');
    });
  });

  test.describe('招聘方职位发布', () => {
    test('招聘方应该能发布职位', async ({ apiContext, testUser }) => {
      // 1. 创建招聘Agent
      const agentResponse = await apiContext.post('/api/agents', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          name: '招聘助手',
          scene: 'agentjob',
          type: 'employer',
        },
      });

      expect(agentResponse.ok()).toBeTruthy();
      const agent = await agentResponse.json();

      // 2. 发布职位
      const jobResponse = await apiContext.post('/api/agentjob/jobs', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          agentId: agent.id,
          title: '高级前端工程师',
          company: '某互联网大厂',
          description: '负责公司核心产品的前端开发',
          requirements: [
            '本科及以上学历',
            '5年以上前端开发经验',
            '精通React和TypeScript',
          ],
          salary: {
            min: 35000,
            max: 50000,
            currency: 'CNY',
          },
          location: {
            city: '北京',
            district: '朝阳区',
            address: '望京SOHO',
          },
          benefits: ['五险一金', '带薪年假', '股票期权', '免费三餐'],
          remote: true,
          tags: ['React', 'TypeScript', '前端架构'],
        },
      });

      expect(jobResponse.ok()).toBeTruthy();
      const job = await jobResponse.json();
      expect(job).toHaveProperty('id');
      expect(job.title).toBe('高级前端工程师');
      expect(job.status).toBe('active');
    });

    test('Agent应该能从JD提取结构化信息', async ({ apiContext, testUser }) => {
      const agentResponse = await apiContext.post('/api/agents', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          name: 'JD解析Agent',
          scene: 'agentjob',
          type: 'employer',
        },
      });

      const agent = await agentResponse.json();

      const extractResponse = await apiContext.post('/api/agentjob/jobs/extract', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          agentId: agent.id,
          jdText: `
            职位：后端开发工程师
            要求：3年以上Java经验，熟悉Spring Cloud，有微服务架构经验。
            薪资：25k-35k，地点：上海。
            福利：六险一金、弹性工作制。
          `,
        },
      });

      expect(extractResponse.ok()).toBeTruthy();
      const extracted = await extractResponse.json();
      expect(extracted).toHaveProperty('structuredData');
      expect(extracted.structuredData.skills).toContain('Java');
    });
  });

  test.describe('简历智能匹配筛选', () => {
    test('Agent应该能为职位智能匹配候选人', async ({ apiContext, testUser }) => {
      // 1. 创建招聘Agent和职位
      const employerAgentResponse = await apiContext.post('/api/agents', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          name: '智能匹配招聘Agent',
          scene: 'agentjob',
          type: 'employer',
        },
      });

      const employerAgent = await employerAgentResponse.json();

      const jobResponse = await apiContext.post('/api/agentjob/jobs', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          agentId: employerAgent.id,
          title: 'React开发工程师',
          company: '创新科技公司',
          description: '招聘前端开发',
          requirements: ['React经验', 'TypeScript'],
          salary: { min: 25000, max: 40000 },
          location: { city: '北京' },
          tags: ['React', '前端'],
        },
      });

      const job = await jobResponse.json();

      // 2. 请求智能匹配
      const matchResponse = await apiContext.post(`/api/agentjob/jobs/${job.id}/match`, {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          agentId: employerAgent.id,
          limit: 10,
          minScore: 70,
        },
      });

      expect(matchResponse.ok()).toBeTruthy();
      const matches = await matchResponse.json();
      expect(Array.isArray(matches)).toBeTruthy();

      // 3. 验证匹配结果
      for (const match of matches) {
        expect(match).toHaveProperty('candidateId');
        expect(match).toHaveProperty('matchScore');
        expect(match.matchScore).toBeGreaterThanOrEqual(70);
        expect(match).toHaveProperty('reasoning');
      }
    });

    test('匹配结果应该按匹配度排序', async ({ apiContext, testUser }) => {
      const agentResponse = await apiContext.post('/api/agents', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          name: '排序测试Agent',
          scene: 'agentjob',
          type: 'employer',
        },
      });

      const agent = await agentResponse.json();

      const jobResponse = await apiContext.post('/api/agentjob/jobs', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          agentId: agent.id,
          title: '测试职位',
          description: '测试匹配排序',
          requirements: ['测试技能'],
        },
      });

      const job = await jobResponse.json();

      const matchResponse = await apiContext.get(`/api/agentjob/jobs/${job.id}/candidates`, {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
      });

      expect(matchResponse.ok()).toBeTruthy();
      const candidates = await matchResponse.json();

      // 验证按匹配度降序排列
      for (let i = 1; i < candidates.length; i++) {
        expect(candidates[i - 1].matchScore).toBeGreaterThanOrEqual(candidates[i].matchScore);
      }
    });
  });

  test.describe('薪资协商与面试安排', () => {
    test('Agent应该能协助薪资协商', async ({ apiContext, testUser }) => {
      // 1. 创建匹配
      const agentResponse = await apiContext.post('/api/agents', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          name: '薪资协商Agent',
          scene: 'agentjob',
        },
      });

      const agent = await agentResponse.json();

      // 2. 发起薪资协商
      const negotiationResponse = await apiContext.post('/api/agentjob/negotiations', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          agentId: agent.id,
          jobId: 'test-job-id',
          candidateId: 'test-candidate-id',
          initialOffer: {
            salary: 30000,
            benefits: ['五险一金'],
          },
          constraints: {
            minSalary: 28000,
            maxSalary: 35000,
          },
        },
      });

      expect(negotiationResponse.ok()).toBeTruthy();
      const negotiation = await negotiationResponse.json();
      expect(negotiation).toHaveProperty('id');
      expect(negotiation.status).toBe('in_progress');
    });

    test('双方同意后应该能安排面试', async ({ apiContext, testUser }) => {
      // 1. 创建协商并达成一致
      const agentResponse = await apiContext.post('/api/agents', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          name: '面试安排Agent',
          scene: 'agentjob',
        },
      });

      const agent = await agentResponse.json();

      // 2. 安排面试
      const interviewResponse = await apiContext.post('/api/agentjob/interviews', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          agentId: agent.id,
          jobId: 'test-job-id',
          candidateId: 'test-candidate-id',
          type: 'video',
          proposedSlots: [
            { date: '2026-04-15', time: '10:00' },
            { date: '2026-04-15', time: '14:00' },
            { date: '2026-04-16', time: '10:00' },
          ],
        },
      });

      expect(interviewResponse.ok()).toBeTruthy();
      const interview = await interviewResponse.json();
      expect(interview).toHaveProperty('id');
      expect(interview.status).toBe('pending_confirmation');
      expect(interview.proposedSlots).toHaveLength(3);
    });

    test('面试安排应该能同步到日历', async ({ apiContext, testUser }) => {
      const agentResponse = await apiContext.post('/api/agents', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          name: '日历同步Agent',
          scene: 'agentjob',
        },
      });

      const agent = await agentResponse.json();

      const interviewResponse = await apiContext.post('/api/agentjob/interviews', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          agentId: agent.id,
          jobId: 'test-job-id',
          candidateId: 'test-candidate-id',
          type: 'video',
          scheduledAt: '2026-04-15T10:00:00Z',
          duration: 60,
          calendarSync: true,
        },
      });

      const interview = await interviewResponse.json();

      // 验证日历同步状态
      const syncResponse = await apiContext.get(`/api/agentjob/interviews/${interview.id}/calendar`, {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
      });

      expect(syncResponse.ok()).toBeTruthy();
      const sync = await syncResponse.json();
      expect(sync).toHaveProperty('synced');
    });
  });

  test.describe('人机切换', () => {
    test('招聘过程中应该能切换到人工处理', async ({ apiContext, testUser }) => {
      const agentResponse = await apiContext.post('/api/agents', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          name: '招聘人机切换Agent',
          scene: 'agentjob',
        },
      });

      const agent = await agentResponse.json();

      const switchResponse = await apiContext.post(`/api/agents/${agent.id}/mode`, {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          mode: 'human',
          context: '需要HR介入处理复杂薪资谈判',
        },
      });

      expect(switchResponse.ok()).toBeTruthy();
      const switched = await switchResponse.json();
      expect(switched.mode).toBe('human');
      expect(switched.context).toBe('需要HR介入处理复杂薪资谈判');
    });
  });
});
