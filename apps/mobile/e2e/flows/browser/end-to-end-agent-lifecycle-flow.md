# End-to-End Agent Lifecycle Flow - P0 全流程验证

## 关联 Story

- US-AGENT-001: 创建个人 Agent
- US-AGENT-002: 通过与 Agent 对话创建需求和供给
- AS-001: 我被创建了
- AS-002: 创建主人的需求
- AS-003: 创建主人的供给

## 常驻测试账号

- Email: `e2e_test@example.com`
- Password: `Test@1234`
- 如账号不存在则先执行注册（仅首次）

## 前置条件

- Web 服务器运行在 localhost:8081
- API 服务正常运行
- 数据库可连接
- AI 服务可用（LLM 路由已配置）

## 全流程概述

```
登录 → (首次注册) → 创建 Agent → 配置 Agent → 提取需求 → 提取供给 → 验证完整生命周期
```

## 步骤

### Phase 1: 登录常驻测试账号

```javascript
// 尝试登录常驻测试账号
let loginRes = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'e2e_test@example.com',
    password: 'Test@1234',
  }),
});

// 如果账号不存在，先注册
if (loginRes.status === 401 || loginRes.status === 404) {
  const regRes = await fetch('/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'e2e_test@example.com',
      password: 'Test@1234',
      name: 'E2E Test User',
    }),
  });
  const regData = await regRes.json();
  // 注册后获取 token
}

const loginData = await loginRes.json();
const token = loginData.data?.accessToken || loginData.accessToken;
const refreshToken = loginData.data?.refreshToken || loginData.refreshToken;

// 验证 token 有效
const meRes = await fetch('/api/v1/auth/me', {
  headers: { Authorization: `Bearer ${token}` },
});
const meData = await meRes.json();
```

- 验证登录成功或注册成功
- 验证 GET /auth/me 返回用户信息

### Phase 2: 创建 Agent (US-AGENT-001 / AS-001)

```javascript
const createRes = await fetch('/api/v1/agents', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    type: 'VISIONSHARE',
    name: 'Lifecycle VisionShare Agent',
    description: 'End-to-end lifecycle test agent for VisionShare scene',
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 2048,
    systemPrompt: '你是一个专业的摄影服务 Agent，擅长匹配摄影需求和供给',
    isPublic: true,
    config: {
      scene: { visionshare: true },
      communicationStyle: 'detailed',
    },
  }),
});
const createData = await createRes.json();
const agentId = createData.data.id;
```

- 验证 status=201 或 200
- 验证 agentId 存在（UUID）
- **US-AGENT-001 AC: 用户选择场景** → VISIONSHARE 已选择
- **US-AGENT-001 AC: 配置沟通风格** → communicationStyle: detailed

### Phase 3: 验证 Agent 初始画像 (US-AGENT-001 AC: Agent 生成初始画像)

```javascript
// 验证 Agent 详情
const agentRes = await fetch(`/api/v1/agents/${agentId}`, {
  headers: { Authorization: `Bearer ${token}` },
});
const agentData = await agentRes.json();

// 验证 L1 profile
const l1Res = await fetch(`/api/v1/agents/${agentId}/profile/l1`, {
  headers: { Authorization: `Bearer ${token}` },
});
const l1Data = await l1Res.json();

// 验证 profile completion
const completionRes = await fetch(`/api/v1/agents/${agentId}/profile/completion`, {
  headers: { Authorization: `Bearer ${token}` },
});
const completionData = await completionRes.json();
```

- 验证 Agent 详情包含正确的 type, name, model
- 验证 L1 profile 可访问
- 验证 profile completion 返回完成度信息

### Phase 4: 配置 Agent (C003-C005, C007)

```javascript
// 配置 Region Filter (C003)
await fetch(`/api/v1/agents/${agentId}`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    config: {
      scene: {
        regionFilter: { enabled: true, regions: ['北京'], maxDistance: 50 },
        creditFilter: { enabled: true, minCreditScore: 60 },
      },
    },
  }),
});

// 配置 Disclosure (C007)
await fetch(`/api/v1/disclosure/${agentId}/settings`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    settings: [
      { fieldName: 'phone', disclosureLevel: 'MATCHED_ONLY' },
      { fieldName: 'location', disclosureLevel: 'PUBLIC' },
    ],
  }),
});
```

- 验证所有配置操作 status=200

### Phase 5: 提取需求 (US-AGENT-002 / AS-002)

#### 5.1 完整需求提取

```javascript
const demandRes = await fetch('/api/v1/ai/extract-demand', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    text: '我想找一个北京的摄影师，预算5000元左右，周末可以拍摄，需要人像摄影',
    scene: 'visionshare',
    options: { requireClarification: true, language: 'zh-CN' },
  }),
});
const demandData = await demandRes.json();
```

- 验证 success=true
- 验证 demand.clarificationNeeded === false
- 验证 demand.entities 包含地点、预算、时间信息
- 验证 l2Data 非空
- **US-AGENT-002 AC: 从对话中自动提取关键字段并分类**

#### 5.2 模糊需求 → 多轮对话补充

```javascript
const vagueDemandRes = await fetch('/api/v1/ai/extract-demand', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    text: '帮我找个摄影师',
    scene: 'visionshare',
  }),
});
const vagueData = await vagueDemandRes.json();
```

