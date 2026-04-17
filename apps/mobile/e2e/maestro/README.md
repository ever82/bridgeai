# Maestro E2E 测试层

> AI Agent 友好的 E2E 测试框架 - BridgeAI 双层测试架构探索层

## 概述

Maestro 是 BridgeAI E2E 测试双层架构的**探索层**，专为 AI Agent 自动化设计。

```
AI Agent 读取 issue → 生成 YAML 测试 → 验证功能
                                              ↓ 通过
                                    迁移到 Detox 生产套件
```

## 快速开始

### 1. 安装 Maestro CLI

```bash
# macOS
brew install maestro

# Linux
curl -s "https://get.maestro.mobile.dev" | bash

# 或使用 npm 脚本
npm run maestro:install
```

### 2. 运行测试

```bash
# 运行所有测试
npm run maestro:test

# 运行特定流程
npm run maestro:test:auth    # 认证流程
npm run maestro:test:chat    # 聊天流程
npm run maestro:test:agent   # Agent 创建
npm run maestro:test:matching # 匹配流程

# 指定平台
npm run maestro:test -- ios
npm run maestro:test -- android
```

### 3. 查看报告

测试报告生成在 `e2e/maestro/reports/` 目录。

## 文件结构

```
e2e/
├── maestro/
│   ├── config.yaml           # Maestro 全局配置
│   ├── flows/                # 测试流程 YAML
│   │   ├── auth-flow.yaml           # 认证流程
│   │   ├── logout-flow.yaml          # 登出流程
│   │   ├── agent-creation-flow.yaml  # Agent 创建
│   │   ├── chat-flow.yaml            # 聊天流程
│   │   └── matching-flow.yaml        # 匹配流程
│   ├── reports/              # 测试报告输出
│   └── run-tests.ts         # 测试执行脚本
├── tests/                   # Detox 生产测试 (TypeScript)
└── pages/                   # Page Object Model
```

## AI Agent 使用指南

### 生成新测试

AI Agent 可直接生成 Maestro YAML：

```yaml
# example: new-feature-flow.yaml
appId: com.bridgeai.app

env:
  TEST_DATA: 'sample'

---
- launchApp
- tapOn: 'feature-button'
- inputText: '${TEST_DATA}'
- tapOn: 'submit-button'
- assertVisible: 'success-message'
```

### 关键语法

| 指令                      | 用途           |
| ------------------------- | -------------- |
| `appId`                   | 目标应用 ID    |
| `launchApp`               | 启动应用       |
| `tapOn: "testID"`         | 点击元素       |
| `inputText: "text"`       | 输入文本       |
| `assertVisible: "testID"` | 断言元素可见   |
| `waitFor: "testID"`       | 等待元素       |
| `scrollUntilVisible`      | 滚动到元素可见 |
| `runFlow: "other.yaml"`   | 复用其他流程   |

### 元素定位优先级

1. `testID` (accessibilityIdentifier) - **首选**
2. `text` - 文字匹配
3. `label` - accessibilityLabel
4. OCR - 模糊匹配（最后手段）

## 与 Detox 的关系

| 特性      | Maestro (探索层)     | Detox (生产层)  |
| --------- | -------------------- | --------------- |
| 语言      | YAML                 | TypeScript      |
| 执行速度  | 快                   | 中等            |
| 稳定性    | 中                   | 高              |
| AI 友好度 | ⭐⭐⭐⭐⭐           | ⭐⭐⭐          |
| 适用场景  | 快速验证、探索性测试 | 回归测试、CI/CD |

### 何时使用哪个

| 场景                    | 推荐工具 |
| ----------------------- | -------- |
| AI Agent 快速验证新功能 | Maestro  |
| 验收标准自动化检查      | Maestro  |
| 探索性测试              | Maestro  |
| 正式回归测试            | Detox    |
| CI/CD 生产检查          | Detox    |
| 性能基准测试            | Detox    |

## CI/CD 集成

```yaml
# .github/workflows/maestro.yml
- name: Run Maestro E2E
  run: |
    cd apps/mobile
    npx ts-node e2e/maestro/run-tests.ts test:auth

- name: Upload Maestro Reports
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: maestro-reports
    path: apps/mobile/e2e/maestro/reports/
```

## 最佳实践

1. **优先使用 testID** - 元素定位最可靠

   ```yaml
   - tapOn: 'login-email-input' # ✅ 首选
   - tapOn: 'Email' # ⚠️ 可能不稳定
   ```

2. **添加等待** - 防止 flaky

   ```yaml
   - waitForAnimationToEnd # 等待动画完成
   - waitFor: 'element-id' # 等待元素出现
   ```

3. **复用流程** - 减少重复

   ```yaml
   - runFlow: auth-flow.yaml # 复用登录流程
   ```

4. **数据隔离** - 使用环境变量
   ```yaml
   env:
     USER_ID: "${RANDOM}"
   - inputText: "test-${USER_ID}@bridgeai.com"
   ```

## 故障排除

### Maestro 未安装

```bash
npm run maestro:install
```

### 测试超时

调整 `config.yaml` 中的 `timeout` 值。

### 元素找不到

1. 检查元素是否有 `testID`
2. 添加等待：`waitForAnimationToEnd`
3. 使用 OCR 作为后备

## 相关文档

- [Detox E2E 测试](../tests/) - 生产级测试
- [Page Object Model](../pages/) - 测试页面对象
- [测试数据管理](../support/) - 测试数据隔离
