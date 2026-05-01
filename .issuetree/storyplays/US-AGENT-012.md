# Story Playbook: 配置供给信息（分公开和详细）

**Story**: `US-AGENT-012`
**Narrative**: 用户为每个场景分别配置公开和详细两级供给信息

## 验收旅程概览

跟随用户 Alex 在已创建 Agent 后，进入 Agent 的场景管理中心，依次为他在多个场景（VisionShare 视觉分享、AgentDate 交友、AgentJob 求职、AgentAd 广告）下配置「公开 / 详细」两级供给信息，体验场景模板、字段联动、能力开关、跨场景迁移，并在末尾验证未授权访问与披露策略切换的边界行为。

## 前置条件

- 后端服务、Postgres / PostGIS、Redis 已启动（`pnpm db:migrate && pnpm db:seed`）
- 已注册测试账号 Alex 并登录 mobile 应用
- 已为 Alex 完成 US-AGENT-001 的基础画像（昵称、头像、性别、年龄）
- 该 Agent 当前没有任何场景配置（空状态）
- 第二个未授权账号 Bob 用于跨账号访问验证

## 旅程步骤

### Phase 1: 进入 Agent 场景中心，了解可配置场景

**目的**: 验证读取主人画像 + 场景列表 + 场景模板呈现。

**Step 1.1**: 打开 Agent 详情页

- 操作: 登录 Alex → 进入 `AgentListScreen` → 点击 Alex 的默认 Agent 卡片
- 预期: Agent 详情显示主人 L1 基础画像（昵称、性别、年龄）和已学习偏好摘要
- 验证 AC: `AS-001-AC-1` 读取主人的基础画像和场景配置；`US-AGENT-001~func` 创建 Agent 并配置基本信息；`AS-001~func` Agent 读取主人画像。

**Step 1.1.b**: 进入 SceneConfigScreen

- 操作: 在 Agent 详情中点击「场景管理」
- 预期: 看到四个场景卡片：VisionShare、AgentDate、AgentJob、AgentAd，各自显示「未配置」状态徽章及「能力清单」预览
- 验证 AC: `ISSUE-C006~c1` 四大场景配置；`ISSUE-C006~c4` 能力系统/能力清单；`ISSUE-C006~c6` 可视化场景配置管理界面。

**Step 1.2**: 多选感兴趣的场景

- 操作: 点击「编辑感兴趣场景」，勾选 VisionShare、AgentDate、AgentJob 三个场景，保存
- 预期: 卡片状态变为「待配置」，AgentAd 仍为「未启用」
- 验证 AC: `US-AGENT-001-AC-2` 选择感兴趣的场景（可多选）。

### Phase 2: 为 AgentDate 配置「公开 + 详细」两级供给信息（主流程）

**目的**: 完整走通 L1（公开）/ L2（详细）双层供给配置，触发字段联动、模板与校验。

**Step 2.1**: 打开 AgentDate → 选择场景模板

- 操作: 进入 AgentDate 场景配置 → 选择「认真交友」预设模板 → 应用
- 预期: 表单字段被模板预填（如：寻找类型、年龄区间、城市），可二次编辑
- 验证 AC: `ISSUE-C006~c3` 场景模板（预设 + 模板应用）。

**Step 2.2**: 填写公开层（L1 / 公开供给）

- 操作: 进入「公开信息」Tab，填写：昵称展示名、性别、年龄段、城市、一句话自我介绍（限 30 字），不填详细资产/家庭等敏感字段
- 预期: 顶部进度条显示 100%（必填项完成），底部「实时预览」面板同步刷新；超过 30 字自动截断并提示
- 验证 AC: `US-AGENT-012-AC-1` 每个场景设置公开/详细信息；`US-AGENT-012~func` 配置两级供给信息；`ISSUE-C006~c2` 字段验证规则；`US-AGENT-011-AC-1` 公开/详细信息（共享 ISSUE-C006）。

**Step 2.3**: 填写详细层（L2 / 详细供给），触发字段依赖

