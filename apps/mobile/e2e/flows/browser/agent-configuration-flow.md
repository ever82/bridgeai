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
- 已创建至少一个测试 Agent（可复用 agent-creation-flow 创建的 Agent）
- 使用 evaluate_script 直接调用 API

## 步骤

### 1. 获取认证 Token 和测试 Agent

- evaluate_script: 获取 auth token
- evaluate_script 调用 `GET /api/v1/agents` 获取已有 Agent 列表：
  ```javascript
  const response = await fetch('/api/v1/agents?limit=10', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  ```
- 如果列表为空，先执行 agent-creation-flow 创建一个 Agent
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
      config: {
        scene: {},
        ai: {},
      },
    }),
  });
  const data = await response.json();
  ```
- 验证 status=201 或 200
- 验证返回 Agent 对象包含 id, name, type, status 等字段
- 记录新创建的 Agent ID

### 3. Agent CRUD - 读取测试

- evaluate_script 调用 `GET /api/v1/agents/:agentId`：
  ```javascript
  const response = await fetch(`/api/v1/agents/${agentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  ```
- 验证 status=200
- 验证返回数据与创建时的数据一致
- 验证 config.scene 和 config.ai 字段存在

### 4. Region Filter 配置 (C003)

- evaluate_script 调用 `PUT /api/v1/agents/:agentId` 更新区域过滤：
  ```javascript
  const response = await fetch(`/api/v1/agents/${agentId}`, {
    method: 'PUT',
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
- 说明：PUT 是完整替换语义，每次调用需要发送完整 config 对象，否则未包含的字段会被清空
- 重新读取 Agent 验证 regionFilter 已保存
- 测试禁用区域过滤（enabled: false）

### 5. Attribute Filter 配置 (C004)

- evaluate_script 调用 `PUT /api/v1/agents/:agentId` 更新属性过滤：
  ```javascript
  const response = await fetch(`/api/v1/agents/${agentId}`, {
    method: 'PUT',
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
- 重新读取 Agent 验证 attributeFilter 配置已保存

### 6. Credit Filter 配置 (C005)

- evaluate_script 调用 `PUT /api/v1/agents/:agentId` 更新信用设置：
  ```javascript
  const response = await fetch(`/api/v1/agents/${agentId}`, {
    method: 'PUT',
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
- 验证信用设置可访问且可更新
- 验证 minCreditScore 值已保存

### 7. Disclosure Control 配置 (C007)

- evaluate_script 调用 `PUT /api/v1/agents/:agentId` 更新隐私披露设置：
  ```javascript
  const response = await fetch(`/api/v1/agents/${agentId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      config: {
        scene: {
          disclosureControl: {
            enabled: true,
            fields: [
              { fieldName: 'phone', disclosureLevel: 'MATCHED_ONLY' },
              { fieldName: 'location', disclosureLevel: 'PUBLIC' },
              { fieldName: 'realName', disclosureLevel: 'PRIVATE' },
            ],
          },
        },
      },
    }),
  });
  const data = await response.json();
  ```
- 验证 status=200
- 重新读取 Agent 验证 disclosure 设置已保存
- 验证 disclosureLevel 的枚举值有效（PUBLIC, MATCHED_ONLY, PRIVATE）

### 8. Agent 状态变更测试

- evaluate_script 调用状态变更接口：

  ```javascript
  // 激活 Agent
  const activateResponse = await fetch(`/api/v1/agents/${agentId}/activate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  // 暂停 Agent
  const deactivateResponse = await fetch(`/api/v1/agents/${agentId}/deactivate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  ```

- 验证状态变更成功
- 如果状态变更接口路径不同，根据实际路由调整
- 注：单独的状态变更端点也可使用 `PATCH /api/v1/agents/:agentId/status`（推荐使用此路径）

### 9. Agent CRUD - 更新测试

- evaluate_script 调用 `PATCH /api/v1/agents/:agentId` 更新基本信息：
  ```javascript
  const response = await fetch(`/api/v1/agents/${agentId}`, {
    method: 'PATCH',
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
- 重新读取 Agent 验证更新已生效

### 10. 清理测试数据

- evaluate_script 调用 `DELETE /api/v1/agents/:agentId` 删除测试 Agent：
  ```javascript
  const response = await fetch(`/api/v1/agents/${agentId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  ```
- 验证删除成功（status=200 或 204）
- 重新获取列表验证 Agent 已移除

## 验证点

| 测试用例                | 验证点                                  |
| ----------------------- | --------------------------------------- |
| Agent 创建              | status=201/200, 返回含 id 的 Agent 对象 |
| Agent 读取              | status=200, 数据与创建一致              |
| Region Filter (C003)    | 可设置/禁用区域过滤，数据持久化         |
| Attribute Filter (C004) | 可设置属性过滤条件，数据持久化          |
| Credit Filter (C005)    | 可设置最低信用分，数据持久化            |
| Disclosure (C007)       | 可设置字段披露级别，数据持久化          |
| Agent 状态变更          | activate/deactivate 接口正常            |
| Agent 更新              | PATCH 请求更新基本信息成功              |
| Agent 删除              | DELETE 请求删除成功，列表中不再存在     |

## 执行提示

Claude Code 执行时使用以下工具：

1. `mcp__chrome-devtools__navigate_page` - 导航到应用页面
2. `mcp__chrome-devtools__evaluate_script` - 执行所有 API 调用
3. `mcp__chrome-devtools__list_network_requests` - 检查 API 请求列表
4. `mcp__chrome-devtools__get_network_request` - 查看特定请求详情
5. `mcp__chrome-devtools__list_console_messages` - 检查控制台错误
6. `mcp__chrome-devtools__take_screenshot` - 截图记录

## 注意事项

- 所有配置测试通过 API 调用完成，不依赖 UI 交互
- Agent ID 在创建步骤中获取，后续步骤使用同一个 ID
- PUT 是完整替换语义：更新 config 时需发送完整 config 对象，未包含的字段会被清空，建议先 GET 读取现有配置再 PUT 更新
- 单独的状态变更使用 `PATCH /api/v1/agents/:agentId/status`，其他字段（name, description 等）可使用 PATCH
- 清理步骤很重要，避免测试数据残留
- API 路径可能需要根据实际后端路由微调

## Viewport 设置

```javascript
await page.setViewportSize({ width: 390, height: 844 });
```
