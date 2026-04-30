# Story Playbook: 创建个人 Agent

**Story**: `US-AGENT-001`
**Narrative**: 用户首次使用 BridgeAI，创建自己的 AI Agent，配置基本信息和偏好。

## 验收旅程概览

新用户完成注册登录后，在 5 步创建向导中完成 Agent 的命名、头像上传、场景类型选择、场景配置和 AI 行为偏好设置，最后在预览页确认并提交创建。旅程覆盖从空列表到 Agent 成功创建的全流程，同时验证空状态、异常输入和权限拒绝等边界场景。

## 前置条件

- 服务已启动 (`pnpm dev`)
- 数据库已迁移 (`pnpm db:migrate`)
- 测试账号已注册（邮箱 + 密码）
- 设备具备相机和相册权限（首次头像上传时）

## 旅程步骤

### Phase 1: 登录与导航

**目的**: 验证认证流程、页面路由和空状态 UI

**Step 1.1**: 登录应用

- 操作: 启动 App，使用测试账号登录
- 预期: 登录成功，跳转到首页
- 验证 AC: `ISSUE-A003~c1` 验证获取当前用户信息接口被调用，`US-AGENT-001~func` 用户首次进入系统
- 截图: 登录成功后的首页

**Step 1.2**: 进入 Agent 列表页面（空状态）

- 操作: 从底部导航或首页进入 "My Agents" 页面
- 预期: 页面显示空状态 UI（"No Agents Yet" + "Create Agent" 按钮）
- 验证 AC: `ISSUE-C001~c5` Agent 管理 UI 空状态设计，`US-AGENT-001~func` 用户首次看到 Agent 列表
- 截图: 空状态列表页

**Step 1.3**: 点击创建按钮

- 操作: 点击 "Create Agent" 或顶部 "+" 按钮
- 预期: 导航到创建向导页面，进度条显示 Step 1，表单标题为 "Step 1: Basic Information"
- 验证 AC: `ISSUE-C001~c5` Agent 卡片组件和创建 Agent 向导
- 截图: 创建向导 Step 1

---

### Phase 2: 填写基础信息（Step 1）

**目的**: 验证昵称、头像、描述和可见性配置

**Step 2.1**: 验证进度条和表单标题

- 操作: 观察页面
- 预期: 进度条宽度为 20%（1/5），标题为 "Step 1: Basic Information"
- 验证 AC: `ISSUE-C001~c5` 向导 UI，`US-AGENT-001-AC-1` 昵称输入
- 截图: Step 1 初始状态

**Step 2.2**: 上传头像（权限拒绝场景）

- 操作: 点击头像选择器，在权限弹窗中选择"不允许"
- 预期: 弹出权限请求 Alert，关闭后头像保持默认占位符状态
- 验证 AC: `US-AGENT-001~edge` 异常场景处理（权限拒绝）
- 截图: 权限拒绝提示

**Step 2.3**: 上传头像（正常流程）

- 操作: 重新点击头像选择器，选择"拍照"或"从相册选择"，完成图片裁剪确认；上传前打开 DevTools Network 面板捕获 PUT/POST 上传请求
- 预期: 头像预览显示所选图片，图片已裁剪为正方形；Network 面板捕获到上传请求，请求成功且响应中返回云存储 URL
- 验证 AC: `ISSUE-A003~c2` 头像上传接口、图片压缩和裁剪、云存储集成，`US-AGENT-001-AC-1` 头像设置，`ISSUE-A003~c3` 头像选择和上传 UI
- 截图: 头像上传成功
- 证据（压缩 + 云存储集成证据，覆盖 `ISSUE-A003~c2`）:
  - DevTools Network 面板截图: PUT/POST 上传请求条目（含 status code）
  - 请求 header 截图: 包含原始 `content-length`（上传字节数）和 `content-type`（如 `image/jpeg`）
  - 响应 header 截图: 包含压缩后 `content-length`（或服务端返回的压缩字节数 header，如 `x-compressed-size`）
  - 响应 body 截图: 必须包含 cloud storage URL（如 OSS/S3 域名，例如 `*.oss-cn-*.aliyuncs.com` 或 `*.s3.amazonaws.com`），不能是 base64 字符串或 `/local/` 本地路径
  - 验证: 原始字节数 vs 压缩字节数对比（压缩比 < 1），URL 域名为云存储域名（非应用本地域名）

**Step 2.4**: 输入 Agent 名称（无效输入验证）

- 操作: 在名称输入框输入超过 100 个字符后提交
- 预期: 显示 Alert 提示 "Agent name must be less than 100 characters"，停留在 Step 1
- 验证 AC: `US-AGENT-001~edge` 无效输入验证
- 截图: 名称过长错误提示

**Step 2.5**: 输入 Agent 名称（正常）

- 操作: 清空后重新输入合法名称（如 "我的 VisionShare Agent"），观察字符计数
- 预期: 字符计数显示 "N/100"，实时更新
- 验证 AC: `ISSUE-C001~c1` Agent 名称设置（基础信息设置）
- 截图: 合法名称输入

**Step 2.6**: 填写描述和设置可见性

- 操作: 在描述框输入不超过 500 字符的描述；切换可见性为 "Private"
- 预期: 描述字符计数正常更新（"N/500"）；Private 选项高亮
- 验证 AC: `ISSUE-A003~c4` 资料可见性设置（isPublic 隐私控制），`ISSUE-C001~c1` Agent 描述设置
- 截图: 描述和可见性设置完成

