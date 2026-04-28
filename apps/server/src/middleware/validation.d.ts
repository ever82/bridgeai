/**
 * Request Validation Middleware
 *
 * Provides Zod-based validation for request body, params, and query.
 */
import type { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';
/**
 * Custom validator function type
 */
export type CustomValidatorFn<T = unknown> = (value: T) => boolean | string;
/**
 * Custom validation rule
 */
export interface ValidationRule {
    name: string;
    validator: CustomValidatorFn;
    message: string;
}
/**
 * Validation target type
 */
export type ValidationTarget = 'body' | 'params' | 'query' | 'headers';
/**
 * Validation schema configuration
 */
export interface ValidationSchemas {
    body?: ZodType<any, any, any>;
    params?: ZodType<any, any, any>;
    query?: ZodType<any, any, any>;
    headers?: ZodType<any, any, any>;
}
/**
 * Create a custom schema with validation rules
 */
export declare function createValidatedSchema<T extends Record<string, unknown>>(baseSchema: ZodType<T>, rules?: ValidationRule[]): ZodType<T>;
/**
 * Built-in custom validators
 */
export declare const Validators: {
    /**
     * Chinese mobile phone number validator
     */
    chinesePhone: (val: unknown) => boolean | string;
    /**
     * URL validator
     */
    url: (val: unknown) => boolean | string;
    /**
     * Strong password validator (min 8 chars, upper, lower, number)
     */
    strongPassword: (val: unknown) => boolean | string;
    /**
     * UUID validator
     */
    uuid: (val: unknown) => boolean | string;
    /**
     * Date range validator
     */
    dateRange: (min: Date, max: Date) => (val: unknown) => boolean | string;
    /**
     * File extension validator
     */
    fileExtension: (allowedExtensions: string[]) => (val: unknown) => boolean | string;
    /**
     * Array length validator
     */
    arrayLength: (min: number, max: number) => (val: unknown) => boolean | string;
};
/**
 * Create custom Zod refinement
 */
export declare function createRefinement<T>(schema: ZodType<T>, validator: (val: T) => boolean | string, message?: string): ZodType<T>;
/**
 * Middleware factory for validating requests
 *
 * @example
 * router.post('/users',
 *   validate({
 *     body: createUserSchema,
 *     params: userIdParamsSchema
 *   }),
 *   userController.create
 * );
 */
export declare function validate(schemas: ValidationSchemas): (req: Request, _res: Response, next: NextFunction) => void;
/**
 * Middleware for validating request body only
 *
 * @example
 * router.post('/users', validateBody(createUserSchema), userController.create);
 */
export declare function validateBody<T>(schema: ZodType<T, any, any>): (req: Request, _res: Response, next: NextFunction) => void;
/**
 * Middleware for validating request params only
 *
 * @example
 * router.get('/users/:id', validateParams(userIdParamsSchema), userController.getById);
 */
export declare function validateParams<T>(schema: ZodType<T, any, any>): (req: Request, _res: Response, next: NextFunction) => void;
/**
 * Middleware for validating request query only
 *
 * @example
 * router.get('/users', validateQuery(listUsersQuerySchema), userController.list);
 */
export declare function validateQuery<T>(schema: ZodType<T, any, any>): (req: Request, _res: Response, next: NextFunction) => void;
/**
 * Sanitize string input - remove dangerous characters and patterns
 */
export declare function sanitizeString(input: string): string;
/**
 * Transform string fields in an object
 */
export declare function sanitizeObject<T extends Record<string, unknown>>(obj: T): T;
/**
 * Zod transform for sanitizing strings
 */
export declare function sanitizedString(): (val: string) => string;
export default validate;
//# sourceMappingURL=validation.d.ts.map