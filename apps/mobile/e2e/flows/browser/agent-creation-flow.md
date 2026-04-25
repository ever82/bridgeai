# Agent Creation Flow - Agent 创建流程测试

## 关联 Issue

- US-AGENT-001
- AS-001

## AC 验证覆盖

| US-AGENT-001 AC                    | 验证步骤                          |
| ---------------------------------- | --------------------------------- |
| 用户设置昵称和头像                 | Step 5 (name) + 头像上传          |
| 用户选择感兴趣的场景（可多选）     | Step 6 (type 选择)                |
| 用户配置 Agent 沟通风格             | Step 7 (AI config: temperature)   |
| Agent 生成初始画像                  | Step 9 (创建后 GET 验证 profile)  |

## 前置条件

- Web 服务器运行在 localhost:8081
- API 服务正常运行
- 使用移动端 viewport (390x844)
- 已注册测试账号

## 步骤

### 1. 登录并获取 Token

- evaluate_script 调用 `POST /api/v1/auth/login`：
  ```javascript
  const loginRes = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'e2e_test@example.com', password: 'Test@1234' }),
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.accessToken || loginData.accessToken;
  ```
- 验证 token 存在

### 2. 导航到主页

- navigate: / (主页)
- take_snapshot 验证页面加载
- 验证底部导航栏存在

### 3. 导航到 Profile 页面

- click `profile-tab`（底部导航栏 "我的" tab）
- take_snapshot 验证 Profile 页面已加载
- 验证 testID `profile-header` 存在

### 4. 进入 Agent 列表

- click `profile-agent-list-button`（"我的 Agent" 菜单项）
- take_snapshot 验证 Agent 列表页面已加载
- 验证 testID `agent-list-screen` 存在

### 5. 点击创建按钮

- 如果列表为空：click `agent-list-empty-create`
- 如果列表不为空：click `agent-list-create-button`
- take_snapshot 验证 CreateAgent 页面已加载
- 验证 testID `create-agent-step-indicator` 存在

### 6. 通过 API 创建 Agent（核心测试）

- evaluate_script 调用 `POST /api/v1/agents`：
  ```javascript
  const response = await fetch('/api/v1/agents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      type: 'VISIONSHARE',
      name: 'E2E Test Agent',
      description: 'E2E 测试创建的 Agent',
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 2048,
      systemPrompt: '你是一个专业的摄影服务 Agent',
      isPublic: false,
      config: {
        scene: { visionshare: true },
        communicationStyle: 'detailed',
      },
    }),
  });
  const data = await response.json();
  ```
- 验证 status=201 或 200
- 验证 `data.data.id` 存在（UUID 格式）
- 验证 `data.data.name === 'E2E Test Agent'`
- 验证 `data.data.type === 'VISIONSHARE'`
- 记录 agentId 用于后续测试

**注意**: type 枚举值为 DEMAND, SUPPLY, VISIONSHARE, AGENTDATE, AGENTJOB, AGENTAD

### 7. 验证 Agent 详情

