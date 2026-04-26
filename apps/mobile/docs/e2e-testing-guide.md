# BridgeAI Mobile - E2E 测试指南

## 概述

本项目使用 Expo React Native 框架，支持 iOS/Android/Web 三端运行。E2E 测试分两条路线：

1. **真机/模拟器 E2E** — Detox + Maestro（iOS/Android）
2. **浏览器 E2E** — 直接用浏览器操作 Expo Web 构建

本文档记录两种方法的详细步骤。

---

## 方法一：浏览器 E2E（推荐用于快速验证 UI 基础设施）

Expo Web 构建将 React Native 组件编译为 Web 组件，可在浏览器中直接运行。这是最快捷的 e2e 验证方式，无需安装 Xcode/Android Studio。

### 1. 启动 Web 开发服务器

```bash
cd apps/mobile
npm run web
# 或: npx expo start --web
```

服务器启动后访问 `http://localhost:8081`。

### 2. 浏览器中验证

可直接在浏览器中手动验证，或使用自动化工具（Playwright/Puppeteer）。

**关键观察点**：
- React Native Web 将组件渲染为 `<div>` 元素，按钮不是 `<button>` 而是带 `cursor: pointer` 的 div
- 输入框是标准 `<input>` 标签，可正常 fill
- 无 `aria-label` 或 `role` 属性，需用文本内容或 CSS 类选择器
- URL 路由正常：`/auth/login`, `/auth/register`, `/auth/forgot-password`

**推荐选择器策略**：
```javascript
// 用文本选择器（最稳定）
page.getByText('登录')
page.getByText('忘记密码？')

// 用 placeholder 选择输入框
page.locator('input[placeholder="邮箱"]')
page.locator('input[placeholder="密码"]')

// 用 CSS 类
page.locator('.css-view-175oi2r') // React Native Web 默认类名
```

### 3. 自动化脚本示例（Playwright）

```typescript
import { test, expect } from '@playwright/test';

test.describe('UI Infrastructure E2E', () => {
  test.beforeEach(async ({ page }) => {
    // 设置移动端 viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:8081');
  });

  test('should render login screen with theme colors', async ({ page }) => {
    // 验证标题
    await expect(page.getByText('BridgeAI')).toBeVisible();
    await expect(page.getByText('AI搭桥，真诚连接')).toBeVisible();

    // 验证输入框
    await expect(page.locator('input[placeholder="邮箱"]')).toBeVisible();
    await expect(page.locator('input[placeholder="密码"]')).toBeVisible();

    // 验证按钮
    await expect(page.getByText('登录')).toBeVisible();
    await expect(page.getByText('微信登录')).toBeVisible();
    await expect(page.getByText('Google 登录')).toBeVisible();
  });

  test('should handle input typing and clearing', async ({ page }) => {
    const emailInput = page.locator('input[placeholder="邮箱"]');

    // 输入
    await emailInput.fill('test@example.com');
    await expect(emailInput).toHaveValue('test@example.com');

    // 清除
    await emailInput.fill('');
    await expect(emailInput).toHaveValue('');

    // 特殊字符
    await emailInput.fill('user+tag@domain.co.jp');
    await expect(emailInput).toHaveValue('user+tag@domain.co.jp');
  });

  test('should navigate to forgot-password page', async ({ page }) => {
    await page.getByText('忘记密码？').click();
    await expect(page).toHaveURL(/\/auth\/forgot-password/);
    await expect(page.getByText('重置密码')).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    await page.getByText('立即注册').click();
    await expect(page).toHaveURL(/\/auth\/register/);
    await expect(page.getByText('创建账号')).toBeVisible();
  });
});
```

### 4. 运行

```bash
# 安装 Playwright
npm install -D @playwright/test
npx playwright install

# 启动 web 服务器（终端1）
npm run web

# 运行测试（终端2）
npx playwright test
```

---

## 方法二：Detox E2E（iOS/Android 真机/模拟器）

用于验证原生组件在真实设备上的行为。

### 1. 环境准备

- iOS: Xcode + iOS Simulator
- Android: Android Studio + Android Emulator

### 2. 配置 Detox

```bash
cd apps/mobile

# iOS 构建
e2e:build:ios

# Android 构建
e2e:build:android
```

### 3. 运行测试

```bash
# iOS
e2e:test:ios

# Android
e2e:test:android
```

### 4. 测试文件位置

```
e2e/tests/
  auth-flow.test.ts      — 登录/注册/登出
  chat-flow.test.ts      — 聊天消息
  matching.test.ts       — 匹配流程
  agent-creation.test.ts — Agent 创建
  ui-infrastructure.test.ts — UI 基础设施（AC-c5）
```

### 5. 编写 Detox 测试

```typescript
import { by, element, expect } from 'detox';
import { LoginPage } from '../pages';

describe('UI Infrastructure', () => {
  const loginPage = new LoginPage();

  it('should render all tab icons', async () => {
    await loginPage.login('test@example.com', 'password123!');
    await expect(element(by.id('home-tab'))).toBeVisible();
    await expect(element(by.id('chat-tab'))).toBeVisible();
    await expect(element(by.id('discover-tab'))).toBeVisible();
    await expect(element(by.id('profile-tab'))).toBeVisible();
  });
});
```

---

## 方法对比

| 维度 | 浏览器 E2E | Detox E2E |
|------|-----------|-----------|
| 启动速度 | 快（秒级） | 慢（需编译） |
| 环境依赖 | 仅需 Node.js | 需 Xcode/Android Studio |
| 组件保真度 | Web 渲染（div） | 原生组件 |
| 适合验证 | UI 布局、主题色、交互逻辑 | 原生行为、性能 |
| CI/CD | 容易集成 | 需要专用 runner |
| 成本 | 零 | 高（需 Apple Developer 等） |

---

## 最佳实践

1. **快速验证用浏览器**：开发阶段先用 `npm run web` + Playwright 快速验证 UI
2. **发布前用 Detox**：提测前用 Detox 跑一遍 iOS/Android 真机验证
3. **选择器策略**：浏览器用文本选择器（`getByText`），Detox 用 `testID`
4. **viewport**：浏览器测试务必设置移动端尺寸（390x844）

---

## 常见问题

**Q: 浏览器中按钮是 `<div>` 不是 `<button>`，怎么选？**
A: 用文本选择器 `page.getByText('登录')` 或 CSS 类选择器。

**Q: Expo Web 和原生表现不一致怎么办？**
A: 浏览器 E2E 只覆盖布局/交互/主题层面，原生特有行为（相机、推送等）必须走 Detox。

**Q: 如何同时启动 web 和 native 开发服务器？**
A: Web 用 `npm run web`（port 8081），Native 用 `npx expo start`（port 19000），互不影响。