- 操作: 切换到「详细信息」Tab → 选择「婚姻状态 = 离异」→ 观察「子女信息」字段动态出现 → 填写身高/体重/职业/收入区间/兴趣标签（多选最多 5 个）
- 预期: `showWhen` 联动字段按状态显隐；标签超过 5 个时无法继续添加；草稿每 1.5s 自动保存到本地（`@l2_draft_*`）
- 验证 AC: `ISSUE-C006~c2` 字段依赖关系 + 验证规则；`US-AGENT-011~func`/`US-AGENT-012~func` 详细信息配置。

**Step 2.4**: 保存并查看预览

- 操作: 点击「保存」→ 跳转回 SceneConfigScreen → 点击 AgentDate 卡片右侧「预览」
- 预期: 弹出双栏预览：左栏「他人能看到的公开供给」（仅 L1 字段），右栏「我自己看到的详细供给」（L1+L2 完整）
- 验证 AC: `ISSUE-C006~c6` 配置预览；`US-AGENT-012-AC-1` 两级信息可独立查看。

### Phase 3: 在 AgentJob 场景配置不同的供给（多场景独立性）

**目的**: 验证每个场景的供给信息相互隔离、能力差异化。

**Step 3.1**: 打开 AgentJob，启用/禁用能力

- 操作: 进入 AgentJob 配置 → 在「场景能力」面板中开启「主动投递简历」「智能薪资谈判」，关闭「夜间打扰」
- 预期: 关闭依赖能力（如关闭「定位推送」）时系统提示「会同时禁用：附近职位推荐」（依赖检查）；右上角显示能力版本号
- 验证 AC: `ISSUE-C006~c4` 能力启用/禁用、依赖检查、能力版本管理。

**Step 3.2**: 配置 AgentJob 的公开 + 详细供给

- 操作: 公开层填写「目标岗位、期望城市、期望薪资区间」；详细层填写「学历、工作年限、技能标签（最多 8 个）、过往项目（长文本，最多 500 字）、是否接受出差（Boolean toggle）」
- 预期: 与 AgentDate 数据互不污染；返回 AgentDate 检查其字段未被覆盖
- 验证 AC: `ISSUE-C006~c1` 各场景独立配置；`US-AGENT-012~func` 每个场景分别配置；`ISSUE-C006~c2` 字段系统覆盖多类型（TEXT/RANGE/TAGS/LONG_TEXT/BOOLEAN）。

### Phase 4: 跨场景数据迁移（VisionShare ← AgentDate）

**目的**: 验证场景切换/迁移工具与转换规则。

**Step 4.1**: 打开 SceneMigrationScreen

- 操作: 在 SceneConfigScreen 顶部点击「场景间迁移」→ 选择源 = AgentDate，目标 = VisionShare
- 预期: 显示字段映射预览表：源字段 → 目标字段（如「兴趣标签 → 内容偏好」「城市 → 默认地理范围」），不可映射字段以灰色标出
- 验证 AC: `ISSUE-C006~c5` 场景切换：迁移预览、配置转换规则。

**Step 4.2**: 确认迁移

- 操作: 勾选「保留目标场景已有公开层」，点击「确认迁移」→ 二次确认弹窗 → 确认
- 预期: VisionShare 场景状态变为「已配置」，公开/详细层均填充了来自 AgentDate 的可迁移字段
- 验证 AC: `ISSUE-C006~c5` 迁移确认；`US-AGENT-011-AC-1` / `US-AGENT-012-AC-1` 两级供给在新场景同步生效。

### Phase 5: 自定义模板与共享

**目的**: 验证用户保存自有模板并复用。

**Step 5.1**: 保存当前 AgentJob 配置为模板

- 操作: 在 AgentJob 配置页右上角「保存为我的模板」→ 命名「资深前端 - 远程优先」
- 预期: 模板列表中出现该模板，可点击「分享」生成分享码
- 验证 AC: `ISSUE-C006~c3` 用户自定义模板 + 模板分享。

### Phase 6: 边界与安全验证

**目的**: 验证披露策略一致性与未授权访问拒绝。

**Step 6.1**: 切换披露策略

