/**
 * Queue Infrastructure Tests
 *
 * Tests the Queue infrastructure with focus on:
 * - Pure functions (config, retry backoff logic)
 * - Worker limiter config (NP-822/NP-1400: rate limits applied)
 * - Monitoring paused await fix (NP-823: worker.isPaused() is async)
 * - HandleFailedJob wiring (NP-1401: DLQ routing on retry exhaustion)
 * - No duplicate retry (NP-824/NP-1402: BullMQ handles retries)
 */
export {};
//# sourceMappingURL=queue.test.d.ts.map