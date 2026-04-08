# BridgeAI - UI/UX 设计文档

> ⚠️ **注意**: 本文档已重构拆分
>
> 请访问 [ui_ux/README.md](./ui_ux/README.md) 查看最新完整文档。
>
> 本文档保留作为历史备份，内容可能已过时。

---

## 📦 文档重构说明 (2026-04-08)

原 UI/UX 设计文档（1239行）已拆分为更易于维护的子文档：

```
.issuetree/spec/ui_ux/
├── 01_navigation.md      # 导航系统
├── 02_home.md            # 首页设计
├── 03_scenarios.md       # 场景选择页
├── 04_chat.md            # 四人群聊（核心交互）
├── 05_messages.md        # 消息中心
├── 06_profile.md         # 个人中心（已合并设置）
├── 07_visionshare.md     # VisionShare场景
├── 08_agentdate.md       # AgentDate场景
├── 09_agentjob.md        # AgentJob场景
├── 10_agentad.md         # AgentAd场景
├── 11_auth.md            # 注册登录
├── 12_errors.md          # 错误处理
├── 13_report_review.md   # 举报拉黑评价
├── 14_design_system.md   # 设计系统
└── README.md             # 主索引文档
```

### 主要变更

1. **导航系统优化** (01_navigation.md)
   - 底部导航从5项优化为4项
   - 新增"任务"聚合入口
   - 合并"我的"和"设置"

2. **Agent私聊建议优化** (04_chat.md)
   - 采用方案1：悬浮气泡形式
   - 💡 图标触发
   - 5秒自动收起
   - [采用] / [忽略] / [设置] 操作

3. **注册登录新增** (11_auth.md)
   - 手机号登录/注册
   - 第三方登录
   - 忘记密码
   - 实名认证流程
   - 人脸识别

4. **错误处理补充** (12_errors.md)
   - 网络错误处理
   - 表单验证错误
   - 权限错误处理
   - 操作失败处理
   - 系统错误页面

5. **举报拉黑评价新增** (13_report_review.md)
   - 举报流程
   - 黑名单管理
   - 多维度评价系统
   - 信用评分体系
   - 申诉机制

6. **设计系统完善** (14_design_system.md)
   - 深色模式配色
   - 字体行高/字重规范
   - 无障碍设计
   - 响应式断点
   - 动效规范

---

## 🔗 快速访问

| 文档 | 路径 |
|------|------|
| 主索引 | [ui_ux/README.md](./ui_ux/README.md) |
| 导航系统 | [ui_ux/01_navigation.md](./ui_ux/01_navigation.md) |
| 四人群聊 | [ui_ux/04_chat.md](./ui_ux/04_chat.md) |
| 注册登录 | [ui_ux/11_auth.md](./ui_ux/11_auth.md) |
| 错误处理 | [ui_ux/12_errors.md](./ui_ux/12_errors.md) |
| 举报评价 | [ui_ux/13_report_review.md](./ui_ux/13_report_review.md) |
| 设计系统 | [ui_ux/14_design_system.md](./ui_ux/14_design_system.md) |

---

## 📜 历史内容（已归档）

以下内容为原文档历史备份，仅供参考：

<details>
<summary>点击查看历史内容</summary>

```
[原文档内容已移动至子文档]
```

</details>

---

*文档版本: 2.0*  
*最后更新: 2026-04-08*  
*重构原因: 文档过大，拆分便于维护和协作*
