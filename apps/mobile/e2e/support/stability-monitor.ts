/**
 * Stability Monitor for E2E Tests
 *
 * Tracks per-test historical pass rates, automatically marks tests as flaky
 * when failure rate exceeds 5%, tracks SLA for flaky test fixes (3 business
 * days), and monitors test execution time with alerting.
 *
 * Data is persisted as JSON in the reports directory so it survives across runs.
 *
 * Usage:
 *   import { StabilityMonitor } from '../support/stability-monitor';
 *
 *   const monitor = StabilityMonitor.load();
 *   monitor.recordResult('login-flow', true, 1234);
 *   monitor.save();
 */

import * as fs from 'fs';
import * as path from 'path';

// ─── Types ────────────────────────────────────────────────────────────────

const FLAKY_THRESHOLD = 0.05; // 5% failure rate triggers flaky marking
const SLA_BUSINESS_DAYS = 3;
const DURATION_WARNING_MULTIPLIER = 2; // Warn if duration > 2x historical average
const MIN_RUNS_FOR_FLAKY_DETECTION = 5; // Need at least 5 runs to detect flakiness

interface TestRecord {
  passed: boolean;
  duration: number;
  timestamp: string;
}

interface FlakyEntry {
  testName: string;
  markedAt: string;      // ISO date when flaky was first detected
  slaDeadline: string;   // ISO date – 3 business days from markedAt
  failureRate: number;
  totalRuns: number;
  failedRuns: number;
}

interface DurationAlert {
  testName: string;
  averageDuration: number;
  lastDuration: number;
  multiplier: number;
  timestamp: string;
}

interface StabilityData {
  version: number;
  lastUpdated: string;
  /** Per-test history of results */
  testHistory: Record<string, TestRecord[]>;
  /** Currently marked flaky tests with SLA tracking */
  flakyTests: Record<string, FlakyEntry>;
  /** Duration alerts */
  durationAlerts: DurationAlert[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Add N business days to a date (skips weekends).
 */
function addBusinessDays(startDate: Date, days: number): Date {
  const result = new Date(startDate);
  let remaining = days;
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) {
      remaining--;
    }
  }
  return result;
}

function _isBusinessDay(d: Date): boolean {
  const dow = d.getDay();
  return dow !== 0 && dow !== 6;
}

function _today(): string {
  return new Date().toISOString().split('T')[0];
}

// ─── StabilityMonitor class ──────────────────────────────────────────────

export class StabilityMonitor {
  private data: StabilityData;
  private filePath: string;

  private constructor(data: StabilityData, filePath: string) {
    this.data = data;
    this.filePath = filePath;
  }

  // ─── Load / Save ─────────────────────────────────────────────────────

  /**
   * Load persisted stability data from disk. Creates a fresh structure if
   * the file does not exist yet.
   */
  static load(dir?: string): StabilityMonitor {
    const reportDir = dir || path.join(__dirname, '..', 'maestro', 'reports');
    const filePath = path.join(reportDir, 'stability-data.json');

    let data: StabilityData;
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      data = JSON.parse(raw) as StabilityData;
      // Ensure structural integrity across versions
      data.testHistory = data.testHistory || {};
      data.flakyTests = data.flakyTests || {};
      data.durationAlerts = data.durationAlerts || [];
    } else {
      data = {
        version: 1,
        lastUpdated: new Date().toISOString(),
        testHistory: {},
        flakyTests: {},
        durationAlerts: [],
      };
    }

