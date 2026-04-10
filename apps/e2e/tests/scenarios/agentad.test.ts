import { test, expect } from '../../fixtures/test-fixtures';

/**
 * AgentAd场景端到端测试
 *
 * 覆盖范围:
 * - 消费需求画像配置
 * - 商家优惠配置发布
 * - Agent优惠协商谈判流程
 * - 一键购买与优惠码验证
 * - 多商家比价场景测试
 */

test.describe('AgentAd场景', () => {
  test.describe('消费需求画像配置', () => {
    test('消费者应该能创建消费画像', async ({ apiContext, testUser }) => {
      // 1. 创建消费Agent
      const agentResponse = await apiContext.post('/api/agents', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          name: '消费助手',
          scene: 'agentad',
          type: 'consumer',
        },
      });

      expect(agentResponse.ok()).toBeTruthy();
      const agent = await agentResponse.json();

      // 2. 配置消费画像
      const profileResponse = await apiContext.post('/api/agentad/profiles/consumer', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          agentId: agent.id,
          preferences: {
            categories: ['餐饮', '娱乐', '购物'],
            brands: ['星巴克', '海底捞', '苹果'],
            priceRange: {
              min: 50,
              max: 500,
            },
            locations: ['朝阳区', '海淀区'],
            notification: {
              enabled: true,
              channels: ['push', 'email'],
            },
          },
          interests: ['美食探店', '电影', '科技产品'],
          shoppingHabits: {
            frequency: 'weekly',
            preferredTime: 'weekend',
            decisionFactors: ['价格', '评价', '距离'],
          },
        },
      });

      expect(profileResponse.ok()).toBeTruthy();
      const profile = await profileResponse.json();
      expect(profile).toHaveProperty('id');
      expect(profile.preferences.categories).toContain('餐饮');
      expect(profile.preferences.priceRange).toEqual({ min: 50, max: 500 });
    });

    test('消费画像应该能从历史消费提取', async ({ apiContext, testUser }) => {
      const agentResponse = await apiContext.post('/api/agents', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          name: '消费分析Agent',
          scene: 'agentad',
          type: 'consumer',
        },
      });

      const agent = await agentResponse.json();

      const extractResponse = await apiContext.post('/api/agentad/profiles/extract', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          agentId: agent.id,
          history: [
            { category: '餐饮', amount: 120, merchant: '海底捞' },
            { category: '餐饮', amount: 35, merchant: '星巴克' },
            { category: '娱乐', amount: 80, merchant: '万达影城' },
          ],
        },
      });

      expect(extractResponse.ok()).toBeTruthy();
      const extracted = await extractResponse.json();
      expect(extracted).toHaveProperty('preferences');
      expect(extracted.preferences.categories).toContain('餐饮');
    });
  });

  test.describe('商家优惠配置发布', () => {
    test('商家应该能发布优惠活动', async ({ apiContext, testUser }) => {
      // 1. 创建商家Agent
      const agentResponse = await apiContext.post('/api/agents', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          name: '商家助手',
          scene: 'agentad',
          type: 'merchant',
        },
      });

      expect(agentResponse.ok()).toBeTruthy();
      const agent = await agentResponse.json();

      // 2. 配置商家信息
      await apiContext.post('/api/agentad/profiles/merchant', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          agentId: agent.id,
          business: {
            name: '美味餐厅',
            category: '餐饮',
            subCategory: '中餐',
            location: {
              city: '北京',
              district: '朝阳区',
              address: '三里屯太古里',
            },
            description: '正宗川菜，环境优雅',
          },
          targetAudience: {
            ageRange: [20, 45],
            interests: ['美食', '聚餐'],
            pricePreference: 'mid_range',
          },
        },
      });

      // 3. 发布优惠
      const promoResponse = await apiContext.post('/api/agentad/promotions', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          agentId: agent.id,
          title: '周末特惠套餐',
          type: 'bundle',
          description: '双人套餐原价299，现价199',
          originalPrice: 299,
          discountPrice: 199,
          discountRate: 33,
          validFrom: '2026-04-15',
          validUntil: '2026-05-15',
          usageLimit: 100,
          conditions: {
            minSpend: 0,
            applicableDays: ['Saturday', 'Sunday'],
            applicableTime: '11:00-22:00',
          },
          tags: ['双人餐', '周末特惠', '川菜'],
        },
      });

      expect(promoResponse.ok()).toBeTruthy();
      const promo = await promoResponse.json();
      expect(promo).toHaveProperty('id');
      expect(promo.title).toBe('周末特惠套餐');
      expect(promo.status).toBe('active');
    });

    test('商家应该能创建优惠码', async ({ apiContext, testUser }) => {
      const agentResponse = await apiContext.post('/api/agents', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          name: '优惠码Agent',
          scene: 'agentad',
          type: 'merchant',
        },
      });

      const agent = await agentResponse.json();

      const couponResponse = await apiContext.post('/api/agentad/coupons', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          agentId: agent.id,
          code: 'WELCOME2026',
          type: 'percentage',
          value: 20,
          maxDiscount: 50,
          validFrom: '2026-04-01',
          validUntil: '2026-06-30',
          totalQuantity: 1000,
          perUserLimit: 1,
          minOrderAmount: 100,
        },
      });

      expect(couponResponse.ok()).toBeTruthy();
      const coupon = await couponResponse.json();
      expect(coupon.code).toBe('WELCOME2026');
      expect(coupon.type).toBe('percentage');
    });
  });

  test.describe('Agent优惠协商谈判', () => {
    test('Agent应该能为消费者协商更好的优惠', async ({ apiContext, testUser }) => {
      // 1. 创建消费Agent
      const consumerAgentResponse = await apiContext.post('/api/agents', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          name: '协商消费Agent',
          scene: 'agentad',
          type: 'consumer',
        },
      });

      const consumerAgent = await consumerAgentResponse.json();

      // 2. 配置消费画像
      await apiContext.post('/api/agentad/profiles/consumer', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          agentId: consumerAgent.id,
          preferences: {
            categories: ['餐饮'],
            priceRange: { min: 100, max: 300 },
          },
        },
      });

      // 3. 发起协商
      const negotiationResponse = await apiContext.post('/api/agentad/negotiations', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          consumerAgentId: consumerAgent.id,
          merchantId: 'test-merchant-id',
          targetOffer: {
            item: '双人套餐',
            desiredPrice: 180,
            maxPrice: 220,
          },
          constraints: {
            urgency: 'low',
            flexibility: 'high',
          },
        },
      });

      expect(negotiationResponse.ok()).toBeTruthy();
      const negotiation = await negotiationResponse.json();
      expect(negotiation).toHaveProperty('id');
      expect(negotiation.status).toBe('in_progress');
    });

    test('Agent协商应该有回合限制', async ({ apiContext, testUser }) => {
      const agentResponse = await apiContext.post('/api/agents', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          name: '回合测试Agent',
          scene: 'agentad',
          type: 'consumer',
        },
      });

      const agent = await agentResponse.json();

      const negotiationResponse = await apiContext.post('/api/agentad/negotiations', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          consumerAgentId: agent.id,
          merchantId: 'test-merchant-id',
          targetOffer: {
            item: '测试商品',
            desiredPrice: 100,
          },
        },
      });

      const negotiation = await negotiationResponse.json();

      // 验证配置
      const configResponse = await apiContext.get(`/api/agentad/negotiations/${negotiation.id}/config`, {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
      });

      expect(configResponse.ok()).toBeTruthy();
      const config = await configResponse.json();
      expect(config.maxRounds).toBeGreaterThan(0);
      expect(config.currentRound).toBe(0);
    });

    test('协商成功应该生成协议', async ({ apiContext, testUser }) => {
      const agentResponse = await apiContext.post('/api/agents', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          name: '协议测试Agent',
          scene: 'agentad',
          type: 'consumer',
        },
      });

      const agent = await agentResponse.json();

      // 模拟完成协商
      const negotiationResponse = await apiContext.post('/api/agentad/negotiations', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          consumerAgentId: agent.id,
          merchantId: 'test-merchant-id',
          targetOffer: {
            item: '测试套餐',
            desiredPrice: 150,
          },
        },
      });

      const negotiation = await negotiationResponse.json();

      // 确认协议
      const confirmResponse = await apiContext.post(`/api/agentad/negotiations/${negotiation.id}/confirm`, {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          confirmed: true,
        },
      });

      expect(confirmResponse.ok()).toBeTruthy();
      const confirmed = await confirmResponse.json();
      expect(confirmed.status).toBe('confirmed');
      expect(confirmed).toHaveProperty('agreement');
    });
  });

  test.describe('一键购买与优惠码', () => {
    test('用户应该能一键购买优惠商品', async ({ apiContext, testUser }) => {
      // 1. 创建Agent
      const agentResponse = await apiContext.post('/api/agents', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          name: '购买助手',
          scene: 'agentad',
          type: 'consumer',
        },
      });

      const agent = await agentResponse.json();

      // 2. 一键购买
      const purchaseResponse = await apiContext.post('/api/agentad/purchases', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          agentId: agent.id,
          promotionId: 'test-promotion-id',
          quantity: 1,
          payment: {
            method: 'credit_card',
          },
        },
      });

      expect(purchaseResponse.ok()).toBeTruthy();
      const purchase = await purchaseResponse.json();
      expect(purchase).toHaveProperty('id');
      expect(purchase).toHaveProperty('couponCode');
      expect(purchase.status).toBe('completed');
    });

    test('购买应该支持使用优惠码', async ({ apiContext, testUser }) => {
      const agentResponse = await apiContext.post('/api/agents', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          name: '优惠码购买Agent',
          scene: 'agentad',
          type: 'consumer',
        },
      });

      const agent = await agentResponse.json();

      const purchaseResponse = await apiContext.post('/api/agentad/purchases', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          agentId: agent.id,
          promotionId: 'test-promotion-id',
          quantity: 1,
          couponCode: 'SAVE20',
          payment: {
            method: 'alipay',
          },
        },
      });

      expect(purchaseResponse.ok()).toBeTruthy();
      const purchase = await purchaseResponse.json();
      expect(purchase.appliedDiscount).toBeGreaterThan(0);
      expect(purchase.finalPrice).toBeLessThan(purchase.originalPrice);
    });

    test('购买的优惠码应该是唯一且有效的', async ({ apiContext, testUser }) => {
      const agentResponse = await apiContext.post('/api/agents', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          name: '唯一码测试Agent',
          scene: 'agentad',
          type: 'consumer',
        },
      });

      const agent = await agentResponse.json();

      const purchaseResponse = await apiContext.post('/api/agentad/purchases', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          agentId: agent.id,
          promotionId: 'test-promotion-id',
          quantity: 2,
        },
      });

      const purchase = await purchaseResponse.json();

      // 验证每个优惠码唯一
      const codes = purchase.couponCodes;
      expect(codes).toHaveLength(2);
      expect(codes[0]).not.toBe(codes[1]);

      // 验证优惠码有效
      const validateResponse = await apiContext.post('/api/agentad/coupons/validate', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          code: codes[0],
        },
      });

      expect(validateResponse.ok()).toBeTruthy();
      const validation = await validateResponse.json();
      expect(validation.valid).toBe(true);
    });
  });

  test.describe('多商家比价', () => {
    test('Agent应该能为同一商品比较多家商家', async ({ apiContext, testUser }) => {
      // 1. 创建消费Agent
      const agentResponse = await apiContext.post('/api/agents', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          name: '比价Agent',
          scene: 'agentad',
          type: 'consumer',
        },
      });

      const agent = await agentResponse.json();

      // 2. 发起比价请求
      const compareResponse = await apiContext.post('/api/agentad/compare', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          agentId: agent.id,
          query: '火锅双人套餐',
          filters: {
            location: {
              lat: 39.9042,
              lng: 116.4074,
              radius: 5000,
            },
            maxPrice: 300,
            minRating: 4.0,
          },
          sortBy: 'price',
        },
      });

      expect(compareResponse.ok()).toBeTruthy();
      const comparison = await compareResponse.json();
      expect(Array.isArray(comparison.results)).toBeTruthy();
      expect(comparison.results.length).toBeGreaterThan(0);

      // 验证结果包含必要字段
      const firstResult = comparison.results[0];
      expect(firstResult).toHaveProperty('merchantId');
      expect(firstResult).toHaveProperty('merchantName');
      expect(firstResult).toHaveProperty('price');
      expect(firstResult).toHaveProperty('rating');
      expect(firstResult).toHaveProperty('distance');
    });

    test('比价结果应该按指定方式排序', async ({ apiContext, testUser }) => {
      const agentResponse = await apiContext.post('/api/agents', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          name: '排序比价Agent',
          scene: 'agentad',
          type: 'consumer',
        },
      });

      const agent = await agentResponse.json();

      // 按价格排序
      const compareResponse = await apiContext.get(
        '/api/agentad/compare?query=咖啡&sortBy=price&order=asc',
        {
          headers: {
            Authorization: `Bearer ${testUser.token}`,
          },
        }
      );

      expect(compareResponse.ok()).toBeTruthy();
      const comparison = await compareResponse.json();

      // 验证按价格升序排列
      for (let i = 1; i < comparison.results.length; i++) {
        expect(comparison.results[i - 1].price).toBeLessThanOrEqual(
          comparison.results[i].price
        );
      }
    });

    test('比价应该考虑综合因素', async ({ apiContext, testUser }) => {
      const agentResponse = await apiContext.post('/api/agents', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          name: '智能比价Agent',
          scene: 'agentad',
          type: 'consumer',
        },
      });

      const agent = await agentResponse.json();

      const compareResponse = await apiContext.post('/api/agentad/compare/smart', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          agentId: agent.id,
          query: '周末聚餐',
          preferences: {
            priceWeight: 0.4,
            qualityWeight: 0.3,
            distanceWeight: 0.2,
            convenienceWeight: 0.1,
          },
        },
      });

      expect(compareResponse.ok()).toBeTruthy();
      const comparison = await compareResponse.json();
      expect(comparison).toHaveProperty('recommendations');
      expect(comparison.recommendations[0]).toHaveProperty('score');
      expect(comparison.recommendations[0]).toHaveProperty('reasoning');
    });
  });
});
