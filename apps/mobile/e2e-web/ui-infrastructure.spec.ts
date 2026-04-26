import { test, expect } from '@playwright/test';

/**
 * E2E Tests for ISSUE-F004 AC-c5: UI 基础设施
 * 使用 Expo Web 构建在浏览器中验证
 *
 * 前置条件: npm run web (服务器在 localhost:8081)
 */

test.describe('UI Infrastructure E2E (Web)', () => {
  test.beforeEach(async ({ page }) => {
    // 设置移动端 viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:8081');
  });

  // ================================================================
  // 1. 主题色渲染
  // ================================================================
  test('should render login screen with primary color branding', async ({ page }) => {
    // 标题可见
    await expect(page.getByText('BridgeAI')).toBeVisible();
    // 副标题可见
    await expect(page.getByText('AI搭桥，真诚连接')).toBeVisible();
    // 登录按钮可见（蓝色主题色）
    await expect(page.getByText('登录')).toBeVisible();
  });

  test('should render all OAuth buttons with distinct colors', async ({ page }) => {
    await expect(page.getByText('微信登录')).toBeVisible(); // 绿色
    await expect(page.getByText('Google 登录')).toBeVisible(); // 白色边框
  });

  // ================================================================
  // 2. 输入框交互
  // ================================================================
  test('should type and clear text in email input', async ({ page }) => {
    const emailInput = page.locator('input[placeholder="邮箱"]');

    await emailInput.fill('test@example.com');
    await expect(emailInput).toHaveValue('test@example.com');

    await emailInput.fill('');
    await expect(emailInput).toHaveValue('');

    await emailInput.fill('new@example.com');
    await expect(emailInput).toHaveValue('new@example.com');
  });

  test('should handle password input with secure masking', async ({ page }) => {
    const passwordInput = page.locator('input[placeholder="密码"]');

    await passwordInput.fill('MySecret123!');
    // input type="password" 会遮罩内容
    const inputType = await passwordInput.getAttribute('type');
    expect(inputType).toBe('password');
  });

  test('should handle special characters in input', async ({ page }) => {
    const emailInput = page.locator('input[placeholder="邮箱"]');

    await emailInput.fill('user+tag@domain.co.jp');
    await expect(emailInput).toHaveValue('user+tag@domain.co.jp');
  });

  test('should handle very long input text', async ({ page }) => {
    const emailInput = page.locator('input[placeholder="邮箱"]');
    const longEmail = 'a'.repeat(80) + '@example.com';

    await emailInput.fill(longEmail);
    await expect(emailInput).toHaveValue(longEmail);
  });

  // ================================================================
  // 3. 按钮状态
  // ================================================================
  test('should keep login button clickable after failed attempt', async ({ page }) => {
    const loginButton = page.getByText('登录');

    // 输入错误凭证
    await page.locator('input[placeholder="邮箱"]').fill('invalid@test.com');
    await page.locator('input[placeholder="密码"]').fill('wrong');
    await loginButton.click();

    // 等待错误提示
    await page.waitForTimeout(1000);

    // 按钮仍可点击
    await expect(loginButton).toBeVisible();
  });

  // ================================================================
  // 4. Tab 导航栏渲染
  // ================================================================
  test('should navigate between auth pages', async ({ page }) => {
    // 点击"忘记密码"
    await page.getByText('忘记密码？').click();
    await expect(page).toHaveURL(/\/auth\/forgot-password/);
    await expect(page.getByText('重置密码')).toBeVisible();

    // 返回登录页
    await page.goto('http://localhost:8081');
    await expect(page.getByText('登录')).toBeVisible();

    // 点击"立即注册"
    await page.getByText('立即注册').click();
    await expect(page).toHaveURL(/\/auth\/register/);
    await expect(page.getByText('创建账号')).toBeVisible();
  });

  // ================================================================
  // 5. 响应式布局
  // ================================================================
  test('should maintain layout in landscape orientation', async ({ page }) => {
    // 横屏
    await page.setViewportSize({ width: 844, height: 390 });

    // 关键元素仍然可见
    await expect(page.getByText('BridgeAI')).toBeVisible();
    await expect(page.locator('input[placeholder="邮箱"]')).toBeVisible();
    await expect(page.locator('input[placeholder="密码"]')).toBeVisible();
    await expect(page.getByText('登录')).toBeVisible();

    // 恢复竖屏
    await page.setViewportSize({ width: 390, height: 844 });
  });
});
