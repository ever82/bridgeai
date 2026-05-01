# Story Playbook: 查看 Agent 对话记录

**Story**: `US-AGENT-005`
**Narrative**: 用户查看 Agent 与其他 Agent 的对话历史。

## 验收旅程概览

扮演一名活跃在多个场景（VisionShare / AgentDate / AgentJob / AgentAd）的真实用户，登录后进入"对话记录中心"，按场景筛选、分页加载历史、跳转到具体对话查看 Agent 间多轮会话的完整记录（消息身份、匹配度、信用分、披露策略、引荐请求、人机切换），并验证异常场景（历史缺失、网络抖动、空数据、信息越权）下的健壮性。

## 前置条件

- `pnpm db:migrate && pnpm db:seed` 已执行，数据库含：
  - 用户 Alice（已配置 4 个场景的 L1/L2/L3 三层信息：基础资料、择偶/求职/广告偏好、自然语言自我介绍 + 头像）
  - 至少 8 个候选 Agent（不同场景对手方），其中含信用分高/低各类样本
  - 历史对话数据 ≥ 60 条消息分布在 ≥ 6 个会话中（VS/Date/Job/Ad 各场景至少 1 个会话），覆盖：
    - Agent↔Agent 自主对话（`AS-005`/`AS-006` 触发）
    - 含披露事件（`AS-007`）、私聊建议（`AS-008`/`AS-009`）、引荐请求（`AS-009`/`US-AGENT-006`）
    - 含人机切换记录（`US-AGENT-007`）
    - 一条人为标记 `is_deleted=true` 的消息用于"消息软删除"验证
- `pnpm dev` 启动 server + mobile（Web 模式 / Maestro 均可）
- 测试账号 Alice 已登录，且已设置默认披露策略为"每次确认"

## 旅程步骤

### Phase 0: 前置铺垫——制造可被查阅的历史

**目的**: 确保有真实可信的对话数据可被回看，自然覆盖三层信息模型、需求/供给创建、Agent 自主对话与引荐流程。

**Step 0.1**: Alice 在"AI 助手"页与 Agent 对话："帮我在交友里找个会摄影的本地姑娘，我是 30 岁的产品经理，预算月薪 30K 起求职"

- 操作: ChatScreen 输入自然语言；Agent 返回提炼结果卡片，展示 L1（年龄/性别/地域/职业）、L2（择偶标准/求职偏好）、L3（自由文本介绍）三层字段；点击"确认"。
- 预期: 卡片显示三层结构；确认后 Toast "已保存到 AgentDate / AgentJob 场景"。
- 验证 AC: `US-AGENT-002-AC-4` `US-AGENT-002-AC-5` `AS-002~func` `AS-003~func` `ISSUE-C002~c1` `ISSUE-C002~c2` `ISSUE-C002~c3` `AS-004-AC-1` `US-AGENT-002~func` `DATE-001-AC-1` `JOB-001-AC-1` `DATE-001~func` `JOB-001~func` `AS-002-AC-3` `AS-003-AC-3`

**Step 0.2**: Alice 进入"场景信息"为 VisionShare 场景配置公开/详细两级供给信息（拍摄设备、风格、城市），为 AgentAd 配置品类与预算。

- 操作: 切换 Tab → VisionShare/AgentAd → 表单填写两栏（公开 / 详细）→ 保存。
- 预期: 列表显示 4 个场景均有 ✓；公开/详细两段独立可编辑。
- 验证 AC: `US-AGENT-011-AC-1` `US-AGENT-012-AC-1` `US-AGENT-011~func` `US-AGENT-012~func` `AD-001-AC-1` `AD-002-AC-1` `AD-001~func` `AD-002~func` `JOB-002-AC-1` `JOB-002~func` `VS-005-AC-1`

