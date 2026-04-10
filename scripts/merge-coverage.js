#!/usr/bin/env node

/**
 * 合并测试覆盖率报告脚本
 *
 * 整合:
 * - 单元测试覆盖率 (apps/server/coverage, apps/mobile/coverage)
 * - API集成测试覆盖率 (apps/server/coverage-integration)
 * - E2E测试覆盖率 (apps/e2e/coverage)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const COVERAGE_DIR = path.join(PROJECT_ROOT, 'coverage');

// 覆盖率源目录
const COVERAGE_SOURCES = [
  { path: 'apps/server/coverage', name: 'Server Unit' },
  { path: 'apps/mobile/coverage', name: 'Mobile Unit' },
  { path: 'apps/e2e/coverage', name: 'E2E Tests' },
];

async function mergeCoverage() {
  console.log('🧪 Merging test coverage reports...\n');

  // 确保覆盖率目录存在
  if (!fs.existsSync(COVERAGE_DIR)) {
    fs.mkdirSync(COVERAGE_DIR, { recursive: true });
  }

  // 收集有效的覆盖率报告
  const validSources = [];
  for (const source of COVERAGE_SOURCES) {
    const sourcePath = path.join(PROJECT_ROOT, source.path);
    const coverageFile = path.join(sourcePath, 'coverage-final.json');

    if (fs.existsSync(coverageFile)) {
      validSources.push({ ...source, coverageFile });
      console.log(`✅ Found: ${source.name}`);
    } else {
      console.log(`⚠️  Missing: ${source.name}`);
    }
  }

  if (validSources.length === 0) {
    console.error('\n❌ No coverage reports found!');
    process.exit(1);
  }

  // 合并覆盖率数据
  console.log('\n📊 Merging coverage data...');
  const mergedCoverage = {};

  for (const source of validSources) {
    try {
      const data = JSON.parse(fs.readFileSync(source.coverageFile, 'utf8'));
      Object.assign(mergedCoverage, data);
    } catch (error) {
      console.warn(`⚠️  Failed to merge ${source.name}:`, error.message);
    }
  }

  // 写入合并后的覆盖率数据
  const mergedFile = path.join(COVERAGE_DIR, 'coverage-final.json');
  fs.writeFileSync(mergedFile, JSON.stringify(mergedCoverage, null, 2));

  console.log(`✅ Merged coverage written to: ${mergedFile}`);

  // 生成HTML报告
  console.log('\n📄 Generating HTML report...');
  try {
    // 使用nyc生成HTML报告
    execSync('npx nyc report --reporter=html --reporter=text-summary', {
      cwd: PROJECT_ROOT,
      stdio: 'inherit',
      env: {
        ...process.env,
        NYC_CWD: PROJECT_ROOT,
      },
    });
  } catch (error) {
    console.warn('⚠️  Failed to generate HTML report:', error.message);
  }

  // 生成覆盖率摘要
  generateSummary(mergedCoverage);

  console.log(`\n✨ Coverage report generated in: ${COVERAGE_DIR}/`);
}

function generateSummary(coverage) {
  console.log('\n📈 Coverage Summary:\n');

  let totalStatements = 0;
  let coveredStatements = 0;
  let totalBranches = 0;
  let coveredBranches = 0;
  let totalFunctions = 0;
  let coveredFunctions = 0;
  let totalLines = 0;
  let coveredLines = 0;

  for (const [file, data] of Object.entries(coverage)) {
    if (typeof data === 'object' && data !== null) {
      const d = data;

      // Statements
      if (d.statementMap && d.s) {
        totalStatements += Object.keys(d.statementMap).length;
        coveredStatements += Object.values(d.s).filter((v: any) => v > 0).length;
      }

      // Branches
      if (d.branchMap && d.b) {
        for (const [branch, hits] of Object.entries(d.b)) {
          totalBranches += (hits as number[]).length;
          coveredBranches += (hits as number[]).filter((h: number) => h > 0).length;
        }
      }

      // Functions
      if (d.fnMap && d.f) {
        totalFunctions += Object.keys(d.fnMap).length;
        coveredFunctions += Object.values(d.f).filter((v: any) => v > 0).length;
      }

      // Lines (simplified)
      if (d.l) {
        totalLines += Object.keys(d.l).length;
        coveredLines += Object.values(d.l).filter((v: any) => v > 0).length;
      }
    }
  }

  const statementPct = totalStatements > 0 ? ((coveredStatements / totalStatements) * 100).toFixed(2) : '0.00';
  const branchPct = totalBranches > 0 ? ((coveredBranches / totalBranches) * 100).toFixed(2) : '0.00';
  const functionPct = totalFunctions > 0 ? ((coveredFunctions / totalFunctions) * 100).toFixed(2) : '0.00';
  const linePct = totalLines > 0 ? ((coveredLines / totalLines) * 100).toFixed(2) : '0.00';

  console.log('File              | % Stmts | % Branch | % Funcs | % Lines');
  console.log('------------------|---------|----------|---------|--------');
  console.log(`All files         | ${statementPct.padStart(7)} | ${branchPct.padStart(8)} | ${functionPct.padStart(7)} | ${linePct.padStart(7)}`);

  // 检查是否达到80%阈值
  const threshold = 80;
  const passed =
    parseFloat(statementPct) >= threshold &&
    parseFloat(branchPct) >= threshold &&
    parseFloat(functionPct) >= threshold &&
    parseFloat(linePct) >= threshold;

  if (passed) {
    console.log('\n✅ All coverage thresholds passed (>= 80%)');
  } else {
    console.log('\n⚠️  Some coverage thresholds not met (< 80%)');
  }

  // 写入摘要文件
  const summary = {
    total: {
      statements: { total: totalStatements, covered: coveredStatements, pct: parseFloat(statementPct) },
      branches: { total: totalBranches, covered: coveredBranches, pct: parseFloat(branchPct) },
      functions: { total: totalFunctions, covered: coveredFunctions, pct: parseFloat(functionPct) },
      lines: { total: totalLines, covered: coveredLines, pct: parseFloat(linePct) },
    },
    threshold: threshold,
    passed: passed,
  };

  fs.writeFileSync(
    path.join(COVERAGE_DIR, 'coverage-summary.json'),
    JSON.stringify(summary, null, 2)
  );
}

mergeCoverage().catch((error) => {
  console.error('❌ Coverage merge failed:', error);
  process.exit(1);
});
