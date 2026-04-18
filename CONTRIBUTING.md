# 贡献指南

感谢您对 BridgeAI 项目的关注！本文档将指导您如何为项目做出贡献。

## 开发流程

### 1. 创建 Issue

在开始工作前，请先创建或认领一个 Issue，描述您要解决的问题或实现的功能。

### 2. 创建分支

```bash
# 从 develop 分支创建功能分支
git checkout develop
git pull origin develop
git checkout -b feature/ISSUE-XXX-short-description
```

分支命名规范:

- 功能分支: `feature/ISSUE-XXX-description`
- 修复分支: `fix/ISSUE-XXX-description`
- 文档分支: `docs/ISSUE-XXX-description`

### 3. 开发规范

#### 代码风格

- 使用 TypeScript 严格模式
- 遵循 ESLint 和 Prettier 配置
- 代码提交前必须通过 lint 检查

#### 提交信息规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型 (type):**

- `feat`: 新功能
- `fix`: 修复
- `docs`: 文档
- `style`: 格式调整
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试
- `chore`: 构建/工具

**作用域 (scope):**

- `server`: 后端
- `mobile`: 移动端
- `shared`: 共享包
- `config`: 配置
- `db`: 数据库

**示例:**

```
feat(server): add user authentication

- Implement JWT token generation
- Add login and register endpoints
- Add password hashing with bcrypt

Closes #123
```

### 4. 代码审查

提交 PR 前请确保:

- [ ] 代码通过所有测试
- [ ] 代码通过 lint 检查
- [ ] 更新了相关文档
- [ ] 添加了必要的注释

### 5. 提交 PR

1. 推送分支到远程

```bash
git push origin feature/ISSUE-XXX-description
```

2. 在 GitHub 创建 Pull Request
3. 填写 PR 模板中的信息
4. 等待代码审查

## 项目设置

### 环境准备

1. 安装 Node.js 20+ 和 pnpm 9+
2. 安装 PostgreSQL 15+ 和 PostGIS
3. 安装 Redis 7+

### 本地开发

```bash
# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env.dev

# 启动数据库和 Redis (使用 Docker)
docker-compose up -d postgres redis

# 运行数据库迁移
pnpm db:migrate

# 启动开发服务器
pnpm dev
```

## 测试

```bash
# 运行单元测试
pnpm test

# 运行集成测试
pnpm test:integration

# 运行 e2e 测试
pnpm test:e2e

# 生成测试覆盖率报告
pnpm test:coverage
```

## 数据库变更

如需修改数据库结构:

1. 修改 `prisma/schema.prisma`
2. 生成迁移文件: `pnpm db:migrate --name descriptive_name`
3. 应用迁移: `pnpm db:migrate`
4. 更新客户端代码: `pnpm prisma generate`

## 文档

- 更新 API 时，请同步更新 `docs/api/`
- 添加新功能时，请更新 `docs/architecture/`

## 问题反馈

如果您发现了 bug 或有功能建议，请:

1. 先搜索是否已有相关 Issue
2. 如果没有，创建新 Issue 并填写模板

## 行为准则

- 尊重所有贡献者
- 接受建设性的批评
- 关注什么对社区最有利

感谢您的贡献！
