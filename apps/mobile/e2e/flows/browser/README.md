# Web E2E 测试规范

## 概述

浏览器端 E2E 测试使用 Markdown 格式描述测试步骤，由 Claude Code 读取后通过 Chrome DevTools MCP 工具执行。

## 目录结构

```
apps/mobile/e2e/flows/
├── browser/           # 浏览器 E2E 测试
│   ├── README.md      # 本文档
│   ├── auth-flow.md   # 认证流程
│   └── ...
└── maestro/           # 移动端 E2E 测试 (YAML)
    └── ...
```

## Flow 文件格式

```markdown
# flow-name.md

## 关联 Issue

- ISSUE-XXX

## 前置条件

- Web 服务器运行在 localhost:8081
- 使用移动端 viewport (390x844)

## 步骤

1. [操作描述]
2. [操作描述]

## 验证点

- [验证描述]
```

## 元素选择器策略

| 场景          | 选择器             | 示例                                       |
| ------------- | ------------------ | ------------------------------------------ |
| 文本按钮/标题 | `page.getByText()` | `page.getByText('登录')`                   |
| 输入框        | `placeholder` 属性 | `input[placeholder="邮箱"]`                |
| 链接          | `page.getByRole`   | `page.getByRole('link', { name: '注册' })` |
| 列表项        | nth 定位           | `page.locator('.item').nth(0)`             |

## 执行方式

Claude Code 在验收 issue 时自动执行：

1. 读取 flow 文件
2. 使用 `mcp__chrome-devtools__*` 工具执行步骤
3. 验证每个关键节点

## 策略

- **开发阶段**: 先跑浏览器 E2E（快速验证 UI/交互）
- **发布前**: 再跑 Maestro E2E（验证原生行为）
