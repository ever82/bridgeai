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

- evaluate_script: 登录获取 auth token
  ```javascript
  const loginRes = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'e2e_test@example.com', password: 'Test@1234' }),
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.accessToken || loginData.accessToken;
  ```
- 验证 token 存在且非空
- 如果登录失败，先执行注册流程

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
      text: '我想找一个北京的摄影师，预算5000元左右，周末可以拍摄',
      scene: 'visionshare',
      options: { requireClarification: true, language: 'zh-CN' },
    }),
  });
  const data = await response.json();
  ```
- 验证 response.status === 200
- 验证 `data.success === true`
- 验证 data.data 包含以下结构：
  - `data.data.demand` 包含: rawText, intent, entities, confidence, clarificationNeeded, clarificationQuestions
  - `data.data.demand.clarificationNeeded === false`（信息充足）
  - `data.data.demand.entities` 包含提取的实体（预算、地点、时间等）
  - `data.data.demand.confidence` 为 0-1 之间的数字
- 验证 `data.data.l2Data` 包含映射后的 L2 结构化数据
- 验证 `data.data.summary.scene === 'visionshare'`
- 验证 `data.data.summary.mappedFieldCount > 0`
- 验证 `data.meta.latencyMs` 存在

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
      text: '帮我找个摄影师',
      scene: 'visionshare',
      options: { requireClarification: true },
    }),
  });
  const data = await response.json();
  ```
- 验证 response.status === 200
- 验证 `data.data.demand.clarificationNeeded === true`（信息不足需要补充）
- 验证 `data.data.demand.clarificationQuestions` 为数组且长度 > 0
- 验证 `data.data.validation.completenessScore` 较低（< 0.7）

### 4. 测试多轮对话补充信息

- 第一轮：发送模糊描述，获取 clarificationQuestions
  ```javascript
  const r1 = await fetch('/api/v1/ai/extract-demand', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      text: '我想找摄影师',
      scene: 'visionshare',
      options: { requireClarification: true },
    }),
  });
  const d1 = await r1.json();
  // 记录 clarificationQuestions
  ```
- 第二轮：补充信息后重新提交
  ```javascript
  const r2 = await fetch('/api/v1/ai/extract-demand', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      text: '我想找北京的摄影师，预算3000-5000，下周末有空',
      scene: 'visionshare',
      context: { previousExtraction: d1.data },
      options: { requireClarification: true },
    }),
  });
  const d2 = await r2.json();
  ```
- 验证第二轮 clarificationNeeded === false 或 completenessScore 显著提高
- 验证第二轮提取了更多实体（地点、预算、时间）

### 5. 测试需求确认

