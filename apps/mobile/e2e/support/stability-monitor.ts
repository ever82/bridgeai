/**
 * E2E Test Stability Monitor
 * Tracks flaky tests and test execution times
 */

interface TestResult {
  testName: string;
  fileName: string;
  status: 'passed' | 'failed';
  duration: number;
  retryCount: number;
  timestamp: number;
  errorMessage?: string;
}

interface StabilityMetrics {
  totalRuns: number;
  passCount: number;
  failCount: number;
  flakyRate: number;
  averageDuration: number;
  maxDuration: number;
}

export class StabilityMonitor {
  private static testResults: Map<string, TestResult[]> = new Map();
  private static flakyTests: Set<string> = new Set();
  private static readonly FLAKY_THRESHOLD = 0.05; // 5% failure rate
  private static readonly TARGET_FLAKY_RATE = 0.02; // 2% target

  /**
   * Record test result
   */
  static recordResult(result: TestResult): void {
    const key = `${result.fileName}::${result.testName}`;

    if (!this.testResults.has(key)) {
      this.testResults.set(key, []);
    }

    this.testResults.get(key)!.push(result);

    // Check if test is flaky
    this.updateFlakyStatus(key);

    // Log if test exceeds time limit (2 minutes)
    if (result.duration > 120000) {
      console.warn(`⚠️ Test "${result.testName}" exceeded 2 minute limit: ${result.duration}ms`);
    }
  }

  /**
   * Check if a test is flaky
   */
  static isFlaky(testName: string, fileName: string): boolean {
    const key = `${fileName}::${testName}`;
    return this.flakyTests.has(key);
  }

  /**
   * Update flaky status for a test
   */
  private static updateFlakyStatus(key: string): void {
    const results = this.testResults.get(key) || [];

    if (results.length < 3) {
      return; // Need at least 3 runs to determine flakiness
    }

    const failCount = results.filter(r => r.status === 'failed').length;
    const failureRate = failCount / results.length;

    if (failureRate > this.FLAKY_THRESHOLD) {
      this.flakyTests.add(key);
      console.warn(`🚨 Flaky test detected: "${key}" (failure rate: ${(failureRate * 100).toFixed(1)}%)`);
    } else if (failureRate <= this.TARGET_FLAKY_RATE && this.flakyTests.has(key)) {
      this.flakyTests.delete(key);
      console.log(`✅ Test "${key}" is no longer flaky`);
    }
  }

  /**
   * Get metrics for a test
   */
  static getMetrics(testName: string, fileName: string): StabilityMetrics {
    const key = `${fileName}::${testName}`;
    const results = this.testResults.get(key) || [];

    const totalRuns = results.length;
    const passCount = results.filter(r => r.status === 'passed').length;
    const failCount = totalRuns - passCount;
    const durations = results.map(r => r.duration);

    return {
      totalRuns,
      passCount,
      failCount,
      flakyRate: totalRuns > 0 ? failCount / totalRuns : 0,
      averageDuration: totalRuns > 0
        ? durations.reduce((a, b) => a + b, 0) / totalRuns
        : 0,
      maxDuration: totalRuns > 0 ? Math.max(...durations) : 0,
    };
  }

  /**
   * Get all flaky tests
   */
  static getFlakyTests(): string[] {
    return Array.from(this.flakyTests);
  }

  /**
   * Generate stability report
   */
  static generateReport(): string {
    const report: string[] = [];
    report.push('# E2E Test Stability Report\n');
    report.push(`Generated: ${new Date().toISOString()}\n`);

    // Overall statistics
    let totalTests = 0;
    let totalFlaky = this.flakyTests.size;

    this.testResults.forEach(() => {
      totalTests++;
    });

    const overallFlakyRate = totalTests > 0 ? totalFlaky / totalTests : 0;

    report.push(`## Overall Statistics`);
    report.push(`- Total unique tests: ${totalTests}`);
    report.push(`- Flaky tests: ${totalFlaky}`);
    report.push(`- Flaky rate: ${(overallFlakyRate * 100).toFixed(2)}%`);
    report.push(`- Target flaky rate: ${(this.TARGET_FLAKY_RATE * 100).toFixed(1)}%\n`);

    // Flaky tests detail
    if (totalFlaky > 0) {
      report.push(`## Flaky Tests (need attention)`);
      this.flakyTests.forEach(testKey => {
        report.push(`- ${testKey}`);
      });
      report.push('');
    }

    // Slow tests (> 90 seconds)
    report.push(`## Slow Tests (> 90 seconds)`);
    let hasSlowTests = false;
    this.testResults.forEach((results, key) => {
      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      if (avgDuration > 90000) {
        report.push(`- ${key}: ${(avgDuration / 1000).toFixed(1)}s avg`);
        hasSlowTests = true;
      }
    });
    if (!hasSlowTests) {
      report.push('- None detected ✓');
    }
    report.push('');

    return report.join('\n');
  }

  /**
   * Save report to file
   */
  static saveReport(filePath: string = './e2e/reports/stability-report.md'): void {
    const report = this.generateReport();
    const fs = require('fs');
    const path = require('path');

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, report);
    console.log(`Stability report saved to ${filePath}`);
  }

  /**
   * Reset all data
   */
  static reset(): void {
    this.testResults.clear();
    this.flakyTests.clear();
  }
}
