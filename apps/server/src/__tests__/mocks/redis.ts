/**
 * Redis Mock for Jest
 */
export const createClient = jest.fn(() => ({
  connect: jest.fn().mockResolvedValue(undefined),
  duplicate: jest.fn().mockReturnThis(),
  on: jest.fn(),
  quit: jest.fn().mockResolvedValue(undefined),
  isOpen: false,
}));

export type RedisClientType = ReturnType<typeof createClient>;
