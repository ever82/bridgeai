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

export const createClient = jest.fn(() => mockRedisClient);
