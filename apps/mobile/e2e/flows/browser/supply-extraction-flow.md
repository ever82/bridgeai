# Supply Extraction Flow - 供给提取 API 测试

## 关联 Issue

- US-AGENT-002
- AS-003

## 前置条件

- Web 服务器运行在 localhost:8081
- API 服务正常运行
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

### 2. 测试完整供给描述

- evaluate_script 调用 `POST /api/v1/ai/extract-supply`：
  ```javascript
  const response = await fetch('/api/v1/ai/extract-supply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      text: '我是北京的专业摄影师，擅长人像和风景摄影，价格3000-8000元，10年经验',
      scene: 'visionshare',
    }),
  });
  const data = await response.json();
  ```
- 验证 response.status === 200
- 验证 `data.success === true`
- 验证 data.data.supply 结构：
  - `title` 非空
  - `description` 非空
  - `service_type` 存在
  - `capabilities` 数组或对象
  - `pricing` 包含价格信息
  - `location` 包含地点信息
  - `experience` 包含经验信息
- 验证 data.data.quality_report 包含：
  - `overall_quality` 数值
  - `confidence` 数值
  - `completeness` 数值
  - `fields_extracted` 数字 > 0
- 验证 data.data.metadata 包含：
  - `provider`, `model`, `latency_ms`

### 3. 测试多场景供给提取

#### 3.1 VisionShare 场景

- evaluate_script 调用 extract-supply，scene = "visionshare"：
  ```javascript
  const response = await fetch('/api/v1/ai/extract-supply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      text: '我是上海的美妆师，擅长新娘妆和日常妆，5年经验，价格800-2000元',
      scene: 'visionshare',
      options: { include_pricing: true, include_location: true },
    }),
  });
  const data = await response.json();
  ```
- 验证 status=200, data.success=true
- 验证提取结果包含 service_type, pricing, location, experience 等字段

#### 3.2 AgentDate 场景

- evaluate_script 调用 extract-supply，scene = "agentdate"：
  ```javascript
  const response = await fetch('/api/v1/ai/extract-supply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      text: '我是28岁的软件工程师，喜欢户外运动和旅行，住在北京，性格开朗，喜欢猫',
      scene: 'agentdate',
    }),
  });
  const data = await response.json();
  ```
- 验证 status=200
- 验证返回包含场景特定字段（年龄、兴趣、性格等）

#### 3.3 AgentJob 场景

- evaluate_script 调用 extract-supply，scene = "agentjob"：
  ```javascript
  const response = await fetch('/api/v1/ai/extract-supply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      text: '5年前端开发经验，精通 React 和 TypeScript，熟悉 Node.js，期望薪资30-50k，在北京',
      scene: 'agentjob',
      options: { include_capabilities: true, include_experience: true },
    }),
  });
  const data = await response.json();
  ```
- 验证 status=200
- 验证返回包含 skills, experience, pricing 等字段

### 4. 测试批量提取

- evaluate_script 调用 `POST /api/v1/ai/extract-supply/bulk`：
  ```javascript
  const response = await fetch('/api/v1/ai/extract-supply/bulk', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      items: [
        { text: '北京婚礼摄影师，10年经验，精通婚礼跟拍', scene: 'visionshare' },
        { text: '广州自由设计师，擅长品牌设计和UI设计，3年经验', scene: 'visionshare' },
        { text: '数据分析师，精通 Python 和 SQL，5年经验，期望20-30k', scene: 'agentjob' },
      ],
    }),
  });
  const data = await response.json();
  ```
- 验证 status=200
- 验证 `data.data.summary.total === 3`
- 验证 `data.data.results` 为数组，每项含 supply, fields_extracted, quality
- 验证 `data.data.quality_report` 存在

### 5. 测试模糊供给描述

- evaluate_script 调用 extract-supply，描述信息不足：
  ```javascript
  const response = await fetch('/api/v1/ai/extract-supply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      text: '我是做设计的，有一些经验，价格可以商量',
      scene: 'visionshare',
      options: { min_confidence: 70 },
    }),
  });
  const data = await response.json();
  ```
- 验证 status=200
- 验证 quality_report.confidence 较低或 completeness 较低
- 验证 fields_failed 包含未能提取的字段

### 6. 测试供给质量报告