- evaluate_script 调用 `GET /api/v1/agents/:id`：
  ```javascript
  const response = await fetch(`/api/v1/agents/${agentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  ```
- 验证 status=200
- 验证 `data.data.name === 'E2E Test Agent'`
- 验证 `data.data.type === 'VISIONSHARE'`
- 验证 `data.data.description` 包含描述文本
- 验证 `data.data.model` 存在
- 验证 `data.data.temperature` === 0.7

### 8. 验证 Agent 初始画像生成

- evaluate_script 调用 `GET /api/v1/agents/:id/profile/l1`：
  ```javascript
  const response = await fetch(`/api/v1/agents/${agentId}/profile/l1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  ```
- 验证 status=200
- 验证 L1 基础画像数据存在

- evaluate_script 调用 `GET /api/v1/agents/:id/profile/completion`：
  ```javascript
  const response = await fetch(`/api/v1/agents/${agentId}/profile/completion`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  ```
- 验证 profile completion 状态

### 9. 验证 Agent 出现在列表

- evaluate_script 调用 `GET /api/v1/agents`：
  ```javascript
  const response = await fetch('/api/v1/agents?limit=10', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  ```
- 验证列表中包含刚创建的 Agent
- 验证 name 为 'E2E Test Agent'

### 10. 测试 UI 创建流程（可选）

- navigate: /profile (或通过 tab 导航)
- 进入 Agent 列表
- 点击创建按钮
- 按步骤填写表单：
  - Step 1: 名称和描述
  - Step 2: 类型选择（VISIONSHARE）
  - Step 3: 场景配置
  - Step 4: AI 配置
  - Step 5: 预览提交
- 每步 take_snapshot 验证
- 截图记录

### 11. 测试 Agent 状态变更

- evaluate_script 调用 `PATCH /api/v1/agents/:id/status`：
  ```javascript
  // DRAFT → ACTIVE
  await fetch(`/api/v1/agents/${agentId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status: 'ACTIVE' }),
  });

  // ACTIVE → PAUSED
  await fetch(`/api/v1/agents/${agentId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status: 'PAUSED' }),
  });

  // PAUSED → ACTIVE
  await fetch(`/api/v1/agents/${agentId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status: 'ACTIVE' }),
  });
  ```
- 验证每次状态变更返回 status=200
- 注意：新 Agent 创建时状态为 DRAFT

### 12. 测试创建不同类型的 Agent

- 依次创建 AGENTDATE, AGENTJOB, AGENTAD 类型：
  ```javascript
  const types = ['AGENTDATE', 'AGENTJOB', 'AGENTAD'];
  for (const type of types) {
    const res = await fetch('/api/v1/agents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        type,
        name: `E2E ${type} Agent`,
        description: `E2E 测试 ${type} Agent`,
        model: 'gpt-3.5-turbo',
      }),
    });
    const data = await res.json();
    // 验证创建成功
  }
  ```
- 验证每种类型都能成功创建

### 13. 清理测试数据

- evaluate_script 调用 `DELETE /api/v1/agents/:id`：
  ```javascript
  const response = await fetch(`/api/v1/agents/${agentId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  ```
- 验证删除成功（status=200 或 204）
- 同样删除其他测试创建的 Agent

## 验证点

| 步骤                | 元素                          | 验证                           |
| ------------------- | ----------------------------- | ------------------------------ |
| API 登录            | auth/login                    | 返回 accessToken               |
| API 创建 Agent      | POST /agents                  | 返回含 id 的 Agent 对象        |
| Agent 类型          | type 字段                     | VISIONSHARE 等6种类型          |
| Agent 名称          | name 字段                     | 'E2E Test Agent'               |
| Agent 描述          | description 字段              | 非空                           |
| AI 配置             | model/temperature/maxTokens   | 配置值正确                     |
| Agent 详情          | GET /agents/:id               | 数据与创建一致                 |
| 初始画像 L1         | GET profile/l1                | 返回 L1 基础数据               |
| Profile 完成度      | GET profile/completion        | 返回完成度状态                 |
| Agent 列表          | GET /agents                   | 新 Agent 出现在列表            |
| 多类型创建          | AGENTDATE/AGENTJOB/AGENTAD    | 各类型均可创建                 |
| 删除清理            | DELETE /agents/:id            | 删除成功                       |

### 已验证的 API 合同

- Agent 更新: **PUT** `/api/v1/agents/:id`（非 PATCH）
- 状态变更: **PATCH** `/api/v1/agents/:id/status`，body: `{ status: "ACTIVE" | "DRAFT" | "PAUSED" | "ARCHIVED" }`
- 新 Agent 默认状态为 **DRAFT**
- 状态转换链: DRAFT→ACTIVE→PAUSED→ACTIVE, *→ARCHIVED(终态)

## 执行提示

Claude Code 执行时使用以下工具：

1. `mcp__chrome-devtools__navigate_page` - 导航
2. `mcp__chrome-devtools__take_snapshot` - 查看页面元素和 testID
3. `mcp__chrome-devtools__click` - 点击按钮和导航
4. `mcp__chrome-devtools__fill` - 输入表单文本
5. `mcp__chrome-devtools__evaluate_script` - 执行 API 调用
6. `mcp__chrome-devtools__handle_dialog` - 处理 alert 弹窗
7. `mcp__chrome-devtools__take_screenshot` - 截图记录
8. `mcp__chrome-devtools__wait_for` - 等待页面元素加载

## 注意事项

- 创建 Agent 的 type 枚举: DEMAND, SUPPLY, VISIONSHARE, AGENTDATE, AGENTJOB, AGENTAD
- **重要修正**: Agent 更新用 PUT（非 PATCH），状态变更用 PATCH + status 枚举值
- Agent Profile L1/L2 端点有 FK 约束 bug（agent_profiles_scene_id_fkey），可能返回 500
- model 枚举: gpt-4, gpt-4-turbo, gpt-3.5-turbo, claude-3-opus, claude-3-sonnet, claude-3-haiku, gemini-pro, gemini-ultra
- temperature 范围: 0-2, 默认 0.7
- maxTokens 范围: 1-8192, 默认 2048
- config 为自由格式 JSON (z.record)
- 清理步骤很重要，避免测试数据残留

## Viewport 设置

```javascript
await page.setViewportSize({ width: 390, height: 844 });
```
