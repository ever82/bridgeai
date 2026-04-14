# BridgeAI E2E端到端测试

本项目使用 [Playwright](https://playwright.dev/) 进行端到端集成测试。

## 测试覆盖范围

### 场景测试 (Scenario Tests)
- **VisionShare**: 需求发布、接单、照片上传、AI脱敏、积分支付、AI相册检索
- **AgentDate**: 交友画像配置、Agent匹配推荐、Agent对话、双向同意引荐、人机切换
- **AgentJob**: 求职者画像、职位发布、简历智能匹配、薪资协商、面试安排
- **AgentAd**: 消费画像配置、商家优惠、Agent协商、一键购买、多商家比价

### 集成测试 (Integration Tests)
- **跨模块集成**: Auth-Core-Matching层间API契约、AI服务集成、通信层集成、信用积分全链路

### 契约测试 (Contract Tests)
- API请求/响应格式验证
- 状态码验证
- 错误处理验证
- 数据类型验证

### WebSocket测试
- 连接管理
- 房间系统
- 消息收发
- 在线状态
- 重连机制

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 运行所有测试

```bash
pnpm test:e2e
```

### 运行特定测试

```bash
# 仅运行场景测试
pnpm --filter e2e test:scenario

# 仅运行集成测试
pnpm --filter e2e test:integration

# 仅运行契约测试
pnpm --filter e2e test:contracts

# 仅运行WebSocket测试
pnpm --filter e2e test:websocket
```

### 调试模式

```bash
# 带UI界面运行
pnpm test:e2e:ui

#  headed模式（显示浏览器）
pnpm --filter e2e test:headed
```

## 测试结构

```
apps/e2e/
├── fixtures/           # 测试数据和fixtures
│   ├── test-fixtures.ts
│   └── types.ts
├── pages/              # Page Object Models
├── tests/
│   ├── scenarios/      # 场景测试
│   │   ├── visionshare.test.ts
│   │   ├── agentdate.test.ts
│   │   ├── agentjob.test.ts
│   │   └── agentad.test.ts
│   ├── integration/    # 集成测试
│   │   └── cross-module.test.ts
│   ├── contracts/      # API契约测试
│   │   └── api-contracts.test.ts
│   └── websocket/      # WebSocket测试
│       └── websocket.test.ts
├── utils/              # 工具函数
│   ├── global-setup.ts
│   └── global-teardown.ts
├── playwright.config.ts
└── package.json
```

## 配置

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `API_URL` | API服务器地址 | `http://localhost:3001` |
| `BASE_URL` | 基础URL | `http://localhost:3001` |
| `WS_URL` | WebSocket服务器地址 | `http://localhost:3001` |
| `CI` | CI环境标识 | - |

### Playwright配置

配置位于 `playwright.config.ts`，包含:
- 多浏览器支持 (Chromium, Firefox, WebKit)
- 重试机制 (CI环境重试2次)
- 截图和视频录制配置
- 并行测试配置

## 编写测试

### 基本测试结构

```typescript
import { test, expect } from '../../fixtures/test-fixtures';

test.describe('功能测试', () => {
  test('应该能完成某个功能', async ({ apiContext, testUser }) => {
    // 使用apiContext进行API测试
    const response = await apiContext.get('/api/some-endpoint', {
      headers: {
        Authorization: `Bearer ${testUser.token}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('expectedField');
  });
});
```

### 使用Fixtures

可用的fixtures:
- `apiContext`: Playwright API请求上下文
- `testUser`: 自动创建的测试用户
- `testAgent`: 自动创建的测试Agent
- `testData`: 共享测试数据

## 覆盖率报告

### 生成覆盖率报告

```bash
# 运行服务器单元测试并生成覆盖率
pnpm test:coverage:server

# 运行移动端单元测试并生成覆盖率
pnpm test:coverage:mobile

# 合并所有覆盖率报告
pnpm test:coverage
```

### 查看报告

合并后的覆盖率报告位于 `coverage/` 目录:
- `coverage/index.html` - HTML格式报告
- `coverage/coverage-summary.json` - JSON摘要

## CI/CD集成

### GitHub Actions示例

```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install dependencies
        run: pnpm install
      - name: Install Playwright
        run: pnpm --filter e2e exec playwright install
      - name: Run E2E tests
        run: pnpm test:e2e
      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: apps/e2e/test-results/
```

## 最佳实践

1. **保持测试独立**: 每个测试应该独立运行，不依赖其他测试的状态
2. **使用Fixtures**: 利用fixtures管理测试数据和资源清理
3. **明确的断言**: 使用清晰的断言消息，验证关键字段
4. **适当的等待**: 使用Playwright的自动等待机制，避免固定等待时间
5. **数据清理**: 利用test.afterEach和globalTeardown清理测试数据

## 故障排除

### 测试超时
- 检查服务器是否正常启动
- 调整playwright.config.ts中的timeout配置

### 连接失败
- 确认API_URL和WS_URL配置正确
- 检查网络连接和防火墙设置

### 认证失败
- 确保测试用户创建成功
- 检查token是否过期

## 参考文档

- [Playwright文档](https://playwright.dev/docs/intro)
- [Playwright API参考](https://playwright.dev/docs/api/class-apirequestcontext)
- [Best Practices](https://playwright.dev/docs/best-practices)
