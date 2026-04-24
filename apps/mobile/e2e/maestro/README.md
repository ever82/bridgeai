# Maestro E2E 测试

> BridgeAI 移动端 E2E 测试框架。Maestro 提供基于 YAML 的声明式测试，AI Agent 可直接生成和执行。

## 快速开始

### 1. 安装 Maestro CLI

```bash
# macOS (推荐)
brew install maestro

# 或使用项目脚本
npm run e2e:install
```

### 2. 环境检查

```bash
npm run e2e -- --platform ios
```

这会检查 Maestro、Xcode、iOS 模拟器是否就绪。

### 3. 运行测试

**开发模式**（应用已在运行，只执行 Maestro 测试）：
```bash
npm run e2e:ios -- --dev
```

**构建模式**（自动构建并安装应用后执行测试）：
```bash
npm run e2e:ios -- --build
```

**运行指定 flow**：
```bash
npm run e2e:ios -- --flow auth-flow
```

**按 issue 运行关联 flows**（Claude Code 自动验收用）：
```bash
npm run e2e:ios -- --issue ISSUE-A001
```

### 4. 查看报告

测试报告生成在 `e2e/maestro/reports/` 目录：
- `report-*.json` - 结构化数据，Claude Code 可解析
- `report-*.html` - 可视化报告，浏览器打开查看

## 文件结构

```
e2e/maestro/
├── config.yaml              # Maestro 全局配置
├── runner.ts               # 统一测试执行器（环境检查 + 模拟器管理 + 报告）
├── flows/                  # 测试流程 YAML
│   ├── auth-flow.yaml           # 认证流程
│   ├── logout-flow.yaml          # 登出流程
│   ├── agent-creation-flow.yaml  # Agent 创建
│   ├── chat-flow.yaml            # 聊天流程
│   └── matching-flow.yaml        # 匹配流程
└── reports/                # 测试报告输出
```

## 编写测试

### 基本结构

```yaml
appId: com.bridgeai.mobile

# 关联 issue（可选，用于 --issue 过滤）
# issue: ISSUE-A001
# description: 用户登录流程验证

env:
  TEST_EMAIL: 'test-${RANDOM}@bridgeai.test'

---
- launchApp
- waitForAnimationToEnd
- tapOn: 'login-email-input'
- inputText: '${TEST_EMAIL}'
- tapOn: 'login-button'
- assertVisible: 'home-tab'
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

### 关联 Issue

在 flow YAML 顶部添加注释，Claude Code 可通过 `--issue` 参数自动筛选：

```yaml
# issue: ISSUE-A001
# issue: ISSUE-A002
# description: 验证用户登录和登出功能
```

## Claude Code 集成

### 验收 Issue 时自动运行 E2E

在 Claude Code 中，实现完一个 issue 后，运行关联的 Maestro flows：

```bash
# Claude Code 自动执行
npm run e2e:ios -- --issue ISSUE-A001 --dev
```

脚本会：
1. 解析所有 flows，找到关联到 ISSUE-A001 的测试
2. 运行这些 flows
3. 生成 JSON 报告
4. 返回 exit code（0 = 全部通过）

### 在 IssueTree 流程中使用

issue-tree 的 `accept-issue` / `probe-test` 流程可直接调用：

```bash
cd apps/mobile
npx ts-node e2e/maestro/runner.ts --issue $ISSUE_ID --dev --platform ios
```

如果 flows 全部通过，则认为该 issue 的 E2E 验收通过。

## CI/CD 集成

```yaml
# .github/workflows/e2e.yml
- name: Run Maestro E2E
  run: |
    cd apps/mobile
    npm run e2e:ios -- --build

- name: Upload Reports
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: maestro-reports
    path: apps/mobile/e2e/maestro/reports/
```

## 故障排除

### Maestro 未安装

```bash
npm run e2e:install
```

### 模拟器未启动

```bash
# 手动启动
open -a Simulator

# 或让 runner 自动管理
npm run e2e:ios -- --build
```

### 应用未安装

使用 `--build` 模式自动构建安装，或使用 `--dev` 模式（先手动启动应用）。

### 元素找不到

1. 检查元素是否有 `testID`
2. 添加等待：`waitForAnimationToEnd`
3. 使用 Maestro Studio 辅助定位：`maestro studio`