- evaluate_script 调用 `POST /api/v1/ai/extract-demand/:id/confirm`：
  ```javascript
  const extractionId = data.data.demand.id;
  const response = await fetch(`/api/v1/ai/extract-demand/${extractionId}/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      confirmed: true,
      corrections: {},
    }),
  });
  const confirmData = await response.json();
  ```
- 验证 status=200
- 验证 `confirmData.data.confirmed === true`
- 验证 `confirmData.data.confirmedAt` 时间戳存在

### 6. 测试场景配置获取

- evaluate_script 调用 `GET /api/v1/ai/scenes/visionshare/config`：
  ```javascript
  const response = await fetch('/api/v1/ai/scenes/visionshare/config', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json();
  ```
- 验证 response.status === 200
- 验证 `data.data.schema` 包含：
  - `id`, `version`, `title`, `description`
  - `fields` 数组，每个 field 有 id, type, label, required
  - `groups` 分组信息
  - `steps` 步骤信息

### 7. 测试批量提取

- evaluate_script 调用 `POST /api/v1/ai/extract-demand/batch`：
  ```javascript
  const response = await fetch('/api/v1/ai/extract-demand/batch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      items: [
        { id: '1', text: '需要上海婚礼摄影师，预算1万' },
        { id: '2', text: '找广州产品摄影师拍商品图' },
      ],
      scene: 'visionshare',
    }),
  });
  const data = await response.json();
  ```
- 验证 status=200
- 验证 `data.data.summary.total === 2`
- 验证 `data.data.results` 为数组
- 验证每个 result 包含 intent, entities, confidence

### 8. 测试无效输入

- evaluate_script 调用空文本：
  ```javascript
  const response = await fetch('/api/v1/ai/extract-demand', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text: '', scene: 'visionshare' }),
  });
  ```
- 验证返回 status 400
- 验证 error.code === 'INVALID_REQUEST'

- 测试无效场景：
  ```javascript
  const response = await fetch('/api/v1/ai/extract-demand', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text: '测试文本', scene: 'invalid_scene' }),
  });
  ```
- 验证返回 status 400
- 验证 error.code === 'INVALID_SCENE'

### 9. 测试反馈提交

- evaluate_script 调用 `POST /api/v1/ai/extract-demand/feedback`：
  ```javascript
  const response = await fetch('/api/v1/ai/extract-demand/feedback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      extractionId: extractionId,
      rating: 4,
      feedback: 'Extraction was mostly accurate',
      corrections: { budget: '应该是6000元' },
    }),
  });
  const data = await response.json();
  ```
- 验证 status=200
- 验证 `data.data.received === true`

## 验证点

| 测试用例          | 验证点                                                         |
| ----------------- | -------------------------------------------------------------- |
| 完整需求描述      | status=200, data.success=true, clarificationNeeded=false       |
| 模糊需求描述      | status=200, clarificationNeeded=true, questions.length > 0     |
| 多轮对话          | 第二轮 completenessScore 提高，实体数量增加                    |
| 需求确认          | status=200, confirmed=true, confirmedAt 存在                   |
| 场景配置获取      | status=200, schema 含 fields/groups/steps                      |
| 批量提取          | status=200, summary.total=2, results 为数组                    |
| 空文本输入        | status=400, error.code=INVALID_REQUEST                         |
| 无效场景          | status=400, error.code=INVALID_SCENE                           |
| 反馈提交          | status=200, data.received=true                                 |
| 结构化数据 - 实体 | 完整需求中 entities 包含预算/地点/时间信息                     |
| L2 映射           | l2Data 非空, mappedFieldCount > 0                              |

## 执行提示

Claude Code 执行时使用以下工具：

1. `mcp__chrome-devtools__navigate_page` - 导航到应用页面
2. `mcp__chrome-devtools__evaluate_script` - 执行 fetch API 调用
3. `mcp__chrome-devtools__take_snapshot` - 验证页面状态
4. `mcp__chrome-devtools__list_console_messages` - 检查控制台错误
5. `mcp__chrome-devtools__take_screenshot` - 截图记录

## 已知 Bug

- **L2 映射逻辑不完整**: 提取的 entities（location/budget/time/person）未能映射到 L2 字段（contentType/purpose/skillLevel）。导致 `mappedFieldCount=0`、`completenessScore=0`、`l2Data={}`、即使输入完整信息 `clarificationNeeded` 仍为 `true`。**高优先级**。
- **Demand 响应缺少 `id` 字段**: `data.data.demand` 仅包含 `[rawText, intent, entities, confidence, clarificationNeeded, clarificationQuestions]`，无法直接用于 `/confirm` 和 `/feedback` 调用。客户端需 fallback 到 `meta.requestId`。
- **`meta.requestId` 包含 "undefined-" 前缀**: 形如 `undefined-1777089955474`，疑似 ID 生成逻辑中模板字符串使用了未定义变量。
- **Web→API 代理缺失**: 开发模式下前端 8081 不代理 API 请求到 3001，需直接调用 `http://localhost:3001/api/v1/...`。
- **Scene schema 缺少 `groups`**: `GET /api/v1/ai/scenes/:scene/config` 返回的 schema 不包含 `groups` 字段（仅含 id/version/title/description/fields/steps）。

## 注意事项

- 所有 API 调用通过 evaluate_script 在浏览器上下文中执行
- **重要**: API 应直接调用 `http://localhost:3001/api/v1/...`（开发模式 8081 不代理）
- API 请求体字段为 `text`（非 description）和 `scene`（非 agentType）
- 响应结构为 `{ success, data: { demand, l2Data, mapping, validation, summary }, meta }`
- 批量提取注意不要超过 API 速率限制
- 认证使用 Bearer token，需要先登录获取
- 若需 confirm/feedback 调用，注意 demand.id 字段缺失，可使用 meta.requestId 作为 fallback

## Viewport 设置

```javascript
await page.setViewportSize({ width: 390, height: 844 });
```