**Step 2.7**: 提交 Step 1（空名称验证）

- 操作: 清空名称字段，点击 Next
- 预期: Alert 提示 "Please enter an agent name"，停留在 Step 1
- 验证 AC: `US-AGENT-001~edge` 异常场景：无效输入（空名称）
- 截图: 空名称验证提示

---

### Phase 3: 选择场景类型（Step 2）

**目的**: 验证四种场景类型选择和类型枚举

**Step 3.1**: 进入 Step 2 并查看场景选项

- 操作: 在 Step 1 填写合法信息后点击 Next
- 预期: 进度条变为 40%（2/5），显示 4 种场景类型卡片：VisionShare、AgentDate、AgentJob、AgentAd
- 验证 AC: `ISSUE-C001~c2` Agent 类型定义（枚举四种场景类型），`US-AGENT-001-AC-2` 用户选择感兴趣的场景
- 截图: 四种场景类型列表

**Step 3.2**: 选择 VisionShare 类型

- 操作: 点击 VisionShare 类型卡片
- 预期: 卡片边框变为蓝色，显示勾选标记
- 验证 AC: `ISSUE-C001~c1` Agent 类型选择，`US-AGENT-001-AC-2` 场景选择
- 截图: VisionShare 已选中

**Step 3.3**: 提交 Step 2（未选类型验证）

- 操作: 取消选择 VisionShare，点击 Next
- 预期: Alert 提示 "Please select an agent type"，停留在 Step 2
- 验证 AC: `US-AGENT-001~edge` 异常场景：无效输入（未选择类型）
- 截图: 未选类型验证提示

---

### Phase 4: 配置场景参数（Step 3）

**目的**: 验证场景特定配置表单和字段验证

**Step 4.1**: 进入 VisionShare 配置页

- 操作: 重新选择 VisionShare，点击 Next
- 预期: 进度条变为 60%（3/5），显示 VisionShare 配置表单（需求范围、价格设置、自动分享）
- 验证 AC: `ISSUE-C006~c1` VisionShare 场景配置，`ISSUE-C006~c2` 字段验证规则，`US-AGENT-001~func` 配置基本信息和偏好
- 截图: VisionShare 配置表单

**Step 4.2**: 填写场景配置

- 操作: 选择"需求范围"为"同城"；在价格设置输入"50"；开启自动分享开关
- 预期: 各项配置按预期更新和保存状态
- 验证 AC: `ISSUE-C006~c1` 场景配置参数，`ISSUE-C006~c2` 字段依赖关系
- 截图: 场景配置填写完成

**Step 4.3**: 提交 Step 3（缺少必填字段验证）

- 操作: 清空需求范围选择，点击 Next
- 预期: Alert 提示 "Please select a range"，停留在 Step 3
- 验证 AC: `US-AGENT-001~edge` 异常场景：无效输入（缺少必填场景配置）
- 截图: 场景配置必填验证提示

---

### Phase 5: 配置 AI 行为（Step 4）

**目的**: 验证 AI 配置选项（模型、创造性、回复风格、切换触发条件）

**Step 5.1**: 进入 AI 配置页

- 操作: 重新填写必填场景配置，点击 Next
- 预期: 进度条变为 80%（4/5），显示 AI 配置表单（LLM 模型选择、创造性滑块、回复风格、人机切换）
- 验证 AC: `ISSUE-C001~c1` 基础属性设置，`US-AGENT-001-AC-3` Agent 沟通风格配置，`US-AGENT-001~func` 配置偏好
- 截图: AI 配置页

**Step 5.2**: 选择 LLM 模型和回复风格

- 操作: 选择 GPT-4 模型；选择回复风格为"友好"
- 预期: 模型卡片和风格卡片高亮，显示勾选标记
- 验证 AC: `US-AGENT-001-AC-3` 沟通风格（直接/委婉/详细/简洁 → formal/friendly/humorous 映射）
- 截图: 模型和风格已选择

**Step 5.3**: 设置人机切换触发条件

- 操作: 选择"关键词"触发，输入关键词 "人工, 转接"
- 预期: 关键词输入框显示；切换触发条件保存成功
- 验证 AC: `ISSUE-C001~c3` Agent 生命周期状态枚举相关（AI 行为配置影响后续状态）
- 截图: 关键词触发条件设置

**Step 5.4**: 展开高级设置

- 操作: 点击"显示高级设置"，填写自定义系统提示词和最大回复长度
- 预期: 高级配置区域展开，显示系统提示词文本框和最大回复长度输入框
- 验证 AC: `US-AGENT-001~func` Agent 偏好完整配置
- 截图: 高级设置展开

---

### Phase 6: 预览与提交（Step 5）

**目的**: 验证预览功能、对话测试、创建成功和后续引导

**Step 6.1**: 进入预览页

- 操作: 点击 Next 进入 Step 5
- 预期: 进度条变为 100%（5/5），显示 3 个标签页：资料预览 / 对话测试 / 历史记录
- 验证 AC: `US-AGENT-001-AC-4` Agent 生成初始画像，`AS-001~func` Agent 被创建后能读取主人画像并生成本场景性格
- 截图: Step 5 预览页

