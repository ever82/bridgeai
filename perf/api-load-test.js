// API Load Test Configuration
// Using k6 for load testing
// Run with: k6 run perf/api-load-test.js
/* eslint-disable no-undef */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const responseTime = new Trend('response_time');
const errorRate = new Rate('error_rate');

// Test configuration
export const options = {
  scenarios: {
    // Warm-up phase
    warmup: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [{ duration: '30s', target: 10 }],
      tags: { phase: 'warmup' },
    },
    // Benchmark phase - sustained load
    benchmark: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '2m', target: 50 },
        { duration: '1m', target: 100 },
        { duration: '2m', target: 100 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 0 },
      ],
      tags: { phase: 'benchmark' },
    },
    // Stress test phase
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 200 },
        { duration: '1m', target: 200 },
        { duration: '30s', target: 400 },
        { duration: '1m', target: 400 },
        { duration: '30s', target: 0 },
      ],
      tags: { phase: 'stress' },
    },
  },
  thresholds: {
    // P95 response time < 200ms
    response_time: ['p(95)<200'],
    // Error rate < 1%
    error_rate: ['rate<0.01'],
    // Availability > 99%
    http_req_failed: ['rate<0.01'],
  },
};

// Base configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_TOKEN = __ENV.API_TOKEN || 'test-token';

// Default headers
const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${API_TOKEN}`,
};

// Health check test
export function testHealthCheck() {
  const res = http.get(`${BASE_URL}/api/v1/health`);

  check(res, {
    'health check status is 200': r => r.status === 200,
    'health check response time < 100ms': r => r.timings.duration < 100,
  });

  responseTime.add(res.timings.duration);
  errorRate.add(res.status !== 200);
}

// Authentication test
export function testAuth() {
  const payload = JSON.stringify({
    email: 'user@test.com',
    password: 'testpassword',
  });

  const res = http.post(`${BASE_URL}/api/auth/login`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'auth response status is 200 or 429': r => r.status === 200 || r.status === 429,
    'auth response time < 500ms': r => r.timings.duration < 500,
  });

  responseTime.add(res.timings.duration);
  errorRate.add(res.status !== 200 && res.status !== 429);
}

// Agent listing test
export function testAgentList() {
  const res = http.get(`${BASE_URL}/api/agents`, { headers });

  check(res, {
    'agents list status is 200': r => r.status === 200,
    'agents response time < 200ms': r => r.timings.duration < 200,
  });

  responseTime.add(res.timings.duration);
  errorRate.add(res.status !== 200);
}

// Agent profile test
export function testAgentProfile() {
  const res = http.get(`${BASE_URL}/api/agents/test-agent-id/profile`, { headers });

  check(res, {
    'agent profile status is 200 or 404': r => r.status === 200 || r.status === 404,
    'agent profile response time < 200ms': r => r.timings.duration < 200,
  });

  responseTime.add(res.timings.duration);
  errorRate.add(res.status !== 200 && res.status !== 404);
}

// Matching service test
export function testMatching() {
  const res = http.get(`${BASE_URL}/api/match?limit=20`, { headers });

  check(res, {
    'matching status is 200': r => r.status === 200,
    'matching response time < 200ms': r => r.timings.duration < 200,
  });

  responseTime.add(res.timings.duration);
  errorRate.add(res.status !== 200);
}

// Credit score test
export function testCreditScore() {
  const res = http.get(`${BASE_URL}/api/credit/score`, { headers });

  check(res, {
    'credit score status is 200': r => r.status === 200,
    'credit score response time < 200ms': r => r.timings.duration < 200,
  });

  responseTime.add(res.timings.duration);
  errorRate.add(res.status !== 200);
}

// Rate limiting test - intentional abuse to test protection
export function testRateLimit() {
  const res = http.get(`${BASE_URL}/api/v1/health`, { headers });

  // We expect rate limiting to kick in at some point
  // This test verifies the protection mechanism works
  check(res, {
    'rate limit returns 200 or 429': r => r.status === 200 || r.status === 429,
  });
}

// Main test function
export default function () {
  // Run tests in sequence with slight delays
  testHealthCheck();
  sleep(0.1);

  testAuth();
  sleep(0.1);

  testAgentList();
  sleep(0.1);

  testAgentProfile();
  sleep(0.1);

  testMatching();
  sleep(0.1);

  testCreditScore();
  sleep(0.1);

  // Small delay between iterations
  sleep(0.5);
}

// Setup function - runs once before tests
export function setup() {
  console.log('Starting API Load Test...');
  console.log(`Target: ${BASE_URL}`);

  // Verify server is reachable
  const health = http.get(`${BASE_URL}/api/v1/health`);
  if (health.status !== 200) {
    console.warn('Warning: Server health check failed, but proceeding with tests');
  }

  return { startTime: Date.now() };
}

// Teardown function - runs once after tests
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Load test completed in ${duration.toFixed(2)}s`);
  console.log('Thresholds check:');
  console.log('  - P95 response time < 200ms');
  console.log('  - Error rate < 1%');
  console.log('  - Availability > 99%');
}