- 操作: 在 AgentDate 配置中将「敏感字段（收入区间）」从「详细可见」切换为「仅自己」→ 保存 → 立即查看 Agent 在交友列表中的对外卡片
- 预期: 对外卡片不再显示收入；对己预览仍可见；切换后已下发的对话/匹配中也立即隐藏（一致性）
- 验证 AC: `US-AGENT-011~edge` 披露策略切换后的行为一致性。

**Step 6.2**: 未授权访问详细供给

- 操作: 用 Bob 账号登录另一台设备/隐私模式浏览器 → 直接访问 API `GET /api/v1/agents/{alexAgentId}/scenes/dating/supply?level=detail`（或在 app 中尝试通过 deeplink 访问）
- 预期: 返回 403 Forbidden（或 401 + 仅返回公开层），mobile 端展示「无权查看详细资料」占位
- 验证 AC: `US-AGENT-012~edge` 异常：供给信息被未授权访问。

**Step 6.3**: i18n 验证（可选快查）

- 操作: 将系统语言切到英文 → 重新打开 SceneConfigScreen
- 预期: 字段标签、错误提示、模板名为英文
- 验证 AC: `ISSUE-C006~c2` 字段国际化。

## AC 覆盖表

| AC Slug           | 描述                         | 验证方式                           | 所在步骤      |
| ----------------- | ---------------------------- | ---------------------------------- | ------------- |
| AS-001-AC-1       | 读取主人画像和场景配置       | 进入 Agent 详情看到 L1 摘要        | 1.1           |
| US-AGENT-001-AC-2 | 选择感兴趣场景（多选）       | 多选三个场景保存                   | 1.2           |
| US-AGENT-011-AC-1 | 每场景设公开/详细            | AgentDate 双 Tab 填写              | 2.2, 2.3, 4.2 |
| US-AGENT-012-AC-1 | 每场景设公开/详细（供给）    | AgentDate / AgentJob 双 Tab + 预览 | 2.2, 2.4, 3.2 |
| ISSUE-C006~c1     | 四大场景配置                 | 配置 VisionShare/Dating/Job 各自   | 1.1.b, 3.2    |
| ISSUE-C006~c2     | 字段系统（验证/依赖/i18n）   | 长度限制、showWhen 联动、英文切换  | 2.2, 2.3, 6.3 |
| ISSUE-C006~c3     | 场景模板（预设/复用/分享）   | 应用「认真交友」+ 保存自定义       | 2.1, 5.1      |
| ISSUE-C006~c4     | 能力系统（开关/依赖/版本）   | AgentJob 开关 + 依赖提示 + 版本号  | 3.1, 1.1.b    |
| ISSUE-C006~c5     | 场景切换/迁移                | SceneMigrationScreen 预览 + 确认   | 4.1, 4.2      |
| ISSUE-C006~c6     | 可视化管理界面 + 预览        | SceneConfigScreen + 双栏预览       | 1.1.b, 2.4    |
| US-AGENT-001~func | 创建 Agent + 基本信息        | Agent 详情显示基础资料             | 1.1           |
| US-AGENT-011~func | 配置两级需求信息             | AgentDate 公开/详细共用容器        | 2.2, 2.3      |
| US-AGENT-011~edge | 披露策略切换一致性           | 收入字段切换后对外/对己一致        | 6.1           |
| US-AGENT-012~func | 配置两级供给信息             | 完整的 Phase 2/3 流程              | 2.2-2.4, 3.2  |
| US-AGENT-012~edge | 未授权访问被拒               | Bob 直接拉详细 API 返回 403        | 6.2           |
| AS-001~func       | Agent 读画像/学规则/生成性格 | 详情页显示偏好摘要                 | 1.1           |

**覆盖率**: 16 / 16 AC = 100%

## 环境启动

```bash
# 1. 启动后端 + 数据库
cd /Users/z/projects/bridgeai
pnpm db:migrate
pnpm db:seed
pnpm --filter server dev

# 2. 启动 mobile（另一终端）
pnpm --filter mobile start
# iOS 模拟器
pnpm --filter mobile ios

# 3. 端到端冒烟脚本（可选）
pnpm test:e2e:web -- --story US-AGENT-012
```