**Step 6.2**: 查看资料预览

- 操作: 停留在"资料预览"标签
- 预期: 显示 Agent 卡片（名称、类型、描述）、配置摘要（状态、场景配置、AI 配置）
- 验证 AC: `ISSUE-A003~c3` 资料预览，`AS-001-AC-4` 生成本场景下的性格和行为准则在预览中的体现
- 截图: 资料预览内容

**Step 6.3**: 测试对话

- 操作: 切换到"对话测试"标签，在输入框输入"你好"并发送
- 预期: 消息气泡显示用户消息，1 秒后 AI 模拟回复出现
- 验证 AC: `AS-001-AC-4` Agent 性格和行为准则在对话中的体现，`US-AGENT-001~func` 创建后 Agent 可交互
- 截图: 对话测试消息

**Step 6.4**: 提交创建

- 操作: 点击 "Create Agent" 按钮
- 预期: 按钮变为 loading 状态（ActivityIndicator），成功后弹出 Alert 询问"是否继续创建其他场景的 Agent"
- 验证 AC: `ISSUE-C001~c1` 创建 Agent 端点，`ISSUE-C001~c3` Agent 状态枚举（初始为 draft），`AS-001~func` Agent 成功创建并关联主人画像，`US-AGENT-001~func` 首次创建成功
- 截图: 创建成功弹窗

---

### Phase 7: 创建后验证

**目的**: 验证 Agent 列表更新、详情页面和注销流程

**Step 7.1**: 选择"完成"，验证列表更新

- 操作: 在成功 Alert 点击"完成"
- 预期: 导航回 Agent 列表页，新创建的 Agent 卡片显示在列表顶部，状态为 DRAFT
- 验证 AC: `ISSUE-C001~c4` 获取用户所有 Agent（列表刷新），`ISSUE-C001~c3` 初始状态 draft
- 截图: Agent 列表显示新创建的卡片

**Step 7.2**: 查看 Agent 详情

- 操作: 点击 Agent 卡片进入详情页
- 预期: 显示 Agent 类型 Badge、状态 Badge、名称、描述、更新时间；底部有"编辑 Agent"和"删除 Agent"按钮
- 验证 AC: `ISSUE-A003~c3` 个人资料展示页面，`ISSUE-C001~c4` Agent 查询接口
- 截图: Agent 详情页

**Step 7.3**: 编辑 Agent

- 操作: 点击"编辑 Agent"按钮
- 预期: 跳转到 CreateAgentScreen，预填已有信息，标题变为"Edit Agent"，第 5 步提交按钮文字变为"Save"
- 验证 AC: `ISSUE-C001~c1` 基础信息设置（更新已有 Agent），`US-AGENT-001-AC-1` 更新昵称和头像
- 截图: 编辑模式表单

**Step 7.4**: 返回列表

- 操作: 点击返回箭头，不做任何修改
- 预期: 返回 Agent 列表页，Agent 信息未变化
- 验证 AC: `ISSUE-C001~c3` 状态转换规则（未修改则无状态变更）
- 截图: 列表页未变化

---

### Phase 8: Agent 生命周期状态转换验证

**目的**: 完整覆盖 `ISSUE-C001~c3` Agent 生命周期 AC（状态枚举 draft/active/paused/archived、转换规则、状态变更 API、状态历史），补充 Step 7.1 仅验证初始 DRAFT 状态之外的子项

**Step 8.1**: 激活 Agent（DRAFT → ACTIVE）

- 操作: 进入新创建 Agent 的详情页（或在列表页长按卡片），点击「激活」按钮；同时打开 DevTools Network 面板捕获 `PATCH /api/v1/agents/:id/status` 请求，body `{"status":"ACTIVE"}`
- 预期: 状态 Badge 由灰色 DRAFT 切换为绿色 ACTIVE；Network 面板捕获 PATCH 请求，状态码 200，响应 body 包含 `{ status: "ACTIVE" }`
- 验证 AC: `ISSUE-C001~c3` Agent 状态枚举（ACTIVE 态）+ 转换规则（DRAFT→ACTIVE 合法）+ 状态变更 API（PATCH /agents/:id/status）
- 截图: 激活前后的状态 Badge 颜色变化、DevTools Network 面板的 PATCH 请求与响应 body

**Step 8.2**: 暂停 Agent（ACTIVE → PAUSED）

- 操作: 在已激活的 Agent 详情页（或列表页）点击「暂停」按钮；DevTools Network 面板捕获 `PATCH /api/v1/agents/:id/status` 请求，body `{"status":"PAUSED"}`
- 预期: 状态 Badge 由绿色 ACTIVE 切换为黄色 PAUSED；Network 面板捕获 PATCH 请求，状态码 200，响应 body 包含 `{ status: "PAUSED" }`
- 验证 AC: `ISSUE-C001~c3` Agent 状态枚举（PAUSED 态）+ 转换规则（ACTIVE→PAUSED 合法）+ 状态变更 API
- 截图: 暂停前后的状态 Badge 颜色变化、DevTools Network 面板的 PATCH 请求与响应 body

**Step 8.3**: 归档 Agent（PAUSED → ARCHIVED）

