# BridgeAI 技术栈选择

## 编程语言
- **前端**: JavaScript / React Native (跨平台移动端)
- **后端**: Node.js + Express
- **AI 服务**: OpenAI API (GPT-4 / GPT-4 Vision)
- **数据库**: PostgreSQL (生产) / SQLite (演示)

## 运行时
- Node.js 18+
- React Native 0.72+

## 核心依赖

### 后端服务 (server/)

#### Web 框架与通信
- `express` - Web 框架
- `ws` / `socket.io` - WebSocket (Agent 实时通信)
- `cors` - 跨域处理

#### AI 与机器学习
- `openai` - OpenAI API 客户端
- `@anthropic-ai/sdk` - Claude API (备选)

#### 图像处理 (VisionShare)
- `sharp` - 高性能图像处理
- `exif-parser` - EXIF 元数据读取与清理
- `face-api.js` / `@tensorflow/tfjs` - 人脸检测

#### 地理与位置
- `geolib` - 地理距离计算
- `node-geocoder` - 地址解析

#### 数据库与缓存
- `prisma` - ORM
- `redis` - 缓存和实时数据 (可选)

#### 安全与隐私
- `bcrypt` - 密码加密
- `jsonwebtoken` - JWT 认证
- `helmet` - 安全头

### 移动端 (client/)

#### React Native 核心
- `react-native` - 框架
- `@react-navigation/native` - 导航
- `react-native-screens` - 屏幕优化

#### 场景切换与 UI
- `react-native-tab-view` - 场景切换
- `react-native-vector-icons` - 图标
- `react-native-paper` / `@rneui/base` - UI 组件库

#### VisionShare 场景
- `react-native-image-picker` - 照片选择
- `react-native-camera` / `expo-camera` - 相机
- `@react-native-community/geolocation` - GPS 定位
- `react-native-permissions` - 权限管理
- `@react-native-community/cameraroll` - 相册访问

#### 实时通信
- `socket.io-client` - Agent 实时消息

#### 状态管理
- `@reduxjs/toolkit` + `react-redux` - 全局状态
- `react-query` / `@tanstack/react-query` - 服务端状态

### AI 能力栈

#### 自然语言处理
- **OpenAI GPT-4**: Agent 对话、意图解析、匹配评估
- **LangChain**: Agent 工作流编排 (可选)

#### 图像识别
- **OpenAI Vision API**: 图像内容分析
- **TensorFlow.js**: 本地人脸检测

#### 向量检索 (未来扩展)
- `pgvector` - PostgreSQL 向量扩展
- `openai` embedding API - 向量化

## 目录结构

```
bridgeai/
├── server/                       # 后端服务
│   ├── src/
│   │   ├── index.ts              # 入口
│   │   ├── routes/               # API 路由
│   │   │   ├── agents.ts         # Agent 管理
│   │   │   ├── scenes/           # 场景路由
│   │   │   │   ├── visionshare.ts
│   │   │   │   ├── date.ts
│   │   │   │   ├── job.ts
│   │   │   │   └── ad.ts
│   │   │   ├── users.ts
│   │   │   └── credits.ts
│   │   ├── services/             # 业务服务
│   │   │   ├── agent-matching.ts # Agent 匹配引擎
│   │   │   ├── agent-dialogue.ts # Agent 对话服务
│   │   │   ├── ai/               # AI 服务
│   │   │   │   ├── openai.ts
│   │   │   │   ├── vision.ts
│   │   │   │   └── embedding.ts
│   │   │   ├── privacy.ts        # 隐私脱敏
│   │   │   └── location.ts
│   │   ├── models/               # 数据模型
│   │   └── prisma/               # 数据库 schema
│   └── package.json
├── client/                       # React Native 客户端
│   ├── src/
│   │   ├── App.tsx               # 入口
│   │   ├── navigation/           # 导航配置
│   │   ├── scenes/               # 场景模块
│   │   │   ├── visionshare/
│   │   │   ├── date/
│   │   │   ├── job/
│   │   │   └── ad/
│   │   ├── components/           # 通用组件
│   │   │   ├── AgentAvatar.tsx   # Agent 头像
│   │   │   ├── MatchCard.tsx     # 匹配卡片
│   │   │   └── SceneSwitcher.tsx # 场景切换器
│   │   ├── services/             # 客户端服务
│   │   │   ├── agent-client.ts   # Agent 通信客户端
│   │   │   ├── gallery-scanner.ts
│   │   │   └── privacy-filter.ts
│   │   ├── store/                # Redux store
│   │   └── types/                # TypeScript 类型
│   └── package.json
└── shared/                       # 共享代码 (类型、协议)
    └── types/
        └── agent-protocol.ts
```

## 平台权限要求

### Android
```xml
<!-- 位置 -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

<!-- 相机和相册 -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />

<!-- 网络 -->
<uses-permission android:name="android.permission.INTERNET" />
```

### iOS (Info.plist)
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>需要位置信息来匹配附近的人</string>

<key>NSCameraUsageDescription</key>
<string>需要相机来拍照</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>需要访问相册来智能检索照片</string>
```

## 部署架构 (生产环境)

```
┌─────────────────────────────────────────────────────────┐
│                      CDN (静态资源)                       │
└─────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────┐
│                   Load Balancer                         │
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
│              PostgreSQL + Redis                         │
└─────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   OpenAI     │   │   Object     │   │   Socket.io  │
│    API       │   │   Storage    │   │   Adapter    │
│              │   │   (S3/MinIO) │   │   (Redis)    │
└──────────────┘   └──────────────┘   └──────────────┘
```
