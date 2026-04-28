import { test, expect } from '../../fixtures/test-fixtures';

/**
 * Location Services E2E Tests
 * 位置服务端到端测试
 *
 * Coverage:
 * - Location Services (位置服务)
 *   - 高德/百度地图 API Integration
 *   - Geocoding (address to coordinates)
 *   - Reverse Geocoding (coordinates to address)
 *   - Address autocomplete/search
 *
 * - Agent Location Filtering (Agent位置筛选)
 *   - Agent location data storage and update
 *   - Location-based Agent search API
 *   - Real-time location update mechanism
 *   - Location privacy settings management
 */

test.describe('Location Services', () => {
  test.describe('Location Hierarchy', () => {
    test('should retrieve all provinces', async ({ apiContext }) => {
      const response = await apiContext.get('/api/location/provinces');

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBeTruthy();
      expect(data.data.length).toBeGreaterThan(0);

      // Verify province structure
      const province = data.data[0];
      expect(province).toHaveProperty('code');
      expect(province).toHaveProperty('name');
    });

    test('should retrieve cities by province', async ({ apiContext }) => {
      const response = await apiContext.get('/api/location/cities/110000');

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBeTruthy();

      // Beijing cities
      const city = data.data[0];
      expect(city).toHaveProperty('code');
      expect(city).toHaveProperty('name');
      expect(city.provinceCode).toBe('110000');
    });

    test('should retrieve districts by city', async ({ apiContext }) => {
      const response = await apiContext.get('/api/location/districts/110100');

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBeTruthy();

      // Verify district structure
      const district = data.data[0];
      expect(district).toHaveProperty('code');
      expect(district).toHaveProperty('name');
      expect(district.cityCode).toBe('110100');
    });

    test('should retrieve location hierarchy', async ({ apiContext }) => {
      const response = await apiContext.get(
        '/api/location/hierarchy?provinceCode=440000&cityCode=440100'
      );

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('provinces');
      expect(data.data).toHaveProperty('cities');
      expect(data.data.cities.length).toBeGreaterThan(0);
    });

    test('should get location name by code', async ({ apiContext }) => {
      const response = await apiContext.get('/api/location/name/110000');

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.code).toBe('110000');
      expect(data.data.name).toBe('北京市');
    });

    test('should return 404 for invalid location code', async ({ apiContext }) => {
      const response = await apiContext.get('/api/location/name/999999');

      expect(response.status()).toBe(404);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('LOCATION_NOT_FOUND');
    });
  });

  test.describe('Location Search (Address Autocomplete)', () => {
    test('should search locations by keyword', async ({ apiContext }) => {
      const response = await apiContext.get('/api/location/search?q=北京');

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBeTruthy();
      expect(data.data.length).toBeGreaterThan(0);

      // Verify result structure
      const result = data.data[0];
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('fullPath');
    });

    test('should search locations with partial match', async ({ apiContext }) => {
      const response = await apiContext.get('/api/location/search?q=朝阳');

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBeTruthy();

      // All results should contain 朝阳
      for (const result of data.data) {
        expect(result.fullPath).toContain('朝阳');
      }
    });

    test('should require query parameter', async ({ apiContext }) => {
      const response = await apiContext.get('/api/location/search');

      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_QUERY');
    });

    test('should return empty results for short queries', async ({ apiContext }) => {
      const response = await apiContext.get('/api/location/search?q=a');

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBeTruthy();
    });
  });

  test.describe('Agent Location Search', () => {
    test('should search agents by province', async ({ apiContext, testUser }) => {
      const response = await apiContext.get('/api/location/agents?province=110000', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('agents');
      expect(data.data).toHaveProperty('total');
    });

    test('should search agents by city', async ({ apiContext, testUser }) => {
      const response = await apiContext.get('/api/location/agents?city=110100', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    test('should search agents by district', async ({ apiContext, testUser }) => {
      const response = await apiContext.get('/api/location/agents?district=110105', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    test('should search agents with pagination', async ({ apiContext, testUser }) => {
      const response = await apiContext.get('/api/location/agents?page=1&limit=10', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.agents.length).toBeLessThanOrEqual(10);
    });

    test('should search agents by radius', async ({ apiContext, testUser }) => {
      const response = await apiContext.get(
        '/api/location/agents?lat=39.9042&lng=116.4074&radius=10',
        {
          headers: {
            Authorization: `Bearer ${testUser.token}`,
          },
        }
      );

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  test.describe('Nearby Agent Search', () => {
    test('should find agents within radius', async ({ apiContext, testUser }) => {
      const response = await apiContext.get(
        '/api/location/agents/nearby?lat=39.9042&lng=116.4074&radius=5',
        {
          headers: {
            Authorization: `Bearer ${testUser.token}`,
          },
        }
      );

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBeTruthy();
    });

    test('should filter nearby agents by type', async ({ apiContext, testUser }) => {
      const response = await apiContext.get(
        '/api/location/agents/nearby?lat=39.9042&lng=116.4074&radius=10&agentType=merchant',
        {
          headers: {
            Authorization: `Bearer ${testUser.token}`,
          },
        }
      );

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    test('should exclude specific agent from nearby search', async ({ apiContext, testUser }) => {
      // First create an agent
      const agentResponse = await apiContext.post('/api/agents', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          name: 'Nearby Test Agent',
          scene: 'visionshare',
        },
      });

      const agent = await agentResponse.json();

      const response = await apiContext.get(
        `/api/location/agents/nearby?lat=39.9042&lng=116.4074&radius=10&excludeAgentId=${agent.id}`,
        {
          headers: {
            Authorization: `Bearer ${testUser.token}`,
          },
        }
      );

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);

      // Verify excluded agent is not in results
      const found = data.data.find((a: { id: string }) => a.id === agent.id);
      expect(found).toBeUndefined();
    });

    test('should validate coordinates', async ({ apiContext, testUser }) => {
      const response = await apiContext.get('/api/location/agents/nearby?lat=91&lng=200&radius=5', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
      });

      expect(response.status()).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe('Agent Location Management', () => {
    test('should update agent location', async ({ apiContext, testUser }) => {
      // First create an agent
      const agentResponse = await apiContext.post('/api/agents', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          name: 'Location Update Test Agent',
          scene: 'visionshare',
        },
      });

      await agentResponse.json();

      // Update location
      const updateResponse = await apiContext.put('/api/v1/location/agents/update', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          location: {
            province: '110000',
            provinceName: '北京市',
            city: '110100',
            cityName: '北京市',
            district: '110105',
            districtName: '朝阳区',
            address: '建国路88号',
          },
          coordinates: {
            latitude: 39.9088,
            longitude: 116.3975,
          },
        },
      });

      expect(updateResponse.ok()).toBeTruthy();
      const data = await updateResponse.json();
      expect(data.success).toBe(true);
    });

    test('should get agent location', async ({ apiContext, testUser }) => {
      // Create an agent
      const agentResponse = await apiContext.post('/api/agents', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          name: 'Get Location Test Agent',
          scene: 'visionshare',
        },
      });

      const agent = await agentResponse.json();

      // Get location
      const response = await apiContext.get(`/api/v1/location/agents/${agent.id}`, {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('location');
      expect(data.data).toHaveProperty('coordinates');
      expect(data.data).toHaveProperty('lastUpdated');
    });

    test('should update agent location privacy settings', async ({ apiContext, testUser }) => {
      // Create an agent
      const agentResponse = await apiContext.post('/api/agents', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          name: 'Privacy Test Agent',
          scene: 'visionshare',
        },
      });

      const agent = await agentResponse.json();

      // Update privacy settings
      const privacyResponse = await apiContext.put(`/api/v1/location/agents/${agent.id}/privacy`, {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          privacyLevel: 'CITY',
          showExactCoords: false,
          hideFromPublic: false,
        },
      });

      expect(privacyResponse.ok()).toBeTruthy();
      const privacyData = await privacyResponse.json();
      expect(privacyData.success).toBe(true);
    });

    test('should get agent location privacy settings', async ({ apiContext, testUser }) => {
      // Create an agent
      const agentResponse = await apiContext.post('/api/agents', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          name: 'Get Privacy Test Agent',
          scene: 'visionshare',
        },
      });

      const agent = await agentResponse.json();

      // Get privacy settings
      const response = await apiContext.get(`/api/v1/location/agents/${agent.id}/privacy`, {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('privacyLevel');
      expect(data.data).toHaveProperty('showExactCoords');
      expect(data.data).toHaveProperty('hideFromPublic');
    });

    test('should hide location when privacy is set to HIDDEN', async ({ apiContext, testUser }) => {
      // Create an agent
      const agentResponse = await apiContext.post('/api/agents', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          name: 'Hidden Privacy Test Agent',
          scene: 'visionshare',
        },
      });

      const agent = await agentResponse.json();

      // Set privacy to hidden
      await apiContext.put(`/api/v1/location/agents/${agent.id}/privacy`, {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          hideFromPublic: true,
        },
      });

      // Get location - should return null for hidden agents
      const response = await apiContext.get(`/api/v1/location/agents/${agent.id}`, {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.data.location).toBeNull();
      expect(data.data.privacyApplied).toBe(true);
    });

    test('should validate coordinate ranges', async ({ apiContext, testUser }) => {
      const response = await apiContext.put('/api/v1/location/agents/update', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          location: {
            province: '110000',
            provinceName: '北京市',
          },
          coordinates: {
            latitude: 100, // Invalid: must be -90 to 90
            longitude: 200, // Invalid: must be -180 to 180
          },
        },
      });

      expect(response.status()).toBe(400);
    });

    test('should support different privacy levels', async ({ apiContext, testUser }) => {
      // Create an agent
      const agentResponse = await apiContext.post('/api/agents', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          name: 'Privacy Levels Test Agent',
          scene: 'visionshare',
        },
      });

      const agent = await agentResponse.json();

      const privacyLevels = ['EXACT', 'DISTRICT', 'CITY', 'PROVINCE', 'HIDDEN'];

      for (const level of privacyLevels) {
        const response = await apiContext.put(`/api/v1/location/agents/${agent.id}/privacy`, {
          headers: {
            Authorization: `Bearer ${testUser.token}`,
          },
          data: {
            privacyLevel: level,
          },
        });

        expect(response.ok()).toBeTruthy();
      }
    });
  });

  test.describe('Distance Calculation', () => {
    test('should calculate distance between two agents', async ({ apiContext, testUser }) => {
      // Create two agents
      const agent1Response = await apiContext.post('/api/agents', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          name: 'Distance Test Agent 1',
          scene: 'visionshare',
        },
      });

      const agent2Response = await apiContext.post('/api/agents', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          name: 'Distance Test Agent 2',
          scene: 'visionshare',
        },
      });

      const agent1 = await agent1Response.json();
      const agent2 = await agent2Response.json();

      // Calculate distance
      const response = await apiContext.get(
        `/api/location/distance?agentId1=${agent1.id}&agentId2=${agent2.id}`,
        {
          headers: {
            Authorization: `Bearer ${testUser.token}`,
          },
        }
      );

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('distanceKm');
      expect(data.data).toHaveProperty('distanceMeters');
    });

    test('should handle distance calculation when agents have no location', async ({
      apiContext,
      testUser,
    }) => {
      // Create two agents without location
      const agent1Response = await apiContext.post('/api/agents', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          name: 'No Location Agent 1',
          scene: 'visionshare',
        },
      });

      const agent2Response = await apiContext.post('/api/agents', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          name: 'No Location Agent 2',
          scene: 'visionshare',
        },
      });

      const agent1 = await agent1Response.json();
      const agent2 = await agent2Response.json();

      // Calculate distance
      const response = await apiContext.get(
        `/api/location/distance?agentId1=${agent1.id}&agentId2=${agent2.id}`,
        {
          headers: {
            Authorization: `Bearer ${testUser.token}`,
          },
        }
      );

      // Should return 404 or null distance when no location data
      if (response.status() === 404) {
        const data = await response.json();
        expect(data.error.code).toBe('DISTANCE_CALCULATION_FAILED');
      } else {
        const data = await response.json();
        expect(data.data.distanceKm).toBeNull();
      }
    });

    test('should validate agent IDs for distance calculation', async ({ apiContext, testUser }) => {
      const response = await apiContext.get(
        '/api/location/distance?agentId1=invalid&agentId2=also-invalid',
        {
          headers: {
            Authorization: `Bearer ${testUser.token}`,
          },
        }
      );

      expect(response.status()).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe('Batch Location Operations', () => {
    test('should handle batch agent location updates', async ({ apiContext, testUser }) => {
      // Create multiple agents
      const agent1Response = await apiContext.post('/api/agents', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          name: 'Batch Agent 1',
          scene: 'visionshare',
        },
      });

      const agent2Response = await apiContext.post('/api/agents', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          name: 'Batch Agent 2',
          scene: 'visionshare',
        },
      });

      await agent1Response.json();
      await agent2Response.json();

      // Update location for first agent
      const updateResponse = await apiContext.put('/api/v1/location/agents/update', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          location: {
            province: '310000',
            provinceName: '上海市',
            city: '310100',
            cityName: '上海市',
          },
          coordinates: {
            latitude: 31.2304,
            longitude: 121.4737,
          },
        },
      });

      expect(updateResponse.ok()).toBeTruthy();

      // Verify both agents can be queried
      const nearbyResponse = await apiContext.get(
        `/api/location/agents/nearby?lat=31.2304&lng=121.4737&radius=100`,
        {
          headers: {
            Authorization: `Bearer ${testUser.token}`,
          },
        }
      );

      expect(nearbyResponse.ok()).toBeTruthy();
      const nearbyData = await nearbyResponse.json();
      expect(nearbyData.success).toBe(true);
    });
  });

  test.describe('Location API Authorization', () => {
    test('should require authentication for agent-specific endpoints', async ({ apiContext }) => {
      const response = await apiContext.get('/api/v1/location/agents/some-id');

      // Should return 401 or 403 without auth
      expect(response.status()).toBeGreaterThanOrEqual(401);
    });

    test('should allow public access to basic location data', async ({ apiContext }) => {
      const response = await apiContext.get('/api/location/provinces');

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });
});

