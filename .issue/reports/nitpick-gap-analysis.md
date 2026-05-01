# Nitpick vs Play-Story 检测能力差距调查报告

调查日期: 2026-05-01
调查范围: US-AGENT-001 (创建个人 Agent) 下的 ISSUE-A003, ISSUE-C001, ISSUE-C006

---

## 1. Nitpick 工作机制

### 1.1 Nitpick 实际做什么

Nitpick (`/Users/z/projects/issue-tree/skills/nitpick-issue/SKILL.md`) 是一个 **prompt-driven 的代码审查 + 有限运行时验证** 流程，由 LLM agent 在 tmux session 中执行。它有 6 个步骤：

| Step    | 动作                                         | 是否实际执行               |
| ------- | -------------------------------------------- | -------------------------- |
| Step 1  | 读取 Issue 信息（AC 列表、上轮 checkpoints） | 是（读 DB）                |
| Step 1b | 检查上轮未解决的 checkpoints                 | 是（读 DB）                |
| Step 2  | Review 相关代码（git diff + 逐文件审查）     | 是（Read 工具读代码）      |
| Step 3  | 逐条 AC 验证                                 | 部分（主要靠代码审查推理） |
| Step 4  | 起服务 + 跑测试                              | **理论上会，实际执行受限** |
| Step 5  | 记录 NitpickFinding                          | 是（写 DB）                |
| Step 6  | 报告结果                                     | 是（写 DB）                |

### 1.2 关键问题的答案

| 问题                          | 答案                                                | 证据                                                                                                                     |
| ----------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| nitpick 是否会启动服务？      | **SKILL 中有此步骤（Step 4c），但实际执行效果受限** | SKILL.md 第 366-383 行定义了 `npm start &` / `uvicorn` 等命令，但这是给 LLM agent 的建议模板，agent 是否执行取决于上下文 |
| nitpick 是否会操作浏览器？    | **不会**                                            | SKILL.md 中没有任何 chrome-devtools / browser 相关指令                                                                   |
| nitpick 是否会调用 API？      | **理论上会（Step 4d），使用 curl**                  | SKILL.md 第 389-398 行定义了 curl 验证模板，但仅限 API 层，不涉及前端 UI                                                 |
| nitpick 是否会运行 e2e 测试？ | **不会专门运行 e2e 测试**                           | Step 4a 只跑 `npm test` / `pytest`，不触发 Playwright/Cypress                                                            |
| nitpick 是否会截图？          | **不会**                                            | 无截图相关指令或工具调用                                                                                                 |

### 1.3 Nitpick 的核心限制

1. **不做前端 UI 操作**：它无法启动移动端 App（React Native / Expo）、无法操作浏览器界面、无法点击按钮、无法看到页面渲染结果。

2. **Step 4（起服务）在实际执行中经常被跳过或简化**：
   - 对于 `apps/server`，它可能启动后端 API 并用 curl 验证
   - 对于 `apps/mobile`（React Native），它**无法启动 Expo**，只能做代码审查
   - 证据：finding NP-2085 明确记录 "移动端 UI 验证缺失：React Native app 需要 Expo Go，无法在浏览器中验证"

3. **AC 验证主要靠代码推理**：Step 3 的 AC 验证方式是 "读取代码实现，确认逻辑与 AC 描述一致"，而非真实运行验证。

4. **运行时验证仅限于后端 API**：即使 Step 4 执行了，也只验证 API 层面的 curl 请求，不验证前端交互。

---

## 2. 检测能力对比表

| 维度                  | Nitpick                                     | Play-Story                                   |
| --------------------- | ------------------------------------------- | -------------------------------------------- |
| **启动后端服务**      | 理论有（Step 4c），实际常执行               | 有（playbook 中明确定义）                    |
| **启动前端/移动端**   | 无（React Native 无法在 CLI 中启动）        | 有（通过 Expo + chrome-devtools MCP）        |
| **浏览器/设备操作**   | 无                                          | 有（navigate, click, fill, take_screenshot） |
| **API 调用（curl）**  | 有（Step 4d）                               | 有（直接调用 + 浏览器网络面板）              |
| **截图 + 视觉验证**   | 无                                          | 有（take_screenshot + Read 工具看图）        |
| **运行 e2e 测试**     | 无                                          | 有（可运行 Playwright 等）                   |
| **代码审查**          | 有（Step 2，核心能力）                      | 无（"不聊代码"原则）                         |
| **AC 文字理解**       | 有（逐条推理）                              | 有（通过 UI 操作验证）                       |
| **双 Agent 交叉验证** | 无                                          | 有（Demo Agent + Critic Agent）              |
| **状态机循环验证**    | 有（nitpick -> arbitrate -> fix 循环）      | 无（一次性验收）                             |
| **运行环境**          | tmux session，CLI                           | tmux + chrome-devtools MCP + Expo            |
| **发现的问题类型**    | 代码质量、类型错误、schema 不一致、测试覆盖 | UI 交互 bug、视觉问题、端到端流程问题        |

