# Story Playbook: Agent 控制信息披露

**Story**: `US-AGENT-014`
**Narrative**: Agent 根据对话情况决定是否向对方披露详细信息。

## 验收旅程概览

用户 Alice 为其 Agent（AgentDate 场景）配置信息披露策略，Agent 在与对方 Agent 对话过程中依据信任水平逐级释放信息，Alice 通过实时否决、预览不同角色视角、审计变更历史等方式全程掌控隐私边界。旅程覆盖从 Agent 创建、策略配置、匹配对话、信任升级披露、异常绕过尝试到审计回溯的完整链路。

## 前置条件

- 服务已启动（`pnpm dev`）
- 数据库已迁移（`pnpm db:migrate`）
- 已创建两个测试用户 Alice 和 Bob（各配一个 Agent）
- 两个用户的移动端模拟器/真机均已登录
- Socket.io 服务正常启动，Redis adapter 可用

---

## 旅程步骤

### Phase 1: Agent 创建与隐私初始化

**目的**: 验证 Agent 创建后自动加载主人画像、生成场景性格并获取默认隐私设置

**Step 1.1**: 创建 Agent 并绑定场景

- 操作: Alice 打开 App，进入"我的 Agent"页面，点击"创建 Agent"，选择 AgentDate 场景，填写基础信息（昵称、年龄段、兴趣标签）并保存
- 预期: Agent 创建成功，系统显示 Agent 卡片；Agent 自动读取 Alice 的用户画像，学习个性化规则并生成本场景的对话性格
- 验证 AC:
  - `AS-001~func` — Agent 被创建后能读取主人画像、学习规则、生成本场景性格
- 可截图: Agent 创建成功页面截图

**Step 1.2**: 获取默认隐私设置和披露权限

- 操作: Alice 点击刚创建的 Agent 卡片，进入 Agent 详情页，点击"信息披露设置"
- 预期: 系统自动为该 Agent 生成默认披露设置（字段级），页面显示"信息披露设置"界面，包含字段列表及各字段默认披露级别（如 name=公开、phone=引荐后可见）
- 验证 AC:
  - `AS-001-AC-3` — 获取隐私设置和披露权限
  - `ISSUE-C007~c2` — 默认披露策略已就绪
- 可截图: 信息披露设置默认状态截图

**Step 1.3**: 异常场景 — 画像缺失

- 操作: 通过 API 直接为一个无用户画像的测试用户创建 Agent，或删除已有画像数据后重新加载 Agent
- 预期: 系统优雅降级，Agent 使用通用默认性格；不崩溃，提示"画像数据不完整，已使用默认配置"
- 验证 AC:
  - `AS-001~edge` — 异常：主人画像缺失、场景规则加载失败
- 可截图: 降级提示截图

---

### Phase 2: 信息披露策略配置

**目的**: 验证用户为各字段配置披露级别、批量设置、严格模式、场景级策略等能力

**Step 2.1**: 配置字段级披露级别

- 操作: Alice 在"信息披露设置"页面，逐一设置各字段的披露级别：
  - name → 公开
  - location → 匹配后可见
  - contact → 私聊后可见
  - phone → 引荐后可见
    点击"保存"
- 预期: 保存成功，页面显示"保存成功"提示；重新进入设置页后各字段保持用户选择的级别
- 验证 AC:
  - `ISSUE-C007~c1` — 公开/匹配后/私聊后/引荐后四级披露控制
  - `ISSUE-C007~c2` — 每个字段的披露级别可单独设置
  - `US-AGENT-011-AC-2` — 为每个场景设置披露策略
  - `US-AGENT-012-AC-2` — 为每个场景设置展示策略
- 可截图: 字段级设置界面截图（显示各字段不同颜色标签）

**Step 2.2**: 批量设置与严格模式

- 操作: Alice 点击"批量设置"区域的"匹配后可见"按钮，确认后所有字段被批量设为 AFTER_MATCH；然后开启"严格模式"开关；点击"保存"
- 预期: 所有字段统一更新为"匹配后可见"；严格模式开关显示为"已开启"；保存成功后未配置字段将被隐藏
- 验证 AC:
  - `ISSUE-C007~c2` — 批量设置功能
  - `US-AGENT-014-AC-1` — 支持自动模式（严格模式关闭时 Agent 自动决策）
- 可截图: 批量设置确认弹窗 + 严格模式开启截图

