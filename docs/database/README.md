# 数据库设计文档

## 概览

BridgeAI 使用 PostgreSQL + PostGIS 作为主数据库。

## 核心表结构

### 用户表 (users)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | 主键 |
| email | VARCHAR(255) UNIQUE | 邮箱 |
| password_hash | VARCHAR(255) | 密码哈希 |
| name | VARCHAR(100) | 用户名 |
| avatar_url | VARCHAR(500) | 头像URL |
| phone | VARCHAR(20) | 手机号 |
| status | ENUM | 状态: active, inactive, suspended |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### Agent 表 (agents)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | 主键 |
| user_id | UUID FK | 所属用户 |
| type | ENUM | 类型: demand, supply |
| name | VARCHAR(100) | Agent 名称 |
| config | JSONB | 配置信息 |
| location | GEOGRAPHY(Point) | 地理位置 |
| is_active | BOOLEAN | 是否激活 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### 需求表 (demands)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | 主键 |
| agent_id | UUID FK | 所属 Agent |
| title | VARCHAR(200) | 标题 |
| description | TEXT | 详细描述 |
| tags | TEXT[] | 标签数组 |
| budget_min | DECIMAL | 最低预算 |
| budget_max | DECIMAL | 最高预算 |
| location | GEOGRAPHY(Point) | 需求位置 |
| status | ENUM | 状态: open, matched, closed |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### 供给表 (supplies)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | 主键 |
| agent_id | UUID FK | 所属 Agent |
| title | VARCHAR(200) | 标题 |
| description | TEXT | 详细描述 |
| skills | TEXT[] | 技能标签 |
| hourly_rate | DECIMAL | 时薪 |
| location | GEOGRAPHY(Point) | 服务位置 |
| availability | JSONB | 可用时间 |
| status | ENUM | 状态: available, busy, offline |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### 匹配表 (matches)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | 主键 |
| demand_id | UUID FK | 需求ID |
| supply_id | UUID FK | 供给ID |
| score | DECIMAL | 匹配分数 (0-100) |
| status | ENUM | 状态: pending, accepted, rejected, completed |
| metadata | JSONB | 匹配元数据 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### 会话表 (conversations)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | 主键 |
| match_id | UUID FK | 关联匹配 |
| participant_ids | UUID[] | 参与者ID数组 |
| last_message_at | TIMESTAMP | 最后消息时间 |
| created_at | TIMESTAMP | 创建时间 |

### 消息表 (messages)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | 主键 |
| conversation_id | UUID FK | 所属会话 |
| sender_id | UUID FK | 发送者 |
| content | TEXT | 内容 |
| type | ENUM | 类型: text, image, file |
| attachments | JSONB | 附件信息 |
| created_at | TIMESTAMP | 创建时间 |

### 评分表 (ratings)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID PK | 主键 |
| match_id | UUID FK | 关联匹配 |
| rater_id | UUID FK | 评分者 |
| ratee_id | UUID FK | 被评分者 |
| score | INTEGER | 分数 (1-5) |
| comment | TEXT | 评论 |
| created_at | TIMESTAMP | 创建时间 |

## 索引设计

```sql
-- 用户表索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

-- Agent 表索引
CREATE INDEX idx_agents_user_id ON agents(user_id);
CREATE INDEX idx_agents_type ON agents(type);
CREATE INDEX idx_agents_location ON agents USING GIST(location);

-- 需求表索引
CREATE INDEX idx_demands_agent_id ON demands(agent_id);
CREATE INDEX idx_demands_status ON demands(status);
CREATE INDEX idx_demands_location ON demands USING GIST(location);
CREATE INDEX idx_demands_tags ON demands USING GIN(tags);

-- 供给表索引
CREATE INDEX idx_supplies_agent_id ON supplies(agent_id);
CREATE INDEX idx_supplies_status ON supplies(status);
CREATE INDEX idx_supplies_location ON supplies USING GIST(location);
CREATE INDEX idx_supplies_skills ON supplies USING GIN(skills);

-- 匹配表索引
CREATE INDEX idx_matches_demand_id ON matches(demand_id);
CREATE INDEX idx_matches_supply_id ON matches(supply_id);
CREATE INDEX idx_matches_status ON matches(status);

-- 会话表索引
CREATE INDEX idx_conversations_match_id ON conversations(match_id);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at);

-- 消息表索引
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
```

## 空间查询示例

### 附近搜索

```sql
-- 查找距离某点 5km 内的供给
SELECT *
FROM supplies
WHERE ST_DWithin(
  location::geography,
  ST_SetSRID(ST_MakePoint(116.4074, 39.9042), 4326)::geography,
  5000
)
AND status = 'available';
```

### 距离计算

```sql
-- 计算两点间距离 (米)
SELECT ST_Distance(
  ST_SetSRID(ST_MakePoint(116.4074, 39.9042), 4326)::geography,
  ST_SetSRID(ST_MakePoint(121.4737, 31.2304), 4326)::geography
);
```

## 备份策略

- 每日自动备份
- 保留 30 天备份
- 测试环境定期恢复验证