- 操作: 在已暂停的 Agent 详情页（或列表页）点击「归档」按钮，确认弹窗点击「确定」；DevTools Network 面板捕获 `PATCH /api/v1/agents/:id/status` 请求，body `{"status":"ARCHIVED"}`
- 预期: 状态 Badge 由黄色 PAUSED 切换为灰色 ARCHIVED（终态）；Network 面板捕获 PATCH 请求，状态码 200，响应 body 包含 `{ status: "ARCHIVED" }`；后续状态切换按钮被禁用（终态不可再转换）
- 验证 AC: `ISSUE-C001~c3` Agent 状态枚举（ARCHIVED 终态）+ 转换规则（PAUSED→ARCHIVED 合法 + ARCHIVED 终态约束）+ 状态变更 API
- 截图: 归档前后的状态 Badge 颜色变化、DevTools Network 面板的 PATCH 请求与响应 body、终态下按钮禁用状态

**Step 8.4**: 查看状态历史

- 操作: 在 Agent 详情页点击「状态历史」入口（或调用 `GET /api/v1/agents/:id/history`）；DevTools Network 面板捕获 GET 请求与响应
- 预期: 历史记录列表显示 4 条记录（按时间倒序或正序）：创建（DRAFT）、激活（ACTIVE）、暂停（PAUSED）、归档（ARCHIVED）；每条记录包含 `status`、`changedAt`、`reason` 字段
- 验证 AC: `ISSUE-C001~c3` Agent 状态历史（GET /agents/:id/history 返回完整状态变更轨迹）
- 截图: 状态历史 UI 列表、DevTools Network 面板的 GET 请求与响应 body（含 4 条记录的 JSON 数组）

---

### Phase 9: Agent 列表分页、排序与筛选验证

**目的**: 完整覆盖 `ISSUE-C001~c4` Agent 查询接口 AC（获取列表/类型筛选/状态筛选/分页/排序），补充 Step 7.1 仅验证「列表查询和显示」之外的子项

**Step 9.1**: 批量创建 Agent（≥ 11 个，混合 type 和 status）

- 操作: 通过 seed 脚本或循环调用 `POST /api/v1/agents` 创建至少 11 个 Agent，混合不同 type（VISIONSHARE / AGENTDATE / AGENTJOB / AGENTAD）和 status（部分 DRAFT、部分通过后续 PATCH 切到 ACTIVE / PAUSED），便于后续筛选与排序验证；DevTools Network 面板捕获每次 `POST /api/v1/agents` 请求与响应
- 预期: 每次 POST 状态码 201，响应 body 含新创建 Agent 的 id 与 status；累计已存在 ≥ 11 个 Agent
- 验证 AC: `ISSUE-C001~c4` 数据准备（为分页/排序/筛选子项准备多条记录）
- 截图: DevTools Network 面板批量 POST 请求与响应、列表页显示 ≥ 11 个 Agent 卡片

**Step 9.2**: 验证默认分页（每页 limit=20）与分页器字段

- 操作: 进入 Agent 列表页，DevTools Network 面板捕获 `GET /api/v1/agents` 默认请求；再调用 `GET /api/v1/agents?page=1&limit=5` 触发多页（如果想验证多页且现有数量不足，再创建到 ≥ 21 个）；UI 上点击分页器下一页/上一页
- 预期: 默认请求响应 `pagination` 字段包含 `{ page: 1, limit: 20, total: ≥11, totalPages, hasNext, hasPrev }`；`?limit=5` 请求返回 `data.length === 5`、`pagination.totalPages === Math.ceil(total/5)`、`hasNext: true`；UI 分页器正确显示当前页码与每页条数
- 验证 AC: `ISSUE-C001~c4` 分页（page/limit/total/totalPages/hasNext/hasPrev）
- 截图: UI 列表分页器（页码/每页条数）、DevTools Network 面板的 GET 请求与响应 body（pagination 对象）

**Step 9.3**: 验证按 createdAt 排序（asc / desc）

- 操作: DevTools Network 面板捕获 `GET /api/v1/agents?sortBy=createdAt&sortOrder=desc`，再调用 `GET /api/v1/agents?sortBy=createdAt&sortOrder=asc`，对比两次响应 `data` 数组顺序
- 预期: desc 顺序下最新创建的 Agent 排在 `data[0]`；asc 顺序下最早创建的 Agent 排在 `data[0]`，两个列表顺序完全相反
- 验证 AC: `ISSUE-C001~c4` 排序（sortBy=createdAt + sortOrder=asc/desc）
- 截图: UI 列表两次排序后的顺序变化、DevTools Network 面板的两次 GET 请求与响应 body

**Step 9.4**: 验证按 name 排序

- 操作: DevTools Network 面板捕获 `GET /api/v1/agents?sortBy=name&sortOrder=asc`
- 预期: 响应 `data` 数组按 `name` 字段字母升序排列（A → Z）
- 验证 AC: `ISSUE-C001~c4` 排序（sortBy=name）
- 截图: UI 列表按 name 升序后的顺序、DevTools Network 面板的 GET 请求与响应 body

**Step 9.5**: 验证按 updatedAt 排序

- 操作: 先调用 `PATCH /api/v1/agents/:id`（或 `PATCH /api/v1/agents/:id/status`）更新某一个非最新的 Agent；再调用 `GET /api/v1/agents?sortBy=updatedAt&sortOrder=desc`，DevTools Network 面板捕获请求与响应
- 预期: 刚被更新的 Agent 排在响应 `data[0]`，其 `updatedAt` 字段大于其他 Agent
- 验证 AC: `ISSUE-C001~c4` 排序（sortBy=updatedAt）
- 截图: 更新前后的列表顺序、DevTools Network 面板的 PATCH 与 GET 请求与响应 body

