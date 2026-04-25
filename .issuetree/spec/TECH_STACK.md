# BridgeAI 技术栈选择

## 编程语言

- **前端**: TypeScript / React Native (Expo SDK 50+)
- **后端**: Node.js 20+ + Express
- **AI 服务**: Multi-LLM Adapter (OpenAI + Claude + 其他)
- **数据库**: PostgreSQL (生产) / SQLite (演示)

## 运行时

- Node.js 20+ (LTS)
- Expo SDK 50+

## 核心依赖

### 后端服务 (server/)

#### Web 框架与通信

- `express` - Web 框架
- `socket.io` - WebSocket (Agent 实时通信)
- `cors` - 跨域处理
- `compression` - Gzip 压缩

#### AI 多供应商抽象层

- `openai` - OpenAI API 客户端
- `@anthropic-ai/sdk` - Claude API
- `opossum` - 熔断器 (供应商故障自动切换)
- `async-retry` - 指数退避重试
- `bullmq` - AI 请求队列 (削峰填谷)
- `ioredis` - Redis 集群支持
- `tiktoken` - Token 计数 (OpenAI)

#### 图像处理 (VisionShare)

- `sharp` - 高性能图像处理
- `exif-parser` - EXIF 元数据读取与清理

#### 地理与位置

- `geolib` - 地理距离计算
- PostGIS (PostgreSQL 扩展) - 地理空间索引

#### 数据库与缓存

- `prisma` - ORM
- `ioredis` - Redis 客户端 (支持集群)
- PostgreSQL + PostGIS 扩展

#### 安全与隐私

- `bcrypt` - 密码加密
- `jsonwebtoken` - JWT 认证
- `helmet` - 安全头
- `express-rate-limit` - API 速率限制
- `zod` - Schema 验证与类型安全

#### 日志与可观测性

- `pino` - 高性能结构化日志
- `pino-pretty` - 开发日志美化
- `@opentelemetry/api` - 分布式追踪

#### 配置管理

- `dotenv` - 环境变量管理

### 移动端 (Expo SDK 50+)

#### Expo 核心

- `expo` - Expo SDK 50+
- `expo-router` - 文件系统路由
- `expo-secure-store` - 加密本地存储

#### Expo 原生模块 (内置)

- `expo-camera` - 相机
- `expo-image-picker` - 照片选择
- `expo-image-manipulator` - 图片处理 (裁剪/压缩)
- `expo-image` - 高性能图片加载 (SDK 48+)
- `expo-location` - GPS 定位
- `expo-media-library` - 相册访问
- `expo-notifications` - 推送通知
- `expo-status-bar` - 状态栏管理

#### 导航

- `expo-router` - 基于文件的路由系统
- 场景切换使用底部 Tab 导航

#### 状态管理

- `@reduxjs/toolkit` + `react-redux` - 全局状态
- `redux-persist` + `expo-secure-store` - 状态持久化 (加密存储敏感状态)
- `@tanstack/react-query` - 服务端状态与缓存

#### UI 组件

- `react-native-paper` - Material Design UI 组件库
- `@shopify/flash-list` - 高性能列表 (FlatList 替代)

#### 实时通信

- `socket.io-client` - Agent 实时消息

#### 网络

- `axios` - HTTP 客户端 (配合拦截器处理 JWT)
- `@react-native-community/netinfo` - 网络状态检测

### AI 能力栈

#### 多 LLM 支持

- **OpenAI GPT-4/GPT-4 Vision**: 复杂推理、图像分析
- **Claude 3.5 Sonnet**: 对话 Agent (性价比高)
- **可选扩展**: Gemini、Azure OpenAI、本地模型 (Llama)

#### AI 服务架构

- 统一接口抽象层 (`ai-service-adapter`)
- 熔断器模式 (单供应商故障自动切换)
- 请求队列 + 流式响应
- Embedding 缓存层

#### 图像识别

- **OpenAI Vision API**: 云端图像内容分析
- **后端 sharp**: 图像预处理与特征提取

