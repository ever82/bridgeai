# BridgeAI 架构设计

## 核心设计决策

### 1. 三层信息模型

每个需求/供给记录分为三层，控制信息访问权限：

| 层级      | 访问范围   | 用途                             |
| --------- | ---------- | -------------------------------- |
| Queryable | 系统       | 快速查询过滤（位置、时间、类别） |
| Readable  | 对方 Agent | 智能阅读理解（自然语言描述）     |
| Private   | 自家 Agent | 绝不外泄（底价、底线、硬性条件） |

### 2. 一对多实时匹配

```
用户发布需求/供给
      ↓
系统查询 → 返回所有候选（第一层）
      ↓
Agent 评估 → 排序精选 Top N（第二层）
      ↓
同时与多个候选四人群聊（第三层）
```

**核心权衡**：牺牲数据库查询复杂度，换取 Agent 智能筛选的精准度和用户的并行对比体验。

### 3. 四人群聊模型

```
┌─────────────────────────────────────┐
│           群聊会话                   │
├──────────────┬──────────────────────┤
│   甲方       │   乙方               │
│  ├ 用户      │  ├ 用户              │
│  └ Agent     │  └ Agent             │
│              │                      │
│  私聊建议     │  私聊建议（仅自己可见）│
└──────────────┴──────────────────────┘
```

- 所有消息群内可见，确保透明
- Agent 私聊建议仅主人可见，辅助决策
- 身份切换实时同步，对方立即感知

### 4. 场景专属过滤

各场景独立配置过滤规则，互不影响：

- **VisionShare**: 距离 + 时间 + AI内容置信度
- **AgentDate**: 城市 + 年龄/收入/婚恋状态 + 兴趣匹配
- **AgentJob**: 城市/远程 + 技能匹配度 + 薪资重叠
- **AgentAd**: 城市/配送 + 品类/价格 + 商家信用

### 5. 实时通信策略

- WebSocket 维持长连接，支持即时消息
- 用户可同时活跃于多个独立群聊
- 每条消息携带发送者类型标记（Agent/用户/系统）

## 数据模型精简

```typescript
// 需求/供给记录（同构）
interface Record {
  id: string;
  scene: string;
  userId: string;

  queryable: {
    location: { lat: number; lng: number; radius: number };
    timeRange: { start: Date; end: Date };
    category: string;
    budget?: { min?: number; max: number };
  };

  readable: {
    title: string;
    description: string;
    requirements: string[];
    preferences: string[];
  };

  private: {
    mustHaves: string[];
    bottomLine: any;
    urgency: 'critical' | 'high' | 'medium' | 'low';
    disclosureStrategy: 'gradual' | 'conditional' | 'exchange' | 'protected';
  };

  status: 'active' | 'matching' | 'fulfilled' | 'expired';
  createdAt: Date;
  expiresAt: Date;
}

// 群聊会话
interface ChatSession {
  id: string;
  scene: string;
  demandId: string;
  supplyId: string;

  participants: {
    demandUser: string;
    demandAgent: string;
    supplyUser: string;
    supplyAgent: string;
  };

  messages: Message[];
  status: 'active' | 'paused' | 'confirmed' | 'passed';
  currentSpeaker: { demandSide: 'agent' | 'user'; supplySide: 'agent' | 'user' };

  createdAt: Date;
  lastActivityAt: Date;
}

// 消息
interface Message {
  id: string;
  sessionId: string;
  senderId: string;
  senderType: 'agent' | 'user' | 'system';
  content: string;
  timestamp: Date;
}
```

## 关键接口

### 公开 API（对方 Agent 可调）

- `queryDemands/Supplies(scene, filters, location)` - 一对多查询
- `realTimeMatch(recordId)` - 实时匹配候选

### 私有 API（仅自家 Agent）

- `getFullRecord(id)` - 获取完整记录（含 private 层）
- `batchEvaluate(candidates)` - 批量评估匹配度
- `decideDisclosure(sessionId, trustLevel)` - 决定披露策略

### 群聊 API

- `createSession(demandId, supplyId)` - 创建四人群聊
- `sendMessage(sessionId, content, senderType)` - 发送消息
- `handoff(sessionId, side, to)` - 身份切换

## 服务边界

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│ 用户客户端   │   │  Agent服务  │   │  AI服务     │
│ (React      │──→│ (Node.js)   │←──│ (OpenAI)    │
│  Native)    │   │             │   │             │
└─────────────┘   └──────┬──────┘   └─────────────┘
                         │
              ┌─────────┼─────────┐
              ▼         ▼         ▼
         ┌────────┐ ┌────────┐ ┌────────┐
         │PostgreSQL│ Redis  │ │MongoDB │
         │ (主数据) │(缓存)  │ │(聊天)  │
         └────────┘ └────────┘ └────────┘
```

## 测试架构

### E2E 双层测试策略

```
Issue 验收标准
      ↓
┌─────────────────┐    Maestro YAML     ┌─────────────────┐
│  AI Agent 探索层 │ ────────────────→  │ 快速验证功能     │
│  (maestro/)     │                    │ AI 可直接生成    │
└─────────────────┘                    └─────────────────┘
      ↓ 验证通过
┌─────────────────┐    Detox TS        ┌─────────────────┐
│  生产级测试层    │ ────────────────→  │ 稳定可靠测试     │
│  (e2e/)         │                    │ CI/CD 集成      │
└─────────────────┘                    └─────────────────┘
```

### 分层职责

| 层级   | 工具    | 职责                             | AI Agent 友好度 |
| ------ | ------- | -------------------------------- | --------------- |
| 探索层 | Maestro | 快速验证新功能，生成验收测试脚本 | ⭐⭐⭐⭐⭐      |
| 生产层 | Detox   | 回归测试，稳定性保障             | ⭐⭐⭐⭐        |

### 测试数据隔离

- **测试用户 ID**: `test-${timestamp}-${random}`
- **数据清理**: 每个测试后自动清理
- **并发控制**: iOS ≤3 并发，Android ≤2 并发
- **稳定性目标**: Flaky rate < 2%

## 实现约束（Demo 阶段）

- 单城市演示，简化地理位置计算
- OpenAI API 模拟 Agent 智能
- 积分系统模拟，不接入真实支付
- 过滤规则简化实现