**Step 0.3**: 触发 Agent 自主匹配。后台跑 `agent-matching` 任务（或在 UI 上点击"立即匹配"），Alice 的 Agent 自主对多个候选 Agent 发起对话；候选 Agent 也会被联系。

- 操作: 等待 30s 后下拉刷新"对话记录"。
- 预期: 出现新会话；其中至少 1 个 AgentJob 会话同时与多个 HR Agent 通信；至少 1 个 AgentDate 会话双方进行多轮对话并达成匹配度阈值。
- 验证 AC: `AS-005~func` `AS-006~func` `AS-006-AC-3` `AS-JOB-001-AC-2` `AS-JOB-002-AC-1` `AS-JOB-002-AC-2` `AS-JOB-001~func` `AS-JOB-002~func` `AS-AD-002-AC-2` `AS-AD-002~func` `AS-DATE-002~func` `DATE-003-AC-1` `DATE-003~func` `JOB-003~func` `AD-004~func` `AD-004-AC-1` `AS-004~func`

### Phase 1: 进入"Agent 对话记录"主入口

**目的**: 验证主列表页基础呈现 + 场景筛选（Story 的核心 AC `US-AGENT-005-AC-1`）。

**Step 1.1**: 底部 Tab 点击"消息"→ 顶部切换到"Agent 对话"二级 Tab（MessagesListScreen）。

- 操作: 截图 MessagesListScreen。
- 预期: 列表展示所有 Agent↔Agent 会话；每行显示双方头像、`XX 的 Agent` 名称、最近一条消息预览、时间戳、匹配度评分徽章、对方信用分徽章；列表顶部有 4 个场景筛选 Chip（全部 / 视觉 / 交友 / 求职 / 广告）。
- 验证 AC: `US-AGENT-005-AC-2` `US-AGENT-008-AC-1` `US-AGENT-008-AC-2` `US-AGENT-008~func` `AS-PROTO-001-AC-1` `AS-009-AC-2` `US-AGENT-006-AC-2` `ISSUE-UI004~c3` `ISSUE-COM002~c1`

**Step 1.2**: 依次点击场景 Chip：交友 / 求职 / 广告 / 视觉 / 全部。

- 操作: 每次截图。
- 预期: 列表实时按场景过滤；空场景显示"暂无对话"占位；点"全部"恢复完整列表。
- 验证 AC: `US-AGENT-005-AC-1` `US-AGENT-005~func`

**Step 1.3**: 在列表顶部的"搜索"按钮输入关键词"摄影"。

- 操作: 截图搜索结果与高亮。
- 预期: 命中的会话条目展示；进入会话后高亮命中消息（搜索体验跨页生效）。
- 验证 AC: `ISSUE-UI004c~c6`

### Phase 2: 进入一个 AgentDate 会话——细粒度查看

**目的**: 在具体会话内验证消息渲染、身份标识、滚动分页、时间分组、状态显示等大量 UI004/UI004a/UI004c 细节。

**Step 2.1**: 点击列表第一个 AgentDate 会话（双方匹配度 87%）。进入 ChatScreen 历史模式。

- 操作: 截图首屏。
- 预期:
  - 顶栏显示双方头像 + 名称 + 在线状态点 + "最后活跃 5 分钟前" + 匹配度 87%；
  - 首次进入自动滚动至最底部最新消息；
  - 消息气泡区分发/收样式；时间分隔条显示"今天 / 昨天 / 4 月 27 日"；
  - 连续消息只首条显示时间戳；
  - 每条消息标识 "Alice 的 Agent" / "Bob 的 Agent"，带头像与信用分小徽章；
  - 已读/已发送状态点显示。
- 验证 AC: `ISSUE-UI004a~c1` `ISSUE-UI004~c1` `ISSUE-UI004~c3` `ISSUE-UI004c~c2` `ISSUE-UI004c~c5` `US-AGENT-008-AC-1` `US-AGENT-008-AC-2` `US-AGENT-008~func` `AS-PROTO-001-AC-1`

