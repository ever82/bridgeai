# 技术栈选择

## 编程语言
- **前端**：JavaScript / React Native (或 Flutter，用于跨平台移动端)
- **后端**：Node.js + Express
- **AI 服务**：OpenAI API (GPT-4) + 简单图像对比

## 运行时
- Node.js 18+
- 简单起见用本地 JSON 文件模拟数据库

## 核心依赖
- `express` - Web 框架
- `ws` - WebSocket (实时推送)
- `multer` - 文件上传
- `openai` - AI 解析
- `react` - 前端 UI (简化版用纯 HTML/JS)

## 目录结构
```
/
├── server/           # 后端服务
│   ├── index.js      # 入口
│   ├── routes/       # API 路由
│   ├── services/     # AI 服务、积分服务
│   └── data/         # JSON 数据文件
├── client/           # 前端 (简化版)
│   └── index.html    # 单页演示
└── .issuetree/       # 项目管理
```
