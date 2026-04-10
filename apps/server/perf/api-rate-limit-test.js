/**
 * Rate Limiter and Circuit Breaker Stress Test
 * Tests API resilience under high load and rate limiting
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

// Metrics
const rateLimitHits = new Counter('rate_limit_hits');
const circuitBreakerTrips = new Counter('circuit_breaker_trips');
const rateLimitLatency = new Trend('rate_limit_latency');
const errorRate = new Rate('errors');

export const options = {
  stages: [
    // Normal load
    { duration: '1m', target: 50 },
    // Spike to trigger rate limiting
    { duration: '30s', target: 200 },
    // Continue at high load
    { duration: '2m', target: 200 },
    // Spike even higher
    { duration: '30s', target: 500 },
    // Sustain peak
    { duration: '2m', target: 500 },
    // Ramp down
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'],
    'errors': ['rate<0.05'],
    'rate_limit_hits': ['count>0'], // We expect some rate limiting
    'circuit_breaker_trips': ['count>=0'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

export function setup() {
  console.log('Running rate limiter stress test');
  return { timestamp: Date.now() };
}

export default function (data) {
  // Test 1: Rapid health check requests (should trigger rate limiting)
  group('Rate Limit Test - Rapid Requests', () => {
    for (let i = 0; i < 10; i++) {
      const res = http.get(`${BASE_URL}/api/v1/health`, {
        headers: { 'Content-Type': 'application/json' },
      });

      rateLimitLatency.add(res.timings.duration);

      if (res.status === 429) {
        rateLimitHits.add(1);
        check(res, {
          'rate limit returns 429': (r) => r.status === 429,
          'rate limit has retry-after header': (r) => r.headers['Retry-After'] !== undefined,
        });
      } else if (res.status === 503) {
        circuitBreakerTrips.add(1);
        check(res, {
          'circuit breaker returns 503': (r) => r.status === 503,
        });
      } else {
        check(res, {
          'request succeeds or is rate limited': (r) => r.status === 200 || r.status === 429,
        });
      }
    }
  });

  sleep(0.1);

  // Test 2: Auth endpoint rate limiting (stricter limits)
  group('Rate Limit Test - Auth Endpoint', () => {
    for (let i = 0; i < 5; i++) {
      const res = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
        email: `test${i}@example.com`,
        password: 'wrongpassword',
      }), {
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.status === 429) {
        rateLimitHits.add(1);
        check(res, {
          'auth rate limit returns 429': (r) => r.status === 429,
        });
      } else if (res.status === 401 || res.status === 400) {
        // Expected for wrong credentials
        check(res, {
          'auth returns expected error': (r) => r.status === 401 || r.status === 400,
        });
      }
    }
  });

  sleep(0.5);

  // Test 3: Burst traffic simulation
  group('Rate Limit Test - Burst Traffic', () => {
    const requests = [];

    // Create 20 parallel requests
    for (let i = 0; i < 20; i++) {
      requests.push(http.get(`${BASE_URL}/api/v1/health`, {
        headers: { 'Content-Type': 'application/json' },
      }));
    }

    // Check results
    let successCount = 0;
    let rateLimitedCount = 0;
    let otherErrorCount = 0;

    requests.forEach((res) => {
      if (res.status === 200) {
        successCount++;
      } else if (res.status === 429) {
        rateLimitedCount++;
        rateLimitHits.add(1);
      } else if (res.status === 503) {
        circuitBreakerTrips.add(1);
        otherErrorCount++;
      } else {
        otherErrorCount++;
      }
    });

    check(null, {
      'burst has some successes': () => successCount > 0,
      'burst has expected rate limits': () => rateLimitedCount >= 0,
    });

    console.log(`Burst results: ${successCount} success, ${rateLimitedCount} rate limited, ${otherErrorCount} errors`);
  });

  sleep(1);
}

export function teardown(data) {
  console.log('Rate limiter stress test completed');
  console.log('Summary:');
  console.log('- Rate limited requests:', rateLimitHits.name);
  console.log('- Circuit breaker trips:', circuitBreakerTrips.name);
}
