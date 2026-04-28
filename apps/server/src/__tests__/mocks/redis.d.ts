/**
 * Redis Mock for Jest
 */
export declare const createClient: jest.Mock<{
    connect: jest.Mock<any, any, any>;
    duplicate: jest.Mock<any, any, any>;
    on: jest.Mock<any, any, any>;
    quit: jest.Mock<any, any, any>;
    isOpen: boolean;
}, [], any>;
export type RedisClientType = ReturnType<typeof createClient>;
//# sourceMappingURL=redis.d.ts.map