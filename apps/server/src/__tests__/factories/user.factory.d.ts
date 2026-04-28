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
export declare function createUser(data?: UserFactoryData): User;
/**
 * Create multiple User objects
 */
export declare function createUsers(count: number, data?: UserFactoryData): User[];
/**
 * Create a unique user with specific overrides
 */
export declare function createUniqueUser(overrides?: Partial<UserFactoryData>): User;
/**
 * Create a user with specific status
 */
export declare function createUserWithStatus(status: UserStatus): User;
//# sourceMappingURL=user.factory.d.ts.map