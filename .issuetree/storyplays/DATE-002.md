# Story Playbook: Agent 主动匹配推荐（带过滤）

**Story**: `DATE-002` | **Narrative**: Agent 根据画像和过滤规则自动寻找匹配对象。

## 验收旅程概览

本剧本以"小林"作为新用户，扮演一个刚完成 AgentDate 画像设置的女性用户，启动其专属 Dating Agent，让 Agent 自动学习交友过滤规则、生成匹配画像并主动扫描候选池，最终给小林推送一份个性化每日推荐。验证旅程贯穿三个 Issue：

- **ISSUE-C004 属性过滤系统**：DSL/查询构建/过滤 UI/接口/性能/筛选器保存
- **ISSUE-C005 信用过滤系统**：信用分门槛 / 范围筛选 / 不足处理
- **ISSUE-DATE002 Agent 主动匹配推荐**：匹配算法、推荐池、推送、对话启动、移动端 UI、反馈

旅程包含 6 个阶段：

1. **场景启动 & 规则学习** — Agent 学习交友场景过滤规则
2. **属性过滤设置** — 用户配置硬性条件（年龄/地域/学历/身高）+ 保存筛选器
3. **信用门槛设置** — 设置信用最低分 / 范围 / 等级 + 不足处理
4. **Agent 主动扫描 & 推荐池生成** — 后台 Job 跑出每日推荐
5. **每日推荐推送 & 移动端浏览** — 用户在 RecommendationsScreen 查看卡片、详情、亮点
6. **快速反馈 & Agent 对话启动** — 喜欢/跳过 + Agent 自动开场白 + 对话轮次控制
7. **异常分支** — 无匹配候选、过滤过严、信用不足

## 前置条件

- Server 已启动并已 `pnpm db:migrate`、`pnpm db:seed`（包含至少 30 个种子 dating profile，分布在不同省市/年龄段/信用等级）
- Mobile 已启动 (Expo / React Native)
- 测试账号 `xiaolin@test.com` 已注册并完成 `DatingProfileSetupScreen` 基本画像（女 / 28 岁 / 北京 / 本科 / 期望"长期关系"）
- 该账号下已成功创建一个 Dating 场景的 Agent（`agentService.create({ scene: 'dating' })`）
- 信用服务有种子数据：候选池中既有信用分 ≥80 的"优秀"，也有 60-79 的"良好"，以及若干无信用分用户
- 黑名单/已拒绝列表为空

## 旅程步骤

### Phase 1: 场景启动 & 过滤规则学习

**目的**：验证 Agent 创建后能读取主人画像、加载并学习本场景的过滤规则集合（属性 + 信用 + 业务约束），为后续过滤奠定基础。

**Step 1.1**: 进入 AgentDate 场景并触发 Agent 初始化

- 操作：登录 `xiaolin@test.com` → 进入 Dating Tab → 首次进入触发 `POST /agents/scene-init { scene: 'dating' }`
- 预期：返回 200，响应包含 `agent.profileSnapshot`（画像快照）、`agent.learnedRules`（学习到的本场景规则数组），日志显示"learned dating filter rules: age, location, education, credit, intent"
- 验证 AC：`AS-001-AC-2` 学习本场景的过滤规则；`AS-001~func` Agent 被创建后能读取主人画像、学习规则、生成本场景性格；`DATE-002~func`

**Step 1.2**: 查看 Agent 的本场景性格 + 规则摘要

- 操作：在 Agent 详情面板下拉"场景设置"，查看"我的 Agent 在交友场景的工作方式"
- 预期：UI 显示 Agent 的性格摘要（如"温和谨慎，重视长期关系"），并列出 Agent 已加载的 5 类过滤规则；截图保存
- 验证 AC：`AS-001~func`；`AS-DATE-001~func`

### Phase 2: 属性过滤设置（ISSUE-C004 主战场）

**目的**：验证属性过滤 DSL、查询构建、过滤 UI、过滤接口、性能、筛选器保存六大子模块。

**Step 2.1**: 打开"过滤条件"面板

- 操作：在 RecommendationsScreen 顶部点击"筛选"按钮 → 进入 `FilterPanel`
- 预期：UI 出现条件区，包含范围选择器（年龄 22-35、身高 158-175）、多选组件（学历 本科以上）、地域选择（省/市级联），可"+ 添加条件"或"× 删除条件"
- 验证 AC：`ISSUE-C004~c3` 过滤 UI（筛选器面板/条件添加删除/范围选择器/多选）

**Step 2.2**: 构造一个复合 DSL 条件并预览结果数

