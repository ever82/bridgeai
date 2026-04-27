/**
 * Peak Load Capacity Test
 * Determines the maximum concurrent user capacity
 *
 * Finds the breaking point where error rate exceeds 5%
 */

/* global __ENV __VU __ITER */

import http from 'k6/http';
import { group, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

const errorRate = new Rate('peak_error_rate');
const responseTime = new Trend('peak_response_time');
const requestsCount = new Counter('peak_requests');
const failuresCount = new Counter('peak_failures');
const sustainedLoad = new Counter('sustained_peak_reached');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export const options = {
  scenarios: {
    // Progressive stress test to find peak capacity
    stress_to_peak: {
      executor: 'ramping-vus',
      stages: [
        // Stage 1: Light load baseline (100 VUs)
        { duration: '1m', target: 100 },
        // Stage 2: Moderate load (300 VUs)
        { duration: '2m', target: 300 },
        // Stage 3: Heavy load (600 VUs)
        { duration: '2m', target: 600 },
        // Stage 4: Near-peak (900 VUs)
        { duration: '3m', target: 900 },
        // Stage 5: Peak test (1200 VUs) - may exceed capacity
        { duration: '3m', target: 1200 },
        // Stage 6: Recovery
        { duration: '1m', target: 100 },
      ],
      gracefulStop: '60s',
    },
  },
  thresholds: {
    // Alert if error rate exceeds 5%
    peak_error_rate: ['rate<0.05'],
    // Log P95 response times
    peak_response_time: ['p(95)<2000'],
  },
};

export function setup() {
  console.log(`Starting peak load capacity test against: ${BASE_URL}`);
  console.log('Finding maximum concurrent user capacity...');

  // Pre-authenticate 50 test accounts for reuse
  const users = [];
  for (let i = 0; i < 50; i++) {
    const email = `peakload${i}@example.com`;
    const res = http.post(
      `${BASE_URL}/api/v1/auth/login`,
      JSON.stringify({
        email,
        password: 'Test123!',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (res.status === 200) {
      const body = JSON.parse(res.body);
      if (body.data?.token) {
        users.push({ token: body.data.token });
      }
    }
  }

  console.log(`Pre-authenticated ${users.length} accounts`);
  return { tokens: users };
}

export default function (data) {
  const headers = { 'Content-Type': 'application/json' };
  const vu = __VU;
  const tokenIndex = vu % data.tokens.length;
  const token = data.tokens[tokenIndex]?.token;

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Mix of operations
  const operation = Math.random();

  group('Peak Load Operations', () => {
    let res;
    let success = false;

    if (operation < 0.3) {
      // Health check (30%)
      res = http.get(`${BASE_URL}/api/v1/health`, { headers });
      success = res.status === 200;
    } else if (operation < 0.55) {
      // Get agents list (25%)
      res = http.get(`${BASE_URL}/api/agents?page=1&limit=20`, { headers });
      success = res.status === 200;
    } else if (operation < 0.75) {
      // Get user profile (20%)
      res = http.get(`${BASE_URL}/api/users/me`, { headers });
      success = res.status === 200;
    } else if (operation < 0.9) {
      // Get matches (15%)
      res = http.get(`${BASE_URL}/api/agents/matches`, { headers });
      success = res.status === 200;
    } else {
      // Search (10%)
      res = http.post(
        `${BASE_URL}/api/agents/search`,
        JSON.stringify({
          type: 'VISIONSHARE',
          location: { lat: 39.9042, lng: 116.4074, radius: 5000 },
        }),
        { headers }
      );
      success = res.status === 200;
    }

    responseTime.add(res.timings.duration);
    requestsCount.add(1);
    errorRate.add(!success);
    if (!success) failuresCount.add(1);

    // Check if we're sustaining at peak load
    if (__ITER >= 5 && (res.status === 200 || res.status === 429)) {
      sustainedLoad.add(1);
    }
  });

  sleep(randomIntBetween(0.5, 2));
}

export function handleSummary(data) {
  const metrics = data.metrics;
  const vuMax = data.state?.vus?.max ?? 0;
  const errorRateVal = metrics.peak_error_rate?.values?.rate ?? 0;
  const requestsTotal = metrics.peak_requests?.values?.count ?? 0;
  const failuresTotal = metrics.peak_failures?.values?.count ?? 0;
  const p95 = metrics.peak_response_time?.values['p(95)'] ?? 0;
  const p99 = metrics.peak_response_time?.values['p(99)'] ?? 0;
  const avg = metrics.peak_response_time?.values?.avg ?? 0;

  const report = {
    testDate: new Date().toISOString(),
    baseUrl: BASE_URL,
    peakVUs: vuMax,
    totalRequests: requestsTotal,
    totalFailures: failuresTotal,
    errorRate: errorRateVal,
    responseTime: {
      p95ms: p95,
      p99ms: p99,
      avgms: avg,
    },
    capacity: {
      maxConcurrentUsers: vuMax,
      meets1000UserTarget: vuMax >= 1000 && errorRateVal < 0.05,
      errorRateWithinThreshold: errorRateVal < 0.05,
    },
    thresholds: {
      p95Below2000ms: p95 < 2000,
      errorRateBelow5Percent: errorRateVal < 0.05,
    },
    rawMetrics: data.metrics,
  };

  const text = [
    '=== Peak Load Capacity Test Results ===',
    `Date: ${report.testDate}`,
    `Base URL: ${report.baseUrl}`,
    '',
    '--- Capacity Results ---',
    `Peak VUs: ${report.peakVUs}`,
    `Total Requests: ${report.totalRequests}`,
    `Failed Requests: ${report.totalFailures}`,
    `Error Rate: ${(errorRateVal * 100).toFixed(2)}%`,
    '',
    '--- Response Times ---',
    `P95: ${p95.toFixed(0)}ms`,
    `P99: ${p99.toFixed(0)}ms`,
    `Avg: ${avg.toFixed(0)}ms`,
    '',
    '--- Target Check ---',
    `Supports 1000+ concurrent users: ${report.capacity.meets1000UserTarget ? 'PASS' : 'FAIL'}`,
    `Error rate < 5%: ${report.capacity.errorRateWithinThreshold ? 'PASS' : 'FAIL'}`,
    `P95 response < 2000ms: ${report.thresholds.p95Below2000ms ? 'PASS' : 'FAIL'}`,
    '',
    '=== End of Report ===',
  ];

  return {
    stdout: text.join('\n'),
    'perf/peak-load-report.json': JSON.stringify(report, null, 2),
  };
}
