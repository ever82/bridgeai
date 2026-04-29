/**
 * Auth Schemas
 *
 * Zod schemas for auth-related request validation
 */
import { z } from 'zod';
/**
 * OAuth provider validator
 */
export declare const oauthProviderSchema: z.ZodEnum<["wechat", "google"]>;
/**
 * User registration request - accepts email OR phone (not both required)
 */
export declare const registerSchema: z.ZodEffects<z.ZodObject<{
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    password: z.ZodString;
    name: z.ZodString;
    verificationCode: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
    verificationCode?: string;
}, {
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
    verificationCode?: string;
}>, {
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
    verificationCode?: string;
}, {
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
    verificationCode?: string;
}>;
export type RegisterInput = z.infer<typeof registerSchema>;
/**
 * User login request - accepts email OR phone
 */
export declare const loginSchema: z.ZodEffects<z.ZodObject<{
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    password: z.ZodString;
    verificationCode: z.ZodOptional<z.ZodString>;
    rememberMe: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    email?: string;
    phone?: string;
    password?: string;
    rememberMe?: boolean;
    verificationCode?: string;
}, {
    email?: string;
    phone?: string;
    password?: string;
    rememberMe?: boolean;
    verificationCode?: string;
}>, {
    email?: string;
    phone?: string;
    password?: string;
    rememberMe?: boolean;
    verificationCode?: string;
}, {
    email?: string;
    phone?: string;
    password?: string;
    rememberMe?: boolean;
    verificationCode?: string;
}>;
export type LoginInput = z.infer<typeof loginSchema>;
/**
 * Refresh token request
 */
export declare const refreshTokenSchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    refreshToken?: string;
}, {
    refreshToken?: string;
}>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
/**
 * Forgot password request
 */
export declare const forgotPasswordSchema: z.ZodEffects<z.ZodObject<{
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email?: string;
    phone?: string;
}, {
    email?: string;
    phone?: string;
}>, {
    email?: string;
    phone?: string;
}, {
    email?: string;
    phone?: string;
}>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
/**
 * Reset password request
 */
export declare const resetPasswordSchema: z.ZodObject<{
    resetToken: z.ZodString;
    newPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    newPassword?: string;
    resetToken?: string;
}, {
    newPassword?: string;
    resetToken?: string;
}>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
/**
 * Change password request
 */
export declare const changePasswordSchema: z.ZodObject<{
    oldPassword: z.ZodString;
    newPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    newPassword?: string;
    oldPassword?: string;
}, {
    newPassword?: string;
    oldPassword?: string;
}>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
/**
 * OAuth bind request
 */
export declare const oauthBindSchema: z.ZodObject<{
    code: z.ZodString;
}, "strip", z.ZodTypeAny, {
    code?: string;
}, {
    code?: string;
}>;
export type OAuthBindInput = z.infer<typeof oauthBindSchema>;
//# sourceMappingURL=authSchemas.d.ts.map