## 平台权限要求

### Android (app.json)

```json
{
  "android": {
    "permissions": [
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
      "CAMERA",
      "READ_MEDIA_IMAGES",
      "READ_MEDIA_VISUAL_USER_SELECTED",
      "INTERNET",
      "NOTIFICATIONS"
    ]
  }
}
```

### iOS (app.json)

```json
{
  "ios": {
    "infoPlist": {
      "NSLocationWhenInUseUsageDescription": "需要位置信息来匹配附近的人",
      "NSCameraUsageDescription": "需要相机来拍照",
      "NSPhotoLibraryUsageDescription": "需要访问相册来智能检索照片",
      "NSUserNotificationUsageDescription": "需要推送通知来接收消息提醒"
    }
  }
}
```

## 部署架构 (生产环境)

```
┌─────────────────────────────────────────────────────────┐
│                      CDN (静态资源)                       │
└─────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────┐
│              Load Balancer / API Gateway                │
│              (Kong / AWS API Gateway / Nginx)           │
└─────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  API Server  │   │  API Server  │   │  API Server  │
│   (Node.js)  │   │   (Node.js)  │   │   (Node.js)  │
└──────────────┘   └──────────────┘   └──────────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│              PostgreSQL + PostGIS                       │
│              (主从复制 + 读写分离)                        │
└─────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  Redis (缓存) │   │  Redis       │   │  AI Queue    │
│  (Cache DB 0) │   │  (Socket.io  │   │  (BullMQ)    │
│               │   │   Adapter    │   │              │
└──────────────┘   └──────────────┘   └──────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   OpenAI     │   │    Claude    │   │   Object     │
│    API       │   │     API      │   │   Storage    │
│   (主)       │   │   (备用)     │   │  (S3/MinIO)  │
└──────────────┘   └──────────────┘   └──────────────┘
```

## 多 LLM 供应商策略

### 路由策略

| 场景                 | 首选模型          | 备选模型       | 选择理由         |
| -------------------- | ----------------- | -------------- | ---------------- |
| VisionShare 图像分析 | GPT-4 Vision      | Claude 3       | 图像理解能力最强 |
| Agent 对话           | Claude 3.5 Sonnet | GPT-4 Turbo    | 成本低、速度快   |
| 简单匹配评估         | GPT-3.5 Turbo     | Claude 3 Haiku | 最低成本         |
| Embedding            | text-embedding-3  | 本地模型       | 缓存复用         |

### 韧性设计

- **熔断器**: 单一供应商限流/故障时自动切换
- **重试机制**: 指数退避 + 抖动
- **降级策略**: 云端全部故障时降级到本地轻量模型
- **成本监控**: Token 用量实时统计与告警

## E2E 测试框架（双层架构）

### 概述

采用 **Chrome DevTools MCP + Maestro** 双层 E2E 测试架构，兼顾开发阶段快速验证和生产环境测试覆盖：

```
┌─────────────────────────────────────────────────────────┐
│              Chrome DevTools MCP (浏览器)                 │
│              快速 UI 验证 / Web 开发阶段                    │
│         mcp__chrome-devtools__ 系列工具直接控制浏览器       │
└─────────────────────────────────────────────────────────┘
                           ↑
┌─────────────────────────────────────────────────────────┐
│                 Maestro (iOS/Android 模拟器)              │
│              AI Agent 验收测试 / 原生行为验证              │
│         YAML 声明式，Claude Code 可直接生成和执行          │
└─────────────────────────────────────────────────────────┘
```

### 第一层：Chrome DevTools MCP（浏览器）

- **定位**: 开发阶段快速验证，Web 端 UI 测试
- **工具**: `mcp__chrome-devtools__*` 系列工具（内置 Claude Code）
- **特性**:
  - `navigate_page`, `click`, `fill`, `screenshot`, `take_snapshot`
  - `list_console_messages`, `list_network_requests`
  - `evaluate_script`, `emulate`, `performance_start_trace`
  - 无需安装 Playwright，直接控制 Chrome