---

## 3. 8 个 Bug 的归因分析

### Bug #1: HIGH — 创建 Agent 提交成功但 UI 停在 Step 5，重复点击产生重复 Agent

**Nitpick 理论上能否发现？** 部分。

**为什么没发现？**

- `CreateAgentScreen.tsx` 第 238 行 `await agentsApi.createAgent(agentData)` 后，第 242 行使用 `Alert.alert('Success', ...)` 弹窗。在 React Native 中 `Alert.alert` 是异步的，但不会阻塞代码执行。问题在于 `Alert.alert` 的回调中才做 `navigation.navigate('AgentList')`（第 247 行）。
- Nitpick 的代码审查确实发现了 NP-156 "CreateAgentScreen is a stub - submit handler uses setTimeout simulation"，且该 finding 已 resolved。
- **但修复后，nitpick 只验证了代码存在 `navigation.navigate('AgentList')`，没有运行 App 来验证 Alert 是否真的弹出了、导航是否真的发生了**。
- 这是一个典型的 **"代码看起来正确但运行时不正确"** 的问题。Alert.alert 在某些 React Native 环境（如 Expo Go）中可能不弹窗或行为不一致。

**修复后如何避免再次 miss：** 必须通过运行时验证（play-story 或 e2e 测试）确认提交后的导航行为。

---

### Bug #2: HIGH — 删除 Agent 按钮完全无响应（无弹窗、无 API 调用）

**Nitpick 理论上能否发现？** 可以（理论上）。

**为什么没发现？**

- 删除按钮在 `EditAgentScreen.tsx` 第 136-146 行，`onPress={handleDelete}` 绑定看起来正确。
- `handleDelete`（第 53-74 行）调用了 `Alert.alert` + `agentsApi.deleteAgent(agentId)`。
- **但问题是：用户是从哪个页面到达的删除按钮？**
  - `AgentListScreen.tsx` 第 236 行导航到 `EditAgent` 页面：`navigation.navigate('EditAgent', { agentId: agent.id })`
  - 但 play-story 报告中 Phase 11 显示用户点击删除按钮没有反应
  - 可能的原因：用户实际在的是另一个页面（如 CreateAgent 的编辑模式），而非 EditAgent 页面
- Nitpick 确实发现过 NP-314 "HTTP method mismatch: server uses PUT vs mobile PATCH"，并已修复。但修复后没有运行时验证删除流程是否端到端可用。
- **根因：nitpick 看到代码有 `handleDelete` 函数和 `onPress` 绑定，认为"代码正确"，但没有实际运行 App 验证点击后是否有弹窗**。

**修复后如何避免再次 miss：** 必须有 e2e 测试覆盖 "点击删除按钮 -> 确认弹窗 -> API 调用 -> 列表更新" 完整流程。

---

### Bug #3: MEDIUM — 空名称提交无验证错误提示

**Nitpick 理论上能否发现？** 可以。

**为什么没发现？**

- `CreateAgentScreen.tsx` 中 `handleSubmit`（第 194 行）只检查 `if (!selectedType) return`，对 `name` 没有做空值检查。
- Nitpick 确实做了 Step 3 的 AC 验证，但这里的 AC 可能没有明确要求 "空名称应显示验证错误提示"。
- Nitpick 的代码审查步骤（Step 2b）有 "边界处理" 检查项（severity=critical），但这条边界条件在多轮 nitpick 中从未被标记。
- **根因：LLM agent 在做代码审查时，没有模拟 "用户输入空名称后点击下一步" 的场景**。

**修复后如何避免再次 miss：** AC 中应明确包含 "表单验证" 类的验收标准；nitpick prompt 中应增加 "检查每个表单的空值/无效值处理" 专用检查项。

