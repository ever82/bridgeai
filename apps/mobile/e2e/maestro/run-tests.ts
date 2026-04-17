#!/usr/bin/env node
/**
 * Maestro Test Runner
 * AI Agent 友好的 E2E 测试执行脚本
 *
 * 用法:
 *   npm run maestro:test                 # 运行所有测试
 *   npm run maestro:test:auth            # 只运行认证流程
 *   npm run maestro:test:chat            # 只运行聊天流程
 *   npm run maestro:install               # 安装 maestro CLI
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const MAESTRO_DIR = path.join(__dirname);
const FLOWS_DIR = path.join(MAESTRO_DIR, 'flows');
const REPORT_DIR = path.join(MAESTRO_DIR, 'reports');

/**
 * 确保报告目录存在
 */
function ensureReportDir() {
  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }
}

/**
 * 检查 maestro CLI 是否安装
 */
function checkMaestroInstalled() {
  try {
    execSync('maestro --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * 安装 maestro CLI
 */
function installMaestro() {
  console.log('📦 Installing Maestro CLI...');
  try {
    // macOS 安装
    if (process.platform === 'darwin') {
      execSync('brew install maestro', { stdio: 'inherit' });
    } else {
      // Linux/其他平台
      execSync('curl -s "https://get.maestro.mobile.dev" | bash', { stdio: 'inherit' });
    }
    console.log('✅ Maestro installed successfully');
  } catch (error) {
    console.error('❌ Failed to install Maestro:', error.message);
    process.exit(1);
  }
}

/**
 * 运行单个 flow
 */
function runFlow(flowPath, platform = 'ios') {
  const flowName = path.basename(flowPath, '.yaml');
  console.log(`\n🔄 Running flow: ${flowName}`);

  const outputFile = path.join(REPORT_DIR, `${flowName}-${Date.now()}.html`);

  try {
    const cmd =
      platform === 'ios'
        ? `maestro test ${flowPath} --platform ios --output ${outputFile}`
        : `maestro test ${flowPath} --platform android --output ${outputFile}`;

    execSync(cmd, { stdio: 'inherit', cwd: MAESTRO_DIR });
    console.log(`✅ Flow passed: ${flowName}`);
    return true;
  } catch (error) {
    console.error(`❌ Flow failed: ${flowName}`);
    return false;
  }
}

/**
 * 运行所有 flows
 */
function runAllFlows(platform = 'ios') {
  console.log(`\n🚀 Running all Maestro E2E tests (${platform})`);

  if (!checkMaestroInstalled()) {
    console.log('⚠️ Maestro not installed. Installing...');
    installMaestro();
  }

  ensureReportDir();

  const flows = fs
    .readdirSync(FLOWS_DIR)
    .filter(f => f.endsWith('.yaml'))
    .map(f => path.join(FLOWS_DIR, f));

  if (flows.length === 0) {
    console.log('⚠️ No flow files found');
    return;
  }

  console.log(`📋 Found ${flows.length} flows to run`);

  let passed = 0;
  let failed = 0;

  for (const flow of flows) {
    const result = runFlow(flow, platform);
    if (result) passed++;
    else failed++;
  }

  console.log('\n📊 Test Summary:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📁 Reports: ${REPORT_DIR}`);
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'test';
  const platform = args[1] || 'ios';

  switch (command) {
    case 'install':
      installMaestro();
      break;

    case 'test':
      runAllFlows(platform);
      break;

    case 'test:auth':
      runFlow(path.join(FLOWS_DIR, 'auth-flow.yaml'), platform);
      break;

    case 'test:chat':
      runFlow(path.join(FLOWS_DIR, 'chat-flow.yaml'), platform);
      break;

    case 'test:agent':
      runFlow(path.join(FLOWS_DIR, 'agent-creation-flow.yaml'), platform);
      break;

    case 'test:matching':
      runFlow(path.join(FLOWS_DIR, 'matching-flow.yaml'), platform);
      break;

    default:
      console.log(`Unknown command: ${command}`);
      console.log(
        'Available commands: install, test, test:auth, test:chat, test:agent, test:matching'
      );
  }
}

main();