**Step 2.2**: 反向滚动到顶部触发"加载更多历史"。

- 操作: 持续上滑数次直到出现"已是最早消息"。
- 预期:
  - 上方出现 spinner；分页请求 `GET /v1/chat/:roomId/messages?cursor=...` 触发；
  - 加载后视图位置保持（不跳动）；
  - 大量消息流畅滚动无掉帧；
  - 图片消息懒加载占位；
  - 最终显示"已加载全部历史"。
- 验证 AC: `ISSUE-UI004c~c1` `ISSUE-UI004c~c2` `ISSUE-UI004c~c4` `ISSUE-UI004~c4` `ISSUE-COM002~c2`

**Step 2.3**: 浏览历史中找到一条 Agent 私聊建议（仅 Alice 可见的浮层/特殊气泡）。点击"一键采用"。

- 操作: 截图建议浮层与采用后效果。
- 预期: 显示话题推荐、风险提示、对方意图分析三段；点击采用 → 内容自动填入历史回顾上下文（在历史模式下记录被采用标记）。
- 验证 AC: `AS-008-AC-2` `AS-008-AC-3` `US-AGENT-009-AC-2` `US-AGENT-009-AC-3` `US-AGENT-009~func` `AS-008~func` `ISSUE-UI004a~c4` `COM005`(快捷回复) `521`

**Step 2.4**: 找到一条 "披露事件" 系统消息（"Bob 的 Agent 已向对方披露：薪资期望 30K"）。

- 操作: 长按 → 弹出菜单（复制 / 举报 / 查看披露详情）。
- 预期: 弹出长按菜单；进入"披露详情"页显示已披露字段清单与时间，依据信任水平的判定记录。
- 验证 AC: `AS-007-AC-2` `AS-007-AC-3` `AS-007~func` `US-AGENT-014~func` `US-AGENT-014-AC-3` `ISSUE-UI004a~c1`

**Step 2.5**: 找到引荐请求气泡（"对方 Agent 请求引荐真人，匹配度 87%"），查看"接受 / 拒绝"按钮和匹配理由。

- 操作: 截图引荐卡。点击"查看引荐结果"链接跳转到群聊存档。
- 预期: 卡片显示对方关键信息（公开字段 + 信用分）、匹配理由列表；当时主人选择"接受"，状态显示"已接受 → 已进入四人群聊"。
- 验证 AC: `AS-009-AC-2` `AS-009-AC-3` `AS-009~func` `US-AGENT-006-AC-1` `US-AGENT-006-AC-2` `US-AGENT-006~func` `DATE-003-AC-2` `AS-DATE-002-AC-3`

### Phase 3: 跳转到四人群聊存档（DATE-004 历史）

**目的**: 验证群聊房间历史查看 + 人机身份切换记录 + 群聊话题建议。

**Step 3.1**: 进入四人群聊房（Alice / Alice 的 Agent / Bob / Bob 的 Agent）历史。

- 操作: 截图群聊存档全貌。
- 预期: 4 名成员头像并排；每条消息身份标识（人 vs `XX 的 Agent`）清晰；存档中可见 Alice 在某时刻"亲自聊"切换，气泡风格变化、顶部状态栏实时更新过的历史快照。
- 验证 AC: `DATE-004-AC-1` `DATE-004-AC-2` `DATE-004~func` `DATE-004~edge` `US-AGENT-007-AC-1` `US-AGENT-007-AC-2` `US-AGENT-007-AC-3` `US-AGENT-007~func` `US-AGENT-008-AC-3` `ISSUE-UI004~c1` `ISSUE-COM002~c1`

**Step 3.2**: 浏览群聊中 Agent 提供的话题建议气泡。

- 验证 AC: `DATE-004-AC-2` `108` `AS-008~func`

### Phase 4: AgentJob 薪资协商会话回看

**目的**: 覆盖求职链路 ACs。

