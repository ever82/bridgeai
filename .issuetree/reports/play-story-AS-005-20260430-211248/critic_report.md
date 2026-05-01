# AS-005 Critic Report

**Story**: AS-005 — 我主动与其他 Agent 对话
**Issues**: ISSUE-COM001 (Socket.io 基础设施), ISSUE-AI004 (AI 对话引擎)
**审查者**: Critic Agent
**审查日期**: 2026-04-30

---

## 1. AC 实现完整性疑点

### 疑点 1: Agent "自主发起对话" 服务从未被任何外部代码调用 — 是死代码

- **关联 AC**: `AS-005-AC-2`, `AS-005~func`
- **文件位置**: `/Users/z/projects/bridgeai/apps/server/src/services/dating/agentInitiatedChat.ts:90`
- **问题描述**: `initiateChat()` 是 Story 的核心 API，但全代码库（除该模块自身、`index.ts` re-export 与单元测试外）没有任何 caller。Socket handler、REST 路由、job queue 都没有触发它的入口。这意味着 "Agent 自主决定与符合条件的候选 Agent 发起对话" 在生产路径上根本不会被执行 — 函数定义存在，但没有"自主"触发的链路。
- **建议**: 必须有一个调度层（cron / 候选列表回调 / Socket 事件 / 后端 worker）在生成候选列表后，根据规则真正调用 `initiateChat`。否则该 AC 仅完成签名层验证。
- **严重程度**: critical

### 疑点 2: Agent 自动响应是硬编码模板，不是 LLM 生成

- **关联 AC**: `ISSUE-AI004~c1` (引擎实现/回复生成), `AS-005~func`
- **文件位置**: `/Users/z/projects/bridgeai/apps/server/src/services/dating/agentInitiatedChat.ts:335-363` (`generateResponseContent`)
- **问题描述**: 双 Agent 对话回复完全是 4-5 条候选字符串数组（"是的！我也注意到了..."、"你觉得呢？"、"你平时喜欢做什么？"），按 `turnIndex % responses.length` 轮播。没有调用 LLM、没有上下文管理、没有人格化、没有意图识别。剧本里说 Agent-Alice 会进行"5-10 轮自然对话评估性格契合度"，实际就是机械复读。
- **建议**: 替换为 `agentDialogService.generateMessage()` 真实 LLM 调用。
- **严重程度**: critical

### 疑点 3: `agent:private_advice` 私聊建议通道根本不存在

- **关联 AC**: `US-AGENT-009~func`, `US-AGENT-009-AC-1/2/3`, `AS-008~func`, `AS-008-AC-2/3`
- **文件位置**: 整个 `/Users/z/projects/bridgeai`（playbook 唯一提及处）
- **问题描述**: 剧本 line 503 明确说 "`agent:private_advice` 通道仅推送给主人 socket"，但全代码库 grep `private_advice|privateAdvice|私聊建议` 在 `apps/server` 和 `apps/mobile` 无任何匹配（除 storyplay/spec 文档自己）。AS-008 整套"实时分析意图、发送私下建议、风险提示、话题推荐、一键采纳"在 server 端没有 emit 任何此类事件，mobile 端没有相应订阅 / UI 面板。
- **建议**: 实现 socket 服务端 emit 到 `socket.to(\`user:${ownerId}\`)`、mobile 订阅、私聊建议侧边栏组件 — 三者全部缺失。
- **严重程度**: critical

### 疑点 4: `agent_memory` 长期记忆表完全不存在

- **关联 AC**: `ISSUE-AI004~c4` (记忆系统), `AS-LEARN-001-AC-1/2/3`
- **文件位置**: `/Users/z/projects/bridgeai/apps/server/prisma/schema.prisma`
- **问题描述**: 剧本 line 504 说"通过后台数据库查询 `agent_memory` 表验证"，但 `schema.prisma` 仅有 `DialogSessionRecord`（line 1880）这一个对话相关 model，没有 `AgentMemory`、没有 long-term agent memory 字段、没有任何成功匹配特征/失败原因/主人偏好的存储 schema。Phase 7.4-7.6 三个 AC（记录成功特征、分析失败原因、学习主人偏好）没有数据落点。
- **建议**: 设计 `AgentMemory` 表并创建写入路径（成功引荐后写入、被拒后写入、用户否决建议后写入）。
- **严重程度**: critical

### 疑点 5: 协商房间永不释放 — 内存泄漏

