#!/usr/bin/env node

/**
 * Bottleneck Analysis Tool
 * Analyzes k6 test results to identify performance bottlenecks
 *
 * Usage: node bottleneck-analysis.js <summary-json-path>
 */

/* eslint-disable @typescript-eslint/no-var-requires */

const fs = require('fs');
const path = require('path');

// Threshold configuration
const THRESHOLDS = {
  api: {
    healthP95: 50,
    userP95: 150,
    agentsP95: 200,
    matchesP95: 300,
    searchP95: 400,
    errorRate: 0.01,
  },
  e2e: {
    authP95: 1000,
    browseP95: 2000,
    searchP95: 3000,
    matchP95: 2000,
    chatP95: 1500,
    errorRate: 0.05,
    scenarioP95: 3000,
  },
  peak: {
    responseTimeP95: 2000,
    errorRate: 0.05,
  },
};

// Bottleneck severity levels
const SEVERITY = {
  CRITICAL: 'CRITICAL',
  WARNING: 'WARNING',
  INFO: 'INFO',
};

function analyzeMetric(name, value, target, unit = 'ms') {
  if (value === undefined || value === null) return null;

  const ratio = value / target;
  let severity;
  if (ratio > 2) severity = SEVERITY.CRITICAL;
  else if (ratio > 1.2) severity = SEVERITY.WARNING;
  else severity = SEVERITY.INFO;

  return {
    metric: name,
    value,
    target,
    unit,
    ratio: ratio.toFixed(2),
    severity,
    message:
      ratio > 1
        ? `${name}: ${value.toFixed(0)}${unit} exceeds target ${target}${unit} (${ratio.toFixed(2)}x)`
        : `${name}: ${value.toFixed(0)}${unit} within target ${target}${unit}`,
  };
}

function analyzeBaselineResults(data) {
  const findings = [];
  const metrics = data.metrics || {};

  // Health check
  const healthP95 = metrics.health_latency?.values?.['p(95)'];
  findings.push(analyzeMetric('Health P95', healthP95, THRESHOLDS.api.healthP95));

  // User endpoints
  const userP95 = metrics.user_latency?.values?.['p(95)'];
  findings.push(analyzeMetric('User P95', userP95, THRESHOLDS.api.userP95));

  // Agent list
  const agentsP95 = metrics.agents_latency?.values?.['p(95)'];
  findings.push(analyzeMetric('Agents P95', agentsP95, THRESHOLDS.api.agentsP95));

  // Matches
  const matchesP95 = metrics.matches_latency?.values?.['p(95)'];
  findings.push(analyzeMetric('Matches P95', matchesP95, THRESHOLDS.api.matchesP95));

  // Search
  const searchP95 = metrics.search_latency?.values?.['p(95)'];
  findings.push(analyzeMetric('Search P95', searchP95, THRESHOLDS.api.searchP95));

  // Error rate
  const errorRate = metrics.http_req_failed?.values?.rate;
  findings.push(analyzeMetric('Error Rate', errorRate, THRESHOLDS.api.errorRate, 'ratio'));

  return findings.filter(Boolean);
}

function analyzeE2EResults(data) {
  const findings = [];
  const metrics = data.metrics || {};

  // Auth
  findings.push(
    analyzeMetric('Auth P95', metrics.auth_duration?.values?.['p(95)'], THRESHOLDS.e2e.authP95)
  );
  // Browse
  findings.push(
    analyzeMetric(
      'Browse P95',
      metrics.browse_duration?.values?.['p(95)'],
      THRESHOLDS.e2e.browseP95
    )
  );
  // Search
  findings.push(
    analyzeMetric(
      'Search P95',
      metrics.search_duration?.values?.['p(95)'],
      THRESHOLDS.e2e.searchP95
    )
  );
  // Match
  findings.push(
    analyzeMetric('Match P95', metrics.match_duration?.values?.['p(95)'], THRESHOLDS.e2e.matchP95)
  );
  // Chat
  findings.push(
    analyzeMetric('Chat P95', metrics.chat_duration?.values?.['p(95)'], THRESHOLDS.e2e.chatP95)
  );
  // Error rate
  findings.push(
    analyzeMetric(
      'E2E Error Rate',
      metrics.e2e_errors?.values?.rate,
      THRESHOLDS.e2e.errorRate,
      'ratio'
    )
  );
  // Scenario duration
  findings.push(
    analyzeMetric(
      'Scenario P95',
      metrics.scenario_duration?.values?.['p(95)'],
      THRESHOLDS.e2e.scenarioP95
    )
  );

  return findings.filter(Boolean);
}

function analyzePeakResults(data) {
  const findings = [];
  const metrics = data.metrics || {};

  findings.push(
    analyzeMetric(
      'Peak Response P95',
      metrics.peak_response_time?.values?.['p(95)'],
      THRESHOLDS.peak.responseTimeP95
    )
  );
  findings.push(
    analyzeMetric(
      'Peak Error Rate',
      metrics.peak_error_rate?.values?.rate,
      THRESHOLDS.peak.errorRate,
      'ratio'
    )
  );

  return findings.filter(Boolean);
}

