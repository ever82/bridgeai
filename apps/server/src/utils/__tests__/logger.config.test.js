"use strict";
/**
 * Logger Configuration Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("../../config/logger");
describe('Logger Config', () => {
    const originalEnv = process.env;
    beforeEach(() => {
        process.env = { ...originalEnv };
    });
    afterAll(() => {
        process.env = originalEnv;
    });
    describe('defaultConfig', () => {
        it('should have correct default values', () => {
            expect(logger_1.defaultConfig.level).toBeDefined();
            expect(logger_1.defaultConfig.format).toBeDefined();
            expect(logger_1.defaultConfig.outputs.console).toBe(true);
            expect(logger_1.defaultConfig.redactFields).toContain('password');
            expect(logger_1.defaultConfig.redactFields).toContain('token');
        });
    });
    describe('getPinoOptions', () => {
        it('should return valid Pino options', () => {
            const options = (0, logger_1.getPinoOptions)(logger_1.defaultConfig);
            expect(options.level).toBe(logger_1.defaultConfig.level);
            expect(options.base).toBeDefined();
            expect(options.timestamp).toBeDefined();
            expect(options.formatters).toBeDefined();
            expect(options.redact).toBeDefined();
        });
        it('should include redact configuration', () => {
            const options = (0, logger_1.getPinoOptions)(logger_1.defaultConfig);
            expect(options.redact).toBeDefined();
            if (typeof options.redact === 'object' && !Array.isArray(options.redact)) {
                expect(options.redact.paths).toEqual(logger_1.defaultConfig.redactFields);
                expect(options.redact.censor).toBe('[REDACTED]');
            }
        });
    });
    describe('loadConfigFromEnv', () => {
        it('should load LOG_LEVEL from environment', () => {
            process.env.LOG_LEVEL = 'debug';
            const config = (0, logger_1.loadConfigFromEnv)();
            expect(config.level).toBe('debug');
        });
        it('should load LOG_FORMAT from environment', () => {
            process.env.LOG_FORMAT = 'json';
            const config = (0, logger_1.loadConfigFromEnv)();
            expect(config.format).toBe('json');
        });
        it('should load LOG_CONSOLE from environment', () => {
            process.env.LOG_CONSOLE = 'false';
            const config = (0, logger_1.loadConfigFromEnv)();
            expect(config.outputs?.console).toBe(false);
        });
    });
    describe('mergeConfig', () => {
        it('should merge configs correctly', () => {
            const base = {
                level: 'info',
                format: 'pretty',
                outputs: { console: true, file: false, errorFile: true },
                fileOptions: { directory: 'logs', maxSize: '10m', maxFiles: 7 },
                redactFields: ['password'],
            };
            const override = {
                level: 'debug',
                outputs: { console: false, file: false, errorFile: true },
            };
            const merged = (0, logger_1.mergeConfig)(base, override);
            expect(merged.level).toBe('debug');
            expect(merged.format).toBe('pretty');
            expect(merged.outputs.console).toBe(false);
            expect(merged.outputs.errorFile).toBe(true);
        });
    });
});
//# sourceMappingURL=logger.config.test.js.map