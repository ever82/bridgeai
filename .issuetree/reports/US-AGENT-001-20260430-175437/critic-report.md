# Critic Report: US-AGENT-001

## 总体评价

- Demo 完整性: 1/10（截止报告时刻仅有 api-evidence.json，0 张截图，无 demo-report.md）
- 证据质量: 1/10（health check 通过；register API 直接 REQUEST_TIMEOUT 失败 — 整个 UI 旅程的前置都未跑通）
- 边界场景覆盖: 2/10（Playbook 设计上覆盖了 5 个 edge，但安全/网络中断/并发等仍缺失）

## 对 Playbook 设计的质疑（Demo 之前）

### 1. ISSUE-A003~c5「安全功能」严重不可验证

- AC 范围: 修改密码、绑定/换绑手机号、绑定/换绑邮箱、登录设备管理。
- Playbook 仅在 Step 7.2 备注「详情页『编辑 Agent』入口存在」即认为覆盖。
- 质疑: 「编辑 Agent」入口与「修改账户密码」「换绑手机邮箱」「设备管理」毫无业务对应关系。这是把 Agent 编辑当成账户安全功能的错位映射，AC 完全未被触达。
- 风险: 此 AC 应被判定为 NOT VERIFIED。

### 2. ISSUE-A003~c4「隐私控制」覆盖不全

- AC 范围: 资料可见性、在线状态可见性、手机号/邮箱隐私、阻止列表管理。
- Playbook 只验证 Public/Private 两态切换（Step 2.6, 9.1, 9.2）。
- 质疑: 「在线状态可见性」「手机号/邮箱字段级隐私」「阻止列表」均无步骤覆盖。Step 9.1 描述「卡片不显示公开/私密标记」恰恰说明 UI 没有差异化呈现，无法通过截图证伪，只能靠 API 字段——而 Playbook 也没声明会调 API 校验。
- 风险: 此 AC 至少 3/4 子项未验证。

### 3. ISSUE-A003~c2「头像压缩 / 云存储」截图不可证伪

- AC 范围: 头像上传、图片压缩、裁剪、云存储集成。
- Playbook Step 2.3 只截「头像上传成功」缩略图。
- 质疑: 截图无法证明「压缩」（需对比上传前后字节数或 MIME）和「云存储」（需要 OSS/S3 URL 而非 base64/本地路径）。仅靠预览缩略图属于过度通过。
- 风险: 必须辅以网络面板截图或 API 响应中的 storage URL 才算证据。

### 4. AS-001-AC-1「读取主人画像」与新用户场景冲突

- Playbook Step 1.1 用「测试账号登录」即声称覆盖；同时 AS-001~edge 又声称用同一步覆盖「主人画像缺失」。
- 质疑: 同一个登录动作不可能同时证明「画像存在并被读取」与「画像缺失被正确处理」。两者必然其一是空跑。
- 风险: 两条 AC 都可能被弱证据通过。

### 5. ISSUE-C001~c3「状态枚举/转换/历史」仅验证初始 draft

- AC 范围: draft/active/paused/archived 四态、转换规则、状态变更 API、状态历史。
- Playbook 仅 Step 7.1 看到 DRAFT badge。
- 质疑: 三个状态、转换路径、状态变更 API、历史记录全未演示。
- 风险: 80% 子项未触达。

### 6. ISSUE-C001~c4「分页和排序」无对应步骤

- 列表里只有 1 个 Agent（Step 7.1）或 2 个（Step 8.3）— 永远触发不到分页。
- 风险: 「分页和排序」明文 AC 完全未验证。

### 7. ISSUE-C006~c3「场景模板」、~c4「能力系统」、~c5「场景切换」覆盖牵强

- ~c3「预设模板/复制/自定义/分享」：Playbook 用「预览页配置摘要体现模板效果」覆盖 — 但配置摘要 ≠ 模板系统。
- ~c4「能力启用/禁用、依赖检查、版本管理」：Playbook 用 Step 3.1「四种类型卡片」覆盖 — 卡片是类型不是能力。
- ~c5「数据迁移、转换规则、迁移预览、迁移确认」：Playbook 用 Step 8.3「继续创建」覆盖 — 这是新建不是迁移。
- 风险: 三个 capability 全部 mis-mapped，疑似为了通过故意拉来挂靠。

### 8. US-AGENT-001~edge 漏掉「网络中断」与「重复创建」

- 描述明文: 重复创建、无效输入、网络中断。
- Playbook 只覆盖无效输入。重复创建（同名/同场景）在 Step 8.2 是「注销后再建」，与「重复创建」语义不同；网络中断完全没有。
- 风险: 50% edge 子项未覆盖。

### 9. US-AGENT-017-AC-2「保留历史交易记录」零步骤

- ISSUE-C001 下挂着此 AC，Playbook 完全没有删除后查看历史记录的步骤。
- 风险: 未验证。

### 10. US-AGENT-001-AC-3「沟通风格 直接/委婉/详细/简洁」与实现枚举不匹配

- Playbook 自承: formal/friendly/humorous 映射 直接/委婉/详细/简洁。
- 质疑: 4 选项 ↔ 3 选项不是双射，至少一种风格无法选择。这是 AC 与实现的偏差，需要在 demo 中明确暴露而非掩盖。

### 11. US-AGENT-001-AC-4「生成初始画像」证据弱