**Step 2.3**: 为不同场景分别配置策略

- 操作: Alice 切换到 AgentAd 场景的 Agent，进入"信息披露设置"，配置不同的字段级别（如 company=公开、budget=匹配后可见）；然后切回 AgentDate 场景，确认两套策略互不影响
- 预期: 两个场景的披露策略各自独立保存，互不覆盖
- 验证 AC:
  - `US-AGENT-011~func` — 用户为每个场景分别配置公开和详细两级需求信息
  - `US-AGENT-012~func` — 用户为每个场景分别配置公开和详细两级供给信息
  - `US-AGENT-011-AC-2` — 为每个场景设置披露策略
  - `AD-001~func` — 用户配置 Agent：品类、预算、品牌偏好
  - `AD-002~func` — 商家配置 Agent：目标客户、优惠、推广预算
- 可截图: AgentDate 和 AgentAd 两套配置对比截图

**Step 2.4**: 预览不同角色视角

- 操作: Alice 在信息披露设置页点击"预览可见效果"按钮
- 预期: 页面展示四个角色视角卡片：
  - 陌生人视角：仅看到 name、avatar、bio
  - 已匹配用户视角：额外看到 location、company
  - 已私聊用户视角：额外看到 contact、email
  - 经引荐用户视角：额外看到 phone
    敏感字段在低权限视角下显示为"\*\*\*"
- 验证 AC:
  - `ISSUE-C007~c4` — 不同角色视角预览、信息脱敏展示、披露状态可视化
- 可截图: 预览页面四角色卡片截图

**Step 2.5**: 配置异常场景

- 操作: Alice 快速来回切换披露策略（公开→引荐后→公开→私聊后），观察系统行为；使用 API 尝试设置无效的 disclosure level
- 预期: 策略切换后行为一致，无残留状态；API 对无效 level 返回 400 错误
- 验证 AC:
  - `US-AGENT-011~edge` — 异常：披露策略切换后的行为一致性
  - `DATE-001~edge` — 异常：配置不完整、极端偏好
- 可截图: API 错误响应截图

---

### Phase 3: Socket.io 通信基础设施验证

**目的**: 验证实时通信底座正常工作，为后续对话披露提供通道

**Step 3.1**: Socket.io 连接建立与认证

- 操作: Alice 的客户端通过 WebSocket 连接到 `/chat` 和 `/presence` 命名空间，携带 JWT token
- 预期: 连接成功建立，服务器返回 `connected` 事件及 socketId；认证失败时（无效 token）连接被拒绝
- 验证 AC:
  - `ISSUE-COM001~c1` — Socket.io 与 Express 集成、命名空间设计（/chat, /presence）
  - `ISSUE-COM001~c2` — JWT token 验证、连接权限检查、用户身份绑定
- 可截图: 浏览器 DevTools Network 面板 WebSocket 连接截图

**Step 3.2**: 心跳检测与重连

- 操作: 模拟网络中断（关闭 Wi-Fi 3 秒后恢复），观察客户端行为
- 预期: 中断后客户端自动尝试重连；恢复后重连成功，收到新的 `connected` 事件；断开期间服务器清理旧连接
- 验证 AC:
  - `ISSUE-COM001~c3` — 连接建立处理、断开连接清理、心跳检测、重连机制
- 可截图: 重连日志截图

**Step 3.3**: 房间管理与广播

- 操作: Alice 加入房间 `match:{matchId}`，服务器端向该房间广播一条测试消息
- 预期: Alice 收到广播消息；其他房间的用户不受影响；房间成员查询返回正确列表
- 验证 AC:
  - `ISSUE-COM001~c4` — 房间创建和销毁、加入/离开房间、房间广播、房间成员查询
- 可截图: 房间消息接收截图

---

### Phase 4: 匹配对话与信任驱动的信息披露

**目的**: 验证 Agent 在对话过程中根据信任水平自主决策信息披露

**Step 4.1**: Agent 自主发起对话请求

- 操作: Alice 的 Agent（AgentDate 场景）扫描到符合条件的候选 Agent（Bob 的 Agent），自动发起对话请求
- 预期: Agent-Alice 向 Agent-Bob 发送对话请求；Alice 收到"您的 Agent 已向 Bob 的 Agent 发起对话"通知；同时可发起多个独立对话
- 验证 AC:
  - `AS-005-AC-2` — 自主发起对话请求
  - `AS-005-AC-3` — 同时与多个候选保持独立对话
  - `AS-005~func` — Agent 自主决定与符合条件的候选 Agent 发起对话
