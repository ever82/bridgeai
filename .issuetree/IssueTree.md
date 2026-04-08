# IssueTree - 共享视野 App (黑客松 Demo)

## Issue Dependency Graph

```mermaid
flowchart TD
    subgraph Design["📋 项目设计"]
        INIT1[✅ ISSUE-DESIGN-1<br/>项目初始化 - 创建 Specs]
        INIT2[⏳ ISSUE-DESIGN-2<br/>生成并完善 IssueTree]
        INIT3[⏳ ISSUE-DESIGN-3<br/>生成 Issues]
        INIT4[🔵 ISSUE-DESIGN-4<br/>补充完善 Issues]
    end

    INIT1 --> INIT2
    INIT2 --> INIT3
    INIT3 --> INIT4

    subgraph Features["✨ Features"]
        FEAT1[🔴 ISSUE-FEAT-1<br/>AI 需求解析与任务分发]
        FEAT2[🔴 ISSUE-FEAT-2<br/>积分/现金经济系统]
        FEAT3[🔴 ISSUE-FEAT-3<br/>实时拍照与上传]
        FEAT4[🔴 ISSUE-FEAT-4<br/>历史照片搜索]
        FEAT5[🔴 ISSUE-FEAT-5<br/>AI 虚假照片裁决]
        FEAT6[🔴 ISSUE-FEAT-6<br/>信用体系与举报]
    end

    subgraph Components["🧩 Components"]
        COMP1[🔴 ISSUE-COMP-1<br/>用户端 App (查看/下单)]
        COMP2[🔴 ISSUE-COMP-2<br/>接单端 App (拍照/接单)]
        COMP3[🔴 ISSUE-COMP-3<br/>后端 API 服务]
        COMP4[🔴 ISSUE-COMP-4<br/>AI 服务 (解析/裁决)]
    end

    INIT4 --> FEAT1
    INIT4 --> FEAT2
    INIT4 --> FEAT3
    INIT4 --> FEAT4
    INIT4 --> FEAT5
    INIT4 --> FEAT6
    FEAT1 --> COMP1
    FEAT1 --> COMP2
    FEAT1 --> COMP3
    FEAT1 --> COMP4
    FEAT2 --> COMP1
    FEAT2 --> COMP3
    FEAT3 --> COMP1
    FEAT3 --> COMP2
    FEAT3 --> COMP3
    FEAT4 --> COMP1
    FEAT4 --> COMP3
    FEAT5 --> COMP4
    FEAT6 --> COMP1
    FEAT6 --> COMP3
```
