/**
 * Database Performance Test
 * Tests database query performance under load
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Metrics for different query types
const simpleQueryLatency = new Trend('simple_query_latency');
const complexQueryLatency = new Trend('complex_query_latency');
const joinQueryLatency = new Trend('join_query_latency');
const aggregationLatency = new Trend('aggregation_latency');
const dbErrorRate = new Rate('db_errors');

export const options = {
  vus: 100,
  duration: '10m',
  thresholds: {
    // Simple queries should be very fast
    'simple_query_latency': ['p(95)<50', 'p(99)<100'],
    // Complex queries should be under 300ms
    'complex_query_latency': ['p(95)<300', 'p(99)<500'],
    // Join queries should be under 400ms
    'join_query_latency': ['p(95)<400', 'p(99)<800'],
    // Aggregation queries can be slower
    'aggregation_latency': ['p(95)<500', 'p(99)<1000'],
    'db_errors': ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export function setup() {
  console.log('Running database performance test');

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
  } else {
    console.log('No auth token, skipping tests');
    return;
  }

  // Test 1: Simple query (single table, indexed)
  group('DB Performance - Simple Query', () => {
    const res = http.get(`${BASE_URL}/api/users/me`, { headers });
    simpleQueryLatency.add(res.timings.duration);

    const success = check(res, {
      'simple query status is 200': (r) => r.status === 200,
      'simple query P95 < 50ms': (r) => r.timings.duration < 50,
    });

    dbErrorRate.add(!success);
  });

  sleep(0.5);

  // Test 2: Complex query (multiple filters, sorting)
  group('DB Performance - Complex Query', () => {
    const res = http.get(`${BASE_URL}/api/agents?page=1&limit=50&type=VISIONSHARE&status=ACTIVE&sort=createdAt&order=desc`, { headers });
    complexQueryLatency.add(res.timings.duration);

    const success = check(res, {
      'complex query status is 200': (r) => r.status === 200,
      'complex query P95 < 300ms': (r) => r.timings.duration < 300,
    });

    dbErrorRate.add(!success);
  });

  sleep(0.5);

  // Test 3: Join query (agents with user data)
  group('DB Performance - Join Query', () => {
    const res = http.get(`${BASE_URL}/api/agents?page=1&limit=20&include=user`, { headers });
    joinQueryLatency.add(res.timings.duration);

    const success = check(res, {
      'join query status is 200': (r) => r.status === 200,
      'join query P95 < 400ms': (r) => r.timings.duration < 400,
    });

    dbErrorRate.add(!success);
  });

  sleep(0.5);

  // Test 4: Aggregation query (credit scores)
  group('DB Performance - Aggregation Query', () => {
    const res = http.get(`${BASE_URL}/api/credit/stats`, { headers });
    aggregationLatency.add(res.timings.duration);

    const success = check(res, {
      'aggregation query status is 200': (r) => r.status === 200,
      'aggregation query P95 < 500ms': (r) => r.timings.duration < 500,
    });

    dbErrorRate.add(!success);
  });

  sleep(0.5);

  // Test 5: Geographic query (spatial search)
  group('DB Performance - Geographic Query', () => {
    const res = http.post(`${BASE_URL}/api/agents/nearby`, JSON.stringify({
      lat: 39.9042,
      lng: 116.4074,
      radius: 10000, // 10km
      type: 'VISIONSHARE',
    }), { headers });

    complexQueryLatency.add(res.timings.duration);

    const success = check(res, {
      'geographic query status is 200': (r) => r.status === 200,
      'geographic query P95 < 300ms': (r) => r.timings.duration < 300,
    });

    dbErrorRate.add(!success);
  });

  sleep(0.5);

  // Test 6: Concurrent write operations
  group('DB Performance - Concurrent Writes', () => {
    const timestamp = Date.now();
    const res = http.post(`${BASE_URL}/api/agents`, JSON.stringify({
      type: 'VISIONSHARE',
      name: `Test Agent ${timestamp} - ${__VU}`,
      description: 'Performance test agent',
      config: {
        test: true,
        timestamp,
      },
    }), { headers });

    simpleQueryLatency.add(res.timings.duration);

    const success = check(res, {
      'concurrent write status is 201 or 200': (r) => r.status === 201 || r.status === 200,
      'concurrent write P95 < 100ms': (r) => r.timings.duration < 100,
    });

    dbErrorRate.add(!success);
  });

  sleep(1);
}

export function teardown(data) {
  console.log('Database performance test completed');
}