- evaluate_script 调用 `GET /api/v1/ai/extract-supply/quality/:agentId`：
  ```javascript
  // 先创建 Agent 并提取供给以获取 agentId
  // 然后查询质量报告
  const response = await fetch(`/api/v1/ai/extract-supply/quality/${agentId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  ```
- 验证 status=200 或 404（如果没有提取历史）
- 如果 200，验证 data.data 包含 agent_id, scenes, reports

### 7. 测试无效输入

- 测试文本过短（< 10 字符）：
  ```javascript
  const response = await fetch('/api/v1/ai/extract-supply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text: '拍照', scene: 'visionshare' }),
  });
  ```
- 验证返回 validation error (400)

- 测试缺少必填字段：
  ```javascript
  const response = await fetch('/api/v1/ai/extract-supply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text: '我是专业摄影师' }),
  });
  ```
- 验证返回 validation error (400)

### 8. 测试供给同步

- evaluate_script 调用 `POST /api/v1/ai/extract-supply/sync`：
  ```javascript
  const response = await fetch('/api/v1/ai/extract-supply/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      supply_id: '00000000-0000-0000-0000-000000000001',
      data: { title: 'Updated Supply', pricing: { range: '5000-10000' } },
    }),
  });
  const data = await response.json();
  ```
- 验证 status=200
- 验证 `data.data.synced_at` 存在
- 验证 `data.data.fields_updated` 包含更新的字段

## 验证点

| 测试用例           | 验证点                                                   |
| ------------------ | -------------------------------------------------------- |
| 完整供给描述       | status=200, supply 含 title/description/service_type     |
| VisionShare 场景   | status=200, 包含视觉相关字段                             |
| AgentDate 场景     | status=200, 包含社交/约会相关字段                        |
| AgentJob 场景      | status=200, 包含技能/薪资/经验字段                       |
| 批量提取           | status=200, summary.total=3, results 为数组              |
| 模糊供给描述       | status=200, confidence/completeness 较低                 |
| 质量报告           | status=200 或 404, data 含 agent_id/scenes               |
| 文本过短           | 返回 400 validation error                                |
| 缺少必填字段       | 返回 400 validation error                                |
| 供给同步           | status=200, synced_at 存在, fields_updated 含更新字段    |

## 执行提示

Claude Code 执行时使用以下工具：

1. `mcp__chrome-devtools__navigate_page` - 导航到应用页面
2. `mcp__chrome-devtools__evaluate_script` - 执行 fetch API 调用
3. `mcp__chrome-devtools__list_console_messages` - 检查网络和控制台错误
4. `mcp__chrome-devtools__list_network_requests` - 查看网络请求列表
5. `mcp__chrome-devtools__get_network_request` - 检查特定请求详情
6. `mcp__chrome-devtools__take_screenshot` - 截图记录

## 已知 Bug

- **Validation Middleware Bug (Critical)**: `supply.ts` line 99 使用 `validateRequest(extractSupplySchema)` 但应使用 `validateRequest({ body: extractSupplySchema })`。导致所有 4 个端点的输入验证被跳过，短文本和缺少 scene 字段都返回 200。
- **批量提取超时**: `extractBulk()` 顺序处理每个 item（3x10s LLM 调用），超出服务器 30s 超时。应改用并发或增加超时。
- **AgentDate 场景不提取特定字段**: age/interests/personality 未映射到结构化字段，仅嵌入 description。`buildExtractionPrompt()` 不按场景调整提取字段。
- **Quality Report 始终 404**: `storeExtractionResult()` 做 `Scene.findUnique({ where: { code: scene.toUpperCase() } })` 查询，但 Scene 表可能没有匹配记录。
- **`fields_failed` 始终为空**: 即使模糊描述，LLM 也用占位值填充而非报告缺失字段。

## 注意事项

- **重要路径修正**: 实际 API 路径为 `/api/v1/ai/supply/extract-supply`（因为 `ai/index.ts` 将 supply 路由挂载在 `/supply` 前缀下），批量提取为 `/api/v1/ai/supply/extract-supply/bulk`
- **重要**: 开发模式下 API 直接调用 `http://localhost:3001`（前端 8081 不代理）
- 请求体字段: `text`（10-5000字）, `scene`（必填）, `agent_id`（可选）, `options`（可选）
- scene 枚举值：visionshare, agentdate, agentjob, agentad（全小写）
- 批量提取路径为 `/api/v1/ai/supply/extract-supply/bulk`，最大 50 项
- 认证使用 Bearer token，需要先登录获取

## Viewport 设置

```javascript
await page.setViewportSize({ width: 390, height: 844 });
```