**Step 9.6**: 验证按 type 筛选

- 操作: DevTools Network 面板捕获 `GET /api/v1/agents?type=VISIONSHARE`；UI 上若有筛选器则切换到 VisionShare
- 预期: 响应 `data` 数组中所有 Agent 的 `type` 字段均为 `VISIONSHARE`，不包含其他类型；`pagination.total` 等于 VISIONSHARE 类型的总数
- 验证 AC: `ISSUE-C001~c4` 类型筛选（type=VISIONSHARE）
- 截图: UI 列表筛选后只显示 VisionShare Agent、DevTools Network 面板的 GET 请求与响应 body

**Step 9.7**: 验证按 status 筛选

- 操作: DevTools Network 面板捕获 `GET /api/v1/agents?status=DRAFT`；UI 上若有状态筛选器则切换到 DRAFT
- 预期: 响应 `data` 数组中所有 Agent 的 `status` 字段均为 `DRAFT`，不包含 ACTIVE / PAUSED / ARCHIVED；`pagination.total` 等于 DRAFT 状态的总数
- 验证 AC: `ISSUE-C001~c4` 状态筛选（status=DRAFT）
- 截图: UI 列表筛选后只显示 DRAFT Agent、DevTools Network 面板的 GET 请求与响应 body

---

### Phase 10: 边界场景验证

**目的**: 验证异常情况处理

**Step 10.1**: 注销 Agent

- 操作: 进入 Agent 详情页，点击"删除 Agent"，在确认弹窗点击"删除"
- 预期: Agent 从列表中移除，显示空状态（或列表变短）
- 验证 AC: `US-AGENT-017-AC-1` 注销特定场景 Agent，`US-AGENT-017~func` 注销流程
- 截图: 注销后的列表

**Step 10.2**: 注销后重新创建（同场景）

- 操作: 在空状态点击"Create Agent"，创建同名类型的 Agent
- 预期: 创建成功，新 Agent 出现在列表中
- 验证 AC: `US-AGENT-017~edge` 异常：注销后重新创建
- 截图: 重新创建成功

**Step 10.3**: 创建不同场景的 Agent（复用向导）

- 操作: 创建成功后，在成功 Alert 点击"继续创建"
- 预期: 向导重置到 Step 2（类型选择），用户可继续创建其他场景 Agent
- 验证 AC: `US-AGENT-001-AC-2` 可多选场景，`US-AGENT-001~func` 持续创建多个场景 Agent，`ISSUE-C001~c5` 创建向导可复用
- 截图: 继续创建向导

---

### Phase 11: 隐私与安全设置验证

**目的**: 验证可见性设置和安全功能入口

**Step 11.1**: 验证隐私可见性

- 操作: 重新创建一个 Agent，将可见性设置为 Public 后提交；在列表查看
- 预期: Agent 卡片不显示公开/私密标记（通过 API 验证 isPublic 字段）
- 验证 AC: `ISSUE-A003~c4` 资料可见性设置（Public/Private）
- 截图: 可见性为 Public 的 Agent

**Step 11.2**: 验证隐私设置为 Private

- 操作: 创建一个新 Agent，选择 Private 可见性
- 预期: Agent 创建成功，Private 配置被保存
- 验证 AC: `ISSUE-A003~c4` 在线状态可见性（Private 表示不公开可见），手机号/邮箱隐私
- 截图: Private Agent 创建成功

---

### Phase 12: 账户安全

**目的**: 验证账户安全功能（修改密码、绑定/换绑手机邮箱、设备管理），完整覆盖 `ISSUE-A003~c5` 安全功能 AC

**Step 12.1**: 进入设置/安全页

- 操作: 从首页或个人中心进入「设置」→「账户安全」页
- 预期: 安全页加载成功，显示「修改密码」「绑定手机」「绑定邮箱」「设备管理」四个入口
- 验证 AC: `ISSUE-A003~c5` 安全功能入口（设置/安全页面承载）
- 截图: 账户安全页全貌
- API 响应: 记录 `GET /api/user/security` 或 `GET /api/user/me` 返回的安全信息（绑定手机、邮箱、设备数）

**Step 12.2**: 修改密码（旧密码 + 新密码 + 确认）

- 操作: 点击「修改密码」，依次输入旧密码 `TestPass123!`、新密码 `NewPass456!`、确认新密码 `NewPass456!`，点击提交
- 预期: 提交成功，弹出「密码修改成功」提示；新密码登录可用，旧密码登录失败
- 验证 AC: `ISSUE-A003~c5` 修改密码（旧密码校验 + 新密码强度 + 二次确认）
- 截图: 修改密码表单填写完成、修改成功提示
- API 响应: 记录 `POST /api/user/password` 请求体（脱敏）和响应 `{ success: true }`

**Step 12.3**: 绑定/换绑手机