---

### Bug #4: MEDIUM — Visibility 编辑时未正确保持

**Nitpick 理论上能否发现？** 可以。

**为什么没发现？**

- `CreateAgentScreen.tsx` 第 210 行 `isPublic: isPublic` 和第 235 行 `isPublic: isPublic`，代码看似正确。
- 但初始值在第 261 行 `setIsPublic(true)` 被硬编码为 `true`。
- 当从 `EditAgent` 页面导航到 `CreateAgent` 时（第 129 行 `navigation.navigate('CreateAgent', { agent })`），编辑模式可能没有正确设置 `isPublic` 的初始值。
- Nitpick 做了代码审查但**没有对比 "创建时设置的值" 和 "编辑时加载的值" 是否一致**。
- **根因：这是一个典型的 "数据往返不一致" 问题，只有端到端操作才能发现**。

**修复后如何避免再次 miss：** 增加 "数据持久化往返测试" 类 e2e 用例。

---

### Bug #5: MEDIUM — UI 缺少 Archive 按钮（API 已实现）

**Nitpick 理论上能否发现？** 完全可以（静态分析就能发现）。

**为什么没发现？**

- `EditAgentScreen.tsx` 只有 "编辑 Agent" 和 "删除 Agent" 两个按钮，没有 "Archive" 按钮。
- AC-4 明确要求 "Agent lifecycle: Draft/Active/Paused/Archived"。
- Nitpick 的 TASK-155 确实验证了 "4/18 ACs fully pass"，其中 AC-4 的结果记录在案。
- 但在后续轮次中（TASK-158: "18/18 ACs passed"），nitpick **通过了 AC-4**。
- **这是 nitpick 最大的失误：它声称 18/18 ACs passed，但实际上 Archive 功能没有 UI 按钮。**
- **根因：LLM agent 可能将 "后端支持 ARCHIVED 状态" 等同于 "UI 有 Archive 按钮"，或者将 "Active/Paused 切换正常" 泛化为 "所有生命周期状态都正常"**。

**修复后如何避免再次 miss：** AC 验证必须精确到 UI 元素级别，不能接受 "后端支持所以通过"。

---

### Bug #6: MEDIUM — 价格单位不一致（输入 5.00 预览显示 500）

**Nitpick 理论上能否发现？** 可以（代码审查就能发现）。

**为什么没发现？**

- 这是一个经典的 "元 vs 分" 单位换算问题。
- 前端输入 5.00（元），后端存储可能以分为单位（500）。
- 预览页面直接展示了后端存储值（500），没有做 /100 转换。
- Nitpick 的代码审查应该检查 price 字段在 "输入 -> 存储 -> 展示" 链路中是否一致。
- **根因：nitpick 主要关注了 schema/类型层面的一致性，忽略了业务层面的单位换算问题**。

**修复后如何避免再次 miss：** 增加 "数值字段单位一致性" 专用检查项。

---

### Bug #7: LOW — Disclosure settings API 报错（缺数据库列）

**Nitpick 理论上能否发现？** 可以。

**为什么没发现？**

- 这是 schema/migration 问题：API 路由存在但引用的数据库列不存在。
- Nitpick 确实会启动服务并 curl API（Step 4d），但如果 Disclosure API 不是 ISSUE-C001 的 AC 要求，nitpick 可能不会去测试它。
- **根因：nitpick 只验证 issue 自己的 AC，不验证关联功能的集成状态**。

**修复后如何避免再次 miss：** 增加 "关联 API 健康检查" 步骤。

---

### Bug #8: LOW — PATCH status 持久化问题

**Nitpick 理论上能否发现？** 可以。

**为什么没发现？**

- Nitpick 发现过 NP-314（HTTP method mismatch），修复了 PUT vs PATCH 的问题。
- 修复后 nitpick 用 curl 验证了 PATCH 请求返回 success，但**没有验证 status 值是否真的持久化了**（即 PATCH 后再 GET 看是否一致）。
- **根因：nitpick 的 API 验证是 "发请求 -> 看响应" 的浅层验证，没有做 "写后读" 的一致性检查**。

**修复后如何避免再次 miss：** API 验证必须包含 "写后读" 模式（POST/PATCH 后 GET 验证持久化）。

---

## 4. 历史 Finding 数据观察

