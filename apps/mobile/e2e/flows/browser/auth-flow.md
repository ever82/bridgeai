# Auth Flow - 登录认证测试

## 关联 Issue

- ISSUE-AUTH-001

## 前置条件

- Web 服务器运行在 localhost:8081
- 使用移动端 viewport (390x844)

## 步骤

### 1. 打开登录页

- navigate: /auth/login
- 验证页面包含 "BridgeAI" 标题
- 验证页面包含 "AI搭桥，真诚连接" 标语

### 2. 验证登录表单

- 验证邮箱输入框 visible (placeholder="邮箱")
- 验证密码输入框 visible (placeholder="密码")
- 验证 "登录" 按钮 visible
- 验证 "微信登录" 按钮 visible
- 验证 "Google 登录" 按钮 visible

### 3. 验证链接

- 验证 "忘记密码？" 链接 visible
- 验证 "立即注册" 链接 visible

### 4. 测试忘记密码导航

- 点击 "忘记密码？"
- 验证 URL 包含 /auth/forgot-password
- 验证页面包含 "重置密码" 标题

### 5. 测试注册导航

- 点击 "立即注册"
- 验证 URL 包含 /auth/register
- 验证页面包含 "创建账号" 标题

### 6. 返回登录页

- 点击 "立即登录"
- 验证 URL 为 /auth/login

### 7. 测试注册流程

- 导航到 /auth/register
- 填入邮箱: e2e_test@example.com
- 填入用户名: e2e_testuser
- 填入显示名称: E2E Test User
- 填入密码: Test@1234
- 填入确认密码: Test@1234
- 点击 "注册" 按钮
- 验证注册结果（成功跳转或显示错误提示）
- 截图记录

### 8. 测试登录流程

- 导航到 /auth/login
- 填入邮箱: e2e_test@example.com
- 填入密码: Test@1234
- 点击 "登录" 按钮
- 验证登录结果（成功跳转到主页或显示错误提示）
- 截图记录

### 9. 测试登录验证（空表单）

- 导航到 /auth/login
- 不填写任何字段，点击 "登录"
- 验证显示验证错误提示

### 10. 测试注册验证（密码不一致）

- 导航到 /auth/register
- 填入邮箱: e2e_test@example.com
- 填入用户名: e2e_testuser
- 填入显示名称: E2E Test User
- 填入密码: Test@1234
- 填入确认密码: Different@1234
- 点击 "注册"
- 验证显示密码不一致错误

## 验证点

| 元素          | 验证                                   |
| ------------- | -------------------------------------- |
| BridgeAI 标题 | text = "BridgeAI"                      |
| 邮箱输入框    | placeholder = "邮箱"                   |
| 密码输入框    | placeholder = "密码"                   |
| 登录按钮      | text = "登录"                          |
| 忘记密码链接  | text = "忘记密码？"                    |
| 注册链接      | text = "立即注册"                      |
| 注册提交      | 填写完整表单后提交，验证跳转或错误提示 |
| 登录提交      | 填写邮箱密码后提交，验证跳转或错误提示 |
| 空表单验证    | 空字段提交时显示错误                   |
| 密码不一致    | 确认密码不匹配时显示错误               |

## 执行提示

Claude Code 执行时使用以下工具：

1. `mcp__chrome-devtools__navigate_page` - 导航
2. `mcp__chrome-devtools__take_snapshot` - 查看页面元素
3. `mcp__chrome-devtools__click` - 点击元素
4. `mcp__chrome-devtools__fill` - 输入文本
5. `mcp__chrome-devtools__take_screenshot` - 截图记录

## Viewport 设置

```javascript
await page.setViewportSize({ width: 390, height: 844 });
```
