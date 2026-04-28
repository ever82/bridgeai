/**
 * Redis client mock for caching tests
 */
export declare const mockRedis: {
    get: jest.Mock<any, any, any>;
    set: jest.Mock<any, any, any>;
    setex: jest.Mock<any, any, any>;
    del: jest.Mock<any, any, any>;
    keys: jest.Mock<any, any, any>;
    exists: jest.Mock<any, any, any>;
    expire: jest.Mock<any, any, any>;
    ttl: jest.Mock<any, any, any>;
    incr: jest.Mock<any, any, any>;
    decr: jest.Mock<any, any, any>;
    hget: jest.Mock<any, any, any>;
    hset: jest.Mock<any, any, any>;
    hdel: jest.Mock<any, any, any>;
    hgetall: jest.Mock<any, any, any>;
    lpush: jest.Mock<any, any, any>;
    rpush: jest.Mock<any, any, any>;
    lpop: jest.Mock<any, any, any>;
    rpop: jest.Mock<any, any, any>;
    lrange: jest.Mock<any, any, any>;
    flushall: jest.Mock<any, any, any>;
    quit: jest.Mock<any, any, any>;
};
/**
 * Reset all Redis mocks
 */
export declare function resetRedisMocks(): void;
/**
 * Mock a cached value response
 */
export declare function mockCachedValue<T>(key: string, value: T): void;
//# sourceMappingURL=redis.mock.d.ts.map