    return new StabilityMonitor(data, filePath);
  }

  /**
   * Persist current state to disk.
   */
  save(): void {
    this.data.lastUpdated = new Date().toISOString();
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
  }

  // ─── Recording results ───────────────────────────────────────────────

  /**
   * Record the outcome of a single test run.
   *
   * @param testName  Flow / test name (e.g. "login-flow")
   * @param passed    Whether the test passed
   * @param duration  Execution time in milliseconds
   */
  recordResult(testName: string, passed: boolean, duration: number): void {
    if (!this.data.testHistory[testName]) {
      this.data.testHistory[testName] = [];
    }

    const record: TestRecord = {
      passed,
      duration,
      timestamp: new Date().toISOString(),
    };

    this.data.testHistory[testName].push(record);

    // Keep only the last 100 runs per test to bound file size
    if (this.data.testHistory[testName].length > 100) {
      this.data.testHistory[testName] = this.data.testHistory[testName].slice(-100);
    }

    // Evaluate flaky status
    this.evaluateFlaky(testName);

    // Evaluate duration
    this.evaluateDuration(testName, duration);
  }

  // ─── Flaky detection ─────────────────────────────────────────────────

  /**
   * Check whether a test should be marked as flaky based on its recent
   * failure rate. The threshold is FLAKY_THRESHOLD (5%) over at least
   * MIN_RUNS_FOR_FLAKY_DETECTION runs.
   */
  private evaluateFlaky(testName: string): void {
    const history = this.data.testHistory[testName];
    if (!history || history.length < MIN_RUNS_FOR_FLAKY_DETECTION) {
      return;
    }

    const total = history.length;
    const failed = history.filter((r) => !r.passed).length;
    const failureRate = failed / total;

    if (failureRate > FLAKY_THRESHOLD) {
      if (!this.data.flakyTests[testName]) {
        const now = new Date();
        const slaDeadline = addBusinessDays(now, SLA_BUSINESS_DAYS);

        this.data.flakyTests[testName] = {
          testName,
          markedAt: now.toISOString(),
          slaDeadline: slaDeadline.toISOString(),
          failureRate,
          totalRuns: total,
          failedRuns: failed,
        };
      } else {
        // Update stats but keep the original markedAt / slaDeadline
        const entry = this.data.flakyTests[testName];
        entry.failureRate = failureRate;
        entry.totalRuns = total;
        entry.failedRuns = failed;
      }
    } else {
      // Test recovered – remove from flaky list
      if (this.data.flakyTests[testName]) {
        delete this.data.flakyTests[testName];
      }
    }
  }

  // ─── Duration monitoring ─────────────────────────────────────────────

  /**
   * Compare the latest duration against the historical average and emit an
   * alert if it exceeds DURATION_WARNING_MULTIPLIER times the average.
   */
  private evaluateDuration(testName: string, latestDuration: number): void {
    const history = this.data.testHistory[testName];
    if (!history || history.length < 3) {
      return; // Need some baseline
    }

    // Use all runs except the current one for the average
    const previous = history.slice(0, -1);
    const avgDuration = previous.reduce((sum, r) => sum + r.duration, 0) / previous.length;

    if (latestDuration > avgDuration * DURATION_WARNING_MULTIPLIER) {
      // Remove any existing alert for this test and replace with updated one
      this.data.durationAlerts = this.data.durationAlerts.filter(
        (a) => a.testName !== testName,
      );
      this.data.durationAlerts.push({
        testName,
        averageDuration: Math.round(avgDuration),
        lastDuration: latestDuration,
        multiplier: Math.round((latestDuration / avgDuration) * 100) / 100,
        timestamp: new Date().toISOString(),
      });
    } else {
      // Clear alert if performance recovered
      this.data.durationAlerts = this.data.durationAlerts.filter(
        (a) => a.testName !== testName,
      );
    }
  }

  // ─── Query helpers ───────────────────────────────────────────────────

  /**
   * Return the list of currently-marked flaky tests.
   */
  getFlakyTests(): FlakyEntry[] {
    return Object.values(this.data.flakyTests);
  }

  /**
   * Return true if a test is currently marked as flaky.
   */
  isFlaky(testName: string): boolean {
    return testName in this.data.flakyTests;
  }

  /**
   * Return flaky tests whose SLA deadline has passed (still flaky after
   * 3 business days).
   */
  getOverdueFlakyTests(): FlakyEntry[] {
    const now = new Date();
    return this.getFlakyTests().filter((entry) => new Date(entry.slaDeadline) < now);
  }

  /**
   * Return current duration alerts.
   */
  getDurationAlerts(): DurationAlert[] {
    return this.data.durationAlerts;
  }

  /**
   * Get per-test failure rate statistics for all tests that have been run
   * at least once.
   */
  getAllTestStats(): Array<{
    testName: string;
    totalRuns: number;
    passedRuns: number;
    failedRuns: number;
    failureRate: number;
    avgDuration: number;
    isFlaky: boolean;
  }> {
    const results: Array<{
      testName: string;
      totalRuns: number;
      passedRuns: number;
      failedRuns: number;
      failureRate: number;
      avgDuration: number;
      isFlaky: boolean;
    }> = [];

    for (const [testName, history] of Object.entries(this.data.testHistory)) {
      const total = history.length;
      const passed = history.filter((r) => r.passed).length;
      const failed = total - passed;
      const avgDuration = total > 0
        ? Math.round(history.reduce((s, r) => s + r.duration, 0) / total)
        : 0;

      results.push({
        testName,
        totalRuns: total,
        passedRuns: passed,
        failedRuns: failed,
        failureRate: total > 0 ? Math.round((failed / total) * 10000) / 10000 : 0,
        avgDuration,
        isFlaky: testName in this.data.flakyTests,
      });
    }

    return results.sort((a, b) => b.failureRate - a.failureRate);
  }

  // ─── Reporting ───────────────────────────────────────────────────────

  /**
   * Generate a human-readable markdown report for CI consumption.
   */
  generateReport(): string {
    const lines: string[] = [];
    const flaky = this.getFlakyTests();
    const overdue = this.getOverdueFlakyTests();
    const alerts = this.getDurationAlerts();
    const allStats = this.getAllTestStats();

    lines.push('# E2E Stability Monitor Report');
    lines.push('');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');

    // Summary
    lines.push('## Summary');
    lines.push('');
    lines.push(`- Tracked tests: ${allStats.length}`);
    lines.push(`- Flaky tests: ${flaky.length}`);
    lines.push(`- SLA overdue: ${overdue.length}`);
    lines.push(`- Duration alerts: ${alerts.length}`);
    lines.push('');

    // Flaky tests section
    if (flaky.length > 0) {
      lines.push('## Flaky Tests (failure rate > 5%)');
      lines.push('');
      lines.push('| Test | Failure Rate | Runs | Failed | Marked | SLA Deadline | Overdue |');
      lines.push('|------|-------------|------|--------|--------|-------------|---------|');
      for (const entry of flaky) {
        const isOverdue = new Date(entry.slaDeadline) < new Date();
        const markedDate = entry.markedAt.split('T')[0];
        const slaDate = entry.slaDeadline.split('T')[0];
        lines.push(
          `| ${entry.testName} | ${(entry.failureRate * 100).toFixed(1)}% ` +
          `| ${entry.totalRuns} | ${entry.failedRuns} | ${markedDate} | ${slaDate} ` +
          `| ${isOverdue ? '**YES**' : 'no'} |`,
        );
      }
      lines.push('');
    } else {
      lines.push('## Flaky Tests');
      lines.push('');
      lines.push('No flaky tests detected.');
      lines.push('');
    }

    // SLA overdue section
    if (overdue.length > 0) {
      lines.push('## SLA Overdue (> 3 business days)');
      lines.push('');
      for (const entry of overdue) {
        const slaDate = new Date(entry.slaDeadline);
        const daysOverdue = Math.floor(
          (Date.now() - slaDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        lines.push(
          `- **${entry.testName}**: ${daysOverdue} day(s) past SLA ` +
          `(deadline was ${entry.slaDeadline.split('T')[0]})`,
        );
      }
      lines.push('');
    }

    // Duration alerts section
    if (alerts.length > 0) {
      lines.push('## Duration Alerts (execution time anomaly)');
      lines.push('');
      lines.push('| Test | Average (ms) | Last (ms) | Multiplier |');
      lines.push('|------|-------------|-----------|------------|');
      for (const a of alerts) {
        lines.push(
          `| ${a.testName} | ${a.averageDuration} | ${a.lastDuration} | ${a.multiplier}x |`,
        );
      }
      lines.push('');
    }

    // Per-test stats
    lines.push('## Per-Test Statistics');
    lines.push('');
    lines.push('| Test | Runs | Passed | Failed | Failure Rate | Avg Duration | Flaky |');
    lines.push('|------|------|--------|--------|-------------|-------------|-------|');
    for (const s of allStats) {
      lines.push(
        `| ${s.testName} | ${s.totalRuns} | ${s.passedRuns} | ${s.failedRuns} ` +
        `| ${(s.failureRate * 100).toFixed(1)}% | ${s.avgDuration}ms ` +
        `| ${s.isFlaky ? '**YES**' : 'no'} |`,
      );
    }
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Generate a JSON summary suitable for machine consumption (CI checks).
   */
  generateJsonSummary(): {
    flakyCount: number;
    overdueCount: number;
    durationAlertCount: number;
    flakyTests: FlakyEntry[];
    overdueTests: FlakyEntry[];
    durationAlerts: DurationAlert[];
  } {
    return {
      flakyCount: this.getFlakyTests().length,
      overdueCount: this.getOverdueFlakyTests().length,
      durationAlertCount: this.getDurationAlerts().length,
      flakyTests: this.getFlakyTests(),
      overdueTests: this.getOverdueFlakyTests(),
      durationAlerts: this.getDurationAlerts(),
    };
  }
}

export default StabilityMonitor;