- **适用场景**:
  - Expo Web 快速验证 UI 布局/主题色/交互
  - 浏览器端登录/导航/表单测试
  - 开发阶段频繁回归

### 第二层：Maestro（iOS/Android 模拟器）

- **定位**: AI Agent 驱动验收测试，原生行为验证
- **语言**: YAML，纯文本易于 LLM 生成
- **React Native 支持**: 黑盒测试，基于 UI 定位
- **特性**:
  - YAML 声明式语法，AI 可直接生成
  - 无需编译，快速执行
  - 支持模糊匹配和 OCR
  - 适合探索性测试和验收标准快速验证

### AI Agent 工作流

```yaml
# 1. AI Agent 读取 issue 验收标准
# 2. 生成 Maestro YAML 测试脚本
appId: com.bridgeai.mobile
- launchApp
- tapOn: "login-email-input"
- inputText: "test@bridgeai.com"
- tapOn: "login-button"
- assertVisible: "home-tab"
# 3. 执行验证
cd apps/mobile
npx ts-node e2e/maestro/runner.ts --flow auth-flow --dev
```

### 工具链

| 层级       | 工具                   | 用途                           |
| ---------- | ---------------------- | ------------------------------ |
| 浏览器测试 | Chrome DevTools MCP    | 内置 Claude Code，无需额外安装 |
| 移动端测试 | `maestro`              | iOS/Android 模拟器，YAML 脚本  |
| 报告       | Maestro HTML/JSON 报告 | 可视化报告 + CI 解析数据       |
| 稳定性监控 | `runner.ts` 内置截图   | 失败自动截图，便于排查         |

### 测试路径

```
apps/mobile/
├── e2e/
│   ├── flows/
│   │   ├── browser/              # 浏览器 E2E 测试 (Markdown)
│   │   │   ├── runner.ts         # Web 服务器启动器
│   │   │   ├── README.md         # 规范说明
│   │   │   └── auth-flow.md      # 认证流程示例
│   │   └── maestro/             # 移动端 E2E 测试 (YAML)
│   │       ├── runner.ts         # 统一测试执行器
│   │       ├── config.yaml
│   │       ├── flows/
│   │       │   ├── auth-flow.yaml
│   │       │   ├── chat-flow.yaml
│   │       │   ├── matching-flow.yaml
│   │       │   ├── agent-creation-flow.yaml
│   │       │   └── logout-flow.yaml
│   │       └── reports/
│   └── e2e-web/                  # Playwright 浏览器测试（已弃用，可删除）
```

### 快速开始

**浏览器测试:**

```bash
# 启动 Web 服务器
pnpm test:e2e:web

# Claude Code 使用 mcp__chrome-devtools__* 工具操作浏览器
```

**Maestro 测试:**

```bash
# 环境检查
pnpm test:e2e:check

# 运行指定 flow
npx ts-node apps/mobile/e2e/maestro/runner.ts --flow auth-flow

# 按 issue 运行关联 flows（Claude Code 自动验收用）
npx ts-node apps/mobile/e2e/maestro/runner.ts --issue ISSUE-A001
```

## CI/CD 与部署

### 移动端 (Expo EAS)

```bash
# EAS Build 配置
 eas build --platform ios     # iOS 构建
 eas build --platform android # Android 构建
 eas update                    # OTA 热更新
```

### 后端

- Docker 容器化部署
- GitHub Actions / GitLab CI 自动化
- 蓝绿部署 / 滚动更新

## 监控与告警

- **日志**: Pino + ELK Stack
- **指标**: Prometheus + Grafana
- **追踪**: OpenTelemetry + Jaeger
- **错误监控**: Sentry (移动端 + 后端)
- **AI 成本监控**: 自定义 Token 用量仪表板

## 实现约束 (Demo 阶段)

- 单城市演示，简化地理位置计算
- 多 LLM 以 OpenAI 为主，Claude 备用
- 积分系统模拟，不接入真实支付
- 过滤规则简化实现
