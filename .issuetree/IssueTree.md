# IssueTree - BridgeAI Agent通信平台

## 项目概述

BridgeAI是一个AI Agent通信平台，核心理念是"Agent先行" - AI作为人与人之间的桥梁，先进行筛选、匹配、初步沟通，再将合适的连接引荐给真人。

**四大核心场景**：

- VisionShare: 一对多实时视野共享
- AgentDate: 一对多智能交友匹配
- AgentJob: 双向一对多智能招聘
- AgentAd: 多对多智能广告比价

---

## Issue Dependency Graph

```mermaid
flowchart TD
    subgraph Foundation["🏗️ 基础层 - Foundation"]
        F001[🟢 ISSUE-F001<br/>项目初始化与开发环境搭建]
        F002[🟢 ISSUE-F002<br/>数据库设计与Prisma ORM搭建]
        F003[🟢 ISSUE-F003<br/>Express后端基础框架]
        F004[🟢 ISSUE-F004<br/>Expo移动端项目初始化]
        F005[🟢 ISSUE-F005<br/>日志系统与结构化日志]
        F006[🟢 ISSUE-F006<br/>错误追踪与监控集成]
    end

    subgraph Infrastructure["⚙️ 基础设施层 - Infrastructure"]
        INF001[⚪ ISSUE-INF001<br/>API Gateway 设计与实现]
        INF002[⚪ ISSUE-INF002<br/>Redis 缓存层设计与实现]
        INF003[⚪ ISSUE-INF003<br/>任务队列系统设计与实现]
        INF004[⚪ ISSUE-INF004<br/>数据库迁移系统]
        INF005[⚪ ISSUE-INF005<br/>推送通知服务]
        INF006[⚪ ISSUE-INF006<br/>邮件服务系统]
    end

    subgraph Test["🧪 测试框架层 - Test"]
        T001[🟢 ISSUE-T001<br/>单元测试框架搭建]
        T002[🟢 ISSUE-T002<br/>API集成测试框架]
        T003[🟢 ISSUE-T003<br/>移动端测试框架]
        API001[🟡 ISSUE-API001<br/>API文档与OpenAPI规范]
        T004[🟢 ISSUE-T004<br/>E2E端到端测试框架<br/>⚡严格标准: flaky<2%]
    end

    subgraph Security["🔒 安全层 - Security"]
        SEC001[🟢 ISSUE-SEC001<br/>RBAC权限控制系统]
        SEC002[🟢 ISSUE-SEC002<br/>敏感数据加密与保护]
        SEC003[🟡 ISSUE-SEC003<br/>API限流与安全防护]
        SEC004[🆘 ISSUE-SEC004<br/>图片上传安全检查]
        SEC005[🆘 ISSUE-SEC005<br/>举报与内容审核系统]
    end

    subgraph Auth["🔐 认证与用户层 - Auth"]
        A001[🟢 ISSUE-A001<br/>用户注册与登录系统]
        A002[🟢 ISSUE-A002<br/>JWT认证与API安全]
        A003[🟢 ISSUE-A003<br/>用户基础资料管理]
        A004[🟢 ISSUE-A004<br/>输入验证与数据校验]
    end

    subgraph Core["🤖 Agent核心层 - Core Agent"]
        C001[🟢 ISSUE-C001<br/>Agent创建与基础配置]
        C002a[✂️ ISSUE-C002a<br/>L1基础信息模型]
        C002b[✂️ ISSUE-C002b<br/>L2结构化信息模型]
        C002c[✂️ ISSUE-C002c<br/>L3自然语言信息模型]
        C003[🟡 ISSUE-C003<br/>地域过滤系统]
        C004[🟡 ISSUE-C004<br/>属性过滤系统]
        C005[🆘 ISSUE-C005<br/>信用过滤系统]
        C006[🟡 ISSUE-C006<br/>场景配置管理]
        C007[🆘 ISSUE-C007<br/>Agent信息披露控制机制]
    end

    subgraph Matching["🎯 匹配引擎层 - Matching"]
        M001a[🆘 ISSUE-M001a<br/>查询构建器与DSL设计]
        M001b[🆘 ISSUE-M001b<br/>实时查询执行引擎]
        M002[🔵 ISSUE-M002<br/>Agent智能筛选排序]
        M003[🔵 ISSUE-M003<br/>匹配度算法实现]
        M004[🆘 ISSUE-M004<br/>匹配结果推送通知]
    end

    subgraph Comm["💬 通信层 - Communication"]
        COM001a[✂️ ISSUE-COM001a<br/>Socket.io基础设施搭建]
        COM001b[✂️ ISSUE-COM001b<br/>连接管理与房间系统]
        COM002a[🆘 ISSUE-COM002a<br/>聊天房间基础架构]
        COM002b[🆘 ISSUE-COM002b<br/>消息持久化与历史记录]
        COM002c[🆘 ISSUE-COM002c<br/>群聊状态同步与在线状态]
        COM003[🔵 ISSUE-COM003<br/>人机切换机制]
        COM004[🔵 ISSUE-COM004<br/>Agent通信协议定义]
        COM005[🔵 ISSUE-COM005<br/>私聊建议系统]
    end

    subgraph AI["🧠 AI服务层 - AI Service"]
        AI001[🟢 ISSUE-AI001<br/>多LLM适配器与熔断器]
        AI002[✂️ ISSUE-AI002<br/>需求智能提炼服务]
        AI003[✂️ ISSUE-AI003<br/>供给智能提炼服务]
        AI004[🟡 ISSUE-AI004<br/>Agent对话生成服务]
        AI005[🆘 ISSUE-AI005<br/>图像分析与Vision API]
        AI006[🆘 ISSUE-AI006<br/>AI服务降级与容错策略]
    end

    subgraph Credit["⭐ 信用与积分层 - Credit"]
        CR001[🟢 ISSUE-CR001<br/>信用分计算系统]
        CR002[✂️ ISSUE-CR002<br/>评分与评价系统]
        CR003[✂️ ISSUE-CR003<br/>积分系统基础与交易记录]
    end

    subgraph VS["📷 VisionShare场景"]
        VS001[🔵 ISSUE-VS001<br/>VisionShare需求发布]
        VS002[🆘 ISSUE-VS002<br/>附近任务查询与接单]
        VS003[🆘 ISSUE-VS003<br/>相机拍照与上传]
        VS004[🆘 ISSUE-VS004<br/>AI隐私脱敏处理]
        VS005[🆘 ISSUE-VS005<br/>照片查看与积分支付]
        VS006[🔵 ISSUE-VS006<br/>AI相册智能检索与历史查询]
        VS007[🔵 ISSUE-VS007<br/>本地相册AI智能检索]
    end

    subgraph Date["💕 AgentDate场景"]
        DATE001[🔵 ISSUE-DATE001<br/>交友画像配置]
        DATE002[🆘 ISSUE-DATE002<br/>Agent主动匹配推荐]
        DATE003[🆘 ISSUE-DATE003<br/>Agent间对话匹配]
        DATE004[🆘 ISSUE-DATE004<br/>双向同意引荐机制]
    end

    subgraph Job["💼 AgentJob场景"]
        JOB001[❌ ISSUE-JOB001<br/>求职者画像与简历]
        JOB002[🆘 ISSUE-JOB002<br/>招聘方职位发布]
        JOB003[🆘 ISSUE-JOB003<br/>简历智能匹配筛选]
        JOB004[🆘 ISSUE-JOB004<br/>薪资协商与面试安排]
    end

    subgraph Ad["🛒 AgentAd场景"]
        AD001[🔵 ISSUE-AD001<br/>消费需求画像配置]
        AD002[🆘 ISSUE-AD002<br/>商家优惠配置]
        AD003[🆘 ISSUE-AD003<br/>Agent优惠协商谈判]
        AD004[🆘 ISSUE-AD004<br/>一键购买与优惠码]
    end

    subgraph UI["📱 前端UI层 - Frontend"]
        UI001[🟢 ISSUE-UI001<br/>设计系统与组件库]
        UI002[🟡 ISSUE-UI002<br/>全局导航与布局]
        UI003[🆘 ISSUE-UI003<br/>首页与状态展示]
        UI004a[🆘 ISSUE-UI004a<br/>聊天消息组件与输入框]
        UI004b[🆘 ISSUE-UI004b<br/>Agent/人类用户状态指示器]
        UI004c[🆘 ISSUE-UI004c<br/>聊天记录滚动与分页加载]
        UI005[🆘 ISSUE-UI005<br/>Agent配置界面]
        UI006[🆘 ISSUE-UI006<br/>消息中心]
        UI007[🆘 ISSUE-UI007<br/>个人中心与信用展示]
    end

    subgraph Integrate["🚀 集成与部署"]
        INT001[🟡 ISSUE-INT001<br/>端到端集成测试]
        INT002[✂️ ISSUE-INT002<br/>性能优化与压测]
        INT003[🆘 ISSUE-INT003<br/>Demo演示准备]
    end

    %% 基础层依赖
    F001 --> F002
    F001 --> F003
    F001 --> F004
    F002 --> A001
    F003 --> A001
    F003 --> F005
    F003 --> F006
    F003 --> T002
    F004 --> T003

    %% 基础设施层依赖
    F003 --> INF001
    A002 --> INF001
    F001 --> INF002
    F002 --> INF002
    INF002 --> INF003
    F002 --> INF004
    F003 --> INF005
    A001 --> INF005
    F003 --> INF006

    %% 测试框架依赖
    F003 --> T001
    A001 --> T001
    C001 --> T001
    F003 --> API001
    A002 --> API001
    T001 --> T004
    T002 --> T004
    T003 --> T004
    UI001 --> T004
    API001 --> T004

    %% 安全层依赖
    A002 --> SEC001
    A002 --> SEC002
    F003 --> SEC003
    VS003 --> SEC004
    COM002c --> SEC005
    SEC001 --> C001
    SEC002 --> C002a
    SEC003 --> A004
    SEC005 --> CR002

    %% 认证层依赖
    A001 --> A002
    A002 --> A003
    A003 --> A004
    %% Auth子Issue依赖
    A002 --> A003a
    A003a --> A003    A003 --> C001
    A003 --> CR001
    A003 --> CR003

    %% Agent核心层依赖
    C001 --> C002a
    C002a --> C002b
    C002b --> C002c
    C002b --> C003
    C002b --> C004
    C002b --> C005
    C001 --> C006
    C002a --> C006
    C006 --> C002a
    C002c --> C007
    COM002c --> C007

    %% 匹配引擎依赖
    C002b --> M001a
    C003 --> M001a
    C004 --> M001a
    C005 --> M001a
    M001a --> M001b
    M001b --> M002
    C002c --> M002
    AI002 --> M002
    AI003 --> M002
    M002 --> M003
    M003 --> M004
    COM001b --> M004

    %% 通信层依赖
    C001 --> COM001a
    COM001a --> COM001b
    COM001b --> COM002a
    COM002a --> COM002b
    COM002b --> COM002c
    COM002c --> COM003
    COM002c --> COM004
    COM002c --> COM005
    AI004 --> COM005

    %% AI服务依赖
    F003 --> AI001
    AI001 --> AI002
    AI001 --> AI003
    AI001 --> AI004
    AI001 --> AI005
    AI001 --> AI006
    C002a --> AI002
    C002a --> AI003
    C002b --> AI002
    C002b --> AI003
    AI004 --> COM002c
    %% AI服务子Issue依赖
    AI001 --> AI002a
    AI002a --> AI002b
    AI001 --> AI003a
    AI003a --> AI003b
    AI003b --> AI003c
    AI005 --> VS004
    AI006 --> AI004

    %% 信用系统依赖
    CR001 --> CR002
    CR002 --> C005
    CR002 --> A003
    CR003 --> VS005
    %% VisionShare子Issue依赖
    VS004 --> VS005a
    VS005a --> VS005b
    VS005a --> VS005c
    CR003 --> VS005b
    VS005b --> VS005d    COM002c --> CR002
    %% 信用系统子Issue依赖
    CR001 --> CR002a
    CR002a --> CR002b
    CR002a --> CR002c
    A003 --> CR003a
    CR003a --> CR003b
    CR003b --> CR003c
    CR003c --> CR003d
    %% VisionShare场景依赖
    C006 --> VS001
    AI002 --> VS001
    C006 --> VS002
    M004 --> VS002
    VS002 --> VS003
    VS003 --> VS004
    AI005 --> VS004
    VS004 --> VS005
    VS002 --> VS006
    AI005 --> VS006
    CR003 --> VS005
    %% VisionShare子Issue依赖
    VS004 --> VS005a
    VS005a --> VS005b
    VS005a --> VS005c
    CR003 --> VS005b
    VS005b --> VS005d    SEC004 --> VS003
    VS006 --> VS007
    AI005 --> VS007

    %% AgentDate场景依赖
    C006 --> DATE001
    AI002 --> DATE001
    M004 --> DATE002
    DATE001 --> DATE002
    COM002c --> DATE003
    DATE003 --> DATE004

    %% AgentJob场景依赖
    C006 --> JOB001
    AI002 --> JOB001
    C006 --> JOB002
    %% AgentJob子Issue依赖
    JOB001 --> JOB003a
    JOB002 --> JOB003a
    JOB003a --> JOB003b
    JOB003a --> JOB003c
    JOB003b --> JOB003d
    M004 --> JOB003d    AI003 --> JOB002
    M004 --> JOB003
    JOB001 --> JOB003
    JOB002 --> JOB003
    AI004 --> JOB003
    COM002c --> JOB004

    %% AgentAd场景依赖
    C006 --> AD001
    AI002 --> AD001
    C006 --> AD002
    AI003 --> AD002
    COM002c --> AD003
    AI002 --> AD003
    AI003 --> AD003
    AI004 --> AD003
    AD003 --> AD004

    %% UI层依赖
    UI001 --> UI002
    UI002 --> UI003
    UI002 --> UI004a
    UI002 --> UI004b
    UI002 --> UI004c
    UI004a --> UI004b
    UI004b --> UI004c
    COM003 --> UI004a
    COM005 --> UI004a
    UI002 --> UI005
    UI002 --> UI006
    UI002 --> UI007
    C001 --> UI005
    C006 --> UI005
    COM002c --> UI006
    CR001 --> UI007
    A003 --> UI007

    %% 场景到UI
    VS001 --> UI003
    DATE002 --> UI003
    COM002c --> UI004a
    VS001 --> UI006
    DATE001 --> UI006
    JOB001 --> UI006
    AD001 --> UI006

    %% 集成
    VS001 --> INT001
    VS002 --> INT001
    DATE001 --> INT001
    DATE003 --> INT001
    JOB001 --> INT001
    JOB004 --> INT001
    AD001 --> INT001
    AD004 --> INT001
    UI004c --> INT001
    UI007 --> INT001
    T001 --> INT001
    T002 --> INT001
    T003 --> INT001
    T004 --> INT001
    F005 --> INT001
    F006 --> INT001
    INT001 --> INT002
    INT002 --> INT003
    %% 集成测试子Issue依赖
    INT001 --> INT001a
    INT001 --> INT001b
    INT001 --> INT001c
    INT001 --> INT002a
    INT002a --> INT002b
    INT002b --> INT002c```

