# 分支策略

## 分支模型

我们使用基于 [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/) 的分支策略。

## 主要分支

### main

- 生产环境代码
- 只接受来自 `develop` 的合并
- 每次合并自动触发部署
- 受保护分支，需要代码审查

### develop

- 开发主分支
- 集成所有功能开发
- 从这里创建功能分支
- 受保护分支，需要代码审查

## 辅助分支

### feature/*

- 用于新功能开发
- 从 `develop` 创建
- 合并回 `develop`
- 命名: `feature/ISSUE-XXX-short-description`

### fix/*

- 用于 bug 修复
- 从 `develop` 创建
- 合并回 `develop`
- 命名: `fix/ISSUE-XXX-short-description`

### hotfix/*

- 用于紧急生产问题修复
- 从 `main` 创建
- 合并到 `main` 和 `develop`
- 命名: `hotfix/ISSUE-XXX-description`

### release/*

- 用于发布准备
- 从 `develop` 创建
- 合并到 `main` 和 `develop`
- 命名: `release/v1.0.0`

## 工作流程

### 开始新功能

```bash
# 确保 develop 是最新的
git checkout develop
git pull origin develop

# 创建功能分支
git checkout -b feature/ISSUE-123-add-login

# 开发并提交
git add .
git commit -m "feat(auth): add user login endpoint"

# 推送分支
git push -u origin feature/ISSUE-123-add-login
```

### 提交 PR

1. 在 GitHub 创建 Pull Request
2. 目标分支选择 `develop`
3. 填写 PR 模板
4. 请求代码审查 (至少 1 人)
5. 通过 CI 检查
6. 合并到 `develop`

### 合并规范

- 使用 **Squash and Merge** 合并功能分支
- 使用 **Merge Commit** 合并 release 分支到 main
- 合并前确保 CI 通过
- 合并后删除功能分支

## 保护规则

### main 分支

- 禁止直接推送
- 需要 PR 审查 (至少 1 人)
- 需要 CI 通过
- 保持线性历史

### develop 分支

- 禁止直接推送
- 需要 PR 审查 (至少 1 人)
- 需要 CI 通过
