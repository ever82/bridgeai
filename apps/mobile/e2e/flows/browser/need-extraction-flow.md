# Need Extraction Flow - 需求提取 API 测试

## 关联 Issue

- US-AGENT-002
- AS-002

## 前置条件

- Web 服务器运行在 localhost:8081
- API 服务正常运行（后端 API 可达）
- 已登录并持有有效 auth token
- 使用 evaluate_script 直接调用 API

## 步骤

### 1. 获取认证 Token

- evaluate_script: 从 localStorage/sessionStorage 或 cookie 中获取 auth token
- 验证 token 存在且非空
- 如果 token 不存在，先执行登录流程获取

### 2. 测试完整需求描述

- evaluate_script 调用 `POST /api/v1/ai/extract-demand`：
  ```javascript
  const response = await fetch('/api/v1/ai/extract-demand', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      description: '我想找一个北京的摄影师，预算5000元左右，周末可以拍摄',
      agentType: 'VISIONSHARE',
    }),
  });
  const data = await response.json();
  ```
- 验证 response.status === 200
- 验证 data 包含结构化字段：
  - `data.budget` 或类似预算字段存在
  - `data.location` 或类似位置字段包含 "北京"
  - `data.schedule` 或类似时间字段包含 "周末"
  - `data.clarificationNeeded` === false（信息充足）

### 3. 测试模糊需求描述

- evaluate_script 调用 `POST /api/v1/ai/extract-demand`：
  ```javascript
  const response = await fetch('/api/v1/ai/extract-demand', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      description: '帮我找个摄影师',
      agentType: 'VISIONSHARE',
    }),
  });
  const data = await response.json();
  ```
- 验证 response.status === 200
- 验证 `data.clarificationNeeded` === true（信息不足需要补充）
- 验证返回包含 clarification 问题或建议字段

### 4. 测试需求提取结果确认

- evaluate_script 调用确认接口（如果有）：
  ```javascript
  const response = await fetch('/api/v1/ai/extract-demand/confirm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      extractionId: data.id,
      confirmed: true,
    }),
  });
  ```
- 验证确认结果
- 如果接口不存在（404），记录并跳过
- 注：此路径可能需要根据实际后端路由调整

### 5. 测试场景配置获取

- evaluate_script 调用 `GET /api/v1/scenes/visionshare`：
  ```javascript
  const response = await fetch('/api/v1/scenes/visionshare', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json();
  ```
- 验证 response.status === 200
- 验证返回数据包含场景配置结构：
  - 包含 filter 配置项
  - 包含 display 配置项
  - 包含 AI 参数配置项

### 6. 测试无效输入

- evaluate_script 调用 `POST /api/v1/ai/extract-demand`，body 为空描述：
  ```javascript
  const response = await fetch('/api/v1/ai/extract-demand', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      description: '',
      agentType: 'VISIONSHARE',
    }),
  });
  ```
- 验证返回适当的错误状态（400 或 validation error）

## 验证点

| 测试用例          | 验证点                                                |
| ----------------- | ----------------------------------------------------- |
| 完整需求描述      | status=200, 返回结构化数据, clarificationNeeded=false |
| 模糊需求描述      | status=200, clarificationNeeded=true                  |
| 需求确认          | 确认接口返回成功或记录 404                            |
| 场景配置获取      | status=200, 返回配置结构                              |
| 空描述输入        | 返回 400 或 validation error                          |
| 结构化数据 - 预算 | 完整需求中预算字段包含 5000                           |
| 结构化数据 - 地点 | 完整需求中地点字段包含 "北京"                         |
| 结构化数据 - 时间 | 完整需求中时间字段包含 "周末"                         |

## 执行提示

Claude Code 执行时使用以下工具：

1. `mcp__chrome-devtools__navigate_page` - 导航到应用页面
2. `mcp__chrome-devtools__evaluate_script` - 执行 fetch API 调用
3. `mcp__chrome-devtools__take_snapshot` - 验证页面状态
4. `mcp__chrome-devtools__list_console_messages` - 检查控制台错误
5. `mcp__chrome-devtools__take_screenshot` - 截图记录

## 注意事项

- 所有 API 调用通过 evaluate_script 在浏览器上下文中执行，自动携带 cookie
- 如果 API 路径与实际不符，需要根据后端路由调整
- 场景配置接口路径为 `/api/v1/scenes/:sceneType`（scene ID 全小写，如 visionshare）
- 注意 token 过期问题，长时间测试时可能需要刷新

## Viewport 设置

```javascript
await page.setViewportSize({ width: 390, height: 844 });
```