### 4.1 US-AGENT-001 下 3 个 Issue 的 Finding 统计

| Issue                            | Total Findings | Resolved | Dismissed | Open | Adopted           |
| -------------------------------- | -------------- | -------- | --------- | ---- | ----------------- |
| ISSUE-A003 (用户基础资料管理)    | 41             | 8        | 0         | 26   | 0 (多数 resolved) |
| ISSUE-C001 (Agent创建与基础配置) | 67             | 45       | 23        | 0    | 0                 |
| ISSUE-C006 (场景配置管理)        | 2              | 2        | 0         | 0    | 0                 |

### 4.2 Finding 类别分布

| Category         | Count        | 占比 |
| ---------------- | ------------ | ---- |
| code_quality     | 27 + 20 = 47 | 41%  |
| test_coverage    | 9 + 3 = 12   | 10%  |
| consistency      | 4 + 9 = 13   | 11%  |
| verification     | 4 + 5 = 9    | 8%   |
| requirement      | 6            | 5%   |
| runtime_behavior | 2 + 3 = 5    | 4%   |
| ac_quality       | 1            | 1%   |

### 4.3 关键洞察

1. **runtime_behavior 类型的 finding 只占 4%**（5/114），且其中大部分是 "server build fails" 或 "service cannot start"，不是真正的运行时行为问题。

2. **没有任何 finding 描述前端 UI 交互问题**。所有关于 mobile 的 finding 都是：
   - "Mobile screens not registered in navigation"（静态分析）
   - "CreateAgentScreen is a stub"（代码审查）
   - "Mobile lint fails"（lint）
   - "Mobile agent tests cannot run"（测试基础设施）
   - 没有一个是 "按钮点击无响应"、"提交后页面不跳转"、"数据展示不正确" 等运行时 UI 问题。

3. **Finding 状态分析**：
   - 23 个 finding 被 dismissed（43% 的已判定 finding）
   - 这说明 nitpick 有时过度报告（误报率高），但也可能 dismiss 了本该保留的 finding

4. **report-story-verification finding（NP-2083-2088）是由 play-story 的前一轮验证创建的**，不是 nitpick 创建的。这证明 play-story 能发现 nitpick 发现不了的问题。

5. **probe-test 发现了 4 个问题（NP-280/281/282/283）**，都是 "边界输入" 类（XSS、越界经纬度、分页参数），说明 probe-test 的刁钻测试比 nitpick 的代码审查更能发现输入验证问题。

---

## 5. 根因分析

### 5.1 本质原因

**Nitpick 是一个 "读代码" 的流程，play-story 是一个 "用产品" 的流程。两者的能力集几乎不重叠。**

具体来说：

1. **Nitpick 的 AC 验证是 "代码推理" 而非 "行为验证"**
   - Nitpick 声称 "18/18 ACs passed"（TASK-158, TASK-175），但实际上多个 AC 并未真正满足
   - 例如 AC-4 "Agent lifecycle: Draft/Active/Paused/Archived" 被标为 passed，但 Archive 按钮根本不存在
   - LLM agent 看到代码中有 ARCHIVED 状态枚举值，就判定 AC 通过

2. **Nitpick 的 "起服务" 步骤是可选项，且只覆盖后端**
   - Step 4c 写的是 "如果项目是一个可启动的服务"，措辞是条件性的
   - 对于 React Native mobile app，nitpick **根本无法启动和操作**
   - Finding NP-2085 明确承认了这一点

3. **Nitpick 和 Play-Story 在工作流中没有衔接**
   - Nitpick 完成 -> issue 进入 `ai_confirmed` -> 没有 Play-Story 环节
   - Play-Story 是手动触发的独立流程，不在自动化的 nitpick 循环中

4. **Probe-test 是离线测试而非在线测试**
   - probe-test 写测试代码来测试代码（如发送请求验证边界输入）
   - 但它不会操作 UI、不会截图、不会验证视觉效果
   - probe-test 的 51/51 passed（TASK-177）给人一种"所有问题都已解决"的错觉

### 5.2 流程缺陷图

```
当前流程:
  implement -> accept -> nitpick (代码审查) -> probe-test (API 测试) -> ai_confirmed
                                                                    ↓
                                                              (play-story 手动触发)
                                                                    ↓
                                                              发现 8 个 bug!

缺失的环节:
  implement -> accept -> nitpick -> probe-test -> play-story -> ai_confirmed
                                                 ↑
                                          这一步是缺失的
```