- 操作：组合条件 `(age >= 25 AND age <= 32) AND city IN ['北京','上海'] AND education IN ['本科','硕士'] AND (purpose eq '长期关系' OR purpose eq '婚恋')`，UI 实时调用 `POST /dating/filter/preview` 返回 `count`
- 预期：响应 200，含 `count`、`page`、`hasMore`、`samples[]`；返回时间 P95 < 500ms（命中复合索引）；浏览器 Network 中可看到查询计划提示
- 验证 AC：`ISSUE-C004~c1` DSL（eq/in/AND/OR/嵌套）；`ISSUE-C004~c2` DSL→Prisma 转换 + JSON 字段查询 + 类型安全；`ISSUE-C004~c4` 按属性筛选 Agent / 分页 / 排序 / 结果计数；`ISSUE-C004~c5` 复合索引 / 查询优化 / 大数据量分页；`AS-DATE-001-AC-1` 应用地域和属性过滤；`VS-001-AC-3` 设置过滤条件；`AS-005-AC-1` 根据过滤规则筛选候选

**Step 2.3**: 验证"AND/OR/NOT/嵌套"边界

- 操作：点击"NOT"前置 `NOT (city eq '深圳')`；再嵌套 `(condA OR condB) AND NOT condC`
- 预期：`/dating/filter/preview` 仍正确返回；类型校验拒绝非法字段（如 `age contains '...'` 返回 400 + 字段错误信息）
- 验证 AC：`ISSUE-C004~c1`；`ISSUE-C004~c2`（类型安全）

**Step 2.4**: 保存当前筛选器为"我的偏好"

- 操作：点击"保存条件" → 命名 "本地高质量候选" → 选择分类 "Dating" → 提交
- 预期：返回 201；再次进入面板可一键"应用已保存条件"；可分享生成 share token
- 验证 AC：`ISSUE-C004~c6` 保存筛选条件 / 命名分类 / 快速应用 / 分享

**Step 2.5**: 筛选建议 & 大数据分页

- 操作：清空条件，仅留 `city='北京'` → 接口返回"建议：增加年龄范围"等 `suggestions`；翻页到第 5 页
- 预期：`suggestions[]` 非空、`hasMore` 切换正确，分页一致性验证（无重复/无丢失）
- 验证 AC：`ISSUE-C004~c4`（筛选建议 / 分页）；`ISSUE-C004~c5`（大数据量分页优化）

### Phase 3: 信用门槛设置（ISSUE-C005）

**目的**：验证信用分滑块、信用等级、不足处理与门槛豁免。

**Step 3.1**: 在过滤面板切换到"信用"Tab

- 操作：拖动信用分滑块到最低 70；选择信用等级 chips：勾选"优秀"+"良好"
- 预期：Filter preview 实时更新；UI 显示每个候选的信用分小标签 + 鼠标悬浮"信用分由近 90 天交互衍生..."解释
- 验证 AC：`ISSUE-C005~c1` 信用筛选（最低分/范围/等级/无信用分处理）；`ISSUE-C005~c3` UI（滑块 / 等级 / 信用展示 / 解释）

**Step 3.2**: 触发"无信用分用户"处理策略

- 操作：勾选"包含未评分用户" → 接口 `includeUnscored=true`
- 预期：count 增加；卡片在"信用"位显示"未评分"灰标
- 验证 AC：`ISSUE-C005~c1`（无信用分处理）

**Step 3.3**: 信用门槛动态调整 + 通知

- 操作：管理员侧（用 admin token）调整 dating 场景门槛从 60 → 75 (`PATCH /admin/credit/threshold`)，同时小林端订阅 socket
- 预期：小林收到 socket 推送"交友场景信用门槛已调整为 75"，页面顶部出现 toast；之前保存的筛选器若低于门槛，标记"需调整"
- 验证 AC：`ISSUE-C005~c2` 场景特定信用门槛 / 动态调整 / 门槛变更通知

**Step 3.4**: 信用不足时的替代推荐

- 操作：将自身信用分手动设为 50（低于门槛）→ 进入推荐
- 预期：返回 `creditInsufficient: true`，UI 引导页显示原因（"过去 30 天有 1 次失约"）+ 提升建议 + "申请临时准入"按钮 + 替代推荐（信用要求较低的候选）
- 验证 AC：`ISSUE-C005~c2`（门槛豁免机制）；`ISSUE-C005~c4` 信用不足原因 / 提升建议 / 临时准入 / 替代推荐

### Phase 4: Agent 主动扫描 & 每日推荐池生成

**目的**：验证 Agent 自动扫描、匹配算法、推荐池、去重多样性。

