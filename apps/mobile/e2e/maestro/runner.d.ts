#!/usr/bin/env ts-node
/**
 * Maestro E2E Test Runner - 统一入口
 * 支持自动环境检查、模拟器管理、应用构建、测试执行和报告生成
 *
 * 用法:
 *   npx ts-node e2e/maestro/runner.ts [options]
 *
 * 选项:
 *   --layer 0|1|2              测试层级 (默认: 2)
 *                              0 = 健康检查 (5s), 1 = Playwright (未来), 2 = Maestro (默认)
 *   --platform ios|android     目标平台 (默认: ios)
 *   --flow <name>              运行指定 flow (默认: 运行所有)
 *   --issue <ISSUE-XXX>        运行关联到指定 issue 的 flows
 *   --dev                      开发模式: 假设应用已运行，只执行 Maestro 测试
 *   --build                    构建模式: 自动构建并安装应用后运行测试
 *   --install                  只安装 Maestro CLI
 *   --screenshot-on-failure    失败时自动截图
 *   --timeout <ms>             全局超时 (默认: 120000)
 *
 * 示例:
 *   npm run e2e:l0              # 环境健康检查 (5秒)
 *   npm run e2e:l2              # 运行所有 Maestro flow
 *   npm run e2e:l2:dev          # dev 模式 (app 已运行)
 *   npm run e2e:debug           # 失败自动截图
 *   npx ts-node e2e/maestro/runner.ts --layer 2 --issue ISSUE-AUTH-001 --build
 */
export {};
//# sourceMappingURL=runner.d.ts.map