- 验证 clarificationNeeded === true
- 验证 clarificationQuestions.length > 0
- **US-AGENT-002 AC: Agent 主动追问关键信息**

#### 5.3 确认需求

```javascript
const extractionId = demandData.data.demand.id;
const confirmRes = await fetch(`/api/v1/ai/extract-demand/${extractionId}/confirm`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ confirmed: true }),
});
```

- **US-AGENT-002 AC: 用户确认后自动保存到对应场景**

#### 5.4 获取场景配置

```javascript
const sceneConfigRes = await fetch('/api/v1/ai/scenes/visionshare/config', {
  headers: { Authorization: `Bearer ${token}` },
});
```

- 验证返回场景 schema

### Phase 6: 提取供给 (US-AGENT-002 / AS-003)

#### 6.1 完整供给提取

```javascript
const supplyRes = await fetch('/api/v1/ai/extract-supply', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    text: '我是北京的专业摄影师，擅长人像和风景摄影，10年经验，价格3000-8000元',
    scene: 'visionshare',
    agent_id: agentId,
  }),
});
const supplyData = await supplyRes.json();
```

- 验证 success=true
- 验证 supply 含 title, description, service_type, pricing, location
- 验证 quality_report.overall_quality > 0
- **US-AGENT-002 AC: 从对话中自动提取关键字段并分类**

#### 6.2 验证供给已保存到 Agent Profile

```javascript
const qualityRes = await fetch(`/api/v1/ai/extract-supply/quality/${agentId}`, {
  headers: { Authorization: `Bearer ${token}` },
});
const qualityData = await qualityRes.json();
```

- 验证 status=200
- 验证 reports 包含刚才提取的数据
- **US-AGENT-002 AC: 用户确认后自动保存到对应场景**

### Phase 7: 最终验证

```javascript
// 验证 Agent 列表包含创建的 Agent
const listRes = await fetch('/api/v1/agents?limit=10', {
  headers: { Authorization: `Bearer ${token}` },
});
const listData = await listRes.json();

// 验证 Agent Profile L1/L2 数据
const l1FinalRes = await fetch(`/api/v1/agents/${agentId}/profile/l1`, {
  headers: { Authorization: `Bearer ${token}` },
});
const l2FinalRes = await fetch(`/api/v1/agents/${agentId}/profile/l2`, {
  headers: { Authorization: `Bearer ${token}` },
});
```

- 验证 Agent 存在于列表中
- 验证 Profile 数据完整

### Phase 8: 清理

```javascript
// 删除本流程创建的测试 Agent（保留常驻账号）
await fetch(`/api/v1/agents/${agentId}`, {
  method: 'DELETE',
  headers: { Authorization: `Bearer ${token}` },
});

// 不登出常驻账号，保留给其他 flow 使用
```

## AC 验证矩阵

| Story         | AC                              | 验证步骤           | 验证方式                                    |
| ------------- | ------------------------------- | ------------------ | ------------------------------------------- |
| US-AGENT-001  | 用户设置昵称和头像              | Phase 1 + 3        | name 字段设置，头像通过 upload API          |
| US-AGENT-001  | 用户选择感兴趣的场景（可多选）  | Phase 3            | type=VISIONSHARE，config.scene.visionshare  |
| US-AGENT-001  | 配置 Agent 沟通风格             | Phase 3            | config.communicationStyle='detailed'        |
| US-AGENT-001  | Agent 生成初始画像              | Phase 4            | profile L1/L2/completion 可访问             |
| US-AGENT-002  | 文字告诉 Agent 需求             | Phase 6.1          | extract-demand API 返回结构化数据           |
| US-AGENT-002  | Agent 主动追问关键信息          | Phase 6.2          | clarificationNeeded=true, questions > 0     |
| US-AGENT-002  | 多轮对话逐步完善信息            | Phase 6.2 → 6.1    | 两轮提取对比 completenessScore              |
| US-AGENT-002  | 自动提取关键字段并分类          | Phase 6.1, 7.1     | entities/l2Data 包含结构化字段              |
| US-AGENT-002  | 用户确认后自动保存              | Phase 6.3, 7.2     | confirm API + quality report 验证           |
| AS-001        | Agent 创建成功                  | Phase 3            | POST /agents 返回 agentId                   |
| AS-002        | 需求提取成功                    | Phase 6            | extract-demand 返回完整结构                 |
| AS-003        | 供给提取成功                    | Phase 7            | extract-supply 返回完整结构                 |

## 执行提示

Claude Code 执行时使用以下工具：

1. `mcp__chrome-devtools__navigate_page` - 导航到应用
2. `mcp__chrome-devtools__evaluate_script` - 执行所有 API 调用
3. `mcp__chrome-devtools__take_snapshot` - 查看页面状态
4. `mcp__chrome-devtools__take_screenshot` - 每个阶段截图记录
5. `mcp__chrome-devtools__list_console_messages` - 检查错误

## 注意事项

- 此流程覆盖所有 P0 story 的 AC，是 P0 验证的最终依据
- 每个阶段的 token 需要检查是否过期，必要时刷新
- AI 提取步骤依赖 LLM 服务可用性，如果 LLM 不可用，记录错误并跳过
- 清理阶段确保不留下测试数据
- 使用唯一的时间戳邮箱确保每次运行独立

## Viewport 设置

```javascript
await page.setViewportSize({ width: 390, height: 844 });
```