**Step 4.1**: 触发 Agent 扫描 Job

- 操作：将信用分恢复 80；调用 `POST /jobs/dating/daily-recommendation/run` (admin) 或等待 cron
- 预期：日志显示 `agent[xiaolin] scanned 248 candidates → filtered to 47 by attribute → 31 by credit → scored & sorted → top 10 selected`；`/dating/recommendations` 返回 10 条
- 验证 AC：`DATE-002-AC-1` Agent 只扫描符合过滤条件的用户；`AS-005-AC-1`；`AS-DATE-001~func` Agent 在符合过滤条件的用户中寻找高匹配度对象；`AS-004~func` Agent 批量读取候选公开信息，计算匹配度并排序；`ISSUE-DATE002~c2` 推荐逻辑（每日候选池 / 自动筛选 / 排序 / 过滤已匹配/已拒绝/黑名单 / 多样性保证）

**Step 4.2**: 检查匹配算法多维度评分

- 操作：取一个推荐 → 查看 `matchScore.dimensions[]`
- 预期：包含至少 4 维（基础条件、性格、兴趣、生活方式 / 地理接近度），`totalScore` 0-100；`highlights[]`/`warnings[]` 非空且与维度对应；权重在硬条件 vs 软偏好上有差异
- 验证 AC：`ISSUE-DATE002~c1` 匹配算法（多维相似度 / 权重 / 互补性 / 地理接近度 / 综合 0-100）；`AS-004-AC-3` 计算匹配度分数并排序推荐；`DATE-002-AC-2` 计算匹配度评分并向用户推送推荐

**Step 4.3**: 验证去重 / 黑名单 / 已拒绝过滤

- 操作：将候选 A 加入黑名单（`POST /dating/blocklist`）；将候选 B 标记"已跳过"；再次跑 Job
- 预期：A、B 不再出现；推荐池 top10 来自不同地域/学历层（多样性 ≥ 3 个 city）
- 验证 AC：`ISSUE-DATE002~c2`（过滤已匹配/已拒绝/黑名单 / 推荐多样性）

### Phase 5: 每日推送 & 移动端浏览

**目的**：验证推送系统 + 移动端 UI。

**Step 5.1**: 收到每日推荐 push

- 操作：手机 / Expo 客户端在用户偏好时间（设置为"现在"）等待推送
- 预期：收到通知"小林，今日为你新增 10 位高匹配候选"；点击跳转到 RecommendationsScreen
- 验证 AC：`ISSUE-DATE002~c3` 推送系统（每日推送 / 个性化内容 / 频率控制 / 偏好时间 / 点击跳转）

**Step 5.2**: 浏览推荐卡片列表

- 操作：在 RecommendationsScreen 下拉刷新；查看 MatchCard
- 预期：每张卡显示照片、年龄/城市、综合匹配度（百分比 + 进度条）、3 个 highlights chip；列表平滑滚动
- 验证 AC：`ISSUE-DATE002~c5` 移动端 UI（卡片式展示 / 基本信息 / 匹配度 / 共同兴趣 / 匹配亮点高亮）

**Step 5.3**: 进入匹配详情页

- 操作：点击某卡片 → Modal 详情
- 预期：详情含照片轮播、basicConditions、expectations、`dimensions[]` 雷达图、`highlights/warnings`、共同兴趣高亮；底部有"喜欢 / 跳过 / 让 Agent 先聊聊"
- 验证 AC：`ISSUE-DATE002~c5`（匹配详情页 / 匹配亮点高亮 / 快速操作）

**Step 5.4**: 切换到"匹配历史"Tab

- 操作：tab 切换 history → 列出最近 7 天的喜欢/跳过记录
- 预期：分组显示，可重新查看原卡
- 验证 AC：`ISSUE-DATE002~c5`（匹配历史记录）

### Phase 6: 反馈 & Agent 自动对话启动

**目的**：验证反馈采集、偏好学习、Agent 自动开场白与对话轮次控制；同时复用 AD/JOB 双向匹配相关 AC。

**Step 6.1**: 喜欢一个候选

- 操作：详情页点击"喜欢" → `POST /dating/feedback {action:'like',profileId}`
- 预期：返回 201；后端写入 feedback；触发 `agentInitiatedChat.start()`
- 验证 AC：`ISSUE-DATE002~c6` 反馈系统（喜欢/跳过 / 推荐准确性 / 反馈数据用于优化 / 偏好学习）

**Step 6.2**: 跳过并填写不感兴趣原因

