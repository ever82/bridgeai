/**
 * E2E Scenario Performance Test
 * Simulates realistic user flows end-to-end
 *
 * Target: 1000+ concurrent users, < 3s response time
 * @k6
 */

/* global __ENV __VU */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate, Counter, Gauge } from 'k6/metrics';
import { randomIntBetween, randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const e2eErrors = new Rate('e2e_errors');
const scenarioDuration = new Trend('scenario_duration');
const authDuration = new Trend('auth_duration');
const browseDuration = new Trend('browse_duration');
const matchDuration = new Trend('match_duration');
const chatDuration = new Trend('chat_duration');
const searchDuration = new Trend('search_duration');
const scenarioCount = new Counter('scenario_count');
const activeConnections = new Gauge('active_connections');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

// Test users pool
const TEST_USERS = [
  { email: 'perftest1@example.com', password: 'Test123!' },
  { email: 'perftest2@example.com', password: 'Test123!' },
  { email: 'perftest3@example.com', password: 'Test123!' },
  { email: 'perftest4@example.com', password: 'Test123!' },
  { email: 'perftest5@example.com', password: 'Test123!' },
];

// Locations for search
const LOCATIONS = [
  { lat: 39.9042, lng: 116.4074 }, // Beijing
  { lat: 31.2304, lng: 121.4737 }, // Shanghai
  { lat: 22.5431, lng: 114.0579 }, // Shenzhen
  { lat: 40.7128, lng: -74.006 }, // New York
  { lat: 51.5074, lng: -0.1278 }, // London
];

export const options = {
  scenarios: {
    // E2E scenario load test with 1000 concurrent users
    e2e_1000: {
      executor: 'ramping-vus',
      stages: [
        { duration: '2m', target: 100 },
        { duration: '3m', target: 500 },
        { duration: '5m', target: 1000 },
        { duration: '5m', target: 1000 }, // Sustained peak
        { duration: '2m', target: 0 },
      ],
      gracefulStop: '60s',
    },
  },
  thresholds: {
    e2e_errors: ['rate<0.05'], // < 5% error rate for E2E scenarios
    scenario_duration: ['p(95)<3000', 'p(99)<5000'],
    auth_duration: ['p(95)<1000'],
    browse_duration: ['p(95)<2000'],
    match_duration: ['p(95)<2000'],
    chat_duration: ['p(95)<1500'],
    search_duration: ['p(95)<3000'],
  },
};

// Store auth tokens per VU for session continuity
const vuSessions = {};

export function setup() {
  console.log(`Starting E2E scenario test against: ${BASE_URL}`);
  console.log(`Simulating ${TEST_USERS.length} test user accounts`);
  return { testUsers: TEST_USERS, locations: LOCATIONS };
}

export default function (data) {
  const scenarioStart = Date.now();
  const vu = __VU;
  const vuId = vu % TEST_USERS.length;
  const testUser = TEST_USERS[vuId];
  const location = randomItem(data.locations);

  // Get or create session for this VU
  if (!vuSessions[vu]) {
    vuSessions[vu] = { token: null, userId: null };
  }
  const session = vuSessions[vu];

  const headers = { 'Content-Type': 'application/json' };

  // Scenario 1: Authentication
  group('E2E-1: Authentication', () => {
    let success = false;

    if (!session.token) {
      const res = http.post(
        `${BASE_URL}/api/v1/auth/login`,
        JSON.stringify({
          email: testUser.email,
          password: testUser.password,
        }),
        { headers }
      );

      authDuration.add(res.timings.duration);

      if (res.status === 200) {
        const body = JSON.parse(res.body);
        session.token = body.data?.token;
        session.userId = body.data?.user?.id;
        headers['Authorization'] = `Bearer ${session.token}`;
        success = check(res, {
          'login status 200': r => r.status === 200,
          'token received': () => !!body.data?.token,
        });
      } else {
        // Try register if login fails
        const regRes = http.post(
          `${BASE_URL}/api/v1/auth/register`,
          JSON.stringify({
            email: testUser.email,
            password: testUser.password,
            name: `PerfTest${vuId}`,
          }),
          { headers }
        );

        if (regRes.status === 201) {
          const body = JSON.parse(regRes.body);
          session.token = body.data?.token;
          session.userId = body.data?.user?.id;
          headers['Authorization'] = `Bearer ${session.token}`;
          success = true;
        }
      }
    } else {
      headers['Authorization'] = `Bearer ${session.token}`;
      success = true;
    }

    e2eErrors.add(!success);
    scenarioCount.add(1);

    if (!success) {
      session.token = null;
    }
  });

  if (!session.token) {
    sleep(randomIntBetween(5, 10));
    return;
  }

  // Scenario 2: Browse agents
  group('E2E-2: Browse Agents', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/agents?page=1&limit=20`, { headers });
    const duration = Date.now() - start;

    browseDuration.add(duration);
    activeConnections.add(1);

    const success = check(res, {
      'browse status 200': r => r.status === 200,
      'browse response < 2s': r => r.timings.duration < 2000,
    });
    e2eErrors.add(!success);

    sleep(randomIntBetween(1, 3));
  });

  // Scenario 3: Search with location
  group('E2E-3: Search with Location', () => {
    const start = Date.now();
    const res = http.post(
      `${BASE_URL}/api/agents/search`,
      JSON.stringify({
        type: 'VISIONSHARE',
        location: {
          lat: location.lat,
          lng: location.lng,
          radius: 5000,
        },
        filters: {
          status: 'ACTIVE',
        },
      }),
      { headers }
    );
    const duration = Date.now() - start;

    searchDuration.add(duration);

    const success = check(res, {
      'search status 200': r => r.status === 200,
      'search response < 3s': r => r.timings.duration < 3000,
    });
    e2eErrors.add(!success);

    sleep(randomIntBetween(1, 2));
  });

  // Scenario 4: Get matches
  group('E2E-4: Get Matches', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/agents/matches`, { headers });
    const duration = Date.now() - start;

    matchDuration.add(duration);

    const success = check(res, {
      'matches status 200': r => r.status === 200,
      'matches response < 2s': r => r.timings.duration < 2000,
    });
    e2eErrors.add(!success);

    sleep(randomIntBetween(1, 3));
  });

  // Scenario 5: Chat/Messages
  group('E2E-5: Message Operations', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/messages?page=1&limit=20`, { headers });
    const duration = Date.now() - start;

    chatDuration.add(duration);

    const success = check(res, {
      'messages status 200': r => r.status === 200,
      'messages response < 1.5s': r => r.timings.duration < 1500,
    });
    e2eErrors.add(!success);
  });

  // Scenario 6: Profile check
  group('E2E-6: Profile Operations', () => {
    const res = http.get(`${BASE_URL}/api/users/me`, { headers });

    check(res, {
      'profile status 200': r => r.status === 200,
      'profile response < 500ms': r => r.timings.duration < 500,
    });

    // Update presence
    http.put(
      `${BASE_URL}/api/users/me/presence`,
      JSON.stringify({
        status: 'online',
      }),
      { headers }
    );
  });

  // Record full scenario duration
  scenarioDuration.add(Date.now() - scenarioStart);

  // Random think time between scenarios
  sleep(randomIntBetween(3, 8));
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    'perf/e2e-scenario-summary.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data) {
  const metrics = data.metrics;
  const lines = [
    '=== E2E Scenario Performance Summary ===',
    `Date: ${new Date().toISOString()}`,
    `Base URL: ${BASE_URL}`,
    '',
    '--- Scenario Metrics ---',
    `Scenarios Run: ${metrics.scenario_count?.values?.count ?? 0}`,
    `Error Rate: ${((metrics.e2e_errors?.values?.rate ?? 0) * 100).toFixed(2)}%`,
    '',
    '--- Response Times (P95/P99) ---',
    `Auth:     P95=${metrics.auth_duration?.values['p(95)']?.toFixed(0) ?? 'N/A'}ms  P99=${metrics.auth_duration?.values['p(99)']?.toFixed(0) ?? 'N/A'}ms`,
    `Browse:   P95=${metrics.browse_duration?.values['p(95)']?.toFixed(0) ?? 'N/A'}ms  P99=${metrics.browse_duration?.values['p(99)']?.toFixed(0) ?? 'N/A'}ms`,
    `Search:   P95=${metrics.search_duration?.values['p(95)']?.toFixed(0) ?? 'N/A'}ms  P99=${metrics.search_duration?.values['p(99)']?.toFixed(0) ?? 'N/A'}ms`,
    `Match:    P95=${metrics.match_duration?.values['p(95)']?.toFixed(0) ?? 'N/A'}ms  P99=${metrics.match_duration?.values['p(99)']?.toFixed(0) ?? 'N/A'}ms`,
    `Chat:     P95=${metrics.chat_duration?.values['p(95)']?.toFixed(0) ?? 'N/A'}ms  P99=${metrics.chat_duration?.values['p(99)']?.toFixed(0) ?? 'N/A'}ms`,
    '',
    '--- Threshold Status ---',
    `Error Rate < 5%:    ${(metrics.e2e_errors?.values?.rate ?? 0) < 0.05 ? 'PASS' : 'FAIL'}`,
    `Auth P95 < 1000ms:  ${(metrics.auth_duration?.values['p(95)'] ?? 0) < 1000 ? 'PASS' : 'FAIL'}`,
    `Browse P95 < 2000ms: ${(metrics.browse_duration?.values['p(95)'] ?? 0) < 2000 ? 'PASS' : 'FAIL'}`,
    `Search P95 < 3000ms: ${(metrics.search_duration?.values['p(95)'] ?? 0) < 3000 ? 'PASS' : 'FAIL'}`,
    `Match P95 < 2000ms: ${(metrics.match_duration?.values['p(95)'] ?? 0) < 2000 ? 'PASS' : 'FAIL'}`,
    `Chat P95 < 1500ms:  ${(metrics.chat_duration?.values['p(95)'] ?? 0) < 1500 ? 'PASS' : 'FAIL'}`,
    '',
    '=== End of Summary ===',
  ];
  return lines.join('\n');
}
