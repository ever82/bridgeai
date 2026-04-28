"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("../logger");
describe('Logger', () => {
    // Store original environment
    const originalEnv = process.env.NODE_ENV;
    const originalLogLevel = process.env.LOG_LEVEL;
    beforeEach(() => {
        // Reset mocks between tests
        jest.clearAllMocks();
    });
    afterAll(() => {
        // Restore original environment
        process.env.NODE_ENV = originalEnv;
        process.env.LOG_LEVEL = originalLogLevel;
    });
    describe('logger', () => {
        it('should have logger instance', () => {
            expect(logger_1.logger).toBeDefined();
            expect(typeof logger_1.logger.info).toBe('function');
            expect(typeof logger_1.logger.error).toBe('function');
            expect(typeof logger_1.logger.warn).toBe('function');
            expect(typeof logger_1.logger.debug).toBe('function');
        });
        it('should log info messages', () => {
            const spy = jest.spyOn(logger_1.logger, 'info').mockImplementation(() => logger_1.logger);
            logger_1.logger.info('Test message');
            expect(spy).toHaveBeenCalledWith('Test message');
            spy.mockRestore();
        });
        it('should log error messages', () => {
            const spy = jest.spyOn(logger_1.logger, 'error').mockImplementation(() => logger_1.logger);
            const error = new Error('Test error');
            logger_1.logger.error('Error occurred', error);
            expect(spy).toHaveBeenCalledWith('Error occurred', error);
            spy.mockRestore();
        });
        it('should log warn messages', () => {
            const spy = jest.spyOn(logger_1.logger, 'warn').mockImplementation(() => logger_1.logger);
            logger_1.logger.warn('Warning message');
            expect(spy).toHaveBeenCalledWith('Warning message');
            spy.mockRestore();
        });
        it('should log debug messages', () => {
            const spy = jest.spyOn(logger_1.logger, 'debug').mockImplementation(() => logger_1.logger);
            logger_1.logger.debug('Debug message');
            expect(spy).toHaveBeenCalledWith('Debug message');
            spy.mockRestore();
        });
        it('should log with metadata', () => {
            const spy = jest.spyOn(logger_1.logger, 'info').mockImplementation(() => logger_1.logger);
            logger_1.logger.info('Request processed', { userId: '123', duration: 100 });
            expect(spy).toHaveBeenCalledWith('Request processed', { userId: '123', duration: 100 });
            spy.mockRestore();
        });
    });
    describe('morganStream', () => {
        it('should have morganStream', () => {
            expect(logger_1.morganStream).toBeDefined();
            expect(typeof logger_1.morganStream.write).toBe('function');
        });
        it('should log HTTP requests via morganStream', () => {
            const spy = jest.spyOn(logger_1.logger, 'info').mockImplementation(() => logger_1.logger);
            const logMessage = 'GET /api/v1/users 200 123ms';
            logger_1.morganStream.write(logMessage);
            expect(spy).toHaveBeenCalledWith(logMessage.trim());
            spy.mockRestore();
        });
        it('should trim whitespace from log messages', () => {
            const spy = jest.spyOn(logger_1.logger, 'info').mockImplementation(() => logger_1.logger);
            const logMessage = '  POST /api/v1/auth 201 45ms  \n\t';
            logger_1.morganStream.write(logMessage);
            expect(spy).toHaveBeenCalledWith('POST /api/v1/auth 201 45ms');
            spy.mockRestore();
        });
        it('should handle empty messages', () => {
            const spy = jest.spyOn(logger_1.logger, 'info').mockImplementation(() => logger_1.logger);
            logger_1.morganStream.write('');
            expect(spy).toHaveBeenCalledWith('');
            spy.mockRestore();
        });
    });
});
//# sourceMappingURL=logger.test.js.map