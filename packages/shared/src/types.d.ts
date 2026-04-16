export * from './types/points';
export * from './types/filter';
export interface User {
    id: string;
    email: string;
    name: string;
}
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}
//# sourceMappingURL=types.d.ts.map