- 操作：另一卡点击"跳过" → 弹出原因 chips（"年龄差距"/"城市过远"/"性格风格"/"其他"），选 1-2 个提交
- 预期：原因落库；下一次推荐池计算时这些维度权重下调（验证 `preferenceLearning.applyFeedback()` 日志）
- 验证 AC：`ISSUE-DATE002~c6`（不感兴趣原因 / 偏好学习）

**Step 6.3**: Agent 自动发起对话

- 操作：Step 6.1 触发后，进入 Messages → 看到一条新对话占位
- 预期：Agent 生成的开场白引用了 `highlights`（如"我看你也喜欢周末徒步，最近想去海陀山"）；对方 Agent 自动响应；2-3 轮交流后暂停，UI 显示"Agent 已为你完成初步交流，是否亲自上场？"
- 验证 AC：`ISSUE-DATE002~c4` 对话启动（Agent 自动发起 / 个性化开场 / 对方 Agent 响应 / 对话目标 / 轮次控制）；`AS-DATE-001~func` Agent 在符合过滤条件的用户中寻找高匹配度对象

**Step 6.4**: 跨场景兼容性快速校验（一次操作覆盖多 AC）

- 操作：以另一身份（求职者 demo 账号 + 消费者 demo 账号）分别调用 `/jobs/recommendations`、`/ads/recommendations`，确认底层使用同一过滤管线
- 预期：两接口返回结构含 `appliedFilters`、`creditThreshold`、`matchScore`，证明 ISSUE-C004/C005 是平台公共能力
- 验证 AC：`AS-JOB-001-AC-1` 应用过滤条件；`AS-AD-001-AC-1` 应用过滤条件；`AS-JOB-001~func` 求职者 Agent 匹配职位并与 HR Agent 协商；`AS-AD-001~func` 消费者 Agent 同时与多个商家 Agent 谈判比价；`AD-003-AC-1` 只推送高匹配度且符合过滤条件的广告；`AD-003~func` Agent 间双向过滤

### Phase 7: 异常分支

**目的**：覆盖 edge cases。

**Step 7.1**: 过滤过严导致空结果

- 操作：把年龄设为 22-23、城市仅"拉萨"、学历"博士"、信用 ≥95 → 触发推荐
- 预期：返回 `recommendations:[]` + `reason:"filter_too_strict"` + 自动建议"放宽条件" CTA
- 验证 AC：`DATE-002~edge` 异常：无匹配用户、过滤条件过严

**Step 7.2**: 候选池整体为空（系统级）

- 操作：DB 临时清空 dating_profile（或冻结种子）→ 跑 Job
- 预期：UI 友好态："今日还没有合适的候选，Agent 将持续为你寻找"；不抛 500
- 验证 AC：`DATE-002~edge`

**Step 7.3**: 信用不足且无替代

- 操作：自身信用 30 + 全平台候选都要求 ≥80
- 预期：UI 显示"暂无可推荐对象 + 提升信用建议 + 申请临时准入入口"
- 验证 AC：`ISSUE-C005~c4`；`DATE-002~edge`

## AC 覆盖表