function generateReport(findings, testType) {
  const critical = findings.filter(f => f.severity === SEVERITY.CRITICAL);
  const warnings = findings.filter(f => f.severity === SEVERITY.WARNING);
  const passing = findings.filter(f => f.severity === SEVERITY.INFO);

  const lines = [
    `# Bottleneck Analysis Report - ${testType}`,
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Summary',
    `- Critical: ${critical.length}`,
    `- Warning: ${warnings.length}`,
    `- Passing: ${passing.length}`,
    '',
  ];

  if (critical.length > 0) {
    lines.push('## Critical Bottlenecks');
    for (const f of critical) {
      lines.push(
        `- **${f.metric}**: ${f.value?.toFixed(0) ?? 'N/A'}${f.unit} (target: ${f.target}${f.unit}, ratio: ${f.ratio}x)`
      );
    }
    lines.push('');
  }

  if (warnings.length > 0) {
    lines.push('## Warnings');
    for (const f of warnings) {
      lines.push(
        `- **${f.metric}**: ${f.value?.toFixed(0) ?? 'N/A'}${f.unit} (target: ${f.target}${f.unit}, ratio: ${f.ratio}x)`
      );
    }
    lines.push('');
  }

  lines.push('## Recommendations');

  if (critical.length > 0) {
    lines.push('');
    lines.push('### Immediate Actions Required');
    for (const f of critical) {
      if (f.metric.includes('P95') || f.metric.includes('Response')) {
        lines.push(
          `- **${f.metric}**: Investigate slow database queries, add caching, or optimize API handler`
        );
      }
      if (f.metric.includes('Error Rate')) {
        lines.push(
          `- **${f.metric}**: Check server logs for errors, verify infrastructure capacity`
        );
      }
    }
  }

  if (warnings.length > 0) {
    lines.push('');
    lines.push('### Optimization Opportunities');
    for (const f of warnings) {
      if (f.metric.includes('Search')) {
        lines.push(
          `- **${f.metric}**: Consider adding database indexes, implementing result caching`
        );
      }
      if (f.metric.includes('Match')) {
        lines.push(`- **${f.metric}**: Optimize matching algorithm, add Redis caching for results`);
      }
    }
  }

  lines.push('');
  lines.push('## Passing Metrics');
  for (const f of passing) {
    lines.push(`- ${f.metric}: ${f.value?.toFixed(0) ?? 'N/A'}${f.unit} (within target)`);
  }

  return lines.join('\n');
}

// Main
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // Generate combined report from all available results
    const resultsDir = path.join(__dirname, 'results');
    const allFindings = [];

    const testTypes = [
      {
        file: 'api-baseline-test-*-summary.json',
        analyzer: analyzeBaselineResults,
        name: 'Baseline',
      },
      {
        file: 'e2e-scenario-test-*-summary.json',
        analyzer: analyzeE2EResults,
        name: 'E2E Scenario',
      },
      { file: 'peak-load-test-*-summary.json', analyzer: analyzePeakResults, name: 'Peak Load' },
    ];

    if (!fs.existsSync(resultsDir)) {
      console.log('No test results directory found. Run performance tests first.');
      console.log('Usage: node bottleneck-analysis.js <summary-json-path>');
      process.exit(0);
    }

    for (const { file, analyzer, name } of testTypes) {
      const prefix = file.split('*')[0];
      const suffix = file.split('*')[1];
      const files = fs
        .readdirSync(resultsDir)
        .filter(f => f.startsWith(prefix) && f.endsWith(suffix));
      if (files.length > 0) {
        const latest = files.sort().pop();
        try {
          const data = JSON.parse(fs.readFileSync(path.join(resultsDir, latest), 'utf-8'));
          allFindings.push({ name, findings: analyzer(data) });
        } catch (e) {
          console.error(`Failed to analyze ${latest}: ${e.message}`);
        }
      }
    }

    if (allFindings.length === 0) {
      console.log('No test results found. Run performance tests first.');
      console.log('Usage: node bottleneck-analysis.js <summary-json-path>');
      process.exit(0);
    }

    // Generate combined report
    let report = '# BridgeAI Performance Bottleneck Analysis\n\n';
    for (const { name, findings } of allFindings) {
      report += generateReport(findings, name) + '\n\n---\n\n';
    }

    const reportPath = path.join(__dirname, '..', '..', 'perf', 'bottleneck-report.md');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, report);
    console.log(report);
    console.log(`\nReport saved to: ${reportPath}`);
  } else {
    // Analyze specific file
    const filePath = args[0];
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const findings = analyzeBaselineResults(data);
    const report = generateReport(findings, 'Custom Analysis');
    console.log(report);
  }
}

main();
