# Agent Creation Flow - Agent 创建流程测试

## 关联 Issue

- US-AGENT-001
- AS-001

## 前置条件

- Web 服务器运行在 localhost:8081
- 使用移动端 viewport (390x844)
- 已注册测试账号（e2e_test@example.com / Test@1234）
- API 服务正常运行

## 步骤

### 1. 登录

- navigate: /auth/login
- fill `login-email-input`: e2e_test@example.com
- fill `login-password-input`: Test@1234
- click `login-button`
- 验证登录成功，页面跳转到主页
- 等待页面加载完成

### 2. 导航到 Profile 页面

- click `profile-tab`（底部导航栏 "我的" tab）
- take_snapshot 验证 Profile 页面已加载
- 验证 testID `profile-header` 存在

### 3. 进入 Agent 列表

- click `profile-agent-list-button`（"我的 Agent" 菜单项）
- take_snapshot 验证 Agent 列表页面已加载
- 验证 testID `agent-list-screen` 存在
- 验证页面标题为 "My Agents"

### 4. 点击创建按钮

- 如果列表为空：click `agent-list-empty-create`
- 如果列表不为空：click `agent-list-create-button`
- take_snapshot 验证 CreateAgent 页面已加载
- 验证 testID `create-agent-step-indicator` 存在（进度条）
- 验证处于 Step 1

### 5. Step 1: 填写基本信息

- fill `create-agent-name-input`: E2E Test Agent
- fill `create-agent-description-input`: 这是一个 E2E 测试创建的 Agent
- click `create-agent-next-button`
- 验证进度条更新，进入 Step 2
- 验证 testID `create-agent-step-indicator` 进度变化

### 6. Step 2: 选择 Agent 类型

- take_snapshot 查看可选类型列表
- click `create-agent-type-VISIONSHARE`
- 验证选中状态（边框高亮或勾选标记）
- click `create-agent-next-button`
- 验证进入 Step 3

### 7. Step 3: 场景配置

- take_snapshot 查看 SceneConfigForm 内容
- 根据表单元素填写场景配置（range、location 等）
- click `create-agent-next-button`
- 验证进入 Step 4

### 8. Step 4: AI 行为配置

- take_snapshot 查看 AIConfigSection 内容
- 根据表单元素调整 AI 配置参数
- click `create-agent-next-button`
- 验证进入 Step 5

### 9. Step 5: 预览并提交

- take_snapshot 查看预览内容
- 验证预览显示正确的 Agent 名称、类型和配置
- click `create-agent-submit`
- 验证提交结果：
  - 成功：显示 "Agent created successfully!" 提示
  - 失败：显示具体错误信息
- 截图记录

### 10. 验证 Agent 出现在列表

- 提交成功后自动返回 Agent 列表
- take_snapshot 验证新创建的 Agent 出现在列表中
- 验证列表包含 "E2E Test Agent" 名称
- 截图记录

## 验证点

| 步骤           | 元素                           | 验证                        |
| -------------- | ------------------------------ | --------------------------- |
| 登录           | login-email-input              | 填入邮箱后成功登录          |
| Profile 导航   | profile-tab                    | 点击后进入 Profile 页面     |
| Agent 列表入口 | profile-agent-list-button      | 点击后导航到 AgentList 页面 |
| 创建按钮       | agent-list-create-button       | 点击后进入 CreateAgent 页面 |
| 基本信息       | create-agent-name-input        | 可输入 Agent 名称           |
| 基本信息       | create-agent-description-input | 可输入 Agent 描述           |
| 下一步         | create-agent-next-button       | 每步点击后进度条更新        |
| 类型选择       | create-agent-type-VISIONSHARE  | 点击后显示选中状态          |
| 步骤指示器     | create-agent-step-indicator    | 每步进度条宽度递增          |
| 提交           | create-agent-submit            | 提交后显示成功或错误提示    |
| 列表验证       | agent-list-screen              | 新 Agent 出现在列表中       |

## 执行提示

Claude Code 执行时使用以下工具：

1. `mcp__chrome-devtools__navigate_page` - 导航
2. `mcp__chrome-devtools__take_snapshot` - 查看页面元素和 testID
3. `mcp__chrome-devtools__click` - 点击按钮和导航
4. `mcp__chrome-devtools__fill` - 输入表单文本
5. `mcp__chrome-devtools__evaluate_script` - 检查进度条状态
6. `mcp__chrome-devtools__handle_dialog` - 处理 alert 弹窗
7. `mcp__chrome-devtools__take_screenshot` - 截图记录
8. `mcp__chrome-devtools__wait_for` - 等待页面元素加载

## Viewport 设置

```javascript
await page.setViewportSize({ width: 390, height: 844 });
```
