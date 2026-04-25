# Agent Configuration Flow - Agent 配置深度验证

## 关联 Issue

- AS-001
- ISSUE-C003 (Region Filter)
- ISSUE-C004 (Attribute Filter)
- ISSUE-C005 (Credit Filter)
- ISSUE-C007 (Disclosure Control)

## 前置条件

- Web 服务器运行在 localhost:8081
- API 服务正常运行
- 已登录并持有有效 auth token
- 已创建至少一个测试 Agent

## 步骤

### 1. 获取认证 Token 和测试 Agent

- evaluate_script: 登录获取 token，获取已有 Agent 列表：
  ```javascript
  const loginRes = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'e2e_test@example.com', password: 'Test@1234' }),
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.accessToken || loginData.accessToken;

  const agentsRes = await fetch('/api/v1/agents?limit=10', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const agentsData = await agentsRes.json();
  ```
- 如果列表为空，先创建 Agent（参见 agent-creation-flow）
- 记录第一个 Agent 的 ID 用于后续测试

### 2. Agent CRUD - 创建测试

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
      name: 'E2E Config Test Agent',
      description: 'Configuration test agent',
      model: 'gpt-3.5-turbo',
      config: { scene: {}, ai: {} },
    }),
  });
  const data = await response.json();
  ```
- 验证 status=201 或 200
- 验证返回 Agent 对象包含 id, name, type 字段
- 记录新创建的 Agent ID

### 3. Agent CRUD - 读取测试

- evaluate_script 调用 `GET /api/v1/agents/:id`：
  ```javascript
  const response = await fetch(`/api/v1/agents/${agentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  ```
- 验证 status=200
- 验证返回数据与创建时的数据一致

### 4. Agent CRUD - 更新基本信息

- evaluate_script 调用 `PUT /api/v1/agents/:id`：
  ```javascript
  const response = await fetch(`/api/v1/agents/${agentId}`, {
    method: 'PUT',  // 注意: 用 PUT（非 PATCH）
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'E2E Updated Agent',
      description: 'Updated via configuration test',
    }),
  });
  const data = await response.json();
  ```
- 验证 status=200
- 重新 GET 验证更新已生效

### 5. Agent 状态变更测试

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

### 6. Region Filter 配置 (C003)

- evaluate_script 调用 `PUT /api/v1/agents/:id` 更新区域过滤配置：
  ```javascript
  const response = await fetch(`/api/v1/agents/${agentId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      config: {
        scene: {
          regionFilter: {
            enabled: true,
            regions: ['北京', '上海'],
            maxDistance: 50,
          },
        },
      },
    }),
  });
  const data = await response.json();
  ```
- 验证 status=200
- 重新 GET 验证 regionFilter 已保存

### 7. Attribute Filter 配置 (C004)

- evaluate_script 调用 `PUT /api/v1/agents/:id`：
  ```javascript
  const response = await fetch(`/api/v1/agents/${agentId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      config: {
        scene: {
          attributeFilter: {
            enabled: true,
            filters: [
              { field: 'category', operator: 'IN', values: ['人像', '风景'] },
              { field: 'experience', operator: 'GTE', value: 3 },
            ],
          },
        },
      },
    }),
  });
  const data = await response.json();
  ```
- 验证 status=200
- 重新 GET 验证 attributeFilter 已保存

### 8. Credit Filter 配置 (C005)

- evaluate_script 调用 `PUT /api/v1/agents/:id`：
  ```javascript
  const response = await fetch(`/api/v1/agents/${agentId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      config: {
        scene: {
          creditFilter: {
            enabled: true,
            minCreditScore: 60,
          },
        },
      },
    }),
  });
  const data = await response.json();
  ```
- 验证 status=200
- 验证信用设置已保存

### 9. Disclosure Control 配置 (C007)

- evaluate_script 调用 `PUT /api/v1/disclosure/:agentId/settings`（独立端点）：
  ```javascript
  const response = await fetch(`/api/v1/disclosure/${agentId}/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      settings: [
        { fieldName: 'phone', disclosureLevel: 'MATCHED_ONLY' },
        { fieldName: 'location', disclosureLevel: 'PUBLIC' },
        { fieldName: 'realName', disclosureLevel: 'PRIVATE' },
      ],
    }),
  });
  const data = await response.json();
  ```
- 验证 status=200
- GET 验证设置已保存：
  ```javascript
  const getRes = await fetch(`/api/v1/disclosure/${agentId}/settings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  ```

### 10. Agent Profile L1/L2 管理

- evaluate_script 调用 `PUT /api/v1/agents/:id/profile/l1`：
  ```javascript
  const response = await fetch(`/api/v1/agents/${agentId}/profile/l1`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      basicInfo: { nickname: '摄影师小王', location: '北京' },
    }),
  });
  ```
- 验证 status=200

- evaluate_script 调用 `PUT /api/v1/agents/:id/profile/l2`：
  ```javascript
  const response = await fetch(`/api/v1/agents/${agentId}/profile/l2`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      skills: ['摄影', '后期处理'],
      pricing: { range: '3000-8000' },
    }),
  });
  ```
- 验证 status=200

### 11. Agent CRUD - 删除测试

- evaluate_script 调用 `DELETE /api/v1/agents/:id`：
  ```javascript
  const response = await fetch(`/api/v1/agents/${agentId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  ```
- 验证删除成功（status=200 或 204）
- 重新 GET 验证返回 404

## 验证点

| 测试用例                | 验证点                                         |
| ----------------------- | ---------------------------------------------- |
| Agent 创建              | status=201/200, 返回含 id 的 Agent 对象        |
| Agent 读取              | status=200, 数据与创建一致                     |
| Agent 更新              | PATCH status=200, name/description 已更新      |
| Agent 状态变更          | PATCH /status status=200, isActive 可切换      |
| Region Filter (C003)    | config 中 regionFilter 可设置和读取            |
| Attribute Filter (C004) | config 中 attributeFilter 可设置和读取         |
| Credit Filter (C005)    | config 中 creditFilter 可设置和读取            |
| Disclosure (C007)       | disclosure settings API 可设置和读取           |
| Profile L1              | PUT /profile/l1 status=200                     |
| Profile L2              | PUT /profile/l2 status=200                     |
| Agent 删除              | DELETE status=200/204, GET 返回 404            |

## 执行提示

Claude Code 执行时使用以下工具：

1. `mcp__chrome-devtools__navigate_page` - 导航到应用页面
2. `mcp__chrome-devtools__evaluate_script` - 执行所有 API 调用
3. `mcp__chrome-devtools__list_network_requests` - 检查 API 请求列表
4. `mcp__chrome-devtools__get_network_request` - 查看特定请求详情
5. `mcp__chrome-devtools__list_console_messages` - 检查控制台错误
6. `mcp__chrome-devtools__take_screenshot` - 截图记录

## 已知 Bug

- **C007 Disclosure Control 后端 bug**: `PUT /api/v1/disclosure/:agentId/settings` 返回 400 "Failed to update disclosure settings"；对应 GET 返回 500 Internal Server Error。需要后端调查 `agent_disclosures` 表结构和路由逻辑。

## 注意事项

- Agent 更新使用 `PUT /api/v1/agents/:id`（非 PATCH）
- 状态变更使用 `PATCH /api/v1/agents/:id/status`，body 含 `{ status: "ACTIVE"|"DRAFT"|"PAUSED"|"ARCHIVED" }`
- 新 Agent 默认状态为 DRAFT
- Disclosure 使用独立端点 `/api/v1/disclosure/:agentId/settings`（非 agent config 内）
- **注意**: C007 Disclosure 端点存在后端 bug，Step 9 可能返回 400/500，需记录为已知问题
- Agent Profile 有独立端点: `/api/v1/agents/:id/profile/l1`, `l2`, `l3`, `completion`
- **注意**: Agent Profile 端点存在 FK 约束 bug (`agent_profiles_scene_id_fkey`)，L1/completion 端点可能返回 500
- config 字段为自由格式 JSON，直接嵌套在 agent 更新中
- 清理步骤很重要，避免测试数据残留

## Viewport 设置

```javascript
await page.setViewportSize({ width: 390, height: 844 });
```
