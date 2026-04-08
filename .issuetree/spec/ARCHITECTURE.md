# 架构设计

## 系统架构

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  用户端 App  │────▶│  后端 API   │────▶│ AI 服务     │
│  (需求方)    │◀────│  (Node.js) │◀────│ (GPT-4)    │
└─────────────┘     └─────────────┘     └─────────────┘
                          │
┌─────────────┐           │           ┌─────────────┐
│ 接单端 App   │───────────┼──────────▶│ 照片存储    │
│ (拍照方)    │           │           │ (本地文件)  │
└─────────────┘           │           └─────────────┘
                          │
                   ┌─────────────┐
                   │ WebSocket   │
                   │ (实时推送)  │
                   └─────────────┘
```

## 模块设计

### 后端 (server/)
- `index.js` - Express 入口，路由注册
- `routes/tasks.js` - 任务发布、查询 API
- `routes/photos.js` - 照片上传、查看 API
- `routes/users.js` - 用户、积分、信用 API
- `services/ai.js` - AI 需求解析、虚假裁决
- `services/credits.js` - 积分计算逻辑
- `services/location.js` - 附近任务匹配
- `data/*.json` - 模拟数据库

### 前端 (client/)
- 简化版单页 HTML 演示
- 两个角色切换：需求方 / 接单方
- 演示核心流程

## 数据模型

### User
```json
{ "id": "u1", "name": "张三", "credits": 100, "trustScore": 80 }
```

### Task
```json
{ "id": "t1", "location": "三里屯", "lat": 39.9, "lng": 116.4, "requirement": "看看堵车情况", "reward": 10, "status": "open" }
```

### Photo
```json
{ "id": "p1", "taskId": "t1", "url": "/uploads/p1.jpg", "takenAt": "2026-04-08T12:00:00Z", "takenBy": "u2" }
```