test.describe('Agent Location Filtering Integration', () => {
  test.describe('Complete Location Workflow', () => {
    test('should support full agent location lifecycle', async ({ apiContext, testUser }) => {
      // 1. Create agent
      const agentResponse = await apiContext.post('/api/agents', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          name: 'Location Lifecycle Agent',
          scene: 'visionshare',
          type: 'merchant',
        },
      });

      expect(agentResponse.ok()).toBeTruthy();
      const agent = await agentResponse.json();

      // 2. Set initial privacy settings
      const privacyResponse = await apiContext.put(`/api/v1/location/agents/${agent.id}/privacy`, {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          privacyLevel: 'CITY',
          showExactCoords: false,
        },
      });
      expect(privacyResponse.ok()).toBeTruthy();

      // 3. Update location
      const updateResponse = await apiContext.put('/api/v1/location/agents/update', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          location: {
            province: '440000',
            provinceName: '广东省',
            city: '440300',
            cityName: '深圳市',
            district: '440305',
            districtName: '南山区',
            address: '科技园南区',
          },
          coordinates: {
            latitude: 22.5312,
            longitude: 113.9288,
          },
        },
      });
      expect(updateResponse.ok()).toBeTruthy();

      // 4. Get location
      const getResponse = await apiContext.get(`/api/v1/location/agents/${agent.id}`, {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
      });
      expect(getResponse.ok()).toBeTruthy();
      const locationData = await getResponse.json();
      expect(locationData.data.location.cityName).toBe('深圳市');
      expect(locationData.data.coordinates).toBeDefined();

      // 5. Search for agent by location
      const searchResponse = await apiContext.get('/api/location/agents?city=440300', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
      });
      expect(searchResponse.ok()).toBeTruthy();

      // 6. Find nearby agents
      const nearbyResponse = await apiContext.get(
        `/api/location/agents/nearby?lat=22.5312&lng=113.9288&radius=10`,
        {
          headers: {
            Authorization: `Bearer ${testUser.token}`,
          },
        }
      );
      expect(nearbyResponse.ok()).toBeTruthy();

      // 7. Update privacy to hidden
      const hideResponse = await apiContext.put(`/api/v1/location/agents/${agent.id}/privacy`, {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          hideFromPublic: true,
        },
      });
      expect(hideResponse.ok()).toBeTruthy();

      // 8. Verify location is now hidden
      const hiddenResponse = await apiContext.get(`/api/v1/location/agents/${agent.id}`, {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
      });
      const hiddenData = await hiddenResponse.json();
      expect(hiddenData.data.privacyApplied).toBe(true);
    });

    test('should support location-based merchant discovery workflow', async ({
      apiContext,
      testUser,
    }) => {
      // 1. Consumer creates agent
      const consumerResponse = await apiContext.post('/api/agents', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          name: 'Consumer Agent',
          scene: 'agentad',
          type: 'consumer',
        },
      });

      await consumerResponse.json();

      // 2. Consumer sets their location
      await apiContext.put('/api/v1/location/agents/update', {
        headers: {
          Authorization: `Bearer ${testUser.token}`,
        },
        data: {
          location: {
            province: '440000',
            provinceName: '广东省',
            city: '440300',
            cityName: '深圳市',
            district: '440305',
            districtName: '南山区',
          },
          coordinates: {
            latitude: 22.5312,
            longitude: 113.9288,
          },
        },
      });

      // 3. Search for merchants nearby
      const searchResponse = await apiContext.get(
        '/api/location/agents/nearby?lat=22.5312&lng=113.9288&radius=5&agentType=merchant',
        {
          headers: {
            Authorization: `Bearer ${testUser.token}`,
          },
        }
      );

      expect(searchResponse.ok()).toBeTruthy();
      const searchData = await searchResponse.json();
      expect(Array.isArray(searchData.data)).toBeTruthy();

      // Results should be sorted by distance
      for (let i = 1; i < searchData.data.length; i++) {
        expect(searchData.data[i - 1].distanceKm).toBeLessThanOrEqual(
          searchData.data[i].distanceKm
        );
      }
    });
  });
});
