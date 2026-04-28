/**
 * External API mock utilities
 */
export declare const mockAxios: any;
/**
 * Mock fetch for external API calls
 */
export declare function mockFetch(response: Response | Promise<Response>): void;
/**
 * Create a mock Response for fetch
 */
export declare function createMockResponse<T>(data: T, options?: {
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
}): Response;
/**
 * Mock file system operations
 */
export declare const mockFs: {
    readFile: jest.Mock<any, any, any>;
    writeFile: jest.Mock<any, any, any>;
    appendFile: jest.Mock<any, any, any>;
    unlink: jest.Mock<any, any, any>;
    mkdir: jest.Mock<any, any, any>;
    readdir: jest.Mock<any, any, any>;
    stat: jest.Mock<any, any, any>;
    exists: jest.Mock<any, any, any>;
};
/**
 * Reset all external API mocks
 */
export declare function resetApiMocks(): void;
//# sourceMappingURL=external.mock.d.ts.map