- **关联 AC**: `ISSUE-COM001~c4` (房间管理：创建销毁), `AS-005-AC-3`
- **文件位置**: `/Users/z/projects/bridgeai/apps/server/src/services/ai/agentNegotiationService.ts:216` (`private rooms: Map<string, NegotiationRoom>`)
- **问题描述**: `agentNegotiationService` 创建了 `rooms` Map，但全文搜索没有 `rooms.delete`、`rooms.clear`、清理 hook、TTL 过期机制。`confirmSelection` 仅改 `room.status = 'completed'`，从不从 Map 中移除。`agentDialogService.sessions` 同样问题：`archiveSession` 改 status 不 delete。生产环境运行时间足够长后，进程内存会持续增长。
- **建议**: 实现 idle TTL 清理（如 30 分钟不活跃→archive→delete）或定期任务回收。
- **严重程度**: warning

---

## 2. 测试覆盖度疑点

### 疑点 6: agentInitiatedChat 测试断言极弱，只检查 "存在"

- **关联 AC**: `AS-005-AC-2`, `ISSUE-AI004~c1`
- **文件位置**: `/Users/z/projects/bridgeai/apps/server/src/services/dating/__tests__/agentInitiatedChat.test.ts:46-95`
- **问题描述**: `should generate a response message` 测试只断言 `response!.content` 存在并 `senderAgentId === 'agent-b'`，没有验证内容是真实生成的而非模板。`should create a chat session with opening line` 期待开场白固定为 `'嗨！很高兴认识你。'` — 这正面证实了开场白本身也是固定字符串。所有测试只覆盖 happy path，无 LLM 失败、无并发、无超时、无对方 Agent 拒绝、无 50+ 并发限流场景。
- **建议**: 补充 (a) 实际生成内容差异性断言；(b) 拒绝/超时/并发上限测试；(c) Agent 学习记忆写入测试。
- **严重程度**: warning

### 疑点 7: 无 E2E / 集成测试覆盖跨 Socket 房间私聊建议隔离

- **关联 AC**: `US-AGENT-009~edge` (建议泄露), `AS-008~edge`
- **文件位置**: `/Users/z/projects/bridgeai/apps/server/src/tests/integration/`
- **问题描述**: `tests/integration/socket.integration.test.ts` 等不包含两 socket 抓包对比 (Alice 收到 / Bob 没收到) 的"建议不泄露给对方"验证。剧本 Step 3.5 的关键安全 AC（建议泄露）没有自动化保障。
- **建议**: 编写双 socket 集成测试：一个 Alice socket 一个 Bob socket，触发建议生成，断言 Bob socket 在 1 秒窗口内未收到 `agent:private_advice` 类事件。
- **严重程度**: critical

---

## 3. 关键功能疑点

### 疑点 8: 无并发上限/限流机制 — `AS-005~edge` 与 `AS-006~edge` 无落地

- **关联 AC**: `AS-005~edge` (同时对话数过多), `AS-006~edge` (大量 Agent 同时联系), `AS-009~edge`
- **文件位置**: `/Users/z/projects/bridgeai/apps/server/src/services/dating/agentInitiatedChat.ts`、`agentNegotiationService.ts`
- **问题描述**: 剧本 Step 2.6 / 6.2 / 6.6 要求 50+ Agent 并发触发限流、按优先级排队、超载收到"稍后再试"。`agentInitiatedChat` 没有任何并发计数；`agentNegotiationService` 没有限流。`agentBehaviorService` 自带限流逻辑，但其文件头部注释 (`agentBehaviorService.ts:8-9`) 明确写道 "intentionally not yet wired into the dispatch path — that integration is tracked separately"，即未接入消息发送链路。所以 "10 个对话上限"、"50+ 并发限流"、"按信用分排队" 全部是空实现。
- **建议**: 至少在 `initiateChat` 入口检查每用户活跃 chat 数；在 negotiation 接收端按优先级队列处理。
- **严重程度**: critical

### 疑点 9: "记忆系统" 仅有 LLM 单段总结字符串，无关键信息提取/向量检索

- **关联 AC**: `ISSUE-AI004~c4` (短期/长期/关键信息提取/记忆摘要/记忆检索增强)
- **文件位置**: `/Users/z/projects/bridgeai/apps/server/src/services/ai/agentDialogService.ts:720-743` (`summarizeMessages`), `1241-1261` (extract)
- **问题描述**: 所谓"记忆系统"在 `agentDialogService` 中实现为：当历史超过 20 条时，让 LLM 用 2-3 句总结整段并塞入 `metadata.conversationSummary`。没有结构化关键信息提取（没拆出"主人偏好"/"成功特征"/"拒绝原因"等独立字段）；`extractSharedInterests` (agentConversationRoom.ts:509) 是简单的"提取 2-4 字中文词组按频次排序"，纯关键词匹配，无向量检索。剧本声称的"记忆检索增强"未实现。
- **建议**: 引入结构化记忆 schema (intents, preferences, milestones)；后续考虑 embedding 检索。
- **严重程度**: warning

