/**
 * API Baseline Performance Test
 * Tests API response times under normal load
 *
 * Target: P95 < 200ms for all endpoints
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend } from 'k6/metrics';

// Custom metrics for each endpoint
const healthLatency = new Trend('health_latency');
const userLatency = new Trend('user_latency');
const agentsLatency = new Trend('agents_latency');
const matchesLatency = new Trend('matches_latency');
const searchLatency = new Trend('search_latency');

export const options = {
  vus: 50,              // 50 concurrent virtual users
  duration: '5m',       // Run for 5 minutes
  thresholds: {
    // Overall HTTP duration thresholds
    'http_req_duration': ['p(95)<200', 'p(99)<500', 'avg<150'],
    'http_req_failed': ['rate<0.01'],
    // Endpoint-specific thresholds
    'health_latency': ['p(95)<50', 'p(99)<100'],
    'user_latency': ['p(95)<150', 'p(99)<300'],
    'agents_latency': ['p(95)<200', 'p(99)<400'],
    'matches_latency': ['p(95)<300', 'p(99)<500'],
    'search_latency': ['p(95)<400', 'p(99)<800'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export function setup() {
  console.log('Running baseline performance test against:', BASE_URL);

  // Authenticate
  const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
    email: 'test@example.com',
    password: 'Test123!',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  let token = null;
  if (loginRes.status === 200) {
    const body = JSON.parse(loginRes.body);
    token = body.data?.token;
  }

  return { token };
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (data.token) {
    headers['Authorization'] = `Bearer ${data.token}`;
  }

  // Test 1: Health endpoint (should be fastest)
  group('Baseline - Health Check', () => {
    const res = http.get(`${BASE_URL}/api/v1/health`, { headers });
    healthLatency.add(res.timings.duration);

    check(res, {
      'health status is 200': (r) => r.status === 200,
      'health P95 < 50ms': (r) => r.timings.duration < 50,
    });
  });

  sleep(0.5);

  // Test 2: Get current user
  if (data.token) {
    group('Baseline - Get User', () => {
      const res = http.get(`${BASE_URL}/api/users/me`, { headers });
      userLatency.add(res.timings.duration);

      check(res, {
        'get user status is 200': (r) => r.status === 200,
        'get user P95 < 150ms': (r) => r.timings.duration < 150,
      });
    });

    sleep(0.5);

    // Test 3: Get agents list
    group('Baseline - Get Agents', () => {
      const res = http.get(`${BASE_URL}/api/agents?page=1&limit=20`, { headers });
      agentsLatency.add(res.timings.duration);

      check(res, {
        'get agents status is 200': (r) => r.status === 200,
        'get agents P95 < 200ms': (r) => r.timings.duration < 200,
      });
    });

    sleep(0.5);

    // Test 4: Get matches
    group('Baseline - Get Matches', () => {
      const res = http.get(`${BASE_URL}/api/agents/matches`, { headers });
      matchesLatency.add(res.timings.duration);

      check(res, {
        'get matches status is 200': (r) => r.status === 200,
        'get matches P95 < 300ms': (r) => r.timings.duration < 300,
      });
    });

    sleep(0.5);

    // Test 5: Search endpoint (most complex)
    group('Baseline - Search', () => {
      const res = http.post(`${BASE_URL}/api/agents/search`, JSON.stringify({
        type: 'VISIONSHARE',
        location: {
          lat: 39.9042,
          lng: 116.4074,
          radius: 5000,
        },
      }), { headers });
      searchLatency.add(res.timings.duration);

      check(res, {
        'search status is 200': (r) => r.status === 200,
        'search P95 < 400ms': (r) => r.timings.duration < 400,
      });
    });
  }

  sleep(1);
}

export function teardown(data) {
  console.log('Baseline test completed');
}
