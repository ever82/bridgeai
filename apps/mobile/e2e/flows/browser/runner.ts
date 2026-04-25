#!/usr/bin/env ts-node
/**
 * Browser E2E Test Runner - Web 端测试入口
 *
 * 启动 Expo Web 服务器，为 Chrome DevTools MCP 测试做准备
 *
 * 用法:
 *   npx ts-node e2e/flows/browser/runner.ts [options]
 *
 * 选项:
 *   --start     启动 Web 服务器（默认）
 *   --check     只检查环境
 *   --stop      停止 Web 服务器
 */

import { execSync, spawn, ChildProcess } from 'child_process';
import * as path from 'path';

const PROJECT_ROOT = path.join(__dirname, '..', '..', '..');
const WEB_PORT = 8081;
const WEB_URL = `http://localhost:${WEB_PORT}`;

let webServer: ChildProcess | null = null;

function checkPort(): boolean {
  try {
    execSync(`lsof -i :${WEB_PORT}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function checkNodeModules(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('fs').existsSync(path.join(PROJECT_ROOT, 'node_modules'));
}

function checkExpo(): boolean {
  try {
    execSync('npx expo --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

async function startWeb(): Promise<void> {
  console.log('\n🚀 Starting Expo Web server...');

  if (checkPort()) {
    console.log(`   ✅ Port ${WEB_PORT} already in use`);
    console.log(`   📍 Web URL: ${WEB_URL}`);
    return;
  }

  const mobileDir = path.join(PROJECT_ROOT, 'apps', 'mobile');

  webServer = spawn('npx', ['expo', 'start', '--web', '--no-dev'], {
    cwd: mobileDir,
    stdio: 'pipe',
  });

  webServer.stdout?.on('data', data => {
    const output = data.toString();
    process.stdout.write(`   [web] ${output}`);

    // 检测服务器就绪
    if (output.includes('Web Bundled complete') || output.includes(`:${WEB_PORT}`)) {
      console.log(`   ✅ Web server ready: ${WEB_URL}`);
    }
  });

  webServer.stderr?.on('data', data => {
    process.stderr.write(`   [web:err] ${data}`);
  });

  // 等待服务器启动
  for (let i = 0; i < 30; i++) {
    if (checkPort()) {
      console.log(`   ✅ Web server started: ${WEB_URL}`);
      return;
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  console.error('   ❌ Web server failed to start');
  process.exit(1);
}

async function check(): Promise<void> {
  console.log('\n🔍 Browser E2E Environment Check');
  console.log('   ─────────────────────────────────');

  const checks = [
    { name: 'node_modules', pass: checkNodeModules(), fix: 'pnpm install' },
    { name: 'Expo CLI', pass: checkExpo(), fix: 'pnpm install' },
    {
      name: `Port ${WEB_PORT} available`,
      pass: !checkPort(),
      fix: 'stop existing server: lsof -ti :8081 | xargs kill',
    },
  ];

  let allOk = true;
  for (const c of checks) {
    if (c.pass) {
      console.log(`   ✅ ${c.name}`);
    } else {
      console.log(`   ❌ ${c.name}`);
      console.log(`      Fix: ${c.fix}`);
      allOk = false;
    }
  }

  console.log('');
  if (allOk) {
    console.log('✅ Environment ready');
    console.log('\n下一步:');
    console.log(`   1. 启动 Web: npx ts-node apps/mobile/e2e/flows/browser/runner.ts --start`);
    console.log('   2. Claude Code 使用 mcp__chrome-devtools__* 工具进行 E2E 测试');
    console.log(`   3. Web 地址: ${WEB_URL}`);
  } else {
    console.log('❌ Fix issues above first');
    process.exit(1);
  }
}

async function stop(): Promise<void> {
  console.log('\n🛑 Stopping Web server...');
  try {
    execSync(`lsof -ti :${WEB_PORT} | xargs kill 2>/dev/null || true`, { stdio: 'pipe' });
    console.log('   ✅ Stopped');
  } catch {
    console.log('   ⚠️  No server running');
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--check')) {
    await check();
  } else if (args.includes('--stop')) {
    await stop();
  } else {
    // 默认启动
    await startWeb();
  }
}

main().catch(console.error);
