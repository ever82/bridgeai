/**
 * User Schemas
 *
 * Zod schemas for user-related request validation
 */
import { z } from 'zod';
/**
 * User ID validator - UUID v4 format
 */
export declare const userIdSchema: z.ZodString;
/**
 * Email validator with strict validation
 */
export declare const emailSchema: z.ZodString;
/**
 * Password validator with security requirements
 */
export declare const passwordSchema: z.ZodString;
/**
 * Username validator
 */
export declare const usernameSchema: z.ZodString;
/**
 * Display name validator
 */
export declare const displayNameSchema: z.ZodString;
/**
 * Phone number validator (international format)
 */
export declare const phoneSchema: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
/**
 * Avatar URL validator
 */
export declare const avatarUrlSchema: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
/**
 * Bio validator
 */
export declare const bioSchema: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
/**
 * User registration request
 */
export declare const registerUserSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    username: z.ZodString;
    displayName: z.ZodOptional<z.ZodString>;
    phone: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    avatarUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    bio: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    username: string;
    displayName?: string | undefined;
    phone?: string | undefined;
    bio?: string | undefined;
    avatarUrl?: string | undefined;
}, {
    email: string;
    password: string;
    username: string;
    displayName?: string | undefined;
    phone?: string | undefined;
    bio?: string | undefined;
    avatarUrl?: string | undefined;
}>;
export type RegisterUserInput = z.infer<typeof registerUserSchema>;
/**
 * User login request
 */
export declare const loginUserSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    rememberMe: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    rememberMe: boolean;
}, {
    email: string;
    password: string;
    rememberMe?: boolean | undefined;
}>;
export type LoginUserInput = z.infer<typeof loginUserSchema>;
/**
 * Update user profile request
 */
export declare const updateUserSchema: z.ZodObject<{
    displayName: z.ZodOptional<z.ZodString>;
    phone: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    avatarUrl: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    bio: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, "strip", z.ZodTypeAny, {
    displayName?: string | undefined;
    phone?: string | undefined;
    bio?: string | undefined;
    avatarUrl?: string | undefined;
}, {
    displayName?: string | undefined;
    phone?: string | undefined;
    bio?: string | undefined;
    avatarUrl?: string | undefined;
}>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
/**
 * Change password request
 */
export declare const changePasswordSchema: z.ZodEffects<z.ZodObject<{
    currentPassword: z.ZodString;
    newPassword: z.ZodString;
    confirmPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}, {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}>, {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}, {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
/**
 * Reset password request
 */
export declare const resetPasswordSchema: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
/**
 * Set new password after reset
 */
export declare const setNewPasswordSchema: z.ZodEffects<z.ZodObject<{
    token: z.ZodString;
    newPassword: z.ZodString;
    confirmPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
    newPassword: string;
    confirmPassword: string;
}, {
    token: string;
    newPassword: string;
    confirmPassword: string;
}>, {
    token: string;
    newPassword: string;
    confirmPassword: string;
}, {
    token: string;
    newPassword: string;
    confirmPassword: string;
}>;
export type SetNewPasswordInput = z.infer<typeof setNewPasswordSchema>;
/**
 * User ID param for routes like /users/:userId
 */
export declare const userIdParamsSchema: z.ZodObject<{
    userId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    userId: string;
}, {
    userId: string;
}>;
export type UserIdParams = z.infer<typeof userIdParamsSchema>;
/**
 * Username param for routes like /users/:username
 */
export declare const usernameParamsSchema: z.ZodObject<{
    username: z.ZodString;
}, "strip", z.ZodTypeAny, {
    username: string;
}, {
    username: string;
}>;
export type UsernameParams = z.infer<typeof usernameParamsSchema>;
/**
 * User list query parameters
 */
export declare const listUsersQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    search: z.ZodOptional<z.ZodString>;
    sortBy: z.ZodDefault<z.ZodEnum<["createdAt", "username", "displayName"]>>;
    sortOrder: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
    role: z.ZodOptional<z.ZodEnum<["user", "admin", "moderator"]>>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    sortOrder: "desc" | "asc";
    sortBy: "createdAt" | "displayName" | "username";
    search?: string | undefined;
    role?: "user" | "admin" | "moderator" | undefined;
    isActive?: boolean | undefined;
}, {
    search?: string | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    role?: "user" | "admin" | "moderator" | undefined;
    sortOrder?: "desc" | "asc" | undefined;
    isActive?: boolean | undefined;
    sortBy?: "createdAt" | "displayName" | "username" | undefined;
}>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
/**
 * Search users query
 */
export declare const searchUsersQuerySchema: z.ZodObject<{
    q: z.ZodString;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    q: string;
    page: number;
    limit: number;
}, {
    q: string;
    page?: number | undefined;
    limit?: number | undefined;
}>;
export type SearchUsersQuery = z.infer<typeof searchUsersQuerySchema>;
//# sourceMappingURL=userSchemas.d.ts.map