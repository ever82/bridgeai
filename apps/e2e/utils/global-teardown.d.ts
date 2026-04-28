import { FullConfig } from '@playwright/test';
/**
 * 全局清理 - 在所有测试之后运行
 */
declare function globalTeardown(_config: FullConfig): Promise<void>;
export default globalTeardown;
//# sourceMappingURL=global-teardown.d.ts.map