- Playbook 用 Step 6.3「输入你好，1 秒后 AI 模拟回复」。
- 质疑: 「模拟回复」字面上就是 mock；不能证明读取了主人画像、不能证明本场景性格被生成。
- 风险: 该 AC 被 mock 通过。

## 对 Demo 执行的质疑

### 截止 critic 报告生成时刻的执行状态

- 工作目录: `/Users/z/projects/bridgeai/.issuetree/reports/US-AGENT-001-20260430-175437/`
- 文件清单: 仅 `api-evidence.json`（260 字节）+ 空 `screenshots/` 目录
- API 证据:
  - `GET /health`: success=true（1 条）
  - `POST /register`: REQUEST_TIMEOUT（失败）
- 截图数: 0 / 期望 ~30+
- demo-report.md: 不存在
- 自 17:58 起未再有写入，距 critic 检查时刻已过去较久且 demo 进度停滞。

### 关键质疑

#### Blocker A: 注册 API 超时

- 证据: `api-evidence.json` 中 `register: REQUEST_TIMEOUT`。
- 影响: Playbook Phase 1（Step 1.1 登录）即依赖已注册账号；如果 demo 走的是「先注册再登录」路径，则后续 14 步全部走不通。
- 质疑: 这不是「截图缺失」，而是「真实功能性 bug」— 后端注册接口 timeout 必须作为 finding 记录。
- 建议: 立即检查 `apps/server` 的 /auth/register 路由、数据库连接、bcrypt 性能；不应通过此 Story 验收。

#### Blocker B: 0 张截图 = 整个旅程未演示

- Playbook 21+ 步骤每步均含截图义务，但 screenshots/ 为空。
- 不能用「环境问题」搪塞 — health 已通过，说明服务在跑；问题集中在 register。
- 质疑: 在没有任何 UI 截图、E2E 测试结果、demo-report.md 的前提下，48 条 AC 没有一条可被认为「Demo 通过」。

#### Blocker C: E2E 未跑（visionshare.test.ts）

- 工作目录中无任何测试输出文件。
- 质疑: Playbook 声称会跑 E2E，至少应有 jest/vitest 输出 log；缺失。

## 总结：高风险 / 疑似过度通过的 AC

按风险倒序：

| AC Slug                           | 主要担忧                                                                |
| --------------------------------- | ----------------------------------------------------------------------- |
| `ISSUE-A003~c5`                   | 「编辑 Agent 入口存在」≠ 改密码/换绑/设备管理；映射错位，4/4 子项未验证 |
| `ISSUE-A003~c4`                   | 仅 Public/Private 两态；在线状态、字段级隐私、阻止列表全缺              |
| `ISSUE-C001~c3`                   | 仅 DRAFT；active/paused/archived、转换、历史全缺                        |
| `ISSUE-C001~c4`                   | 列表只有 1-2 项，分页排序无法触发                                       |
| `ISSUE-C006~c3 / ~c4 / ~c5`       | 模板/能力/场景切换被牵强映射到无关步骤                                  |
| `US-AGENT-017-AC-2`               | 保留历史交易记录无任何步骤                                              |
| `ISSUE-A003~c2`                   | 压缩与云存储仅靠缩略图截图，无字节/URL 证据                             |
| `AS-001-AC-1 / AS-001~edge`       | 同一个登录动作同时声称覆盖正常+异常路径，必然其一空跑                   |
| `US-AGENT-001-AC-3`               | 4 风格映射到 3 个枚举，非双射                                           |
| `US-AGENT-001-AC-4 / AS-001~func` | 「1 秒后模拟回复」=mock，非性格生成证据                                 |
| `US-AGENT-001~edge`               | 网络中断、重复创建未覆盖                                                |
| 全部 48 条 AC                     | 截止此刻 demo 未实际演示，无截图、无报告                                |

## 结论

**不建议 Story 验收通过**。理由：

1. **执行层**: Demo Agent 进度停滞，0 截图、无 demo-report.md、无 E2E 输出；register API 超时是硬性阻塞。
2. **设计层**: 即便 demo 全部跑通，至少 9 条 AC 的 Playbook 步骤与 AC 文本属于错位映射或子项严重缺失（ISSUE-A003~c5、ISSUE-A003~c4、ISSUE-C001~c3/c4、ISSUE-C006~c3/c4/c5、US-AGENT-017-AC-2、US-AGENT-001~edge）。
3. **证据层**: 头像「压缩/云存储」、Agent「初始画像生成」均为 mock 或缩略图，缺少 API/字节级证据。

### 必须修复后才能再验收

- [ ] 修复 `POST /api/v1/auth/register` 超时
- [ ] Demo Agent 实际产出截图（≥ 21 张，对应 21 个步骤）与 demo-report.md
- [ ] Playbook 增补：改密码/换绑/设备管理实际界面、在线状态/字段级隐私/阻止列表 UI、Agent 状态转换 4 态全部演示、列表分页测试（造数据 ≥ 11 条）、网络中断与同名重复创建 edge、历史交易记录查看
- [ ] 头像上传补充网络面板截图（含 cloud storage URL + content-length）
- [ ] AI 对话测试改为真实 LLM 调用而非 1 秒 mock；或在报告中明确标注 mock 不算 AC 通过

=== CRITIC_AGENT_COMPLETE ===
