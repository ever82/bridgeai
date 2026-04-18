# BridgeAI

AI驱动的供需匹配平台 - 连接需求与供给的智能桥梁

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![React Native](https://img.shields.io/badge/React%20Native-0.73-blue.svg)](https://reactnative.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://www.postgresql.org/)
[![PostGIS](https://img.shields.io/badge/PostGIS-3+-lightblue.svg)](https://postgis.net/)

## 项目简介

BridgeAI 是一个基于 AI 的供需匹配平台，通过智能 Agent 技术实现用户需求与服务供给的精准匹配。

## 技术栈

- **后端**: Node.js + Express + TypeScript + Prisma
- **前端/移动端**: React Native + Expo
- **数据库**: PostgreSQL + PostGIS (地理空间扩展)
- **缓存/队列**: Redis + BullMQ
- **AI**: Claude API / MiniMax API
- **对象存储**: AWS S3 / MinIO
- **部署**: Docker + Docker Compose

## 快速开始

### 前置要求

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- PostgreSQL >= 15 (带 PostGIS 扩展)
- Redis >= 7.0

### 安装

1. 克隆仓库

```bash
git clone https://github.com/yourorg/bridgeai.git
cd bridgeai
```

2. 安装依赖

```bash
pnpm install
```

3. 配置环境变量

```bash
cp .env.example .env.dev
# 编辑 .env.dev 填入你的配置
```

4. 启动开发服务器

```bash
# 启动后端
pnpm dev:server

# 启动移动端 (另一个终端)
pnpm dev:mobile
```

## 项目结构

```
bridgeai/
├── apps/
│   ├── server/          # Express 后端服务
│   └── mobile/          # Expo React Native 移动端
├── packages/
│   ├── shared/          # 共享类型和工具
│   └── config/          # 共享配置 (ESLint, TS)
├── docs/                # 项目文档
└── .github/             # GitHub 配置
```

## 开发命令

```bash
# 安装所有依赖
pnpm install

# 启动开发模式
pnpm dev

# 构建所有项目
pnpm build

# 运行代码检查
pnpm lint

# 格式化代码
pnpm format

# 运行测试
pnpm test

# 数据库迁移
pnpm db:migrate

# 数据库种子
pnpm db:seed
```

## 贡献指南

请参阅 [CONTRIBUTING.md](./CONTRIBUTING.md)

## 文档

- [架构文档](./docs/architecture/README.md)
- [API 文档](./docs/api/README.md)
- [数据库设计](./docs/database/README.md)

## 许可证

[MIT](./LICENSE)
