"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = void 0;
/**
 * Mock for redis module
 */
const mockRedisClient = {
    on: jest.fn(),
    connect: jest.fn(),
    quit: jest.fn(),
    duplicate: jest.fn(() => Promise.resolve(mockRedisClient)),
    isOpen: false,
};
exports.createClient = jest.fn(() => mockRedisClient);
//# sourceMappingURL=redis.js.map