- 可截图: Agent 发起对话通知截图

**Step 4.2**: 初始对话阶段 — 仅公开信息可见

- 操作: Agent-Alice 与 Agent-Bob 开始自动对话；同时通过 API 以 Bob 的身份调用 `POST /api/v1/disclosure/{agentId}/check`，检查 Alice Agent 的 phone 字段
- 预期: 对话正常进行；check 接口返回 `canView: false`，因为当前关系阶段为 NONE，phone 要求 AFTER_REFERRAL
- 验证 AC:
  - `US-AGENT-014-AC-2` — 保护底线信息不轻易透露
  - `US-AGENT-014~func` — Agent 根据对话和信任水平决定是否披露详细信息
  - `AS-007-AC-1` — 分析当前信任水平
  - `AS-007~func` — Agent 根据信任水平决定是否向对方披露详细信息
- 可截图: API check 返回 canView=false 的响应截图

**Step 4.3**: 信任升级 — 匹配后信息披露

- 操作: 双方 Agent 对话匹配度达标，匹配成功；Alice 以 Bob 身份再次检查 Alice Agent 的 location 和 company 字段
- 预期: 匹配成功后关系阶段升为 MATCHED；location（AFTER_MATCH）和 company（AFTER_MATCH）变为可见；phone（AFTER_REFERRAL）仍不可见
- 验证 AC:
  - `ISSUE-C007~c1` — 匹配后可见信息正确释放
  - `ISSUE-C007~c3` — 披露级别计算、自动披露升级
  - `AS-007-AC-3` — 记录已披露信息
  - `DATE-001-AC-2` — 设置隐私级别生效
- 可截图: 匹配后 check 接口响应对比截图

**Step 4.4**: 私聊后进一步披露

- 操作: Alice 与 Bob 通过四人群聊开始私聊，双方各发送几条消息；然后检查 contact、email 字段
- 预期: 关系阶段升为 CHATTED；contact（AFTER_CHAT）和 email（AFTER_CHAT）变为可见；phone（AFTER_REFERRAL）仍不可见
- 验证 AC:
  - `ISSUE-C007~c1` — 私聊后可见信息正确释放
  - `US-AGENT-007~func` — 用户在四人群聊中成功切换"亲自聊"和"让 Agent 代聊"
  - `DATE-004-AC-1` — 四人群聊界面
  - `DATE-004~func` — 双方接受引荐后进入四人群聊交友
- 可截图: 私聊后字段可见性变化截图

**Step 4.5**: Agent 披露决策 — 每次确认模式

- 操作: Alice 将 Agent 设为"每次确认"模式；Agent 在对话中判断可以披露某字段时，向 Alice 发送确认请求"Agen 建议向对方披露您的工作经历，是否同意？"
- 预期: Alice 收到确认请求通知；点击"同意"后 Agent 向对方披露该信息；点击"拒绝"后 Agent 不披露并回复替代内容
- 验证 AC:
  - `US-AGENT-014-AC-1` — 支持每次确认模式和自动模式
  - `US-AGENT-014-AC-3` — 用户可实时否决即将发生的披露
  - `AS-007-AC-2` — 执行披露策略（每次确认/自动）
- 可截图: Agent 披露确认请求通知截图

**Step 4.6**: 实时否决披露

- 操作: Agent-Alice 在对话中准备自动披露 Alice 的联系方式；Alice 在 5 秒内点击"否决"按钮
- 预期: 披露被阻止；Agent 改为发送脱敏回复；对方看不到被否决的字段内容
- 验证 AC:
  - `US-AGENT-014-AC-3` — 用户可实时否决即将发生的披露
- 可截图: 否决操作界面截图

---

### Phase 5: 跨场景验证

**目的**: 验证披露机制在 AgentJob 和 AgentAd 场景中同样生效

**Step 5.1**: AgentJob 场景 — 薪资协商中的信息披露

- 操作: 在 AgentJob 场景中，Alice（求职者）和 Bob（招聘方）的 Agent 在四人群聊中协商薪资；检查薪资字段在未匹配时的可见性
- 预期: 薪资等敏感字段仅在下限关系阶段后可见；Agent 在协商过程中按信任水平逐步释放信息
- 验证 AC:
  - `JOB-004~func` — 双方 Agent 和用户在四人群聊中协商薪资
  - `US-AGENT-011-AC-2` — 为每个场景设置披露策略
- 可截图: AgentJob 四人群聊界面截图

**Step 5.2**: AgentAd 场景 — 优惠谈判中的信息披露

- 操作: 在 AgentAd 场景中，Alice（消费者）的 Agent 与商家 Agent 谈判争取更好优惠；检查预算字段可见性
- 预期: 预算字段按披露策略控制可见性；Agent 在谈判中根据策略决定是否透露预算底线
- 验证 AC:
  - `AD-004~func` — Agent 与商家 Agent 谈判争取更好优惠
  - `AD-001~func` — 用户配置 Agent：品类、预算、品牌偏好
  - `AD-002~func` — 商家配置 Agent：目标客户、优惠、推广预算
- 可截图: AgentAd 谈判对话截图

---

### Phase 6: 安全与异常场景

**目的**: 验证披露策略的防护能力和异常处理

**Step 6.1**: 尝试绕过披露策略

- 操作: 使用 Bob 的身份直接调用 `POST /api/v1/disclosure/{aliceAgentId}/filter` 接口，传入 Alice 的完整 Agent 数据（包含 phone），观察返回的过滤结果
- 预期: 返回数据中 phone 字段被过滤掉；只有符合当前关系阶段的字段被返回
- 验证 AC:
  - `US-AGENT-014~edge` — 异常：披露策略被绕过
  - `AS-007~edge` — 异常：披露策略被绕过、信任计算错误
  - `US-AGENT-012~edge` — 异常：供给信息被未授权访问
  - `DATE-001~func` — 用户配置交友偏好和个人信息（隐私生效）
- 可截图: filter 接口返回的脱敏数据截图

**Step 6.2**: 对方拒绝对话与并发限制

- 操作: Agent-Alice 向 Agent-Bob 发起对话请求，Bob 设为拒绝状态；然后 Alice 同时发起 5 个以上对话请求
- 预期: 被拒绝时收到"对方拒绝"通知，Agent 不再重复请求；并发对话数达上限时收到"同时对话数过多"提示
- 验证 AC:
  - `AS-005~edge` — 异常：对方拒绝对话、同时对话数过多
- 可截图: 拒绝对话通知截图

**Step 6.3**: 异常配置处理

- 操作: 使用 API 将 AD 场景 Agent 的目标客户设为空字符串、推广预算设为 0；将 DATE 场景偏好设为极端值
- 预期: 系统返回校验错误或优雅降级提示，不影响其他 Agent 功能
- 验证 AC:
  - `AD-001~edge` — 异常：无偏好设置、极端预算
  - `AD-002~edge` — 异常：目标客户描述为空、预算为零
- 可截图: API 校验错误响应截图

---

### Phase 7: 变更管理与审计回溯

**目的**: 验证披露设置的变更记录、信息撤回、审计日志等能力

**Step 7.1**: 修改披露设置并查看变更历史

- 操作: Alice 将 phone 字段从"引荐后可见"改为"私聊后可见"，保存后调用 `GET /api/v1/disclosure/{agentId}/history`
- 预期: 变更历史中新增一条记录，包含 previousLevel=AFTER_REFERRAL、newLevel=AFTER_CHAT、changedBy=Alice、changedAt 时间戳
- 验证 AC:
  - `ISSUE-C007~c5` — 披露设置变更记录
  - `ISSUE-C007~c3` — 披露历史记录
  - `AS-007-AC-3` — 记录已披露信息
- 可截图: 变更历史 API 响应截图

**Step 7.2**: 撤回已披露信息

- 操作: Alice 调用撤回接口，将已向 Bob 披露的 email 字段撤回；Bob 再次尝试访问 Alice 的 email
- 预期: 撤回成功，Bob 访问 email 时返回 canView=false；Bob 收到"对方已更新隐私设置"通知
- 验证 AC:
  - `ISSUE-C007~c5` — 已披露信息撤回、对方变更通知
- 可截图: 撤回后 check 接口返回 canView=false 截图

**Step 7.3**: 访问审计日志

