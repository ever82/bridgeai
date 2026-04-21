/**
 * Schema Index
 *
 * Central export for all validation schemas
 */

// User schemas (exclude duplicates with authSchemas)
export {
  userIdSchema,
  emailSchema,
  passwordSchema,
  usernameSchema,
  displayNameSchema,
  phoneSchema,
  avatarUrlSchema,
  bioSchema,
  registerUserSchema,
  type RegisterUserInput,
  loginUserSchema,
  type LoginUserInput,
  updateUserSchema,
  type UpdateUserInput,
  setNewPasswordSchema,
  type SetNewPasswordInput,
  userIdParamsSchema,
  type UserIdParams,
  usernameParamsSchema,
  type UsernameParams,
  listUsersQuerySchema,
  type ListUsersQuery,
  searchUsersQuerySchema,
  type SearchUsersQuery,
} from './userSchemas';

// Auth schemas
export * from './authSchemas';

// Agent schemas
export * from './agentSchemas';

// Message schemas
export * from './messageSchemas';
