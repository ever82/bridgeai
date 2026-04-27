// Test teardown file - runs after all tests complete
import { destroyFilterCache } from '../utils/filterCache';

export default async function teardown(): Promise<void> {
  // Clean up global filter cache timer
  destroyFilterCache();
}