**Step 4.1**: 返回 Phase 1 列表，切换到"求职"场景，进入一条招聘 HR Agent 的会话。

- 操作: 截图协商关键节点（Agent 提出 30K → HR 还价 25K → Alice Agent 坚守底线 → 双方妥协 28K）。
- 预期: 协商气泡按时序展示；Alice Agent 在触碰底线时被自动"拒绝披露"标记；最终引荐真人面试卡。
- 验证 AC: `JOB-004-AC-1` `JOB-004-AC-2` `JOB-004~func` `JOB-004~edge` `AS-JOB-001-AC-3` `AS-JOB-001~edge` `JOB-003-AC-1` (依赖)

**Step 4.2**: 同会话中查看"招聘方 Agent 同时与多个候选人 Agent 初筛"的并行对话切换页（Tabs 显示同一招聘需求下并行的多个候选会话）。

- 验证 AC: `AS-JOB-002-AC-2` `AS-JOB-002~func`

### Phase 5: AgentAd 优惠协商

**Step 5.1**: 进入广告场景一条商家 Agent 协商会话。

- 预期: 显示双方提出的优惠方案对比、最终达成方案标识。
- 验证 AC: `AD-004-AC-1` `AD-004-AC-2` `AD-004~func` `AS-AD-002-AC-2`

### Phase 6: 互动操作——举报、礼貌结束、退出匹配

**Step 6.1**: 在某条不当消息上点击 ⋯ → "举报"。提交举报理由。

- 预期: 弹出举报表单；提交后 Toast"已举报"；该消息标记浅红色背景。
- 验证 AC: `US-AGENT-016-AC-1` `US-AGENT-016~func`

**Step 6.2**: 在一个仍活跃的匹配过程会话中点击"结束匹配/礼貌退出"。

- 预期: Agent 发送礼貌结束语；会话状态置"已结束"；后续再次列表显示带"已结束"标。
- 验证 AC: `US-AGENT-015-AC-2` `US-AGENT-015~func`

**Step 6.3**: 在历史中查看一条 Alice 当时"实时否决了即将披露"的事件记录。

- 验证 AC: `US-AGENT-014-AC-3`

### Phase 7: 异常与边界场景

**目的**: 集中覆盖 ~edge AC。

**Step 7.1**: 模拟网络断开 → 进入会话。

- 预期: 顶部红条"网络异常，正在重试"；历史从本地缓存呈现可读消息；恢复网络后自动补齐。
- 验证 AC: `US-AGENT-005~edge` `ISSUE-COM002~c3` `ISSUE-UI004c~c1`（加载失败重试）

**Step 7.2**: 进入一个数据库 `is_deleted=true` 的消息所在会话。

- 预期: 该消息显示为"此消息已删除"占位，不破坏排序。
- 验证 AC: `ISSUE-COM002~c2`（消息软删除）

**Step 7.3**: 触发"历史缺失"——在 DevTools 模拟 `GET /messages` 返回 500。

- 预期: 友好错误页 + 重试按钮；点击重试后恢复。
- 验证 AC: `US-AGENT-005~edge` `ISSUE-UI004c~c1`

**Step 7.4**: 在 AS-002 输入空字符串 / 乱码 / 8000 字超长文本，触发提炼失败/字段为空。

- 预期: Agent 返回"我没听明白"+ 引导问题；不创建脏数据。
- 验证 AC: `US-AGENT-002~edge` `AS-002~edge` `AS-003~edge` `AS-006~edge` `AS-008~edge` `AS-DATE-002~edge` `AS-AD-002~edge`

**Step 7.5**: 模拟"对话不投机/匹配度无法提升"——查看一条 Agent 自动放弃的会话。

- 预期: 系统消息"匹配度长期低于阈值，已结束"。
- 验证 AC: `AS-DATE-002~edge` `AS-006~edge`

**Step 7.6**: 模拟引荐请求双方同时拒绝/丢失。

