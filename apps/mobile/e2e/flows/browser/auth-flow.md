# Auth Flow - 登录认证测试

## 关联 Issue

- ISSUE-AUTH-001

## 前置条件

- Web 服务器运行在 localhost:8081
- API 服务正常运行
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

### 7. 通过 API 测试注册流程

- evaluate_script 调用 `POST /api/v1/auth/register`：
  ```javascript
  const response = await fetch('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'e2e_auth_test@example.com',
      password: 'Test@1234',
      name: 'E2E Auth Test',
    }),
  });
  const data = await response.json();
  ```
- 验证注册结果：
  - 成功：status=201 或 200，返回含 user 和 token 的数据
  - 邮箱已存在：status=409 或返回 "already exists" 错误
- 截图记录

**注意**: 注册 API 字段为 `email`（或 `phone`）+ `password` + `name`，无 username/displayName/confirmPassword

### 8. 通过 API 测试登录流程

- evaluate_script 调用 `POST /api/v1/auth/login`：
  ```javascript
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'e2e_auth_test@example.com',
      password: 'Test@1234',
    }),
  });
  const data = await response.json();
  ```
- 验证登录结果：
  - 成功：status=200，`data.accessToken` 或 `data.data.accessToken` 存在
  - 保存 token 用于后续测试
- 截图记录

### 9. 测试 UI 登录流程

- navigate: /auth/login
- fill `login-email-input`: e2e_auth_test@example.com
- fill `login-password-input`: Test@1234
- click `login-button`
- 验证登录成功，页面跳转到主页
- 等待页面加载完成

### 10. 测试获取当前用户

- evaluate_script 调用 `GET /api/v1/auth/me`：
  ```javascript
  const response = await fetch('/api/v1/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  ```
- 验证 status=200
- 验证返回用户信息包含 email, name 等字段

### 11. 测试登录验证（空表单）

- navigate: /auth/login
- 不填写任何字段，点击 "登录"
- 验证显示验证错误提示

### 12. 测试错误密码

- evaluate_script 调用 `POST /api/v1/auth/login`：
  ```javascript
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'e2e_auth_test@example.com',
      password: 'WrongPassword@123',
    }),
  });
  ```
- 验证返回 401 或 "Invalid credentials" 错误

### 13. 测试 Token 刷新

- evaluate_script 调用 `POST /api/v1/auth/refresh`：
  ```javascript
  const response = await fetch('/api/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: refreshToken }),
  });
  const data = await response.json();
  ```
- 验证 status=200
- 验证返回新的 accessToken

## 验证点

| 元素            | 验证                                             |
| --------------- | ------------------------------------------------ |
| BridgeAI 标题   | text = "BridgeAI"                                |
| 邮箱输入框      | placeholder = "邮箱"                             |
| 密码输入框      | placeholder = "密码"                             |
| 登录按钮        | text = "登录"                                    |
| 忘记密码链接    | text = "忘记密码？"                              |
| 注册链接        | text = "立即注册"                                |
| API 注册        | email+password+name 提交成功                     |
| API 登录        | email+password 返回 accessToken                  |
| UI 登录         | 填写邮箱密码后跳转主页                           |
| 获取用户信息    | GET /auth/me 返回用户信息                        |
| 空表单验证      | 空字段提交时显示错误                             |
| 错误密码        | 返回 401 或无效凭证错误                          |
| Token 刷新      | POST /auth/refresh 返回新 accessToken            |

## 执行提示

Claude Code 执行时使用以下工具：

1. `mcp__chrome-devtools__navigate_page` - 导航
2. `mcp__chrome-devtools__take_snapshot` - 查看页面元素
3. `mcp__chrome-devtools__click` - 点击元素
4. `mcp__chrome-devtools__fill` - 输入文本
5. `mcp__chrome-devtools__evaluate_script` - 执行 API 调用
6. `mcp__chrome-devtools__handle_dialog` - 处理 alert 弹窗
7. `mcp__chrome-devtools__take_screenshot` - 截图记录

## 注意事项

- 注册 API 字段: `email`（或 `phone`）+ `password`（>= 8字）+ `name`（必填）
- 登录 API 字段: `email`（或 `phone`）+ `password`
- 登录响应可能为 `data.accessToken` 或 `data.data.accessToken`，两种格式都需检查
- refreshToken 在登录响应中一并返回

## Viewport 设置

```javascript
await page.setViewportSize({ width: 390, height: 844 });
```