### 疑点 10: 双向 Agent 协商无状态机/共识达成检测/分歧处理

- **关联 AC**: `ISSUE-AI004~c3` (协商机制：双向 Agent 对话/条件协商/匹配意愿确认/分歧处理/共识达成)
- **文件位置**: `/Users/z/projects/bridgeai/apps/server/src/services/ai/agentDialogService.ts:767-802` (`updateDialogPhase`); `agentNegotiationService.ts`
- **问题描述**: 协商"状态机" 只有简单的消息条数判定 (`messageCount <= 2 → intro`、`messageCount > 6 → negotiating`)。没有对方 Agent 的"接受/拒绝/反提议" 状态、没有底线触碰检测、没有共识达成判定（剧本 Step 5.4 提的"薪资底线 22K 触碰自动反提议"完全没有代码），没有死锁防御（双方持续反提议但永不达成时如何退出）。
- **建议**: 设计明确的 `NegotiationState` enum (PROPOSED/COUNTER/ACCEPTED/REJECTED/STALEMATE) 与底线检查器。
- **严重程度**: warning

### 疑点 11: Agent "人格系统" 仅是 prompt 字符串拼接，无一致性维护

- **关联 AC**: `ISSUE-AI004~c2` (人格定义/语气风格/行为特征/场景角色扮演/人格一致性维护)
- **文件位置**: `/Users/z/projects/bridgeai/apps/server/src/services/ai/agentDialogService.ts:675-690` (`buildPersona`); 各 prompt 构建函数
- **问题描述**: 人格 = `agent.config?.personality` 数组 + `communicationStyle` 字符串，每次调用 LLM 都把这些拼到 prompt 里就完事。没有人格状态持久化、没有跨会话一致性校验、没有"违反人格"检测。所谓"场景角色扮演"就是把 `scene` 字符串塞进 prompt。Step 1.2 要求的"学习场景行为准则 → 显示进度 → 生成行为准则摘要"在代码中无对应实现 — 没有"学习"动作，更没有学习进度。
- **建议**: 至少实现一个"学习场景规则"的入口（生成并持久化 persona）；增加跨轮 persona drift 检测。
- **严重程度**: warning

---

## 4. 代码质量与架构疑点

### 疑点 12: Socket 命名空间设计冗余且职责重叠

- **关联 AC**: `ISSUE-COM001~c1` (命名空间设计)
- **文件位置**: `/Users/z/projects/bridgeai/apps/server/src/socket/index.ts:83-170`
- **问题描述**: 同时存在 `/`、`/chat`、`/user`、`/handoff`、`/system`、`/group`、`/room`、`/negotiation`、`/presence`、`/dialog`、`/matchSubscriptions` 共 11 个命名空间。`/chat` 与 `/dialog` 与 `/group` 与 `/room` 职责高度重叠 — 这些 handler 都在做"加入房间 / 广播消息 / 离开房间"。剧本只要求 `/chat` 与 `/presence` 两个命名空间。命名空间膨胀=认证开销重复（每个 nsp 各自调一次 `socketAuthMiddleware`）+ 客户端连接复杂度。
- **建议**: 整合 `/chat`、`/dialog`、`/group`、`/room` → `/chat` 一个命名空间下用 events 区分。
- **严重程度**: info

### 疑点 13: `dialogHandler` 只是被动广播器，不调用 dialog 引擎

- **关联 AC**: `ISSUE-AI004~c6` (WebSocket 实时对话), `AS-005~func`
- **文件位置**: `/Users/z/projects/bridgeai/apps/server/src/socket/handlers/dialogHandler.ts:1-71`
- **问题描述**: `/dialog` 命名空间的 handler 只暴露 `join_session`/`leave_session`/`new_message`/`typing`/`session_state` 5 个透传事件，没有任何调用 `agentDialogService.generateMessage()` 或 `agentToAgentDialog()` 的入口。即 mobile 端无法通过 WebSocket 触发 Agent 实际生成消息 — 只能调用 REST？也无对应 REST 路由（`agentDialog.ts` 路由文件不存在于 `routes/`）。
- **建议**: 增加 `dialog:generate` socket event 调用 service 并回写结果。
- **严重程度**: critical

### 疑点 14: dialog session 存储双轨 (memory Map + DB)，状态不一致风险

- **关联 AC**: `ISSUE-COM001~c3` (重连/状态同步)
- **文件位置**: `/Users/z/projects/bridgeai/apps/server/src/services/ai/agentDialogService.ts:154,403-407,808`
- **问题描述**: `sessions: Map` 内存缓存 + `dialogSessionRecord` DB upsert，每条消息都重写整个 session（messages JSON column 整体替换）。多实例（K8s 副本）情况下不同进程内存 Map 会偏离；大对话会消息越多越慢（O(n) JSON 序列化）。`persistSession` 失败仅 `logger.warn`，调用方拿到的是 in-memory 状态，但下次重启即丢失。
- **建议**: 改为 messages 单独 table、append-only；session map 仅做缓存，关键写直接落 DB；多副本场景配合 Redis pub/sub。
- **严重程度**: warning