---

## 6. 改进方案

### 6.1 P0: 将 Play-Story 纳入自动化流程（结构性修复）

**现状**：Play-Story 是手动触发的独立 skill。
**改进**：在 polish-issue 流程中，probe-test 之后增加 play-story 步骤。

修改 `polish-issue/SKILL.md` 的流程：

```
当前: nitpick -> arbitrate -> fix 循环 -> probe-test -> fix -> 完成
改进: nitpick -> arbitrate -> fix 循环 -> probe-test -> fix -> play-story -> fix -> 完成
```

具体做法：

- 在 `polish-issue` 的 Step 3（Probe-test）之后增加 Step 3.5（Play-Story）
- 只有当 issue 关联到有 UI 的 story 时才执行（通过 `issue_story_mapping` 和 `story.story_type` 判断）
- Play-Story 的 findings 用 `transition='play-story-verification'` 记录
- 问题发现后创建 fix task，循环回 nitpick

**可行性**：需要确保 play-story 可以在 tmux session 中执行（需要 chrome-devtools MCP 和 Expo 的支持）。这可能是最大的技术障碍。

### 6.2 P1: Nitpick 增加 "UI 元素清单" 验证步骤（低成本改进）

**现状**：Nitpick 声称 AC 通过，但不验证 UI 是否有对应元素。
**改进**：在 Step 3（逐条 AC 验证）中增加子步骤：

```
对每个 AC:
  3a. 读取 AC 描述
  3b. 在代码中搜索对应的 UI 元素（按钮、表单、标签）
  3c. 确认 UI 元素存在且绑定了正确的事件处理函数
  3d. 如果是 lifecycle 相关的 AC（如 "支持 Draft/Active/Paused/Archived"），
      逐一确认每个状态在 UI 中都有对应的操作入口
```

具体检查清单（硬编码到 SKILL.md）：

- [ ] 每个 AC 中提到的按钮，在代码中搜索 `onPress` / `onClick` 绑定
- [ ] 每个 AC 中提到的状态，在 UI 代码中搜索对应的切换/显示逻辑
- [ ] 表单验证：每个 input 都检查空值处理
- [ ] 数据往返：创建时设置的值，编辑时是否正确加载

### 6.3 P1: Nitpick 增加 "写后读" API 验证模式（低成本改进）

**现状**：Nitpick 的 API 验证是 `POST -> 看 200 响应` 就通过。
**改进**：强制要求 `POST/PATCH -> GET -> 对比` 模式：

```
4d-1: POST /api/v1/agents 创建 agent -> 记录返回的 id
4d-2: GET /api/v1/agents/{id} -> 对比返回值与创建时提交的值
4d-3: PATCH /api/v1/agents/{id} {status: "ACTIVE"} -> GET 验证 status 确实变为 ACTIVE
4d-4: DELETE 相关验证
```

### 6.4 P2: 建立 Nitpick -> Play-Story 的 "待验证清单" 机制

**现状**：Nitpick 完成后直接进入 ai_confirmed，没有给 play-story 留线索。
**改进**：Nitpick 在 Step 6 报告中增加 "requires_play_story_verification" 字段：

```json
{
  "summary": "Nitpick R5 ISSUE-C001: 18/18 ACs pass",
  "requires_play_story_verification": [
    {
      "ac_slug": "US-AGENT-001-AC-1",
      "reason": "CreateAgentScreen 5-step wizard with navigation — can only verify via runtime UI test",
      "items_to_verify": [
        "Step 5 submission navigates to AgentList",
        "Form data persists correctly in edit mode",
        "Empty name shows validation error"
      ]
    },
    {
      "ac_slug": "US-AGENT-001-AC-4",
      "reason": "Agent lifecycle states require UI toggle verification",
      "items_to_verify": ["Archive button exists and works", "Status transitions render correctly"]
    }
  ]
}
```

将这些 items 写入 `verification_checkpoints` 表，`status='pending_play_story'`，play-story 启动时读取并逐一验证。

### 6.5 P2: AC 增加 verification_method=e2e_ui 标记

**现状**：AC 的 `verification_method` 可能是 `manual`、`automated` 等，但没有区分 "可以代码审查验证" 和 "必须 UI 操作验证"。
**改进**：增加 `verification_method=e2e_ui` 标记，nitpick 遇到此类 AC 时：