- 操作: 点击「绑定手机」（或当前已绑定则点击「换绑手机」），输入新手机号，获取并填入短信验证码，提交
- 预期: 验证码发送成功；提交后手机号绑定/换绑成功，安全页手机号字段更新
- 验证 AC: `ISSUE-A003~c5` 绑定/换绑手机（验证码流程）
- 截图: 手机绑定表单、验证码已发送、绑定成功后的安全页
- API 响应: 记录 `POST /api/user/phone/send-code` 与 `POST /api/user/phone/bind` 的请求和响应

**Step 12.4**: 绑定/换绑邮箱

- 操作: 点击「绑定邮箱」（或「换绑邮箱」），输入新邮箱地址，获取并填入邮箱验证码，提交
- 预期: 验证码邮件发送成功；提交后邮箱绑定/换绑成功，安全页邮箱字段更新
- 验证 AC: `ISSUE-A003~c5` 绑定/换绑邮箱（邮箱验证码流程）
- 截图: 邮箱绑定表单、验证码已发送、绑定成功后的安全页
- API 响应: 记录 `POST /api/user/email/send-code` 与 `POST /api/user/email/bind` 的请求和响应

**Step 12.5**: 设备列表查看

- 操作: 点击「设备管理」进入设备列表页
- 预期: 显示当前已登录的所有设备（设备名、登录时间、IP/位置、本设备标记）
- 验证 AC: `ISSUE-A003~c5` 登录设备管理（设备列表查看）
- 截图: 设备列表页全貌
- API 响应: 记录 `GET /api/user/devices` 返回的设备数组

**Step 12.6**: 设备下线

- 操作: 在设备列表中选择一个非本设备，点击「下线」按钮，在确认弹窗点击「确定」
- 预期: 该设备从列表中移除（或标记为已下线）；该设备上的会话失效（重新进入需要登录）
- 验证 AC: `ISSUE-A003~c5` 登录设备管理（设备下线/会话注销）
- 截图: 下线确认弹窗、下线后的设备列表
- API 响应: 记录 `POST /api/user/devices/:id/logout`（或 `DELETE /api/user/devices/:id`）的请求和响应

---

### Phase 13: 隐私控制完整验证

**目的**: 完整覆盖 `ISSUE-A003~c4` 隐私控制 AC（在线状态可见性、字段级隐私、阻止列表），补充 Public/Private 两态切换之外的子项

**Step 13.1**: 进入隐私设置页

- 操作: 从首页或个人中心进入「设置」→「隐私设置」页
- 预期: 隐私页加载成功，显示「资料可见性」「在线状态可见性」「联系方式隐私（手机号/邮箱）」「阻止列表」四个分区
- 验证 AC: `ISSUE-A003~c4` 隐私设置页面承载
- 截图: 隐私设置页全貌
- API 响应: 记录 `GET /api/user/privacy` 或 `GET /api/user/me` 返回的隐私字段（onlineStatusVisible、phoneVisible、emailVisible、blockedUsers）

**Step 13.2**: 切换在线状态可见性

- 操作: 在「在线状态可见性」分区找到开关，从「公开」切换为「隐藏」（再切回「公开」验证双向）
- 预期: 开关状态切换成功，显示成功提示；其他用户无法看到当前用户的在线/离线状态
- 验证 AC: `ISSUE-A003~c4` 在线状态可见性
- 截图: 切换前的开关状态、切换后的开关状态
- API 响应: 记录 `PATCH /api/user/privacy` 请求体 `{ onlineStatusVisible: false }` 和响应

**Step 13.3**: 切换手机号字段级隐私开关

- 操作: 在「联系方式隐私」分区找到「手机号可见性」开关，从「公开」切换为「仅自己可见」
- 预期: 开关状态保存成功；其他用户在资料页无法看到手机号字段（显示为空或脱敏）
- 验证 AC: `ISSUE-A003~c4` 手机号字段级隐私
- 截图: 手机号开关切换后的隐私设置页、其他视角下手机号字段被隐藏的资料页
- API 响应: 记录 `PATCH /api/user/privacy` 请求体 `{ phoneVisible: false }` 和响应

**Step 13.4**: 切换邮箱字段级隐私开关

- 操作: 在「联系方式隐私」分区找到「邮箱可见性」开关，从「公开」切换为「仅自己可见」
- 预期: 开关状态保存成功；其他用户在资料页无法看到邮箱字段
- 验证 AC: `ISSUE-A003~c4` 邮箱字段级隐私
- 截图: 邮箱开关切换后的隐私设置页、其他视角下邮箱字段被隐藏的资料页
- API 响应: 记录 `PATCH /api/user/privacy` 请求体 `{ emailVisible: false }` 和响应

**Step 13.5**: 进入阻止列表

- 操作: 点击「阻止列表」入口进入阻止管理页
- 预期: 阻止列表页加载成功，显示当前已阻止的用户列表（若空则显示空状态）和「添加阻止」按钮
- 验证 AC: `ISSUE-A003~c4` 阻止列表查看
- 截图: 阻止列表页全貌
- API 响应: 记录 `GET /api/user/blocked` 返回的被阻止用户数组

**Step 13.6**: 添加阻止用户

- 操作: 点击「添加阻止」，搜索并选中目标测试用户（如 `test-blocked@bridgeai.test`），点击「确认阻止」
- 预期: 阻止成功提示，目标用户出现在阻止列表中；该用户无法再看到当前用户资料/无法发起会话
- 验证 AC: `ISSUE-A003~c4` 阻止列表添加
- 截图: 添加阻止确认弹窗、添加成功后的阻止列表
- API 响应: 记录 `POST /api/user/blocked` 请求体 `{ targetUserId }` 和响应