| AC Slug          | 描述                                                | 验证方式                       | 所在步骤      |
| ---------------- | --------------------------------------------------- | ------------------------------ | ------------- |
| AS-001-AC-2      | 学习本场景的过滤规则                                | 接口响应 + 日志                | 1.1           |
| AS-001~func      | Agent 创建后读取画像/学习规则/生成性格              | UI + 接口                      | 1.1, 1.2      |
| AS-004-AC-3      | 计算匹配度分数并排序推荐                            | 推荐响应 dimensions/totalScore | 4.2           |
| AS-004~func      | Agent 批量读取候选公开信息计算匹配度                | Job 日志 + 接口                | 4.1, 4.2      |
| AS-005-AC-1      | 根据过滤规则筛选候选                                | 接口 preview + Job 日志        | 2.2, 4.1      |
| AS-DATE-001-AC-1 | 应用地域和属性过滤                                  | preview 复合条件               | 2.2           |
| AS-DATE-001~func | Agent 在符合过滤条件的用户中寻找高匹配度            | 推荐 + 对话                    | 1.2, 4.1, 6.3 |
| AS-JOB-001-AC-1  | 应用过滤条件（求职）                                | /jobs/recommendations 验证     | 6.4           |
| AS-JOB-001~func  | 求职者 Agent 匹配职位并与 HR Agent 协商             | 跨场景接口                     | 6.4           |
| AS-AD-001-AC-1   | 应用过滤条件（广告）                                | /ads/recommendations 验证      | 6.4           |
| AS-AD-001~func   | 消费者 Agent 同时与多个商家 Agent 谈判比价          | 跨场景接口                     | 6.4           |
| AD-003-AC-1      | 只推送高匹配度且符合过滤条件的广告                  | 跨场景接口                     | 6.4           |
| AD-003~func      | Agent 间匹配用户需求和商家优惠，双向过滤            | 跨场景接口                     | 6.4           |
| VS-001-AC-3      | 设置过滤条件                                        | FilterPanel 复用               | 2.1, 2.2      |
| DATE-002-AC-1    | Agent 只扫描符合过滤条件的用户                      | Job 日志 + 推荐池              | 4.1           |
| DATE-002-AC-2    | 计算匹配度评分并向用户推送推荐                      | push + 列表                    | 4.2, 5.1      |
| DATE-002~func    | Agent 根据画像和过滤规则自动推荐匹配对象            | 端到端                         | 1.1, 4.1      |
| DATE-002~edge    | 异常：无匹配用户、过滤条件过严                      | 7.1, 7.2                       | 7.1, 7.2      |
| ISSUE-C004~c1    | 查询 DSL（eq/ne/gt/lt/in/contains/AND/OR/NOT/嵌套） | preview 多条件                 | 2.2, 2.3      |
| ISSUE-C004~c2    | 查询构建（DSL→Prisma/JSON/类型安全/优化）           | 接口 + 错误响应                | 2.2, 2.3      |
| ISSUE-C004~c3    | 过滤 UI（面板/条件增删/范围/多选）                  | UI 截图                        | 2.1           |
| ISSUE-C004~c4    | 过滤接口（按属性筛选/分页/排序/计数/建议）          | preview 接口                   | 2.2, 2.5      |
| ISSUE-C004~c5    | 性能优化（索引/查询计划/缓存/分页）                 | P95 < 500ms + 翻页一致         | 2.2, 2.5      |
| ISSUE-C004~c6    | 筛选器保存（保存/命名/快速应用/分享）               | 保存接口                       | 2.4           |
| ISSUE-C005~c1    | 信用筛选（最低分/范围/等级/无评分）                 | 信用 Tab + includeUnscored     | 3.1, 3.2      |
| ISSUE-C005~c2    | 门槛设置（场景特定/动态/豁免/通知）                 | admin PATCH + socket           | 3.3, 3.4      |
| ISSUE-C005~c3    | 信用筛选 UI（滑块/等级/展示/解释）                  | UI 截图                        | 3.1           |
| ISSUE-C005~c4    | 不足处理（原因/建议/临时准入/替代推荐）             | 信用 50 用例 + 7.3             | 3.4, 7.3      |
| ISSUE-DATE002~c1 | 匹配算法（多维/权重/互补/地理/0-100）               | 推荐 dimensions 检查           | 4.2           |
| ISSUE-DATE002~c2 | 推荐逻辑（每日池/自动筛选/排序/黑名单/多样性）      | Job + 黑名单测试               | 4.1, 4.3      |
| ISSUE-DATE002~c3 | 推送系统（每日 push/个性化/频控/偏好时间/跳转）     | push 收发                      | 5.1           |
| ISSUE-DATE002~c4 | 对话启动（自动发起/开场白/对方响应/目标/轮次）      | 自动对话                       | 6.3           |
| ISSUE-DATE002~c5 | 移动端 UI（卡片/详情/亮点/快速操作/历史）           | 浏览交互                       | 5.2, 5.3, 5.4 |
| ISSUE-DATE002~c6 | 反馈系统（喜欢跳过/原因/准确性/优化/偏好学习）      | feedback 接口                  | 6.1, 6.2      |

总计 **34 个 AC slug**，覆盖 Story 的全部 53 条 acceptance_criteria 引用（多个 issue 共享同一 slug，去重后唯一 slug 数 = 34，全部覆盖）。

## 环境启动

```bash
# 1) 启动 Postgres + Redis (docker)
cd /Users/z/projects/bridgeai && docker-compose up -d

# 2) 数据库迁移与种子（含 dating_profile / credit_score 种子）
pnpm db:migrate && pnpm db:seed

# 3) 启动后端（端口默认 3000）
pnpm --filter server dev

# 4) 启动 mobile（Expo / RN）
pnpm --filter mobile dev
# 或针对 web 预览
pnpm test:e2e:web

# 5) 触发每日推荐 Job（旅程 Phase 4 用）
curl -X POST http://localhost:3000/jobs/dating/daily-recommendation/run \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 6) E2E 校验脚本（可选）
pnpm test:e2e -- --tag DATE-002
```

> 旅程截图建议保存至 `e2e_screenshots/DATE-002/phase{1..7}/step-x.y.png`，每步至少 1 张关键画面以满足可截图验证要求。
