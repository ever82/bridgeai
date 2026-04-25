# Registration Flow - 注册流程测试

## 关联 Issue

- ISSUE-A003

## 前置条件

- Web 服务器运行在 localhost:8081
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
  - `register-username-input` 用户名输入框
  - `register-displayname-input` 显示名称输入框
  - `register-password-input` 密码输入框
  - `register-confirm-password-input` 确认密码输入框
  - `register-submit-button` 注册按钮

### 3. 空表单验证测试

- 点击 `register-submit-button`
- 验证弹出错误提示（alert 或 inline error）
- 验证提示内容包含 "请填写所有必填项" 或类似字段验证错误
- 截图记录

### 4. 密码不一致验证测试

- fill `register-email-input`: e2e_reg_test@example.com
- fill `register-username-input`: e2e_reg_user
- fill `register-displayname-input`: E2E Test
- fill `register-password-input`: Test@1234
- fill `register-confirm-password-input`: Different@5678
- 点击 `register-submit-button`
- 验证弹出 "两次输入的密码不一致" 错误提示
- 截图记录

### 5. 密码长度不足验证测试

- clear `register-confirm-password-input`
- fill `register-confirm-password-input`: Test@1234
- clear `register-password-input`
- fill `register-password-input`: short
- clear `register-confirm-password-input`
- fill `register-confirm-password-input`: short
- 点击 `register-submit-button`
- 验证弹出密码长度相关错误提示
- 截图记录

### 6. 完整注册成功测试

- fill `register-email-input`: e2e_full_test@example.com
- fill `register-username-input`: e2e_full_user
- fill `register-displayname-input`: E2E Full Test
- fill `register-password-input`: Test@1234
- fill `register-confirm-password-input`: Test@1234
- 点击 `register-submit-button`
- 验证结果：
  - 如果注册成功：页面跳转到登录页或主页
  - 如果邮箱已存在：验证显示 "注册失败" 或 "邮箱已被注册" 错误提示
- 截图记录

### 7. 验证 "立即登录" 链接

- navigate: /auth/register
- 点击 "立即登录" 链接
- 验证 URL 为 /auth/login
- 验证页面包含登录表单

## 验证点

| 元素            | 验证                                                |
| --------------- | --------------------------------------------------- |
| 注册页标题      | text = "创建账号"                                   |
| 邮箱输入框      | testID = "register-email-input", 可输入             |
| 用户名输入框    | testID = "register-username-input", 可输入          |
| 显示名称输入框  | testID = "register-displayname-input", 可输入       |
| 密码输入框      | testID = "register-password-input", secureTextEntry |
| 确认密码输入框  | testID = "register-confirm-password-input"          |
| 注册按钮        | testID = "register-submit-button", text = "注册"    |
| 空表单提交      | 显示 "请填写所有必填项" 错误                        |
| 密码不一致      | 显示 "两次输入的密码不一致" 错误                    |
| 密码过短        | 显示密码长度相关错误                                |
| 成功注册        | 跳转到登录页/主页 或 显示成功提示                   |
| 重复邮箱        | 显示 "注册失败" 或邮箱已存在错误                    |
| "立即登录" 链接 | 点击后导航到 /auth/login                            |

## 执行提示

Claude Code 执行时使用以下工具：

1. `mcp__chrome-devtools__navigate_page` - 导航到注册页
2. `mcp__chrome-devtools__take_snapshot` - 查看 testID 元素
3. `mcp__chrome-devtools__click` - 点击注册按钮和链接
4. `mcp__chrome-devtools__fill` - 输入表单文本
5. `mcp__chrome-devtools__evaluate_script` - 处理 alert 对话框
6. `mcp__chrome-devtools__handle_dialog` - 接受 alert 弹窗
7. `mcp__chrome-devtools__take_screenshot` - 截图记录

## Viewport 设置

```javascript
await page.setViewportSize({ width: 390, height: 844 });
```