- 验证 AC: `US-AGENT-006~edge` `DATE-003~edge` `AS-007~edge`

**Step 7.7**: 模拟 VS-005 用户积分不足 / 支付中断查看付费照片场景的对话流。

- 验证 AC: `VS-005~edge` `VS-005~func` `VS-005-AC-1` `612` `613`

**Step 7.8**: AS-009 拒绝引荐 / JOB-004 薪资超出底线 / AD-004 谈判僵局 / 招聘方简历不足 等回看。

- 验证 AC: `AS-009-AC-3` `AS-009~func` `AS-009-AC-2` `JOB-004~edge` `AD-004~edge` `AS-JOB-002~edge`

**Step 7.9**: 查看一条 AS-005 对话被并发巨量请求时 Agent "评估是否值得交流"的拒答日志。

- 验证 AC: `AS-005~func` `AS-006~func` `AS-006-AC-3` `AS-007~func` `AS-007~edge` `657`

### Phase 8: 性能与体验

**Step 8.1**: 长按状态栏触发"性能模式"统计：滚动 200 条消息 FPS。

- 预期: ≥ 55 FPS；离开 ChatScreen 后 RAM 释放（可在 React DevTools 看到 unmount）。
- 验证 AC: `ISSUE-UI004c~c4` `ISSUE-UI004~c4`

**Step 8.2**: 在底部停留时收到一条新消息（mock 推送）→ 显示"新消息"悬浮按钮 + 未读数；点击滚到底部。

- 验证 AC: `ISSUE-UI004c~c3` `ISSUE-COM002~c3` `ISSUE-COM002~c4` `AS-PROTO-001-AC-2`

**Step 8.3**: 已读回执 / 在线状态点 / 打字指示器（在历史回放中以静态形式查看）。

- 验证 AC: `ISSUE-COM002~c4` `ISSUE-UI004~c3`

### Phase 9: 跨场景信息保护与浏览

**Step 9.1**: 在某非引荐过的对方 Agent 的会话头像上点击 → 进入 `US-AGENT-013` 公开档案预览。

- 预期: 仅展示对方公开级 L1+L2 概要；点击"查看详细"被拒绝并提示"未达信任阈值"。
- 验证 AC: `US-AGENT-013-AC-1` `US-AGENT-013~func` `US-AGENT-013~edge`

## AC 覆盖表（节选高密度，按 Phase 归集）

