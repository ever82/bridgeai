/**
 * API Load Test Configuration
 * Uses k6 for performance testing
 *
 * Target: API P95 response time < 200ms
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const apiErrors = new Rate('api_errors');
const apiLatencyP95 = new Trend('api_latency_p95');
const apiLatencyP99 = new Trend('api_latency_p99');
const requestsPerSecond = new Counter('requests_per_second');

// Test configuration
export const options = {
  stages: [
    // Ramp up
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '2m', target: 500 },   // Ramp up to 500 users
    // Steady state
    { duration: '5m', target: 500 },   // Stay at 500 users
    // Peak load
    { duration: '3m', target: 1000 },  // Ramp up to 1000 users
    { duration: '5m', target: 1000 },  // Stay at 1000 users
    // Ramp down
    { duration: '2m', target: 0 },     // Ramp down to 0
  ],
  thresholds: {
    // P95 should be under 200ms
    'api_latency_p95': ['p(95)<200'],
    // P99 should be under 500ms
    'api_latency_p99': ['p(99)<500'],
    // Error rate should be under 1%
    'api_errors': ['rate<0.01'],
    // HTTP request duration
    'http_req_duration': ['p(95)<200', 'p(99)<500'],
    // HTTP errors
    'http_req_failed': ['rate<0.01'],
  },
  ext: {
    loadimpact: {
      distribution: {
        'amazon:us:ashburn': { loadZone: 'amazon:us:ashburn', percent: 50 },
        'amazon:ie:dublin': { loadZone: 'amazon:ie:dublin', percent: 50 },
      },
    },
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

// Test user credentials (for authenticated endpoints)
const TEST_USER = {
  email: 'test@example.com',
  password: 'Test123!',
};

let authToken = null;

/**
 * Setup function - runs once before all VUs start
 */
export function setup() {
  console.log('Starting load test against:', BASE_URL);

  // Get auth token for authenticated requests
  const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
    email: TEST_USER.email,
    password: TEST_USER.password,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (loginRes.status === 200) {
    const body = JSON.parse(loginRes.body);
    authToken = body.data?.token;
    console.log('Authentication successful');
  } else {
    console.log('Authentication failed, running public endpoints only');
  }

  return { authToken };
}

/**
 * Main test function - runs repeatedly during the test
 */
export default function (data) {
  const token = data.authToken;
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  group('Public API Endpoints', () => {
    // Health check endpoint
    group('Health Check', () => {
      const start = Date.now();
      const res = http.get(`${BASE_URL}/api/v1/health`, { headers });
      const duration = Date.now() - start;

      apiLatencyP95.add(duration);
      apiLatencyP99.add(duration);

      const success = check(res, {
        'health status is 200': (r) => r.status === 200,
        'health response time < 100ms': (r) => r.timings.duration < 100,
      });

      apiErrors.add(!success);
      requestsPerSecond.add(1);
    });

    sleep(randomIntBetween(1, 3));
  });

  group('Authenticated API Endpoints', () => {
    if (!token) {
      console.log('Skipping authenticated endpoints - no token');
      return;
    }

    // Get current user
    group('Get Current User', () => {
      const start = Date.now();
      const res = http.get(`${BASE_URL}/api/users/me`, { headers });
      const duration = Date.now() - start;

      apiLatencyP95.add(duration);
      apiLatencyP99.add(duration);

      const success = check(res, {
        'get user status is 200': (r) => r.status === 200,
        'get user response time < 200ms': (r) => r.timings.duration < 200,
      });

      apiErrors.add(!success);
      requestsPerSecond.add(1);
    });

    sleep(randomIntBetween(1, 3));

    // Get agents list
    group('Get Agents List', () => {
      const start = Date.now();
      const res = http.get(`${BASE_URL}/api/agents?page=1&limit=20`, { headers });
      const duration = Date.now() - start;

      apiLatencyP95.add(duration);
      apiLatencyP99.add(duration);

      const success = check(res, {
        'get agents status is 200': (r) => r.status === 200,
        'get agents response time < 200ms': (r) => r.timings.duration < 200,
      });

      apiErrors.add(!success);
      requestsPerSecond.add(1);
    });

    sleep(randomIntBetween(1, 3));

    // Get matches
    group('Get Matches', () => {
      const start = Date.now();
      const res = http.get(`${BASE_URL}/api/agents/matches`, { headers });
      const duration = Date.now() - start;

      apiLatencyP95.add(duration);
      apiLatencyP99.add(duration);

      const success = check(res, {
        'get matches status is 200': (r) => r.status === 200,
        'get matches response time < 300ms': (r) => r.timings.duration < 300,
      });

      apiErrors.add(!success);
      requestsPerSecond.add(1);
    });

    sleep(randomIntBetween(1, 3));
  });

  group('Heavy Load Endpoints', () => {
    if (!token) return;

    // Complex query - matching algorithm
    group('Matching Algorithm Query', () => {
      const start = Date.now();
      const res = http.post(`${BASE_URL}/api/agents/search`, JSON.stringify({
        type: 'VISIONSHARE',
        location: {
          lat: 39.9042,
          lng: 116.4074,
          radius: 5000,
        },
        filters: {
          status: 'ACTIVE',
          tags: ['urgent', 'photo'],
        },
      }), { headers });
      const duration = Date.now() - start;

      apiLatencyP95.add(duration);
      apiLatencyP99.add(duration);

      const success = check(res, {
        'search status is 200': (r) => r.status === 200,
        'search response time < 500ms': (r) => r.timings.duration < 500,
      });

      apiErrors.add(!success);
      requestsPerSecond.add(1);
    });

    sleep(randomIntBetween(2, 5));
  });
}

/**
 * Teardown function - runs once after all VUs finish
 */
export function teardown(data) {
  console.log('Load test completed');
  console.log('Final metrics:');
  console.log('- Auth token available:', data.authToken ? 'Yes' : 'No');
}
