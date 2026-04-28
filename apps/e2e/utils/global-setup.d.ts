import { FullConfig } from '@playwright/test';
/**
 * 全局设置 - 在所有测试之前运行
 */
declare function globalSetup(config: FullConfig): Promise<void>;
export default globalSetup;
//# sourceMappingURL=global-setup.d.ts.map