# API 文档

VisionShare API 文档

## 基础信息

- **Base URL**: `http://localhost:3000/api/v1` (开发) / `https://api.visionshare.com/api/v1` (生产)
- **认证方式**: Bearer Token (JWT)

## 认证

### 注册

```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

### 登录

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**响应:**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 604800,
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
}
```

### 刷新令牌

```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

## 用户

### 获取当前用户

```http
GET /users/me
Authorization: Bearer <token>
```

### 更新用户资料

```http
PUT /users/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "New Name",
  "avatar": "https://..."
}
```

## Agent

### 创建 Agent

```http
POST /agents
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "demand|supply",
  "name": "我的需求 Agent",
  "config": {
    "tags": ["design", "ui"],
    "location": {
      "latitude": 39.9042,
      "longitude": 116.4074
    }
  }
}
```

### 获取 Agent 列表

```http
GET /agents
Authorization: Bearer <token>
```

### 获取 Agent 详情

```http
GET /agents/:id
Authorization: Bearer <token>
```

### 更新 Agent

```http
PUT /agents/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "config": { ... }
}
```

### 删除 Agent

```http
DELETE /agents/:id
Authorization: Bearer <token>
```

## 匹配

### 搜索匹配

```http
GET /matches?agentId=:agentId&radius=5000&limit=20
Authorization: Bearer <token>
```

**查询参数:**

- `agentId` (required): Agent ID
- `radius` (optional): 搜索半径(米), 默认 5000
- `limit` (optional): 返回数量, 默认 20

### 获取匹配详情

```http
GET /matches/:id
Authorization: Bearer <token>
```

### 接受匹配

```http
POST /matches/:id/accept
Authorization: Bearer <token>
```

### 拒绝匹配

```http
POST /matches/:id/reject
Authorization: Bearer <token>
```

## 消息

### 获取会话列表

```http
GET /conversations
Authorization: Bearer <token>
```

### 获取消息列表

```http
GET /conversations/:id/messages?limit=50&before=:messageId
Authorization: Bearer <token>
```

### 发送消息

```http
POST /conversations/:id/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Hello!",
  "type": "text"
}
```

## 上传

### 上传文件

```http
POST /upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <binary>
```

**响应:**

```json
{
  "success": true,
  "data": {
    "url": "https://...",
    "key": "uploads/...",
    "size": 12345,
    "mimeType": "image/jpeg"
  }
}
```

## 错误响应

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

## 错误代码

| 代码 | HTTP状态 | 说明 |
|------|----------|------|
| `UNAUTHORIZED` | 401 | 未授权 |
| `FORBIDDEN` | 403 | 禁止访问 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `VALIDATION_ERROR` | 400 | 验证失败 |
| `RATE_LIMITED` | 429 | 请求过于频繁 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |
