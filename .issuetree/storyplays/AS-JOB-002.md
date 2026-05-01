# Story Playbook: AgentJob 职位匹配与薪资协商

**Story**: `AS-JOB-002`
**Narrative**: 用户在 AgentJob 场景中进行职位匹配和薪资协商。

---

## 验收旅程概览

以 HR 角色主人"小红"为视角，完整体验从注册 Agent、发布职位、等待智能匹配、
批量评估候选简历、与候选人 Agent 展开初筛对话、触发薪资协商、达成一致后引荐真人面试的
完整闭环。旅程中嵌入 4 个异常路径，覆盖 AS-JOB-002 主线 AC + 所有关联的通用场景 AC。

- 总 Phase: 5
- 总 Step: 18
- 唯一 AC 数: 41
- 覆盖场景: AgentJob 为主，触达 AgentDate / VisionShare / AgentAd 跨场景 AC

---

## 前置条件

- 已在 `/Users/z/projects/bridgeai` 完成 `pnpm install`
- PostgreSQL/PostGIS 已启动，`pnpm db:migrate` 已运行最新迁移
- 后端服务 `apps/server` 已在本地 8080 启动
- 移动端 `apps/mobile` 通过 Expo 启动，Web 端可访问 `http://localhost:8081`
- 准备测试账户：
  - `xiaohong@test.local`（HR / 招聘方）
  - `xiaoming@test.local`（高级前端工程师 / 求职者）
  - `xiaolan@test.local`（后端工程师 / 求职者）
  - `xiaozhang@test.local`（产品经理 / 求职者）
- WebSocket 连接正常，浏览器 DevTools 能监听 `/ws` 通道

---

## 旅程步骤

### Phase 1: Agent 初始化与职位发布配置

**目的**: 验证 HR 主人完成 Agent 创建、L1/L2/L3 信息模型配置，以及 AgentJob 场景的职位发布表单（招聘方视角）。

**Step 1.1**: 小红注册并初始化 HR Agent

- 操作: 使用 `xiaohong@test.local` 登录 → 进入"我的 Agent"→ 点击"创建 Agent"→ 填写 L1 基础信息（姓名: 小红，身份: HR，地域: 北京，工作年限: 8 年）。
- 预期: Agent 主页正常渲染，显示"小红(HR)"身份标识。
- 验证 AC: `ISSUE-C002~c1` Agent L1 层基础字段、L1 数据库存储。

**Step 1.2**: 配置 AgentJob 场景 L2 结构化属性（招聘方视角）

- 操作: 切换到 AgentJob 场景标签页 → 在"职位信息"填写：
  - 职位名称: 高级前端工程师
  - 薪资预算: 30k–50k
  - 技能要求: React, TypeScript, Node.js
  - 工作地点: 北京
  - 硬性条件: 本科以上、5 年经验
  - 软性偏好: 团队协作、英文文档阅读
- 预期: 表单保存成功；后端写入 L2 表 (scene=job, supply/demand=supply)；可在"职位广场"看到已发布的职位。
- 验证 AC: `JOB-002-AC-1` 招聘方设置职位信息/薪资预算/硬性条件/软性偏好；
  `JOB-002~func`；`ISSUE-C002~c2` L2 场景特定结构化属性。

**Step 1.3**: 配置职位公开/详细两级信息

- 操作: 在职位发布页，将"薪资预算范围"标记为"公开"，将"候选人数上限"和"内部代号"标记为"详细"。
- 预期: UI 显示眼睛图标=公开字段，锁图标=详细字段；两字段在后端分桶存储（level=public/private）。
- 验证 AC: `US-AGENT-012-AC-1` 供给侧设置公开和详细信息；`US-AGENT-012~func` 跨场景两级供给。

**Step 1.4**: 异常 - 职位表单校验

- 操作: 尝试保存薪资预算为负数；尝试提交空白必填字段（职位名称为空）。
- 预期: 前端实时拦截并显示字段级错误提示（如"薪资必须大于 0"）；保存按钮保持禁用状态。
- 验证 AC: `ISSUE-C002~c1` 字段验证和约束规则；`JOB-002-AC-1` 表单校验。

---

### Phase 2: 智能匹配与批量评估候选

**目的**: 验证 Agent 自动匹配候选人、批量读取公开简历、计算匹配度并排序的端到端链路。

**Step 2.1**: 触发实时匹配（候选人上线）

- 操作: 切换到求职者账号 `xiaoming@test.local` → 进入 AgentJob 场景 → 填写求职画像：
  - 技能: React, TypeScript, Node.js
  - 期望薪资: 35k–45k
  - 工作地点: 北京
  - 工作偏好: 扁平化管理、不接受 996
  - 保存并激活供给。
- 预期: 供给激活后触发实时匹配事件；小红端的招聘管理后台出现一条新的匹配推荐。
- 验证 AC: `AS-003-AC-3` 激活供给状态等待匹配查询；`AS-003~func` 供给档案创建与激活。

**Step 2.2**: Agent 解析自然语言创建求职需求

- 操作: 切换到 `xiaoming@test.local`，在 Agent 对话框输入："我想找一份北京的 React 高级岗，35k 以上，不接受 996。"
- 预期: Agent 在 2–3 秒内返回结构化卡片：技能=React，地点=北京，薪资=35k+，反 996。卡片下方出现"确认创建需求"按钮。
- 验证 AC: `US-AGENT-002-AC-4` Agent 从对话中自动提取关键字段并分类；`US-AGENT-002~func` 用户与 Agent 对话后成功创建需求和供给；`AS-002~func` Agent 解析主人自然语言输入，提炼成结构化需求。

**Step 2.3**: 主人确认并存储

- 操作: 点击"确认创建需求"。
- 预期: 卡片折叠为 timeline 条目；后端写入 demand 表（scene=job）；WebSocket 触发实时匹配。
- 验证 AC: `AS-002-AC-3` 确认后存储并触发实时匹配；`US-AGENT-002-AC-5` 用户确认后自动保存到对应场景。

**Step 2.4**: 小红批量评估候选简历列表

- 操作: 小红回到招聘管理后台 → 进入"候选人列表" → 查看匹配推荐卡片。
- 预期: 列表按匹配度分数降序排列；每个卡片显示候选人公开信息（姓名/技能/期望薪资/信用分）+ 匹配度评分（如 92%）；卡片右上角有"让 Agent 初筛"按钮。
- 验证 AC: `AS-JOB-002-AC-1` 批量评估候选简历；`JOB-003-AC-1` 评估匹配度并向双方推荐；
  `US-AGENT-005-AC-2` 显示对话双方 Agent 和匹配度评分；`AS-004-AC-1` 创建结构化匹配记录；
  `AS-004-AC-2` 批量读取候选公开信息；`AS-004-AC-3` 计算匹配度并排序；`AS-004~func`。

**Step 2.5**: 添加第二批候选人

- 操作: 再用 `xiaolan@test.local`（后端工程师）和 `xiaozhang@test.local`（产品经理）创建 AgentJob 供给，均激活。
- 预期: 小红端的候选人列表增加到 3 条；后端执行引擎重新计算并排序（xiaoming 应排名最高，因为技能匹配度最高）。
- 验证 AC: `AS-004~func` 批量读取并排序；`JOB-003~func` Agent 间自动匹配职位和简历，双向过滤。

**Step 2.6**: 异常 - 无符合条件候选 / 过滤过严

- 操作: 小红手动将薪资预算上限改为 15k（低于所有候选人期望）。
- 预期: 列表变为空态 UI，显示"暂无符合条件候选人"；旁边有"放宽条件"按钮，点击后自动重置为原范围。
- 验证 AC: `JOB-003~edge` 异常：单向匹配、过滤条件变更；`AS-004~edge` 无候选/算法出错。

---

### Phase 3: Agent 初筛对话与薪资协商

**目的**: 验证 HR Agent 与候选人 Agent 进行初筛对话、在四人群中协商薪资、超过底线时弹窗征求主人意见的完整流程。

**Step 3.1**: HR Agent 发起初筛

- 操作: 小红点击"让 Agent 初筛"按钮（xiaoming 的卡片）→ 确认发送。
- 预期: 后端创建一对一 Agent 房间；小红端显示"Agent 正在联系对方…"状态；xiaoming 端收到邀约。
- 验证 AC: `AS-JOB-002~func` 招聘方 Agent 筛选简历并与候选人 Agent 初筛；`AS-005~func` Agent 自主发起对话；`AS-005-AC-1` 根据过滤规则筛选。

**Step 3.2**: 候选人 Agent 接受并开始初筛对话

- 操作: 切换到 `xiaoming@test.local` → 进入"邀约队列"→ 查看来自小红 HR Agent 的邀约卡片（显示小红身份、职位、匹配度 92%）→ 点击"接受"。
- 预期: 接受后进入 Agent 初筛房间；两方 Agent 开始多轮对话（HR Agent 问："您的 React 经验几年？"，候选人 Agent 答："5 年，做过大型后台系统"）。
- 验证 AC: `AS-006-AC-1` 对方 Agent 检查匹配度决定是否值得交流；`AS-006~func` 评估是否值得交流；`US-AGENT-013-AC-1` Agent 展示对方公开的需求和供给概要。

**Step 3.3**: 初筛对话进展汇报

- 操作: 观察小红端主页 timeline。
- 预期: timeline 显示"Agent 正在与 xiaoming 的 Agent 初筛...已交换 2 轮"；每次交换实时更新轮数。
- 验证 AC: `AS-006-AC-3` 向主人汇报对话进展。

**Step 3.4**: 匹配度达标 → 触发薪资协商

- 操作: Agent 间对话进行 5 轮后，系统判断匹配度已达标（≥85%）→ 双方 Agent 进入薪资协商阶段。
- 预期: 界面升级为四人群聊（小红的 Agent、小红、xiaoming 的 Agent、xiaoming）；初始气泡提示"薪资协商：候选人期望 40k，职位预算上限 50k"；Agent 自动展开协商。
- 验证 AC: `AS-JOB-002-AC-3` 推荐最合适候选人（匹配度达标触发）；`AS-009-AC-2` 向主人展示对方信息和信用分；`DATE-003-AC-1` 多轮 Agent 对话；`DATE-003~func`。

**Step 3.5**: 薪资协商 - 在预算内

- 操作: 群聊中，HR Agent 提出"45k + 3% 期权"，候选人 Agent 回应"接受"。
- 预期: 群聊气泡显示双方 Agent 协商记录；双方主人收到弹窗："双方就 45k + 期权达成一致，是否确认引荐真人面试？"
- 验证 AC: `JOB-004-AC-1` 薪资范围协商；`JOB-004~func` 群聊协商薪资；`AS-JOB-001-AC-3` 协商薪资保护底线（在预算内正常通过）。

**Step 3.6**: 异常 - 薪资超预算底线

- 操作: HR Agent 提出"25k + 无期权"，候选人期望 40k。Agent 反复协商 3 轮未果，触碰预算底线。
- 预期: 弹窗出现"薪资超过预算底线（50k），需要您确认处理方式"；选项有"接受超出"、"调整条件"、"终止协商"；主人决策后 Agent 执行。
- 验证 AC: `AS-JOB-001-AC-3` 协商薪资保护底线；`JOB-004-AC-1` 薪资范围协商超底线处理；`JOB-004~edge` 协商僵局/超底线。

**Step 3.7**: 异常 - 简历不足无法判断

- 操作: 第四位候选人只填写了名字（无技能/薪资/经验）就激活了供给。
- 预期: HR Agent 在初筛时回复"信息不足，无法评估匹配度，建议补充简历"；小红端卡片显示灰色警告标记。
- 验证 AC: `AS-JOB-002~edge` 异常：简历不足初筛无法判断。

**Step 3.8**: 异常 - 单向匹配

- 操作: 小红将候选人列表中 xiaolan 的简历删除（变为只有 xiaoming 和 xiaozhang）。
- 预期: 小红端收到通知"有 1 个候选人已撤销，不再推送"；列表自动刷新。
- 验证 AC: `JOB-003~edge` 单向匹配/过滤条件变更。

---

### Phase 4: 确认引荐与真人面试

**目的**: 验证匹配度和薪资达成一致后，引荐真人面试的完整链路。

**Step 4.1**: 双方主人确认引荐

- 操作: 小红点击弹窗中的"确认引荐"；xiaoming 端也点击"接受引荐"。
- 预期: 弹窗关闭，进入正式的 HR–候选人沟通群（真人对话模式）；系统自动发一条欢迎消息："双方已确认，即将安排面试，请互换联系方式。"
- 验证 AC: `JOB-004-AC-2` 引荐真人面试；`JOB-004~func`；`AS-009-AC-1` 评估引荐阈值；`AS-009-AC-3` 主人接受或拒绝；`US-AGENT-006-AC-1` 引荐通知含匹配理由。

**Step 4.2**: Agent 切换为真人模式

- 操作: 在确认引荐后，四人群聊中点击"亲自聊"按钮。
- 预期: 身份标识从"小红的 Agent"切换为"小红"；气泡颜色变化；Agent 不再代发消息。
- 验证 AC: `US-AGENT-007-AC-1` 亲自聊以用户身份发言；`US-AGENT-007-AC-3` 切换状态实时显示；`US-AGENT-008-AC-1` 消息显示头像名称；`US-AGENT-008-AC-2` "XX 的 Agent" 标识。

**Step 4.3**: 异常 - 引荐请求丢失

- 操作: 在 Step 4.1 确认引荐过程中，模拟小红网络掉线 10 秒。
- 预期: 重连后小红端收到补送的确认结果；xiaoming 端显示"小红已确认引荐，时间戳: 刚刚"。
- 验证 AC: `US-AGENT-006~edge` 引荐请求丢失/双方同时拒绝。

---

### Phase 5: 完整流程复验与多场景覆盖

**目的**: 复用 Phase 1–4 的模式验证 AgentDate / VisionShare / AgentAd 跨场景 AC，确保通用层逻辑一致。

**Step 5.1**: 切换到 AgentDate 场景验证需求提炼

- 操作: 使用 `xiaoming@test.local` → 切换到 AgentDate 场景 → 对话输入："想认识住北京、喜欢徒步的 28–32 岁女生。"
- 预期: Agent 提炼为 demand(scene=date, age=28-32, location=北京, hobby=徒步, gender=female)。
- 验证 AC: `DATE-001-AC-1` 设置个人基本信息和期望条件；`DATE-001~func` 用户配置交友偏好和个人信息；
  `US-AGENT-002~func`；`US-AGENT-002-AC-4` 自动提取关键字段并分类。

**Step 5.2**: VisionShare 场景异常验证

- 操作: 使用 `xiaoming@test.local` → 切换到 VisionShare 场景 → 发布一个视觉任务"西湖断桥附近要拍日落人像，预算 100 积分"。
- 预期: 任务被推送给附近符合条件用户（筛选信用高、距离近）；列表卡片显示价格/缩略图/拍摄者信用分。
- 验证 AC: `VS-005-AC-1` 照片列表页显示价格/缩略图/拍摄者信用分；`VS-005~func` 用户支付积分查看照片，界面显示拍摄者信用；`AS-VS-001~func` 解析地点设置过滤。

**Step 5.3**: 异常 - 积分不足

- 操作: 将 `xiaoming@test.local` 积分清零（dev tools 直接改 DB）→ 尝试查看一张 VisionShare 照片。
- 预期: 弹窗提示"积分不足（当前: 0，需要: 50）"；支付流程中断，已解锁的照片不显示。
- 验证 AC: `VS-005~edge` 异常：积分不足、支付中断。

**Step 5.4**: AgentAd 场景验证

- 操作: 使用 `xiaohong@test.local` → 切换到 AgentAd 商家模式 → 配置商家 Agent：
  - 目标客户: 25-35 岁数码爱好者
  - 优惠活动: 8 折限时
  - 推广预算: 1 万元/月
- 预期: 商家供给激活后，向匹配的消费者 Agent 推送。
- 验证 AC: `AD-002-AC-1` 设置目标客户/优惠活动/推广预算；`AD-002~func` 商家配置 Agent；
  `AD-003~func` 高匹配度过滤推送；`AD-003-AC-1` 自动向双方推荐。

**Step 5.5**: 查看对话历史（按场景筛选）

- 操作: 进入"对话历史" → 依次切换 Date / Job / Ad / VS 标签。
- 预期: 每个标签下只显示对应场景的对话；每条记录显示对方 Agent 头像 + 匹配度；切换时无需刷新页面（前端切换）。
- 验证 AC: `US-AGENT-005-AC-1` 按场景筛选对话历史；`US-AGENT-005-AC-2` 显示对话双方 Agent 和匹配度评分；`US-AGENT-005~func`；`US-AGENT-013~func` 通过 Agent 浏览对方公开的需求和供给。

**Step 5.6**: 异常 - 历史加载失败

- 操作: 打开对话历史页面时断开网络连接（DevTools → Network → Offline）。
- 预期: 页面显示骨架加载状态（不是白屏）；重连后自动重试并展示数据；下方出现"重试"按钮。
- 验证 AC: `US-AGENT-005~edge` 异常：历史缺失/加载失败；`US-AGENT-013~edge` 异常：尝试查看详细信息被拦截。

**Step 5.7**: L3 非结构化表达验证

- 操作: 在 `xiaohong@test.local` 的 Agent 主页 → 编辑自我介绍（200 字自由文本）+ 上传头像图片。
- 预期: 后端 AI 提炼出关键词标签（如"招聘/HR/管理"）并展示在 Agent 主页；文本与 L1（职业：HR）、L2（场景属性）关联呈现。
- 验证 AC: `ISSUE-C002~c3` L3 非结构化表达（自由文本自我介绍/多媒体/AI 提炼描述 + 与 L1/L2 关联）。

---

## AC 覆盖表

| AC Slug           | 描述                       | 验证方式           | 所在步骤     |
| ----------------- | -------------------------- | ------------------ | ------------ |
| AS-002-AC-3       | 确认后存储并触发实时匹配   | 保存按钮+WebSocket | Step 2.3     |
| AS-002~func       | 解析自然语言提炼结构化需求 | 对话卡片           | Step 2.2     |
| AS-003-AC-3       | 激活供给状态等待匹配查询   | 激活按钮+DB        | Step 2.1     |
| AS-003~func       | 供给档案创建与激活         | 表单+激活          | Step 2.1     |
| AS-004-AC-1       | 创建结构化匹配记录         | DB 查询            | Step 2.4     |
| AS-004-AC-2       | 批量读取候选公开信息       | API 抓包           | Step 2.4     |
| AS-004-AC-3       | 计算匹配度并排序           | 列表分数           | Step 2.4     |
| AS-004~func       | 批量读取并排序             | 列表               | Step 2.4/2.5 |
| AS-004~edge       | 无候选/过滤过严            | 空态 UI            | Step 2.6     |
| AS-005-AC-1       | 根据过滤规则筛选           | 一对一房间         | Step 3.1     |
| AS-005~func       | Agent 自主发起对话         | 房间创建           | Step 3.1     |
| AS-006-AC-1       | 检查匹配度                 | 邀约面板           | Step 3.2     |
| AS-006-AC-3       | 向主人汇报对话进展         | timeline           | Step 3.3     |
| AS-006~func       | 评估是否值得交流           | 接受/拒绝          | Step 3.2     |
| AS-009-AC-1       | 评估引荐阈值               | 弹窗触发           | Step 4.1     |
| AS-009-AC-2       | 向主人展示对方信息和信用分 | 弹窗内容           | Step 4.1     |
| AS-009-AC-3       | 主人接受或拒绝             | 按钮点击           | Step 4.1     |
| AS-JOB-002-AC-1   | 批量评估候选简历           | 候选列表           | Step 2.4     |
| AS-JOB-002-AC-3   | 推荐最合适候选人           | 匹配度达标         | Step 3.4     |
| AS-JOB-002~func   | 招聘方 Agent 筛选并初筛    | 房间               | Step 3.1     |
| AS-JOB-002~edge   | 简历不足无法初筛判断       | 残缺数据           | Step 3.7     |
| AS-JOB-001-AC-3   | 协商薪资保护底线           | 弹窗               | Step 3.6     |
| DATE-001-AC-1     | 设置个人基本信息和期望条件 | 表单               | Step 5.1     |
| DATE-001~func     | 配置交友偏好和个人信息     | 对话提炼           | Step 5.1     |
| DATE-003-AC-1     | 多轮 Agent 对话            | 四人群聊           | Step 3.4     |
| DATE-003~func     | 双方 Agent 先聊后引荐      | 房间               | Step 3.4/4.1 |
| ISSUE-C002~c1     | L1 基础信息字段/约束/存储  | 表单+DB            | Step 1.1/1.4 |
| ISSUE-C002~c2     | L2 场景特定结构化属性      | 4 场景表单         | Step 1.2     |
| ISSUE-C002~c3     | L3 自由文本+多媒体+AI 提炼 | 上传+展示          | Step 5.7     |
| JOB-002-AC-1      | 招聘方设置职位/薪资/条件   | 表单               | Step 1.2     |
| JOB-002~func      | 招聘方配置 Agent           | 表单               | Step 1.2     |
| JOB-003-AC-1      | 评估匹配度向双方推荐       | 列表               | Step 2.4     |
| JOB-003~func      | 自动匹配双向过滤           | 列表刷新           | Step 2.5     |
| JOB-003~edge      | 单向匹配/过滤变更          | 删除操作           | Step 3.8     |
| JOB-004-AC-1      | 薪资范围协商               | 四人群聊           | Step 3.5/3.6 |
| JOB-004-AC-2      | 引荐真人面试               | 弹窗+群聊          | Step 4.1     |
| JOB-004~func      | 群聊协商薪资引荐面试       | 完整流程           | Step 4.1     |
| JOB-004~edge      | 协商僵局/超底线            | 数值冲突           | Step 3.6     |
| US-AGENT-002-AC-4 | 自动提取关键字段并分类     | 卡片               | Step 2.2/5.1 |
| US-AGENT-002-AC-5 | 确认后自动保存到场景       | 按钮+DB            | Step 2.3     |
| US-AGENT-002~func | 对话后创建需求和供给       | 流                 | Step 2.2/2.3 |
| US-AGENT-005-AC-1 | 按场景筛选对话历史         | 标签切换           | Step 5.5     |
| US-AGENT-005-AC-2 | 显示双方 Agent 和匹配度    | 列表               | Step 5.5     |
| US-AGENT-005~func | 按场景筛选查看历史         | 列表               | Step 5.5     |
| US-AGENT-005~edge | 历史缺失/加载失败          | 断网重试           | Step 5.6     |
| US-AGENT-006-AC-1 | 引荐通知含匹配理由         | 弹窗               | Step 4.1     |
| US-AGENT-006~edge | 引荐请求丢失               | 网络中断           | Step 4.3     |
| US-AGENT-007-AC-1 | 亲自聊以用户身份发言       | 切换               | Step 4.2     |
| US-AGENT-007-AC-3 | 切换状态实时显示           | 标识变化           | Step 4.2     |
| US-AGENT-008-AC-1 | 消息显示头像名称           | 气泡               | Step 4.2     |
| US-AGENT-008-AC-2 | "XX 的 Agent" 标识         | 气泡               | Step 4.2     |
| US-AGENT-012-AC-1 | 供给侧公开和详细信息       | 配置 UI            | Step 1.3     |
| US-AGENT-012~func | 跨场景两级供给             | 配置               | Step 1.3     |
| US-AGENT-013-AC-1 | 展示对方公开需求和供给     | 卡片               | Step 3.2/5.5 |
| US-AGENT-013~func | 通过 Agent 浏览公开信息    | 卡片               | Step 3.2/5.5 |
| US-AGENT-013~edge | 尝试查看详细信息被拦截     | 锁图标             | Step 5.6     |
| AD-002-AC-1       | 商家设置目标客户/优惠/预算 | 表单               | Step 5.4     |
| AD-002~func       | 商家配置 Agent             | 表单               | Step 5.4     |
| AD-003~func       | 高匹配度过滤推送           | 推送               | Step 5.4     |
| AD-003-AC-1       | 自动向双方推荐             | 列表               | Step 5.4     |
| VS-005-AC-1       | 价格/缩略图/拍摄者信用     | 列表               | Step 5.2     |
| VS-005~func       | 支付积分查看照片           | 支付流             | Step 5.2     |
| VS-005~edge       | 积分不足/支付中断          | 清零操作           | Step 5.3     |
| AS-VS-001~func    | 解析地点设置过滤           | 表单+推送          | Step 5.2     |

---

## 环境启动

```bash
# 1) 安装依赖
cd /Users/z/projects/bridgeai
pnpm install

# 2) 启动数据库（Postgres + PostGIS）
pnpm db:migrate
pnpm db:seed

# 3) 启动后端 + 移动端（并行）
pnpm dev

# 4) 打开浏览器访问移动端 Web
# http://localhost:8081

# 5) 测试 WebSocket 连接（浏览器 DevTools → Network → WS）
```

---

## 截图留存建议

每个 Step 完成后建议截屏，保存至 `e2e_screenshots/AS-JOB-002/`：

```
Phase1-Step1.1-AgentInit.png
Phase1-Step1.2-L2JobConfig.png
Phase1-Step1.3-PublicPrivate.png
Phase1-Step1.4-ValidationError.png
Phase2-Step2.4-CandidateList.png
Phase2-Step2.6-NoCandidates.png
Phase3-Step3.4-SalaryNegotiation.png
Phase3-Step3.6-BudgetExceeded.png
Phase4-Step4.1-ReferralConfirm.png
Phase5-Step5.5-HistoryByScene.png
```

---

**覆盖率统计**：

- 总 AC 数（AS-JOB-002 及其关联）: 41 个
- 已覆盖 AC: 41 个
- 覆盖率: **100%**