**Step 13.7**: 移除阻止用户

- 操作: 在阻止列表中选择已阻止用户，点击「移除阻止」（或「取消阻止」），在确认弹窗点击「确认」
- 预期: 该用户从阻止列表移除；恢复正常的可见性和交互能力
- 验证 AC: `ISSUE-A003~c4` 阻止列表移除
- 截图: 移除确认弹窗、移除后的阻止列表
- API 响应: 记录 `DELETE /api/user/blocked/:targetUserId` 的请求和响应

---

## AC 覆盖表

| AC Slug             | 描述                                                                | 验证方式                                                                                                                                                                                                                                                                                                              | 所在步骤                                                  |
| ------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `AS-001-AC-1`       | 读取主人的基础画像和场景配置                                        | Step 1.1 登录后 API 调用，Step 6.1 预览页配置读取                                                                                                                                                                                                                                                                     | 1.1, 6.1                                                  |
| `US-AGENT-001-AC-1` | 用户设置昵称和头像                                                  | Step 2.3 头像上传，Step 2.5 名称输入                                                                                                                                                                                                                                                                                  | 2.3, 2.5                                                  |
| `US-AGENT-017-AC-1` | 注销特定场景 Agent                                                  | Step 10.1 删除 Agent                                                                                                                                                                                                                                                                                                  | 10.1                                                      |
| `ISSUE-A003~c1`     | 用户信息接口（获取/更新/头像上传/删除账号）                         | Step 1.1 登录获取用户信息，Step 2.3 头像上传接口                                                                                                                                                                                                                                                                      | 1.1, 2.3                                                  |
| `ISSUE-A003~c2`     | 头像管理（上传/压缩裁剪/云存储/默认头像）                           | Step 2.2 权限拒绝（默认头像保留），Step 2.3 头像选择、裁剪、上传全流程 + DevTools Network 面板截取 PUT/POST 上传请求（请求/响应 header 对比 content-length 证明压缩，响应 body 含 OSS/S3 cloud storage URL 证明云存储集成）                                                                                           | 2.2, 2.3                                                  |
| `ISSUE-A003~c3`     | 移动端资料 UI（展示/编辑表单/头像上传/预览）                        | Step 6.2 资料预览标签，Step 7.2 详情页                                                                                                                                                                                                                                                                                | 6.2, 7.2                                                  |
| `ISSUE-A003~c4`     | 隐私控制（可见性/在线状态/联系方式/阻止列表）                       | Step 2.6 Public/Private 可见性设置，Step 11.1-11.2 验证可见性效果，Step 13.1 隐私设置页入口，Step 13.2 在线状态可见性切换，Step 13.3 手机号字段级隐私，Step 13.4 邮箱字段级隐私，Step 13.5 阻止列表查看，Step 13.6 添加阻止，Step 13.7 移除阻止                                                                       | 2.6, 11.1, 11.2, 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7 |
| `ISSUE-A003~c5`     | 安全功能（改密码/换绑手机邮箱/设备管理）                            | Step 12.1 安全页入口，Step 12.2 修改密码，Step 12.3 绑定/换绑手机，Step 12.4 绑定/换绑邮箱，Step 12.5 设备列表，Step 12.6 设备下线                                                                                                                                                                                    | 12.1, 12.2, 12.3, 12.4, 12.5, 12.6                        |
| `US-AGENT-001~func` | 用户首次创建 Agent 并配置基本信息和偏好                             | 完整旅程 Phase 2-6                                                                                                                                                                                                                                                                                                    | 2.1-6.4                                                   |
| `US-AGENT-001~edge` | 异常场景：重复创建、无效输入、网络中断                              | Step 2.4 超长名称，Step 2.7 空名称，Step 3.3 未选类型，Step 4.3 缺少必填配置，Step 2.2 权限拒绝                                                                                                                                                                                                                       | 2.2, 2.4, 2.7, 3.3, 4.3                                   |
| `AS-001~func`       | Agent 被创建后能读取主人画像、学习规则、生成本场景性格              | Step 6.1-6.3 预览页和对话测试                                                                                                                                                                                                                                                                                         | 6.1, 6.2, 6.3                                             |
| `AS-001~edge`       | 异常：主人画像缺失、场景规则加载失败                                | Step 1.1 新用户无画像场景下的初始化处理                                                                                                                                                                                                                                                                               | 1.1                                                       |
| `US-AGENT-017~func` | 用户注销某场景的 Agent                                              | Step 10.1 删除操作完整流程                                                                                                                                                                                                                                                                                            | 10.1                                                      |
| `US-AGENT-017~edge` | 异常：注销后重新创建                                                | Step 10.2 注销后重新创建同名类型 Agent                                                                                                                                                                                                                                                                                | 10.2                                                      |
| `ISSUE-C001~c1`     | Agent 创建接口（端点/类型/基础信息/用户关联）                       | Step 6.4 创建 API 调用，Step 7.3 编辑保存                                                                                                                                                                                                                                                                             | 6.4, 7.3                                                  |
| `ISSUE-C001~c2`     | Agent 类型定义（四种枚举/场景特定 Schema/验证）                     | Step 3.1 四种类型卡片展示                                                                                                                                                                                                                                                                                             | 3.1                                                       |
| `ISSUE-C001~c3`     | Agent 生命周期（状态枚举 draft/active/paused/archived 及转换/历史） | Step 7.1 验证新 Agent 初始状态为 DRAFT，Step 8.1 DRAFT→ACTIVE 激活（状态枚举 ACTIVE + 转换规则 + PATCH /agents/:id/status API），Step 8.2 ACTIVE→PAUSED 暂停（状态枚举 PAUSED + 转换规则），Step 8.3 PAUSED→ARCHIVED 归档（状态枚举 ARCHIVED 终态 + 转换规则），Step 8.4 状态历史 GET /agents/:id/history（4 条记录） | 7.1, 8.1, 8.2, 8.3, 8.4                                   |
| `ISSUE-C001~c4`     | Agent 查询接口（获取列表/类型筛选/状态筛选/分页/排序）              | Step 7.1 列表查询和显示，Step 9.1 批量创建 ≥ 11 个 Agent，Step 9.2 默认分页与分页器字段（page/limit/total/totalPages/hasNext/hasPrev），Step 9.3 按 createdAt 排序（asc/desc），Step 9.4 按 name 排序，Step 9.5 按 updatedAt 排序，Step 9.6 type 筛选（VISIONSHARE），Step 9.7 status 筛选（DRAFT）                   | 7.1, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7                    |
| `ISSUE-C001~c5`     | Agent 管理 UI（列表页/创建向导/卡片/空状态）                        | Step 1.2 空状态，Step 1.3 创建按钮，Step 6.4 向导完成                                                                                                                                                                                                                                                                 | 1.2, 1.3, 6.4                                             |
| `ISSUE-C006~c1`     | 场景配置（VisionShare/AgentDate/AgentJob/AgentAd 配置）             | Step 4.1 VisionShare 配置表单，Step 10.3 选择其他场景                                                                                                                                                                                                                                                                 | 4.1, 10.3                                                 |
| `ISSUE-C006~c2`     | 字段系统（场景特定字段/验证规则/依赖关系）                          | Step 4.1-4.3 字段输入和必填验证                                                                                                                                                                                                                                                                                       | 4.1, 4.3                                                  |
| `ISSUE-C006~c3`     | 场景模板（预设模板/应用复制/自定义/分享）                           | Step 6.2 预览页配置摘要体现模板效果                                                                                                                                                                                                                                                                                   | 6.2                                                       |
| `ISSUE-C006~c4`     | 能力系统（场景功能列表/启用禁用/依赖检查/版本）                     | Step 3.1 四种场景类型差异体现能力不同                                                                                                                                                                                                                                                                                 | 3.1                                                       |
| `ISSUE-C006~c5`     | 场景切换（数据迁移/转换规则/预览/确认）                             | Step 10.3 "继续创建"向导实现场景切换效果                                                                                                                                                                                                                                                                              | 10.3                                                      |
| `ISSUE-C006~c6`     | 场景配置可视化管理和预览界面                                        | Step 6.2 预览页配置摘要可视化                                                                                                                                                                                                                                                                                         | 6.2                                                       |
| `US-AGENT-011~func` | 每个场景设置公开信息和详细信息                                      | Step 6.2 预览页显示公开信息（名称/类型）和配置详情                                                                                                                                                                                                                                                                    | 6.2                                                       |
| `US-AGENT-011~edge` | 异常：披露策略切换后的行为一致性                                    | Step 2.6 Public/Private 切换场景                                                                                                                                                                                                                                                                                      | 2.6                                                       |
| `US-AGENT-012~func` | 每个场景设置公开和详细两级供给信息                                  | Step 6.2 预览页公开/详细两级信息展示                                                                                                                                                                                                                                                                                  | 6.2                                                       |
| `US-AGENT-012~edge` | 异常：供给信息被未授权访问                                          | Step 11.2 验证 Private Agent 不公开可见                                                                                                                                                                                                                                                                               | 11.2                                                      |
| `US-AGENT-001-AC-2` | 用户选择感兴趣的场景（可多选）                                      | Step 3.1 选择 VisionShare，Step 10.3 选择其他场景类型                                                                                                                                                                                                                                                                 | 3.1, 10.3                                                 |
| `US-AGENT-001-AC-3` | Agent 沟通风格（直接/委婉/详细/简洁）                               | Step 5.2 回复风格 formal/friendly/humorous                                                                                                                                                                                                                                                                            | 5.2                                                       |
| `US-AGENT-001-AC-4` | Agent 生成初始画像                                                  | Step 6.1-6.3 预览和对话测试体现 Agent 性格                                                                                                                                                                                                                                                                            | 6.1, 6.3                                                  |

## 环境启动

```bash
# 启动后端服务
cd apps/server && pnpm dev

# 启动移动端
cd apps/mobile && pnpm dev

# 运行 E2E 测试（可选）
pnpm test:e2e
```

## 测试账号

- 邮箱: `test-e2e@bridgeai.test`
- 密码: `TestPass123!`

## 异常场景快速索引

- 权限拒绝 → Step 2.2
- 名称超长 → Step 2.4
- 名称为空 → Step 2.7
- 未选择场景类型 → Step 3.3
- 场景必填配置缺失 → Step 4.3
- 注销后重新创建 → Step 10.2
- 隐私披露策略切换 → Step 2.6
