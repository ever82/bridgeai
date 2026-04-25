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

- evaluate_script: 从浏览器存储中获取 auth token
- 验证 token 存在且非空

### 2. 测试完整供给描述

- evaluate_script 调用 `POST /api/v1/ai/supply/extract-supply`：
  ```javascript
  const response = await fetch('/api/v1/ai/supply/extract-supply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      text: '我是北京的专业摄影师，擅长人像和风景摄影，价格3000-8000元',
      scene: 'visionshare',
    }),
  });
  const data = await response.json();
  ```
- 验证 response.status === 200
- 验证返回结构化数据：
  - 包含 location/profession/priceRange 等提取字段
  - clarificationNeeded === false（信息充足）

### 3. 测试多场景供给提取

#### 3.1 VisionShare 场景

- evaluate_script 调用 extract-supply，scene = "visionshare"：
  ```javascript
  const response = await fetch('/api/v1/ai/supply/extract-supply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      text: '我是上海的美妆师，擅长新娘妆和日常妆，5年经验',
      scene: 'visionshare',
    }),
  });
  const data = await response.json();
  ```
- 验证 status=200
- 验证提取结果包含场景特定字段

#### 3.2 AgentDate 场景

- evaluate_script 调用 extract-supply，scene = "agentdate"：
  ```javascript
  const response = await fetch('/api/v1/ai/supply/extract-supply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      text: '我是28岁的软件工程师，喜欢户外运动和旅行，住在北京',
      scene: 'agentdate',
    }),
  });
  const data = await response.json();
  ```
- 验证 status=200
- 验证返回不同的字段结构（适合约会场景）

#### 3.3 AgentJob 场景

- evaluate_script 调用 extract-supply，scene = "agentjob"：
  ```javascript
  const response = await fetch('/api/v1/ai/supply/extract-supply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      text: '5年前端开发经验，精通 React 和 TypeScript，期望薪资30-50k',
      scene: 'agentjob',
    }),
  });
  const data = await response.json();
  ```
- 验证 status=200
- 验证返回包含技能、经验、薪资等字段

### 4. 测试批量提取

- evaluate_script 依次调用多次 extract-supply：

  ```javascript
  const descriptions = [
    { desc: '北京婚礼摄影师，10年经验', scene: 'visionshare' },
    { desc: '广州自由设计师，擅长品牌设计', scene: 'visionshare' },
    { desc: '数据分析师，Python 和 SQL', scene: 'agentjob' },
  ];

  const results = await Promise.all(
    descriptions.map(item =>
      fetch('/api/v1/ai/supply/extract-supply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: item.desc,
          scene: item.scene,
        }),
      }).then(r => r.json())
    )
  );
  ```

- 验证所有请求返回 status=200
- 验证每个结果都包含有效的结构化数据

### 5. 测试反馈提交

- evaluate_script 调用反馈接口：
  ```javascript
  const response = await fetch('/api/v1/ai/extract-supply/feedback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      extractionId: '<extraction_id_from_step_2>',
      feedback: 'CORRECT',
      corrections: {},
    }),
  });
  const data = await response.json();
  ```
- 验证反馈提交成功（status=200 或 201）
- 如果接口返回 404，记录接口路径并跳过

### 6. 测试模糊供给描述

- evaluate_script 调用 extract-supply，描述信息不足：
  ```javascript
  const response = await fetch('/api/v1/ai/supply/extract-supply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      text: '我是做设计的',
      scene: 'visionshare',
    }),
  });
  const data = await response.json();
  ```
- 验证 clarificationNeeded === true
- 验证返回补充信息提示

## 验证点

| 测试用例         | 验证点                                                |
| ---------------- | ----------------------------------------------------- |
| 完整供给描述     | status=200, 结构化数据完整, clarificationNeeded=false |
| VisionShare 场景 | status=200, 包含视觉相关字段                          |
| AgentDate 场景   | status=200, 包含社交/约会相关字段                     |
| AgentJob 场景    | status=200, 包含技能/薪资/经验字段                    |
| 批量提取         | 所有请求 status=200, 每个结果有效                     |
| 反馈提交         | status=200/201 或记录 404                             |
| 模糊供给描述     | status=200, clarificationNeeded=true                  |
| 无效输入         | 返回 400 或 validation error                          |

## 执行提示

Claude Code 执行时使用以下工具：

1. `mcp__chrome-devtools__navigate_page` - 导航到应用页面
2. `mcp__chrome-devtools__evaluate_script` - 执行 fetch API 调用
3. `mcp__chrome-devtools__list_console_messages` - 检查网络和控制台错误
4. `mcp__chrome-devtools__list_network_requests` - 查看网络请求列表
5. `mcp__chrome-devtools__get_network_request` - 检查特定请求详情
6. `mcp__chrome-devtools__take_screenshot` - 截图记录

## 注意事项

- 所有 API 调用通过 evaluate_script 在浏览器上下文中执行
- scene 枚举值：visionshare, agentdate, agentjob, agentad（全小写）
- 批量提取注意不要超过 API 速率限制
- 反馈接口路径可能需要根据实际后端路由调整

## Viewport 设置

```javascript
await page.setViewportSize({ width: 390, height: 844 });
```
