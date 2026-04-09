import { faker } from '@faker-js/faker';
import type { User, UserStatus } from '@prisma/client';

/**
 * Factory for creating User test data
 */
export interface UserFactoryData {
  id?: string;
  email?: string;
  passwordHash?: string;
  name?: string;
  avatarUrl?: string | null;
  phone?: string | null;
  status?: UserStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Create a mock User object
 */
export function createUser(data: UserFactoryData = {}): User {
  const now = new Date();

  return {
    id: data.id ?? faker.string.uuid(),
    email: data.email ?? faker.internet.email(),
    passwordHash: data.passwordHash ?? faker.string.alphanumeric(60),
    name: data.name ?? faker.person.fullName(),
    avatarUrl: data.avatarUrl ?? faker.image.avatar(),
    phone: data.phone ?? faker.phone.number(),
    status: data.status ?? 'ACTIVE',
    createdAt: data.createdAt ?? now,
    updatedAt: data.updatedAt ?? now,
  };
}

/**
 * Create multiple User objects
 */
export function createUsers(count: number, data: UserFactoryData = {}): User[] {
  return Array.from({ length: count }, () => createUser(data));
}

/**
 * Create a unique user with specific overrides
 */
export function createUniqueUser(overrides: Partial<UserFactoryData> = {}): User {
  return createUser({
    email: faker.internet.email({ provider: 'test.visionshare.local' }),
    ...overrides,
  });
}

/**
 * Create a user with specific status
 */
export function createUserWithStatus(status: UserStatus): User {
  return createUser({ status });
}
