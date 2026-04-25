# Registration Flow - 注册流程测试

## 关联 Issue

- ISSUE-A003

## 前置条件

- Web 服务器运行在 localhost:8081
- API 服务正常运行
- 使用移动端 viewport (390x844)
- 数据库可连接

## 步骤

### 1. 导航到注册页

- navigate: /auth/register
- 验证页面包含 "创建账号" 标题
- 验证页面包含 "开始你的 BridgeAI 之旅" 副标题

### 2. 验证注册表单元素

- take_snapshot 验证以下元素存在：
  - `register-email-input` 邮箱输入框
  - `register-password-input` 密码输入框
  - `register-name-input` 名称输入框
  - `register-submit-button` 注册按钮

**注意**: 实际注册表单字段为 email + password + name（无 username/displayName/confirmPassword）

### 3. 空表单验证测试

- 点击 `register-submit-button`
- 验证弹出错误提示（alert 或 inline error）
- 验证提示内容包含必填字段相关错误
- 截图记录

### 4. 密码过短验证测试

- fill `register-email-input`: e2e_reg_short@example.com
- fill `register-name-input`: Short PW Test
- fill `register-password-input`: short
- 点击 `register-submit-button`
- 验证弹出密码长度相关错误提示（"Password must be at least 8 characters"）
- 截图记录

### 5. 通过 API 测试完整注册

- evaluate_script 调用 `POST /api/v1/auth/register`：
  ```javascript
  const response = await fetch('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'e2e_reg_full@example.com',
      password: 'Test@1234',
      name: 'E2E Full Test',
    }),
  });
  const data = await response.json();
  ```
- 验证结果：
  - 成功注册：status=201 或 200，返回含 user 和 token
  - 邮箱已存在：status=409，返回 "already exists" 错误
- 截图记录

### 6. 通过 API 测试手机号注册

- evaluate_script 调用 `POST /api/v1/auth/register`：
  ```javascript
  const response = await fetch('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: '+8613800138000',
      password: 'Test@1234',
      name: 'Phone Test User',
    }),
  });
  const data = await response.json();
  ```
- 验证结果（成功或手机号已注册）

### 7. 通过 UI 测试完整注册

- navigate: /auth/register
- fill `register-email-input`: e2e_ui_reg@example.com
- fill `register-name-input`: E2E UI Reg
- fill `register-password-input`: Test@1234
- 点击 `register-submit-button`
- 验证结果：
  - 如果注册成功：页面跳转到登录页或主页
  - 如果邮箱已存在：验证显示错误提示
- 截图记录

### 8. 验证 "立即登录" 链接

- navigate: /auth/register
- 点击 "立即登录" 链接
- 验证 URL 为 /auth/login
- 验证页面包含登录表单

### 9. 测试注册后自动登录

- evaluate_script 调用注册 API：
  ```javascript
  const uniqueEmail = `e2e_auto_login_${Date.now()}@example.com`;
  const regRes = await fetch('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: uniqueEmail,
      password: 'Test@1234',
      name: 'Auto Login Test',
    }),
  });
  const regData = await regRes.json();

  // 验证返回的 token 是否可用
  const token = regData.data?.accessToken || regData.accessToken;
  const meRes = await fetch('/api/v1/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const meData = await meRes.json();
  ```
- 验证 meRes.status === 200
- 验证 meData 包含正确的用户信息

### 10. 测试头像上传（A003 AC）

- 登录后 evaluate_script 调用 `POST /api/v1/upload/avatar`：
  ```javascript
  // 先登录获取 token
  const loginRes = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: uniqueEmail, password: 'Test@1234' }),
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.accessToken || loginData.accessToken;

  // 上传头像（使用 FormData）
  const formData = new FormData();
  const blob = new Blob(['fake-image-data'], { type: 'image/png' });
  formData.append('avatar', blob, 'test-avatar.png');

  const uploadRes = await fetch('/api/v1/upload/avatar', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const uploadData = await uploadRes.json();
  ```
- 验证上传结果（status=200 或 multipart 相关错误可记录）

### 11. 测试用户资料更新

- evaluate_script 调用 `PUT /api/v1/users/me`：
  ```javascript
  const response = await fetch('/api/v1/users/me', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'Updated E2E Name',
    }),
  });
  const data = await response.json();
  ```
- 验证 status=200
- 验证返回的用户名已更新

## 验证点

| 元素            | 验证                                                |
| --------------- | --------------------------------------------------- |
| 注册页标题      | text = "创建账号"                                   |
| 邮箱输入框      | 可输入                                              |
| 密码输入框      | secureTextEntry                                     |
| 名称输入框      | 可输入                                              |
| 注册按钮        | text = "注册"                                       |
| 空表单提交      | 显示必填字段错误                                    |
| 密码过短        | 显示密码长度错误（>= 8字）                          |
| API 注册        | email+password+name 提交成功                        |
| 手机号注册      | phone+password+name 提交成功或已存在                |
| UI 注册         | 填写完整表单后跳转                                  |
| "立即登录" 链接 | 点击后导航到 /auth/login                            |
| 注册后自动登录  | 返回的 token 可用于 GET /auth/me                    |
| 头像上传        | POST /upload/avatar 返回成功                        |
| 资料更新        | PUT /users/me 更新 name 成功                        |

## 执行提示

Claude Code 执行时使用以下工具：

1. `mcp__chrome-devtools__navigate_page` - 导航到注册页
2. `mcp__chrome-devtools__take_snapshot` - 查看表单元素
3. `mcp__chrome-devtools__click` - 点击注册按钮和链接
4. `mcp__chrome-devtools__fill` - 输入表单文本
5. `mcp__chrome-devtools__evaluate_script` - 执行 API 调用
6. `mcp__chrome-devtools__handle_dialog` - 接受 alert 弹窗
7. `mcp__chrome-devtools__take_screenshot` - 截图记录

## 注意事项

- 注册 API 字段: `email`（或 `phone`）+ `password`（>= 8字）+ `name`（1-50字）
- 密码规则：>= 8 字符（重置密码还要求大写+小写+数字+特殊字符）
- 注册响应可能直接返回 accessToken 和 refreshToken
- 头像上传使用 multipart/form-data

## Viewport 设置

```javascript
await page.setViewportSize({ width: 390, height: 844 });
```
