# Demo Data Reference

## Demo Accounts

All demo accounts share the password: **`Demo1234!`**

| #   | Email                      | Name  | Scene       | Purpose               |
| --- | -------------------------- | ----- | ----------- | --------------------- |
| 1   | `demo-vision@bridgeai.com` | Alice | VisionShare | 发布/浏览视野分享任务 |
| 2   | `demo-date@bridgeai.com`   | Bob   | AgentDate   | 交友匹配演示          |
| 3   | `demo-job@bridgeai.com`    | Carol | AgentJob    | 求职招聘演示          |
| 4   | `demo-ad@bridgeai.com`     | David | AgentAd     | 商家优惠演示          |
| 5   | `demo-admin@bridgeai.com`  | Eve   | Admin       | 管理后台演示          |

## Scenario Data

### VisionShare (Alice)

| Task               | Category | Location     |
| ------------------ | -------- | ------------ |
| 望京SOHO附近路况   | traffic  | 望京SOHO     |
| 三里屯现在人多吗   | crowd    | 三里屯太古里 |
| 国贸附近停车方便吗 | parking  | 国贸CBD      |

### AgentDate (Bob)

| Type   | Title                  | Tags                     |
| ------ | ---------------------- | ------------------------ |
| Demand | 找周末一起爬山的朋友   | outdoor, hiking          |
| Demand | 找电影搭子             | movie, sci-fi            |
| Supply | 周末有空，喜欢户外活动 | outdoor, hiking, cycling |

### AgentJob (Carol)

| Type   | Title              | Tags                      |
| ------ | ------------------ | ------------------------- |
| Demand | 招聘高级前端工程师 | frontend, react, senior   |
| Demand | 寻找UI/UX设计师    | design, ui, ux, figma     |
| Supply | 6年React全栈开发   | react, typescript, nodejs |
| Supply | 资深UI设计师       | figma, sketch, ui, ux     |

### AgentAd (David)

| Merchant       | Offer          | Discount |
| -------------- | -------------- | -------- |
| David's Coffee | 新用户首杯半价 | 50% off  |

## How to Seed

```bash
cd apps/server
npm run db:seed:demo
```

The seed script is idempotent -- running it multiple times will not create duplicate records.

## Data Summary

- 5 preset demo accounts
- 10 example tasks (3 VisionShare + 4 demands + 3 supplies)
- 1 merchant with 1 offer (AgentAd)
- 2 matches with a chat room and demo messages
- Credit records and transactions for each user