---

## Issue模块分组说明

### 🏗️ Foundation (基础层)

| Issue      | 标题                       | 复杂度 | 关键依赖 |
| ---------- | -------------------------- | ------ | -------- |
| ISSUE-F001 | 项目初始化与开发环境搭建   | **L**  | 无       |
| ISSUE-F002 | 数据库设计与Prisma ORM搭建 | L      | F001     |
| ISSUE-F003 | Express后端基础框架        | L      | F001     |
| ISSUE-F004 | Expo移动端项目初始化       | L      | F001     |
| ISSUE-F005 | 日志系统与结构化日志       | M      | F003     |
| ISSUE-F006 | 错误追踪与监控集成         | M      | F003     |

### ⚙️ Infrastructure (基础设施层)

| Issue        | 标题                       | 复杂度 | 关键依赖       |
| ------------ | -------------------------- | ------ | -------------- |
| ISSUE-INF001 | API Gateway 设计与实现     | **H**  | F003, A002     |
| ISSUE-INF002 | Redis 缓存层设计与实现     | M      | F001, F002     |
| ISSUE-INF003 | 任务队列系统设计与实现     | H      | F001, F002, INF002 |
| ISSUE-INF004 | 数据库迁移系统             | M      | F002           |
| ISSUE-INF005 | 推送通知服务               | H      | F003, A001     |
| ISSUE-INF006 | 邮件服务系统               | M      | F003           |

### 🧪 Test (测试框架层)

| Issue      | 标题                         | 复杂度 | 关键依赖                        |
| ---------- | ---------------------------- | ------ | ------------------------------- |
| ISSUE-T001 | 单元测试框架搭建(Jest)       | M      | F003, A001                      |
| ISSUE-T002 | API集成测试框架              | M      | F003                            |
| ISSUE-T003 | 移动端测试框架               | M      | F004                            |
| ISSUE-API001 | API文档与OpenAPI规范       | M      | F003, A002                      |
| ISSUE-T004 | E2E端到端测试框架 [严格标准] | H      | T001, T002, T003, UI001, API001 |

### 🔒 Security (安全层)

| Issue        | 标题               | 复杂度 | 关键依赖       |
| ------------ | ------------------ | ------ | -------------- |
| ISSUE-SEC001 | RBAC权限控制系统   | M      | A002           |
| ISSUE-SEC002 | 敏感数据加密与保护 | M      | A002, C002a    |
| ISSUE-SEC003 | API限流与安全防护  | M      | F003           |
| ISSUE-SEC004 | 图片上传安全检查   | M      | VS003          |
| ISSUE-SEC005 | 举报与内容审核系统 | M      | COM002c, CR002 |

### 🔐 Auth (认证层)

| Issue       | 标题                  | 复杂度 | 关键依赖   |
| ----------- | --------------------- | ------ | ---------- |
| ISSUE-A001  | 用户注册与登录系统    | M      | F002, F003 |
| ISSUE-A002  | JWT认证与API安全      | M      | A001       |
| ISSUE-A003  | 用户基础资料管理      | **L**  | A002       |
| ISSUE-A003a | 用户资料管理后端API   | L      | A002       |
| ISSUE-A004  | 输入验证与数据校验    | M      | A002       |

### 🤖 Core Agent (Agent核心层)

| Issue       | 标题                  | 复杂度 | 关键依赖       |
| ----------- | --------------------- | ------ | -------------- |
| ISSUE-C001  | Agent创建与基础配置   | M      | A003           |
| ISSUE-C002a | L1基础信息模型        | M      | C001           |
| ISSUE-C002b | L2结构化信息模型      | M      | C002a          |
| ISSUE-C002c | L3自然语言信息模型    | M      | C002b          |
| ISSUE-C003  | 地域过滤系统          | M      | C002b          |
| ISSUE-C004  | 属性过滤系统          | H      | C002b          |
| ISSUE-C005  | 信用过滤系统          | M      | C002b, CR001   |
| ISSUE-C006  | 场景配置管理          | **L**  | C001, C002a    |
| ISSUE-C007  | Agent信息披露控制机制 | M      | C002c, COM002c |

### 🎯 Matching (匹配引擎层)

| Issue       | 标题                | 复杂度 | 关键依赖                   |
| ----------- | ------------------- | ------ | -------------------------- |
| ISSUE-M001a | 查询构建器与DSL设计 | M      | C002b, C003, C004, C005    |
| ISSUE-M001b | 实时查询执行引擎    | M      | M001a                      |
| ISSUE-M002  | Agent智能筛选排序   | M      | M001b, AI002, AI003, AI004 |
| ISSUE-M003  | 匹配度算法实现      | **H**  | M002                       |
| ISSUE-M004  | 匹配结果推送通知    | M      | M003, COM001b              |

### 💬 Communication (通信层)

| Issue         | 标题                                        | 复杂度 | 关键依赖       |
| ------------- | ------------------------------------------- | ------ | -------------- |
| ISSUE-COM001a | Socket.io基础设施搭建                       | M      | C001           |
| ISSUE-COM001b | 连接管理与房间系统                          | M      | COM001a        |
| ISSUE-COM002a | 聊天房间基础架构                            | M      | COM001b        |
| ISSUE-COM002b | 消息持久化与历史记录                        | M      | COM002a        |
| ISSUE-COM002c | 群聊状态同步与在线状态                      | M      | COM002b        |
| ISSUE-COM003  | 人机切换机制                                | M      | COM002c        |
| ISSUE-COM004  | Agent通信协议定义(消息格式/身份切换/信用分) | M      | COM002c        |
| ISSUE-COM005  | 私聊建议系统                                | M      | COM002c, AI004 |

### 🧠 AI Service (AI服务层)

| Issue        | 标题                      | 复杂度 | 关键依赖            |
| ------------ | ------------------------- | ------ | ------------------- |
| ISSUE-AI001  | 多LLM适配器与熔断器       | H      | F003                |
| ISSUE-AI002  | 需求智能提炼服务          | H      | AI001, C002a, C002b |
| ISSUE-AI002a | 需求提炼 - 核心框架       | H      | AI001, C002a, C002b |
| ISSUE-AI002b | 需求提炼 - 场景提取器     | M      | AI002a              |
| ISSUE-AI003  | 供给智能提炼服务          | H      | AI001, C002a, C002b |
| ISSUE-AI003a | 供给提炼 - 核心框架       | H      | AI001, C002a, C002b |
| ISSUE-AI003b | 供给提炼 - 场景提取器     | M      | AI003a              |
| ISSUE-AI003c | 供给提炼 - 优化与缓存     | M      | AI003b              |
| ISSUE-AI004  | Agent对话生成服务         | H      | AI001               |
| ISSUE-AI005  | 图像分析与Vision API      | M      | AI001               |
| ISSUE-AI006  | AI服务降级与容错策略      | M      | AI001, AI004        |

### ⭐ Credit (信用与积分层)

| Issue        | 标题                     | 复杂度 | 关键依赖             |
| ------------ | ------------------------ | ------ | -------------------- |
| ISSUE-CR001  | 信用分计算系统           | **H**  | A003                 |
| ISSUE-CR002  | 评分与评价系统           | L      | CR001, COM002c, A003 |
| ISSUE-CR002a | 评分评价 - 后端API       | M      | CR001, COM002c       |
| ISSUE-CR002b | 评分评价 - 前端组件      | M      | CR002a               |
| ISSUE-CR002c | 评分评价 - 审核与反作弊  | M      | CR002a               |
| ISSUE-CR003  | 积分系统基础与交易记录   | M      | A003                 |
| ISSUE-CR003a | 积分系统 - 核心交易      | M      | A003                 |
| ISSUE-CR003b | 积分系统 - 支付集成      | M      | CR003a               |
| ISSUE-CR003c | 积分系统 - 退款与申诉    | M      | CR003b               |
| ISSUE-CR003d | 积分系统 - 统计与报表    | L      | CR003c               |

### 📷 VisionShare场景

| Issue        | 标题                       | 复杂度 | 关键依赖            |
| ------------ | -------------------------- | ------ | ------------------- |
| ISSUE-VS001  | VisionShare需求发布        | M      | C006, AI002         |
| ISSUE-VS002  | 附近任务查询与接单         | M      | C006, M004          |
| ISSUE-VS003  | 相机拍照与上传             | M      | VS002, F004, SEC004 |
| ISSUE-VS004  | AI隐私脱敏处理             | H      | VS003, AI005        |
| ISSUE-VS005  | 照片查看与积分支付         | M      | VS004, CR003        |
| ISSUE-VS005a | 照片查看 - 核心API         | M      | VS004                |
| ISSUE-VS005b | 照片查看 - 支付流程        | M      | VS005a, CR003       |
| ISSUE-VS005c | 照片查看 - 预览组件        | M      | VS005a               |
| ISSUE-VS005d | 照片查看 - 历史记录        | L      | VS005b               |
| ISSUE-VS006  | AI相册智能检索与历史查询   | **M**  | VS002, AI005        |
| ISSUE-VS007  | 本地相册AI智能检索         | M      | VS006, AI005        |

### 💕 AgentDate场景

| Issue         | 标题              | 复杂度 | 关键依赖            |
| ------------- | ----------------- | ------ | ------------------- |
| ISSUE-DATE001 | 交友画像配置      | M      | C006, AI002         |
| ISSUE-DATE002 | Agent主动匹配推荐 | M      | C006, M004, DATE001 |
| ISSUE-DATE003 | Agent间对话匹配   | H      | COM002c             |
| ISSUE-DATE004 | 双向同意引荐机制  | M      | DATE003             |

### 💼 AgentJob场景

| Issue         | 标题                 | 复杂度 | 关键依赖                    |
| ------------- | -------------------- | ------ | --------------------------- |
| ISSUE-JOB001  | 求职者画像与简历     | M      | C006, AI002                 |
| ISSUE-JOB002  | 招聘方职位发布       | M      | C006, AI003                 |
| ISSUE-JOB003  | 简历智能匹配筛选     | H      | JOB001, JOB002, M004, AI004 |
| ISSUE-JOB003a | 简历匹配 - 算法核心  | H      | JOB001, JOB002              |
| ISSUE-JOB003b | 简历匹配 - 排序优化  | H      | JOB003a                     |
| ISSUE-JOB003c | 简历匹配 - 筛选界面  | M      | JOB003a, UI005              |
| ISSUE-JOB003d | 简历匹配 - 结果通知  | M      | JOB003b, M004               |
| ISSUE-JOB004  | 薪资协商与面试安排   | M      | COM002c                     |
### 🛒 AgentAd场景

| Issue       | 标题              | 复杂度 | 关键依赖                     |
| ----------- | ----------------- | ------ | ---------------------------- |
| ISSUE-AD001 | 消费需求画像配置  | M      | C006, AI002                  |
| ISSUE-AD002 | 商家优惠配置      | M      | C006, AI003                  |
| ISSUE-AD003 | Agent优惠协商谈判 | H      | COM002c, AI002, AI003, AI004 |
| ISSUE-AD004 | 一键购买与优惠码  | M      | AD003                        |

### 📱 Frontend (前端UI层)

| Issue        | 标题                     | 复杂度 | 关键依赖                       |
| ------------ | ------------------------ | ------ | ------------------------------ |
| ISSUE-UI001  | 设计系统与组件库         | M      | F004                           |
| ISSUE-UI002  | 全局导航与布局           | M      | UI001                          |
| ISSUE-UI003  | 首页与状态展示           | M      | UI002, C001, M004              |
| ISSUE-UI004a | 聊天消息组件与输入框     | M      | UI002, COM002c, COM003, COM005 |
| ISSUE-UI004b | Agent/人类用户状态指示器 | S      | UI002, UI004a                  |
| ISSUE-UI004c | 聊天记录滚动与分页加载   | M      | UI002, UI004b                  |
| ISSUE-UI005  | Agent配置界面            | M      | UI002, C001, C006              |
| ISSUE-UI006  | 消息中心                 | M      | UI002, COM002c                 |
### 🚀 Integration (集成与部署)

| Issue         | 标题                     | 复杂度 | 关键依赖                                 |
| ------------- | ------------------------ | ------ | ---------------------------------------- |
| ISSUE-INT001  | 端到端集成测试           | M      | 所有场景Issue, UI, T001-T004, F005, F006 |
| ISSUE-INT001a | 集成测试 - VisionShare   | M      | VS001, VS002, UI004a                    |
| ISSUE-INT001b | 集成测试 - AgentDate     | M      | DATE001, DATE003, UI004a                |
| ISSUE-INT001c | 集成测试 - AgentJob/Ad   | M      | JOB001, JOB004, AD001, AD004            |
| ISSUE-INT002  | 性能优化与压测           | H      | INT001                                   |
| ISSUE-INT002a | 性能优化 - 数据库优化    | H      | INT001                                   |
| ISSUE-INT002b | 性能优化 - 缓存策略      | H      | INT002a                                  |
| ISSUE-INT002c | 性能优化 - 压测与调优    | H      | INT002b                                  |
| ISSUE-INT003  | Demo演示准备             | M      | INT002                                   |

---

## 开发阶段规划

### 第一阶段：基础架构 (Foundation + Auth + Test + Security)

**目标**: 搭建项目基础，用户可注册登录，测试框架就绪

- ISSUE-F001 ~ F006
- ISSUE-A001 ~ A004
- ISSUE-T001 ~ T003
- ISSUE-SEC001 ~ SEC003

### 第二阶段：核心能力 (Core + Matching + Comm)

**目标**: Agent可创建，基础匹配和通信可用

- ISSUE-C001 ~ C002c, C003 ~ C006
- ISSUE-M001a ~ M001b, M002 ~ M004
- ISSUE-COM001a ~ COM002c, COM003 ~ COM005

### 第三阶段：AI与支撑 (AI + Credit)

**目标**: AI服务可用，信用积分系统就绪

- ISSUE-AI001 ~ AI006
- ISSUE-CR001 ~ CR003

### 第四阶段：场景实现 (Scenes + Security)

**目标**: 四大场景核心流程跑通，安全加固完成

- VisionShare: ISSUE-VS001 ~ VS007
- AgentDate: ISSUE-DATE001 ~ DATE004
- AgentJob: ISSUE-JOB001 ~ JOB004
- AgentAd: ISSUE-AD001 ~ AD004
- ISSUE-SEC004 (图片安全检查)
- ISSUE-SEC005 (举报与内容审核系统)
- ISSUE-C007 (信息披露控制机制)

### 第五阶段：前端与集成 (UI + Integration)

**目标**: 完整UI界面，系统可演示

- ISSUE-UI001 ~ UI007
- ISSUE-UI004a ~ UI004c
- ISSUE-INT001 ~ INT003

---

## 关键路径说明

```
关键开发路径 (Critical Path):

F001 → F002 → A001 → A002 → A003 → C001 → C002a → C002b → M001a → M001b → M002 → M003 → M004
  ↓      ↓                                            ↓
F003 → F004 → UI001 → UI002 → UI003/UI004a/UI004b/UI004c/UI005/UI006/UI007

并行路径:
- 测试框架: F003 → T001/T002, F004 → T003 (可与开发并行)
- 安全基础: A002 → SEC001/SEC002/SEC003 (可与Core并行)
- AI服务: AI001 → AI002/AI003/AI004/AI005/AI006 (可与Core并行)
- 信用系统: A003 → CR001 → CR002/CR003 (可与Core并行)
- 场景开发: 依赖C006和M004后可并行开发四个场景
- 日志监控: F003 → F005/F006 (基础设施)
```

---

## 状态图例

| Status        | Symbol | Meaning                                         |
| ------------- | ------ | ----------------------------------------------- |
| `draft`       | ⚪     | Draft - newly created, awaiting quality review  |
| `blocked`     | 🔴     | Waiting for prerequisite issues                 |
| `pending`     | 🟡     | Ready to start (all dependencies passed)        |
| `in_progress` | 🔵     | Currently being developed                       |
| `implemented` | 💻     | Development complete, awaiting acceptance check |
| `passed`      | 🟢     | Acceptance check passed - fully complete        |
| `failed`      | ❌     | Acceptance check failed - needs fixes           |
| `research`    | 🔍     | Investigating failure root cause                |
| `split`       | ✂️     | Decomposed into sub-issues                      |

---

_IssueTree 版本: 2.2_
_最后更新: 2026-04-12_
_基于Spec: BridgeAI Agent通信平台完整设计文档_
_更新内容: 新增基础设施层(Infrastructure)模块，包含6个Issue: INF001-API Gateway, INF002-Redis缓存, INF003-任务队列, INF004-数据库迁移, INF005-推送通知, INF006-邮件服务_
