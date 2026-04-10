import { test, expect } from '../../fixtures/test-fixtures';

/**
 * VisionShare场景端到端测试
 *
 * 覆盖范围:
 * - 需求发布到接单完整流程
 * - 相机拍照上传与AI脱敏处理
 * - 照片查看与积分支付流程
 * - AI相册智能检索功能验证
 * - 移动端与后端API集成验证
 */

test.describe('VisionShare场景', () => {
  test.describe('需求发布流程', () => {
    test('用户应该能发布VisionShare需求', async ({ apiContext, testUser }) => {
      // 1. 创建需求
      const demandResponse = await apiContext.post('/api/visionshare/demands', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          title: '寻找附近咖啡店',
          description: '想看看附近有什么好的咖啡店',
          location: {
            latitude: 39.9042,
            longitude: 116.4074,
            address: '北京市朝阳区',
          },
          radius: 1000,
          reward: 10,
        },
      });

      expect(demandResponse.ok()).toBeTruthy();
      const demand = await demandResponse.json();
      expect(demand).toHaveProperty('id');
      expect(demand.title).toBe('寻找附近咖啡店');
      expect(demand.status).toBe('active');

      // 2. 验证需求列表
      const listResponse = await apiContext.get('/api/visionshare/demands', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
      });

      expect(listResponse.ok()).toBeTruthy();
      const demands = await listResponse.json();
      expect(demands).toContainEqual(
        expect.objectContaining({
          id: demand.id,
          title: demand.title,
        })
      );
    });

    test('用户应该能搜索附近的需求', async ({ apiContext, testUser }) => {
      // 1. 首先发布一个需求
      const createResponse = await apiContext.post('/api/visionshare/demands', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          title: '测试附近搜索',
          description: '测试搜索功能',
          location: {
            latitude: 39.9042,
            longitude: 116.4074,
          },
          radius: 5000,
          reward: 5,
        },
      });

      const demand = await createResponse.json();

      // 2. 搜索附近的需求
      const searchResponse = await apiContext.get(
        '/api/visionshare/demands/nearby?lat=39.9042&lng=116.4074&radius=10000',
        {
          headers: {
            Authorization: `Bearer ${testUser.token}`,
          },
        }
      );

      expect(searchResponse.ok()).toBeTruthy();
      const nearbyDemands = await searchResponse.json();
      expect(Array.isArray(nearbyDemands)).toBeTruthy();
      expect(nearbyDemands.length).toBeGreaterThan(0);
    });
  });

  test.describe('接单与照片上传', () => {
    test('服务提供者应该能接单并上传照片', async ({ apiContext, testUser }) => {
      // 1. 发布需求
      const demandResponse = await apiContext.post('/api/visionshare/demands', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          title: '查看某餐厅环境',
          description: '想看看这家餐厅的环境',
          location: {
            latitude: 39.9042,
            longitude: 116.4074,
          },
          radius: 2000,
          reward: 20,
        },
      });

      const demand = await demandResponse.json();

      // 2. 接单
      const acceptResponse = await apiContext.post(`/api/visionshare/demands/${demand.id}/accept`, {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
      });

      expect(acceptResponse.ok()).toBeTruthy();
      const accepted = await acceptResponse.json();
      expect(accepted.status).toBe('accepted');

      // 3. 模拟照片上传
      const uploadResponse = await apiContext.post('/api/upload/photo', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          demandId: demand.id,
          photoUrl: 'https://example.com/test-photo.jpg',
          metadata: {
            latitude: 39.9042,
            longitude: 116.4074,
          },
        },
      });

      expect(uploadResponse.ok()).toBeTruthy();
      const upload = await uploadResponse.json();
      expect(upload).toHaveProperty('id');
      expect(upload).toHaveProperty('photoUrl');
    });
  });

  test.describe('AI脱敏与积分支付', () => {
    test('上传的照片应该经过AI脱敏处理', async ({ apiContext, testUser }) => {
      // 1. 发布需求并接单
      const demandResponse = await apiContext.post('/api/visionshare/demands', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          title: 'AI脱敏测试',
          description: '测试AI脱敏功能',
          location: {
            latitude: 39.9042,
            longitude: 116.4074,
          },
          radius: 1000,
          reward: 15,
        },
      });

      const demand = await demandResponse.json();

      // 2. 上传照片
      const uploadResponse = await apiContext.post('/api/upload/photo', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          demandId: demand.id,
          photoUrl: 'https://example.com/test-photo.jpg',
          needsPrivacyMask: true,
        },
      });

      const upload = await uploadResponse.json();

      // 3. 验证脱敏状态
      const photoResponse = await apiContext.get(`/api/visionshare/photos/${upload.id}`, {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
      });

      expect(photoResponse.ok()).toBeTruthy();
      const photo = await photoResponse.json();
      expect(photo).toHaveProperty('privacyStatus');
      expect(['processing', 'completed', 'failed']).toContain(photo.privacyStatus);
    });

    test('查看照片应该扣除相应积分', async ({ apiContext, testUser }) => {
      // 1. 获取初始积分
      const initialCreditResponse = await apiContext.get('/api/credits/balance', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
      });

      expect(initialCreditResponse.ok()).toBeTruthy();
      const initialCredit = await initialCreditResponse.json();

      // 2. 发布需求
      const demandResponse = await apiContext.post('/api/visionshare/demands', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          title: '积分支付测试',
          description: '测试积分支付功能',
          location: {
            latitude: 39.9042,
            longitude: 116.4074,
          },
          radius: 1000,
          reward: 10,
        },
      });

      const demand = await demandResponse.json();

      // 3. 查看照片（应触发积分支付）
      const viewResponse = await apiContext.post(`/api/visionshare/demands/${demand.id}/view`, {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
      });

      expect(viewResponse.ok()).toBeTruthy();

      // 4. 验证积分变动
      const finalCreditResponse = await apiContext.get('/api/credits/balance', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
      });

      expect(finalCreditResponse.ok()).toBeTruthy();
      const finalCredit = await finalCreditResponse.json();
      expect(finalCredit.balance).not.toEqual(initialCredit.balance);
    });
  });

  test.describe('AI相册智能检索', () => {
    test('用户应该能用自然语言搜索历史照片', async ({ apiContext, testUser }) => {
      // 1. 上传多张测试照片
      const photos = [];
      for (let i = 0; i < 3; i++) {
        const uploadResponse = await apiContext.post('/api/upload/photo', {
          headers: {
            Authorization: `Bearer ${testUser.token}`,
          },
          data: {
            photoUrl: `https://example.com/photo-${i}.jpg`,
            tags: ['咖啡店', '环境', '室内'],
          },
        });

        if (uploadResponse.ok()) {
          photos.push(await uploadResponse.json());
        }
      }

      // 2. 使用自然语言搜索
      const searchResponse = await apiContext.post('/api/visionshare/photos/search', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          query: '附近的咖啡店照片',
          filters: {
            dateRange: 'last_30_days',
          },
        },
      });

      expect(searchResponse.ok()).toBeTruthy();
      const results = await searchResponse.json();
      expect(Array.isArray(results.photos)).toBeTruthy();
    });
  });
});
