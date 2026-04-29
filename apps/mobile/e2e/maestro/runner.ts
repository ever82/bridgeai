#!/usr/bin/env ts-node
/**
 * Maestro E2E Test Runner - 统一入口
 * 支持自动环境检查、模拟器管理、应用构建、测试执行和报告生成
 *
 * 用法:
 *   npx ts-node e2e/maestro/runner.ts [options]
 *
 * 选项:
 *   --layer 0|1|2              测试层级 (默认: 2)
 *                              0 = 健康检查 (5s), 1 = Playwright (未来), 2 = Maestro (默认)
 *   --platform ios|android     目标平台 (默认: ios)
 *   --flow <name>              运行指定 flow (默认: 运行所有)
 *   --issue <ISSUE-XXX>        运行关联到指定 issue 的 flows
 *   --dev                      开发模式: 假设应用已运行，只执行 Maestro 测试
 *   --build                    构建模式: 自动构建并安装应用后运行测试
 *   --install                  只安装 Maestro CLI
 *   --screenshot-on-failure    失败时自动截图
 *   --stability-report         运行时输出稳定性和flaky测试报告
 *   --timeout <ms>             全局超时 (默认: 120000)
 *
 * 示例:
 *   npm run e2e:l0              # 环境健康检查 (5秒)
 *   npm run e2e:l2              # 运行所有 Maestro flow
 *   npm run e2e:l2:dev          # dev 模式 (app 已运行)
 *   npm run e2e:debug           # 失败自动截图
 *   npx ts-node e2e/maestro/runner.ts --layer 2 --issue ISSUE-AUTH-001 --build
 */

import { execSync, spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

import { StabilityMonitor } from '../support/stability-monitor';

import { getShard } from './test-isolation';

// ─── 配置 ──────────────────────────────────────────────────────────

const MAESTRO_DIR = path.join(__dirname);
const FLOWS_DIR = path.join(MAESTRO_DIR, 'flows');
const REPORT_DIR = path.join(MAESTRO_DIR, 'reports');
const PROJECT_ROOT = path.join(MAESTRO_DIR, '..', '..');

const APP_ID = 'com.bridgeai.mobile';
const DEFAULT_TIMEOUT = 120000;
const DEFAULT_PLATFORM: Platform = 'ios';

type Platform = 'ios' | 'android';

interface FlowMeta {
  file: string;
  name: string;
  issues: string[];
  description: string;
}

interface RunResult {
  flow: string;
  passed: boolean;
  duration: number;
  output: string;
  error?: string;
  screenshot?: string;
}

interface RunReport {
  timestamp: string;
  layer: number;
  platform: Platform;
  total: number;
  passed: number;
  failed: number;
  duration: number;
  results: RunResult[];
  summary: string;
}

type Layer = 0 | 1 | 2;

// ─── CLI 解析 ──────────────────────────────────────────────────────

function parseArgs(): {
  layer: Layer;
  platform: Platform;
  flow?: string;
  issue?: string;
  dev: boolean;
  build: boolean;
  install: boolean;
  report: boolean;
  screenshotOnFailure: boolean;
  stabilityReport: boolean;
  timeout: number;
  skipBackend: boolean;
  shardIndex?: number;
  totalShards?: number;
} {
  const args = process.argv.slice(2);
  const result = {
    layer: 2 as Layer,
    platform: DEFAULT_PLATFORM,
    flow: undefined as string | undefined,
    issue: undefined as string | undefined,
    dev: false,
    build: false,
    install: false,
    report: false,
    stabilityReport: false,
    screenshotOnFailure: false,
    timeout: DEFAULT_TIMEOUT,
    skipBackend: false,
    shardIndex: undefined,
    totalShards: undefined,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--layer') {
      const val = parseInt(args[++i], 10);
      result.layer = (val === 0 || val === 1 || val === 2 ? val : 2) as Layer;
      continue;
    }
    switch (arg) {
      case '--platform':
        result.platform = (args[++i] as Platform) || 'ios';
        break;
      case '--flow':
        result.flow = args[++i];
        break;
      case '--issue':
        result.issue = args[++i]?.toUpperCase();
        break;
      case '--dev':
        result.dev = true;
        break;
      case '--build':
        result.build = true;
        break;
      case '--install':
        result.install = true;
        break;
      case '--report':
        result.report = true;
        break;
      case '--screenshot-on-failure':
        result.screenshotOnFailure = true;
        break;
      case '--stability-report':
        result.stabilityReport = true;
        break;
      case '--timeout':
        result.timeout = parseInt(args[++i], 10) || DEFAULT_TIMEOUT;
        break;
      case '--skip-backend':
        result.skipBackend = true;
        break;
      case '--shard': {
        const shardParts = args[++i]?.split('/');
        if (shardParts && shardParts.length === 2) {
          result.shardIndex = parseInt(shardParts[0], 10);
          result.totalShards = parseInt(shardParts[1], 10);
        }
        break;
      }
    }
  }

  return result;
}