- 操作: 调用 `GET /api/v1/disclosure/{agentId}/access-log` 查看所有访问记录
- 预期: 日志包含所有历史访问尝试（成功和失败），包含 accessedBy、fieldName、accessGranted、timestamp
- 验证 AC:
  - `ISSUE-C007~c5` — 披露审计日志
  - `ISSUE-C007~c3` — 访问权限验证记录
  - `ISSUE-C007~c4` — 披露状态可视化（日志形式）
- 可截图: 审计日志 API 响应截图

**Step 7.4**: 用户随时退出

- 操作: Alice 在匹配列表页点击"退出匹配"；然后在四人群聊中点击"退出群聊"
- 预期: 退出匹配后 Agent 停止与候选对话；退出群聊后不再收到群消息，但历史消息保留
- 验证 AC:
  - `US-AGENT-015-AC-1` — 在匹配列表页或四人群中可随时退出
  - `US-AGENT-015~func` — 用户在匹配过程中随时退出
- 可截图: 退出确认弹窗截图

**Step 7.5**: 频繁退出加入异常

- 操作: Alice 快速连续退出/加入匹配 5 次以上
- 预期: 系统设置频率限制或弹出"操作过于频繁"提示；不产生数据不一致
- 验证 AC:
  - `US-AGENT-015~edge` — 异常：频繁退出加入
- 可截图: 频率限制提示截图

---

## AC 覆盖表

| AC Slug           | 描述                                           | 验证方式                                | 所在步骤      |
| ----------------- | ---------------------------------------------- | --------------------------------------- | ------------- |
| AS-005-AC-2       | 自主发起对话请求                               | 观察Agent自动发起对话通知               | Step 4.1      |
| AS-005-AC-3       | 同时与多个候选保持独立对话                     | 验证多个独立对话同时进行                | Step 4.1      |
| DATE-004-AC-1     | 四人群聊界面                                   | 进入四人群聊页查看四人头像              | Step 4.4      |
| US-AGENT-015-AC-1 | 在匹配列表页或四人群中可随时退出               | 点击退出按钮验证                        | Step 7.4      |
| ISSUE-COM001~c1   | 服务器搭建：Socket.io集成/命名空间/适配器/传输 | WebSocket连接到/chat和/presence命名空间 | Step 3.1      |
| ISSUE-COM001~c2   | 连接认证：JWT/权限/身份绑定/失败处理           | 携带JWT连接，验证无效token被拒          | Step 3.1      |
| ISSUE-COM001~c3   | 连接生命周期：建立/断开/心跳/重连              | 模拟网络中断后自动重连                  | Step 3.2      |
| ISSUE-COM001~c4   | 房间管理：创建销毁/加入离开/广播/成员查询      | 加入房间并接收广播消息                  | Step 3.3      |
| US-AGENT-007~func | 四人群聊中切换亲自聊和Agent代聊                | 在群聊中验证身份切换                    | Step 4.4      |
| DATE-004~func     | 双方接受引荐后进入四人群聊交友                 | 匹配成功后进入四人群聊                  | Step 4.4      |
| JOB-004~func      | 四人群聊中协商薪资                             | AgentJob场景群聊验证                    | Step 5.1      |
| AD-004~func       | Agent与商家Agent谈判争取更好优惠               | AgentAd场景谈判验证                     | Step 5.2      |
| AS-005~func       | Agent自主决定与候选Agent发起对话               | 观察Agent自动扫描并对话                 | Step 4.1      |
| AS-005~edge       | 异常：对方拒绝对话、同时对话数过多             | 发起对话被拒和超并发测试                | Step 6.2      |
| US-AGENT-015~func | 用户在匹配过程中随时退出                       | 点击退出匹配/退出群聊                   | Step 7.4      |
| US-AGENT-015~edge | 异常：频繁退出加入                             | 快速连续退出加入5次                     | Step 7.5      |
| AS-001-AC-3       | 获取隐私设置和披露权限                         | 进入披露设置页查看默认配置              | Step 1.2      |
| AS-007-AC-1       | 分析当前信任水平                               | 对话各阶段检查信任级别计算              | Step 4.2      |
| AS-007-AC-2       | 执行披露策略（每次确认/自动）                  | 切换模式并验证行为                      | Step 4.5      |
| AS-007-AC-3       | 记录已披露信息                                 | 查看变更历史中的披露记录                | Step 4.3, 7.1 |
| US-AGENT-011-AC-2 | 为每个场景设置披露策略                         | 分别配置AgentDate和AgentAd策略          | Step 2.3      |
| US-AGENT-012-AC-2 | 为每个场景设置展示策略                         | 分别配置两个场景的展示策略              | Step 2.3      |
| US-AGENT-014-AC-1 | 支持每次确认模式和自动模式                     | 切换模式并验证Agent行为差异             | Step 2.2, 4.5 |
| US-AGENT-014-AC-2 | 保护底线信息不轻易透露                         | 验证phone等敏感字段在低信任时不可见     | Step 4.2      |
| US-AGENT-014-AC-3 | 用户可实时否决即将发生的披露                   | 点击否决按钮阻止Agent披露               | Step 4.6      |
| DATE-001-AC-2     | 设置隐私级别                                   | 配置AgentDate场景隐私级别并验证         | Step 4.3      |
| ISSUE-C007~c1     | 披露控制：公开/匹配后/私聊后/引荐后            | 四个关系阶段逐一验证字段可见性          | Step 4.2-4.4  |
| ISSUE-C007~c2     | 字段控制：每字段级别/默认策略/批量设置/预览    | 逐一设置、批量设置、预览效果            | Step 2.1-2.4  |
| ISSUE-C007~c3     | 权限控制：级别计算/权限验证/自动升级/历史记录  | API check/filter验证、变更历史          | Step 4.3, 7.1 |
| ISSUE-C007~c4     | 预览功能：角色视角预览/脱敏/可视化/提示        | 点击预览按钮查看四角色卡片              | Step 2.4      |
| ISSUE-C007~c5     | 变更处理：变更记录/撤回/通知/审计日志          | 修改设置、撤回信息、查看日志            | Step 7.1-7.3  |
| US-AGENT-011~func | 为每个场景分别配置公开和详细两级需求信息       | 分别配置AgentDate和AgentAd              | Step 2.3      |
| US-AGENT-011~edge | 异常：披露策略切换后行为一致性                 | 快速切换策略验证一致性                  | Step 2.5      |
| US-AGENT-012~func | 为每个场景分别配置公开和详细两级供给信息       | 分别配置两套策略                        | Step 2.3      |
| US-AGENT-012~edge | 异常：供给信息被未授权访问                     | 用Bob身份调用filter接口验证脱敏         | Step 6.1      |
| US-AGENT-014~func | Agent根据对话和信任水平决定是否披露详细信息    | 四阶段信任递增验证                      | Step 4.2-4.4  |
| US-AGENT-014~edge | 异常：披露策略被绕过                           | 直接调用API尝试获取敏感字段             | Step 6.1      |
| DATE-001~func     | 用户配置交友偏好和个人信息                     | 配置AgentDate场景偏好                   | Step 2.3      |
| DATE-001~edge     | 异常：配置不完整、极端偏好                     | 设置极端配置验证校验                    | Step 2.5      |
| AD-001~func       | 用户配置Agent：品类、预算、品牌偏好            | 配置AgentAd场景消费者Agent              | Step 2.3      |
| AD-001~edge       | 异常：无偏好设置、极端预算                     | 设置空偏好和极端预算                    | Step 6.3      |
| AD-002~func       | 商家配置Agent：目标客户、优惠、推广预算        | 配置AgentAd场景商家Agent                | Step 5.2      |
| AD-002~edge       | 异常：目标客户描述为空、预算为零               | 设置空描述和零预算                      | Step 6.3      |
| AS-001~func       | Agent创建后读取画像/学习规则/生成性格          | 创建Agent并查看自动生成结果             | Step 1.1      |
| AS-001~edge       | 异常：主人画像缺失、场景规则加载失败           | 无画像创建Agent验证降级                 | Step 1.3      |
| AS-007~func       | Agent根据信任水平决定披露                      | 对话各阶段验证字段可见性变化            | Step 4.2-4.4  |
| AS-007~edge       | 异常：披露策略被绕过、信任计算错误             | API绕过尝试 + 异常信任计算              | Step 6.1      |

---

## 环境启动

```bash
# 1. 安装依赖
pnpm install

# 2. 数据库迁移
pnpm db:migrate

# 3. 种子数据（创建测试用户和Agent）
pnpm db:seed

# 4. 启动开发服务
pnpm dev

# 5. 验证服务健康
curl http://localhost:3000/health

# 6. 验证 Socket.io 连接（可选）
# 浏览器打开 http://localhost:3000 并检查 DevTools Network 面板 WebSocket 连接
```