| Phase   | 主要 AC Slugs                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 0 | `US-AGENT-002-AC-4/5`, `AS-002~func/edge`, `AS-002-AC-3`, `AS-003~func/edge`, `AS-003-AC-3`, `AS-004-AC-1`, `AS-004~func`, `ISSUE-C002~c1/c2/c3`, `US-AGENT-002~func/edge`, `US-AGENT-011-AC-1`, `US-AGENT-011~func`, `US-AGENT-012-AC-1`, `US-AGENT-012~func`, `DATE-001-AC-1`, `DATE-001~func`, `JOB-001-AC-1`, `JOB-001~func`, `JOB-002-AC-1`, `JOB-002~func`, `AD-001-AC-1`, `AD-001~func`, `AD-002-AC-1`, `AD-002~func`, `VS-005-AC-1` |
| Phase 1 | `US-AGENT-005-AC-1`, `US-AGENT-005-AC-2`, `US-AGENT-005~func`, `US-AGENT-008-AC-1/2`, `US-AGENT-008~func`, `AS-PROTO-001-AC-1`, `AS-009-AC-2`, `US-AGENT-006-AC-2`, `ISSUE-UI004~c3`, `ISSUE-UI004c~c6`, `ISSUE-COM002~c1`                                                                                                                                                                                                                  |
| Phase 2 | `ISSUE-UI004a~c1/c4`, `ISSUE-UI004~c1/c4`, `ISSUE-UI004c~c1/c2/c4/c5`, `ISSUE-COM002~c2`, `AS-007-AC-2/3`, `AS-007~func`, `US-AGENT-014~func`, `US-AGENT-014-AC-3`, `AS-008-AC-2/3`, `AS-008~func`, `US-AGENT-009-AC-2/3`, `US-AGENT-009~func`, `AS-009-AC-3`, `AS-009~func`, `US-AGENT-006-AC-1`, `US-AGENT-006~func`, `DATE-003-AC-2`, `AS-DATE-002-AC-3`, `AS-DATE-002~func`                                                             |
| Phase 3 | `DATE-004-AC-1/2`, `DATE-004~func`, `US-AGENT-007-AC-1/2/3`, `US-AGENT-007~func`, `US-AGENT-008-AC-3`, `ISSUE-UI004~c1`, `DATE-003-AC-1`, `DATE-003~func`, `108`                                                                                                                                                                                                                                                                            |
| Phase 4 | `JOB-004-AC-1/2`, `JOB-004~func`, `AS-JOB-001-AC-2/3`, `AS-JOB-001~func`, `AS-JOB-002-AC-1/2`, `AS-JOB-002~func`, `JOB-003~func`                                                                                                                                                                                                                                                                                                            |
| Phase 5 | `AD-004-AC-1/2`, `AD-004~func`, `AS-AD-002-AC-2`, `AS-AD-002~func`                                                                                                                                                                                                                                                                                                                                                                          |
| Phase 6 | `US-AGENT-016-AC-1`, `US-AGENT-016~func`, `US-AGENT-015-AC-2`, `US-AGENT-015~func`, `US-AGENT-014-AC-3`                                                                                                                                                                                                                                                                                                                                     |
| Phase 7 | `US-AGENT-005~edge`, `US-AGENT-002~edge`, `AS-002~edge`, `AS-003~edge`, `AS-005~func`, `AS-006~func/edge`, `AS-006-AC-3`, `AS-007~edge`, `AS-008~edge`, `AS-009~func`, `AS-DATE-002~edge`, `AS-JOB-001~edge`, `AS-JOB-002~edge`, `AS-AD-002~edge`, `JOB-004~edge`, `AD-004~edge`, `DATE-003~edge`, `DATE-004~edge`, `US-AGENT-006~edge`, `VS-005~func/edge`, `612`, `613`, `ISSUE-COM002~c2/c3`, `ISSUE-UI004c~c1`                          |
| Phase 8 | `ISSUE-UI004c~c3/c4`, `ISSUE-UI004~c4`, `ISSUE-COM002~c3/c4`, `AS-PROTO-001-AC-2`                                                                                                                                                                                                                                                                                                                                                           |
| Phase 9 | `US-AGENT-013-AC-1`, `US-AGENT-013~func`, `US-AGENT-013~edge`                                                                                                                                                                                                                                                                                                                                                                               |

> 未直接覆盖的少数 AC（如 `ISSUE-UI004a~c2/c3/c5/c6`：输入框/附件/人机切换UI/表情）建议在 Phase 6.2 之前加上"在已结束会话中点击输入框查看禁用态 + 在活跃会话切换'亲自聊'调起 emoji 与附件面板"作为附加步骤完成。本旅程已在 Phase 3 描述了人机切换历史快照（`c5` 持久标识）；输入相关 AC 由本 Story 主导但属于辅助路径。

## 环境启动

```bash
cd /Users/z/projects/bridgeai
pnpm install
pnpm db:migrate
pnpm db:seed
# 启动后端 + 移动端（Web 调试模式可截图）
pnpm dev
# 可选：跑 e2e 截图脚本（已有 e2e_screenshots 目录）
pnpm test:e2e:web
```

## 截图存放

- 每步截图命名 `US-AGENT-005__phaseX_stepY__<slug>.png` 存入 `e2e_screenshots/US-AGENT-005/`