// ─── 环境检查 ──────────────────────────────────────────────────────

function checkMaestroInstalled(): boolean {
  try {
    const maestro = getMaestroCmd();
    execSync(`${maestro} --version`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function checkXcode(): boolean {
  try {
    execSync('xcodebuild -version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function checkSimulator(): boolean {
  try {
    const output = execSync('xcrun simctl list devices available --json', {
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    const devices = JSON.parse(output);
    const hasDevice = Object.values(devices.devices).some((list: unknown[]) => list.length > 0);
    return hasDevice;
  } catch {
    return false;
  }
}

function getBootedSimulator(): string | null {
  try {
    const output = execSync('xcrun simctl list devices booted --json', {
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    const data = JSON.parse(output);
    for (const [_runtime, list] of Object.entries(data.devices)) {
      for (const device of list as Record<string, string>[]) {
        if (device.state === 'Booted') {
          return device.udid;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

function getDefaultSimulator(): string | null {
  try {
    const output = execSync('xcrun simctl list devices available --json', {
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    const data = JSON.parse(output);
    // 优先找 iPhone 15/16
    for (const [runtime, list] of Object.entries(data.devices)) {
      if (!runtime.includes('iOS')) continue;
      for (const device of list as Record<string, string>[]) {
        if (device.name?.includes('iPhone 16') || device.name?.includes('iPhone 15')) {
          return device.udid;
        }
      }
    }
    //  fallback: 任意 iPhone
    for (const [_runtime, list] of Object.entries(data.devices)) {
      if (!_runtime.includes('iOS')) continue;
      for (const device of list as Record<string, string>[]) {
        if (device.name?.includes('iPhone')) {
          return device.udid;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ─── 模拟器管理 ────────────────────────────────────────────────────

function bootSimulator(udid: string): boolean {
  try {
    console.log(`  📱 Booting simulator ${udid}...`);
    execSync(`xcrun simctl boot "${udid}"`, { stdio: 'pipe' });
    // 等待模拟器完全启动
    let attempts = 0;
    while (attempts < 30) {
      const booted = getBootedSimulator();
      if (booted === udid) {
        console.log('  ✅ Simulator ready');
        return true;
      }
      execSync('sleep 1');
      attempts++;
    }
    return false;
  } catch {
    return false;
  }
}

function openSimulatorApp(): void {
  try {
    execSync('open -a Simulator', { stdio: 'pipe' });
  } catch {
    // ignore
  }
}

function ensureSimulator(): string | null {
  const booted = getBootedSimulator();
  if (booted) {
    console.log(`  ✅ Using booted simulator: ${booted}`);
    // Ensure no other simulators are also booted - this confuses Maestro
    shutdownExtraSimulators(booted);
    return booted;
  }

  const defaultSim = getDefaultSimulator();
  if (!defaultSim) {
    console.error('  ❌ No available iOS simulator found');
    console.error('     Run: xcrun simctl list devices');
    return null;
  }

  openSimulatorApp();
  if (!bootSimulator(defaultSim)) {
    console.error('  ❌ Failed to boot simulator');
    return null;
  }

  return defaultSim;
}

// ─── 应用管理 ──────────────────────────────────────────────────────

function isAppInstalled(udid: string): boolean {
  try {
    const output = execSync(`xcrun simctl listapps "${udid}"`, {
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    return output.includes(APP_ID);
  } catch {
    return false;
  }
}

function killConflictingProcesses(): void {
  // Kill any existing expo/metro processes to prevent conflicts
  try {
    execSync('pkill -f "expo run:ios" 2>/dev/null || true', { stdio: 'pipe' });
    execSync('pkill -f "react-native start" 2>/dev/null || true', { stdio: 'pipe' });
    execSync('pkill -f "metro" 2>/dev/null || true', { stdio: 'pipe' });
    execSync('sleep 2', { stdio: 'pipe' });
    console.log('  🧹 Cleaned up conflicting processes');
  } catch {
    // ignore
  }
}

function shutdownExtraSimulators(keepUdid: string): void {
  // If multiple simulators are booted, shut down all except the one we want to use
  try {
    const output = execSync('xcrun simctl list devices booted --json', {
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    const data = JSON.parse(output);
    for (const [_runtime, list] of Object.entries(data.devices)) {
      for (const device of list as Record<string, string>[]) {
        if (device.udid !== keepUdid && device.state === 'Booted') {
          console.log(`  🛑 Shutting down extra simulator: ${device.name} (${device.udid})`);
          try {
            execSync(`xcrun simctl shutdown "${device.udid}"`, { stdio: 'pipe' });
          } catch {
            // ignore
          }
        }
      }
    }
  } catch {
    // ignore
  }
}

function buildAndInstallApp(platform: Platform): boolean {
  console.log(`\n🔨 Building app for ${platform}...`);
  killConflictingProcesses();

  try {
    if (platform === 'ios') {
      // Use --no-bundler is NOT set - let expo bundle JS into the app.
      // This way the app works without needing a Metro server.
      execSync('npx expo run:ios --scheme BridgeAI --no-install', {
        cwd: PROJECT_ROOT,
        stdio: 'inherit',
        timeout: 300000,
      });
    } else {
      execSync('npx expo run:android --no-install', {
        cwd: PROJECT_ROOT,
        stdio: 'inherit',
        timeout: 300000,
      });
    }
    console.log('  ✅ Build complete (JS bundled into app)');
    return true;
  } catch (error: unknown) {
    console.error('  ❌ Build failed:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

// ─── Flow 解析 ─────────────────────────────────────────────────────

function parseFlowMeta(filePath: string): FlowMeta {
  const content = fs.readFileSync(filePath, 'utf-8');
  const name = path.basename(filePath, '.yaml');
  const issues: string[] = [];
  let description = '';

  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# issue:')) {
      issues.push(trimmed.replace('# issue:', '').trim().toUpperCase());
    }
    if (trimmed.startsWith('# description:')) {
      description = trimmed.replace('# description:', '').trim();
    }
  }

  return { file: filePath, name, issues, description };
}

function getAllFlows(): FlowMeta[] {
  if (!fs.existsSync(FLOWS_DIR)) return [];
  return fs
    .readdirSync(FLOWS_DIR)
    .filter(f => f.endsWith('.yaml'))
    .map(f => parseFlowMeta(path.join(FLOWS_DIR, f)));
}

function filterFlows(flows: FlowMeta[], flowName?: string, issueId?: string): FlowMeta[] {
  if (flowName) {
    return flows.filter(f => f.name === flowName || f.name === `${flowName}-flow`);
  }
  if (issueId) {
    return flows.filter(f => f.issues.includes(issueId));
  }
  return flows;
}

// ─── Flow 执行 ─────────────────────────────────────────────────────

function takeScreenshot(flowName: string): string | undefined {
  const booted = getBootedSimulator();
  if (!booted) return undefined;

  const screenshotDir = path.join(REPORT_DIR, 'screenshots');
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const screenshotPath = path.join(screenshotDir, `${flowName}-${Date.now()}.png`);
  try {
    execSync(`xcrun simctl io booted screenshot "${screenshotPath}"`, { stdio: 'pipe' });
    console.log(`     📸 Screenshot saved: ${screenshotPath}`);
    return screenshotPath;
  } catch {
    return undefined;
  }
}

function getMaestroCmd(): string {
  // Use local Maestro path if not in PATH
  try {
    execSync('maestro --version', { stdio: 'pipe' });
    return 'maestro';
  } catch {
    const localPath = path.join(process.env.HOME || '', '.maestro', 'bin', 'maestro');
    return `"${localPath}"`;
  }
}

const MAX_RETRIES = 2; // Max retry attempts on test failure

function runFlow(
  flowPath: string,
  platform: Platform,
  timeout: number,
  screenshotOnFailure: boolean
): RunResult {
  const flowName = path.basename(flowPath, '.yaml');

  console.log(`\n  🔄 Running: ${flowName}`);

  let lastResult: RunResult = { flow: flowName, passed: false, duration: 0, output: '' };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      console.log(`     🔁 Retry ${attempt}/${MAX_RETRIES}...`);
    }

    const attemptStart = Date.now();

    try {
      const maestro = getMaestroCmd();
      const bootedUdid = getBootedSimulator();
      const deviceArg = bootedUdid ? `--device-id "${bootedUdid}"` : '';
      const outputFile = path.join(REPORT_DIR, `${flowName}-${Date.now()}.html`);
      const cmd =
        `${maestro} test "${flowPath}" --format HTML --output "${outputFile}" ${deviceArg}`.trim();
      const output = execSync(cmd, {
        stdio: 'pipe',
        encoding: 'utf-8',
        timeout,
        cwd: MAESTRO_DIR,
      });

      const duration = Date.now() - attemptStart;
      console.log(`     ✅ Passed (${duration}ms)`);

      return {
        flow: flowName,
        passed: true,
        duration,
        output,
      };
    } catch (error: unknown) {
      const duration = Date.now() - attemptStart;
      const output = (error as { stdout?: string }).stdout || '';
      const errMsg = error instanceof Error ? error.message : String(error);

      console.log(`     ❌ Failed (${duration}ms)`);
      if (errMsg.includes('timeout')) {
        console.log(`     ⚠️  Timeout after ${timeout}ms`);
      }

      let screenshot: string | undefined;
      if (screenshotOnFailure) {
        screenshot = takeScreenshot(flowName);
      }

      lastResult = {
        flow: flowName,
        passed: false,
        duration,
        output,
        error: errMsg,
        screenshot,
      };

      // If we have retries left, continue the loop; otherwise return the failure
      if (attempt < MAX_RETRIES) {
        continue;
      }
    }
  }

  return lastResult;
}

// ─── L0 健康检查 ──────────────────────────────────────────────────

function checkJava(): boolean {
  try {
    const version = execSync('java -version 2>&1', { stdio: 'pipe', encoding: 'utf-8' });
    const match = version.match(/version "(\d+)\./);
    const major = match ? parseInt(match[1]) : 0;
    return major >= 17;
  } catch {
    return false;
  }
}

function checkIOSProject(): boolean {
  try {
    const iosDir = path.join(PROJECT_ROOT, 'ios');
    const hasWorkspace = fs.existsSync(path.join(iosDir, 'BridgeAI.xcworkspace'));
    const hasProject = fs.existsSync(path.join(iosDir, 'BridgeAI.xcodeproj'));
    return hasWorkspace || hasProject;
  } catch {
    return false;
  }
}

function runLayer0(): boolean {
  console.log('\n🔍 L0 Environment Health Check');
  console.log('   ────────────────────────────');

  const checks: { name: string; pass: boolean; fix: string }[] = [
    {
      name: 'Maestro CLI',
      pass: checkMaestroInstalled(),
      fix: 'brew install maestro or curl -s "https://get.maestro.mobile.dev" | bash',
    },
    {
      name: 'Java 17+',
      pass: checkJava(),
      fix: 'Install JDK 17: brew install openjdk@17 (then rehash)',
    },
    {
      name: 'Xcode',
      pass: checkXcode(),
      fix: 'Install Xcode from App Store',
    },
    {
      name: 'iOS Simulator',
      pass: checkSimulator(),
      fix: 'Run: xcrun simctl list devices',
    },
    {
      name: 'iOS Project (workspace)',
      pass: checkIOSProject(),
      fix: 'cd apps/mobile && npx expo prebuild --platform ios',
    },
  ];

  let allOk = true;
  for (const check of checks) {
    if (check.pass) {
      if (check.name === 'Maestro CLI') {
        // Show version if available
        try {
          const maestro = getMaestroCmd();
          const version = execSync(`${maestro} --version`, {
            encoding: 'utf-8',
            stdio: 'pipe',
          }).trim();
          console.log(`   ✅ ${check.name}: ${version}`);
          continue;
        } catch {
          // expected - version check may fail, skip
        }
      }
      console.log(`   ✅ ${check.name}`);
    } else {
      console.log(`   ❌ ${check.name}`);
      console.log(`      Fix: ${check.fix}`);
      allOk = false;
    }
  }

  // Environment variables — auto-fix common locations
  const home = process.env.HOME || '';
  const defaultJavaHome = path.join(
    home,
    'Library',
    'Java',
    'JavaVirtualMachines',
    'temurin-17.jdk',
    'Contents',
    'Home'
  );
  const defaultMaestroBin = path.join(home, '.maestro', 'bin');

  if (!process.env.JAVA_HOME && fs.existsSync(defaultJavaHome)) {
    process.env.JAVA_HOME = defaultJavaHome;
  }
  if (process.env.JAVA_HOME) {
    console.log(`   ✅ JAVA_HOME: ${process.env.JAVA_HOME}`);
  } else {
    console.log(`   ⚠️  JAVA_HOME not set (may be needed by Maestro)`);
    console.log(`      Fix: export JAVA_HOME="$(/usr/libexec/java_home)"`);
  }

  if (!process.env.PATH?.includes('.maestro') && fs.existsSync(defaultMaestroBin)) {
    process.env.PATH = `${process.env.PATH}:${defaultMaestroBin}`;
  }
  if (process.env.PATH?.includes('.maestro')) {
    console.log(`   ✅ Maestro in PATH`);
  } else {
    console.log(`   ⚠️  Maestro not in PATH`);
    console.log(`      Fix: export PATH="$PATH:${defaultMaestroBin}"`);
  }

  console.log('');
  if (allOk) {
    console.log('✅ All L0 checks passed — environment is ready');
  } else {
    console.log('❌ Some L0 checks failed — fix the issues above before running L2');
  }
  return allOk;
}

// ─── 报告生成 ──────────────────────────────────────────────────────

function generateReport(report: RunReport): void {
  ensureReportDir();

  const jsonPath = path.join(REPORT_DIR, `report-${Date.now()}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  const htmlPath = path.join(REPORT_DIR, `report-${Date.now()}.html`);
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Maestro E2E Report</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; }
    h1 { color: #333; }
    .summary { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .pass { color: #28a745; }
    .fail { color: #dc3545; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f8f9fa; font-weight: 600; }
    .status { font-weight: bold; }
    .detail { color: #666; font-size: 0.9em; }
    .screenshot { color: #007aff; font-size: 0.85em; }
  </style>
</head>
<body>
  <h1>Maestro E2E Test Report</h1>
  <div class="summary">
    <p><strong>Layer:</strong> ${report.layer} (${report.layer === 0 ? 'Health Check' : report.layer === 1 ? 'Playwright' : 'Maestro'})</p>
    <p><strong>Platform:</strong> ${report.platform}</p>
    <p><strong>Time:</strong> ${report.timestamp}</p>
    <p><strong>Total:</strong> ${report.total} | <span class="pass">Passed: ${report.passed}</span> | <span class="fail">Failed: ${report.failed}</span></p>
    <p><strong>Duration:</strong> ${report.duration}ms</p>
  </div>
  <table>
    <tr><th>Flow</th><th>Status</th><th>Duration</th><th>Details</th><th>Screenshot</th></tr>
    ${report.results
      .map(
        r => `
    <tr>
      <td>${r.flow}</td>
      <td class="status ${r.passed ? 'pass' : 'fail'}">${r.passed ? 'PASS' : 'FAIL'}</td>
      <td>${r.duration}ms</td>
      <td class="detail">${r.error ? r.error.substring(0, 100) + '...' : 'OK'}</td>
      <td class="screenshot">${r.screenshot ? `<a href="${path.relative(REPORT_DIR, r.screenshot)}">view</a>` : '-'}</td>
    </tr>`
      )
      .join('')}
  </table>
</body>
</html>`;
  fs.writeFileSync(htmlPath, html);

  console.log(`\n📊 Reports saved:`);
  console.log(`   JSON: ${jsonPath}`);
  console.log(`   HTML: ${htmlPath}`);
}

function ensureReportDir(): void {
  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }
}

// ─── 安装 ──────────────────────────────────────────────────────────

function installMaestro(): void {
  console.log('\n📦 Installing Maestro CLI...');
  try {
    if (process.platform === 'darwin') {
      execSync('brew install maestro', { stdio: 'inherit' });
    } else {
      execSync('curl -s "https://get.maestro.mobile.dev" | bash', { stdio: 'inherit' });
    }
    console.log('✅ Maestro installed');
  } catch (error: unknown) {
    console.error(
      '❌ Installation failed:',
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

// ─── 环境诊断 ──────────────────────────────────────────────────────

function diagnose(platform: Platform): boolean {
  console.log('\n🔍 Environment Check');
  console.log('   ──────────────────');

  let ok = true;

  // Maestro
  if (checkMaestroInstalled()) {
    const version = execSync(`${getMaestroCmd()} --version`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim();
    console.log(`   ✅ Maestro: ${version}`);
  } else {
    console.log('   ❌ Maestro: not installed');
    console.log('      Fix: npm run e2e:install');
    ok = false;
  }

  if (platform === 'ios') {
    // Xcode
    if (checkXcode()) {
      const version = execSync('xcodebuild -version', { encoding: 'utf-8', stdio: 'pipe' })
        .split('\n')[0]
        .trim();
      console.log(`   ✅ Xcode: ${version}`);
    } else {
      console.log('   ❌ Xcode: not found');
      console.log('      Fix: Install Xcode from App Store');
      ok = false;
    }

    // Simulator
    if (checkSimulator()) {
      const booted = getBootedSimulator();
      const defaultSim = getDefaultSimulator();
      if (booted) {
        console.log(`   ✅ Simulator: booted (${booted})`);
      } else if (defaultSim) {
        console.log(`   ⚠️  Simulator: available but not booted (${defaultSim})`);
      } else {
        console.log('   ❌ Simulator: none available');
        ok = false;
      }
    } else {
      console.log('   ❌ Simulator: none available');
      console.log('      Fix: xcrun simctl list devices');
      ok = false;
    }
  }

  return ok;
}

// ─── 后端服务管理 ──────────────────────────────────────────────────

let backendProcess: ChildProcess | null = null;

function checkBackendRunning(): boolean {
  try {
    // Try both /health and /api/health endpoints
    let output = execSync('curl -s --connect-timeout 2 http://localhost:3001/health', {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    if (output.includes('ok') || output.includes('healthy') || output.includes('"success"')) {
      return true;
    }
    // Try /api/health as fallback
    output = execSync('curl -s --connect-timeout 2 http://localhost:3001/api/health', {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    return output.includes('ok') || output.includes('healthy') || output.includes('"success"');
  } catch {
    return false;
  }
}

function startBackend(): boolean {
  console.log('\n🚀 Starting backend server...');

  const serverDir = path.join(PROJECT_ROOT, 'apps', 'server');

  // Check if already running
  if (checkBackendRunning()) {
    console.log('   ✅ Backend is already running');
    return true;
  }

  try {
    // Start backend in background
    backendProcess = spawn('npx', ['tsx', 'src/index.ts'], {
      cwd: serverDir,
      detached: false,
      stdio: 'pipe',
    });

    // Log output
    backendProcess.stdout?.on('data', data => {
      process.stdout.write(`   [server] ${data}`);
    });
    backendProcess.stderr?.on('data', data => {
      process.stderr.write(`   [server:err] ${data}`);
    });

    // Wait for backend to be ready (max 30 seconds)
    console.log('   ⏳ Waiting for backend to start...');
    for (let i = 0; i < 30; i++) {
      if (checkBackendRunning()) {
        console.log('   ✅ Backend server ready');
        return true;
      }
      execSync('sleep 1');
    }

    console.error('   ❌ Backend failed to start within 30 seconds');
    return false;
  } catch (error: unknown) {
    console.error(
      '   ❌ Failed to start backend:',
      error instanceof Error ? error.message : String(error)
    );
    return false;
  }
}

function stopBackend(): void {
  if (backendProcess) {
    console.log('\n🛑 Stopping backend server...');
    backendProcess.kill();
    backendProcess = null;
  }
}

// ─── 主流程 ────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs();

  // L0: 健康检查
  if (args.layer === 0) {
    const ok = runLayer0();
    process.exit(ok ? 0 : 1);
  }

  // L1: 保留接口（未来可扩展 Playwright）
  if (args.layer === 1) {
    console.log('\n⚠️  L1 (Playwright) not yet implemented.');
    console.log('   Use L0 to check environment, or L2 for Maestro tests.');
    process.exit(1);
  }

  // L2: Maestro 测试（默认）
  // 安装模式
  if (args.install) {
    installMaestro();
    return;
  }

  // 启动后端服务器（除非 --skip-backend）
  if (!args.skipBackend && !args.dev) {
    if (!startBackend()) {
      console.log('\n⚠️  Backend failed to start. Use --skip-backend to skip.');
      // Continue anyway for dev mode where backend might already be running
    }
  }

  // 环境诊断
  const envOk = diagnose(args.platform);
  if (!envOk) {
    console.log('\n⚠️  Environment issues detected. Fix them first, or use --dev mode.');
    console.log('   --dev mode skips build/simulator checks and assumes app is already running.');
    if (!args.dev) {
      process.exit(1);
    }
    // --dev mode still requires Maestro CLI
    if (!checkMaestroInstalled()) {
      console.log('\n❌ Maestro CLI is required even in --dev mode.');
      console.log('   Install: npm run e2e:install');
      process.exit(1);
    }
  }

  // 获取 flows
  const allFlows = getAllFlows();
  if (allFlows.length === 0) {
    console.log('\n⚠️  No Maestro flow files found in e2e/maestro/flows/');
    return;
  }

  const flows = filterFlows(allFlows, args.flow, args.issue);
  if (flows.length === 0) {
    if (args.issue) {
      console.log(`\n⚠️  No flows found for issue ${args.issue}`);
      console.log('   Add "# issue: ISSUE-XXX" comment to flow YAML files to associate them.');
    } else if (args.flow) {
      console.log(`\n⚠️  Flow "${args.flow}" not found`);
      console.log('   Available flows:');
      allFlows.forEach(f => console.log(`     - ${f.name}`));
    }
    return;
  }

  console.log(`\n🚀 Running ${flows.length} Maestro flow(s) on ${args.platform}`);
  if (args.issue) console.log(`   Issue: ${args.issue}`);
  if (args.dev) console.log('   Mode: dev (app must be running)');
  if (args.build) console.log('   Mode: build (will build & install app)');
  if (args.screenshotOnFailure) console.log('   Screenshots: on failure');

  // 模拟器/应用管理
  if (args.platform === 'ios') {
    const udid = ensureSimulator();
    if (!udid) process.exit(1);

    if (args.build || (!args.dev && !isAppInstalled(udid))) {
      // Build if --build flag is set, OR if not dev mode and app not installed
      if (!buildAndInstallApp(args.platform)) process.exit(1);
    } else if (args.dev && !isAppInstalled(udid)) {
      console.log('\n⚠️  App not installed. Building with bundled JS...');
      if (!buildAndInstallApp(args.platform)) process.exit(1);
    } else if (args.dev) {
      console.log('  ✅ App already installed, using --dev mode');
    }
  }

  // 执行 flows
  ensureReportDir();
  const startTime = Date.now();
  const results: RunResult[] = [];

  // Apply sharding if specified
  const flowsToRun = args.totalShards !== undefined
    ? getShard(flows, args.totalShards, args.shardIndex ?? 0)
    : flows;

  if (args.totalShards !== undefined) {
    console.log(`   Shard: ${args.shardIndex}/${args.totalShards} (${flowsToRun.length} flows)`);
  }

  for (const flow of flowsToRun) {
    const result = runFlow(flow.file, args.platform, args.timeout, args.screenshotOnFailure);
    results.push(result);
  }

  const totalDuration = Date.now() - startTime;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  // 生成报告
  const report: RunReport = {
    timestamp: new Date().toISOString(),
    layer: 2,
    platform: args.platform,
    total: results.length,
    passed,
    failed,
    duration: totalDuration,
    results,
    summary: `${passed}/${results.length} passed`,
  };

  generateReport(report);

  // Record stability data for flaky-test tracking
  const monitor = StabilityMonitor.load();
  for (const result of results) {
    monitor.recordResult(result.flow, result.passed, result.duration);
  }
  monitor.save();

  // Output stability report if requested
  if (args.stabilityReport) {
    console.log('\n' + monitor.generateReport());
  }

  // 最终输出
  console.log('\n' + '─'.repeat(50));
  if (failed === 0) {
    console.log(`✅ All ${results.length} flows passed`);
    process.exit(0);
  } else {
    console.log(`❌ ${failed}/${results.length} flows failed`);
    results.filter(r => !r.passed).forEach(r => console.log(`   - ${r.flow}`));
    process.exit(1);
  }
}

main()
  .catch(err => {
    console.error('Unexpected error:', err);
    stopBackend();
    process.exit(1);
  })
  .finally(() => {
    stopBackend();
  });