---

## 5. 跨场景一致性疑点

### 疑点 15: 横向场景 (AgentJob/AgentAd/VisionShare) 各自独立实现，未真正复用

- **关联 AC**: `JOB-004~func`, `AD-004~func`, `VS-003~func`, Phase 5
- **文件位置**:
  - Dating: `/Users/z/projects/bridgeai/apps/server/src/services/dating/agentInitiatedChat.ts`、`agentConversationRoom.ts`
  - Job: `/Users/z/projects/bridgeai/apps/server/src/services/job/negotiationRoom.ts`
  - Ad: `/Users/z/projects/bridgeai/apps/server/src/services/ai/agentNegotiationService.ts`
- **问题描述**: 三个场景各有自己的 "Room" 与 "Chat" 服务（dating 的 `agentConversationRoom` + `agentInitiatedChat`、job 的 `negotiationRoom`、ad 的 `agentNegotiationService`），房间数据结构、状态机、消息格式互不相同（`ConversationRoom` vs `NegotiationRoom` vs `JobRoom` 字段差异巨大）。剧本 Phase 5 声称"横向同构 — 同一套基础设施"，实际是三套各自实现，没有共享 base class 或抽象。VisionShare 的"扫描相册推荐照片"与 Agent 对话基础设施完全脱钩。
- **建议**: 抽象 `AgentRoomBase`/`AgentDialogBase` 类，三场景继承。否则任何 Socket/AI 改进都要改 3 遍，维护成本高。
- **严重程度**: warning

### 疑点 16: AS-008 / US-AGENT-009 / AS-009 三个引荐相关 Story 实质未实现，只有 referralService 桩

- **关联 AC**: `AS-009-AC-1`, `AS-009~func`, `AS-008-AC-1`, `AS-008-AC-2`
- **文件位置**: `/Users/z/projects/bridgeai/apps/server/src/services/dating/agentConversationRoom.ts:413-439` (referral 触发); `/Users/z/projects/bridgeai/apps/server/src/services/dating/referralService.ts`
- **问题描述**: "匹配度达标 → 请求引荐 → 进入四人群聊" 整个流程在代码中只有 `agentConversationRoom.completeRoom` 末尾一段 — 当 `qualityScore >= 0.6` 调一次 `createReferralFromConversation`。但：(a) 剧本说阈值 80%，代码用 0.6；(b) 此触发路径只在 room 完成时（达到最大轮次/手动 complete）才走，不是"匹配度评估实时达标"动态触发；(c) 实时意图分析 → 主人确认弹窗 → 双方接受跳四人群聊的完整链路在 mobile 端无对应屏幕（grep 不到 `referralAccept` / `quadrupleChat` 等）。
- **建议**: 拆分实时阈值监听 + UI 流；阈值常量集中配置。
- **严重程度**: warning

---

## 总体评价

- **总疑点数**: 16
- **critical**: 6 (#1, #2, #3, #4, #7, #8, #13 — 实际为 7 个，但 #5 计 warning)
- **warning**: 8 (#5, #6, #9, #10, #11, #14, #15, #16)
- **info**: 1 (#12)

**整体结论**:

AS-005 "我主动与其他 Agent 对话" 的代码骨架（service 类、socket handler、prompt 模板）在关键文件中**确实存在并且能编译通过**，但故事剧本所声称的核心运行路径在生产端基本是**断裂的或占位实现**：

1. **"自主发起"链路死代码** — `initiateChat()` 没有调用方，没人会真的让 Agent 自主行动；
2. **核心私聊建议通道 `agent:private_advice` 完全不存在** — 涉及 7+ 个 AC 直接落空；
3. **Agent 学习记忆没有 schema** — `agent_memory` 表不存在，3 个 AS-LEARN AC 没有数据载体；
4. **限流 / 并发上限未接入** — `agentBehaviorService` 自我承认"未接入消息分发路径"；
5. **Dating Agent 自动响应是硬编码模板** — 不是 LLM；
6. **横向场景不复用基础设施** — 三套各自实现的房间/对话服务。

**推荐结论**：本 Story 距"真正达到验收标准"还有相当大的差距。建议至少先解决 6 个 critical 疑点（#1、#2、#3、#4、#7、#8、#13）后，再进行 Story-level 演示验收。当前实现更接近"框架雏形"而非"用户旅程可走通"的状态。