1. 标记为 "nitpick 无法完全验证"
2. 创建 `verification_checkpoint`（status=open），等待 play-story 验证
3. 不将此类 AC 纳入 "ACs passed" 计数

### 6.6 P3: 让 Nitpick 从 Play-Story Bug 模式中学习

**现状**：Play-Story 发现的 bug 模式不会反馈到 nitpick 的检查项中。
**改进**：从本次 8 个 bug 中提取通用模式，硬编码到 nitpick SKILL.md 的 Step 2b 检查清单中：

| 新增检查项                                                                  | 能抓到的 bug |
| --------------------------------------------------------------------------- | ------------ |
| "表单提交后的导航是否正确？检查 Alert.alert 回调中的 navigate 调用是否可靠" | Bug #1       |
| "删除/危险操作按钮的 onPress 是否绑定？点击后是否有确认弹窗？"              | Bug #2       |
| "每个表单输入是否都有空值/无效值的错误提示？"                               | Bug #3       |
| "编辑模式是否正确加载了创建时的所有字段值？逐一对比初始值和编辑加载值"      | Bug #4       |
| "AC 提到的每个 UI 操作（按钮/切换/入口）是否都存在于渲染代码中？"           | Bug #5       |
| "金额/数值字段的单位在 输入->存储->展示 链路中是否一致？"                   | Bug #6       |
| "关联功能的 API 端点是否健康？"                                             | Bug #7       |
| "PATCH 后 GET 验证数据是否持久化？"                                         | Bug #8       |

---

## 7. 建议的下一步行动

### 行动 1（立即执行，约 2 小时）

**将上述 6.6 中的 8 个检查项添加到 nitpick-issue SKILL.md 的 Step 2b 检查清单中。**

文件：`/Users/z/projects/issue-tree/skills/nitpick-issue/SKILL.md`
位置：Step 2b 的检查表格（当前第 217-226 行），增加 8 行检查项。

这不需要任何架构改动，只需在 SKILL.md 中加文字，下次 nitpick 自动生效。

### 行动 2（本周完成，约 1 天）

**在 polish-issue SKILL.md 中增加 "UI 元素逐一确认" 步骤（6.2 方案）。**

文件：`/Users/z/projects/issue-tree/skills/nitpick-issue/SKILL.md`
位置：Step 3 中增加 "3b-UI: UI 元素清单验证" 子步骤。

强制要求 nitpick 对每个 AC 生成 "该 AC 在 UI 中对应的元素清单"，并在代码中逐一确认存在。

### 行动 3（本周完成，约 2 天）

**在 polish-issue 流程中集成 play-story 步骤（6.1 方案）。**

文件：`/Users/z/projects/issue-tree/skills/polish-issue/SKILL.md`
位置：Step 3（Probe-test）之后，增加 Step 3.5（Play-Story 验证）。

条件触发：只有当 issue 通过 `issue_story_mapping` 关联到 story，且该 story 的 `narrative` 中包含 UI 交互描述时才执行。

技术前提：确认 play-story 能在 tmux session + chrome-devtools MCP 环境中运行。

---

## 附录：数据来源

- Nitpick SKILL.md: `/Users/z/projects/issue-tree/skills/nitpick-issue/SKILL.md`
- Play-Story SKILL.md: `/Users/z/projects/issue-tree/skills/play-story/SKILL.md`
- Polish-Issue SKILL.md: `/Users/z/projects/issue-tree/skills/polish-issue/SKILL.md`
- Probe-Test SKILL.md: `/Users/z/projects/issue-tree/skills/probe-test/SKILL.md`
- 数据库: `/Users/z/projects/bridgeai/.issuetree/issuetree.db`
  - `nitpick_findings` 表（114 条记录关联 US-AGENT-001）
  - `tasks` 表（ISSUE-C001 有 10 个 nitpick tasks，经历了 5 轮 nitpick 循环）
- Play-Story 报告: `/Users/z/projects/bridgeai/.issue/reports/US-AGENT-001/20260501_104522/index.html`
- 源代码:
  - `CreateAgentScreen.tsx`（提交逻辑，第 194-271 行）
  - `EditAgentScreen.tsx`（删除逻辑，第 53-74 行）
