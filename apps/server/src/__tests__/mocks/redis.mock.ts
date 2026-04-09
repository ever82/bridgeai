/**
 * Redis client mock for caching tests
 */
export const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
  incr: jest.fn(),
  decr: jest.fn(),
  hget: jest.fn(),
  hset: jest.fn(),
  hdel: jest.fn(),
  hgetall: jest.fn(),
  lpush: jest.fn(),
  rpush: jest.fn(),
  lpop: jest.fn(),
  rpop: jest.fn(),
  lrange: jest.fn(),
  flushall: jest.fn(),
  quit: jest.fn(),
};

/**
 * Reset all Redis mocks
 */
export function resetRedisMocks(): void {
  Object.values(mockRedis).forEach((mock) => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
}

/**
 * Mock a cached value response
 */
export function mockCachedValue<T>(key: string, value: T): void {
  mockRedis.get.mockImplementation((k: string) => {
    if (k === key) return Promise.resolve(JSON.stringify(value));
    return Promise.resolve(null);
  });
}
