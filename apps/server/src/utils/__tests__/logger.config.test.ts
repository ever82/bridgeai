/**
 * Logger Configuration Tests
 */

import {
  defaultConfig,
  getPinoOptions,
  loadConfigFromEnv,
  mergeConfig,
  ILoggerConfig,
} from '../../config/logger';

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
      expect(defaultConfig.level).toBeDefined();
      expect(defaultConfig.format).toBeDefined();
      expect(defaultConfig.outputs.console).toBe(true);
      expect(defaultConfig.redactFields).toContain('password');
      expect(defaultConfig.redactFields).toContain('token');
    });
  });

  describe('getPinoOptions', () => {
    it('should return valid Pino options', () => {
      const options = getPinoOptions(defaultConfig);

      expect(options.level).toBe(defaultConfig.level);
      expect(options.base).toBeDefined();
      expect(options.timestamp).toBeDefined();
      expect(options.formatters).toBeDefined();
      expect(options.redact).toBeDefined();
    });

    it('should include redact configuration', () => {
      const options = getPinoOptions(defaultConfig);

      expect(options.redact).toBeDefined();
      if (typeof options.redact === 'object' && !Array.isArray(options.redact)) {
        expect(options.redact.paths).toEqual(defaultConfig.redactFields);
        expect(options.redact.censor).toBe('[REDACTED]');
      }
    });
  });

  describe('loadConfigFromEnv', () => {
    it('should load LOG_LEVEL from environment', () => {
      process.env.LOG_LEVEL = 'debug';
      const config = loadConfigFromEnv();

      expect(config.level).toBe('debug');
    });

    it('should load LOG_FORMAT from environment', () => {
      process.env.LOG_FORMAT = 'json';
      const config = loadConfigFromEnv();

      expect(config.format).toBe('json');
    });

    it('should load LOG_CONSOLE from environment', () => {
      process.env.LOG_CONSOLE = 'false';
      const config = loadConfigFromEnv();

      expect(config.outputs?.console).toBe(false);
    });
  });

  describe('mergeConfig', () => {
    it('should merge configs correctly', () => {
      const base: ILoggerConfig = {
        level: 'info',
        format: 'pretty',
        outputs: { console: true, file: false, errorFile: true },
        fileOptions: { directory: 'logs', maxSize: '10m', maxFiles: 7 },
        redactFields: ['password'],
      };

      const override: Partial<ILoggerConfig> = {
        level: 'debug',
        outputs: { console: false, file: false, errorFile: true },
      };

      const merged = mergeConfig(base, override);

      expect(merged.level).toBe('debug');
      expect(merged.format).toBe('pretty');
      expect(merged.outputs.console).toBe(false);
      expect(merged.outputs.errorFile).toBe(true);
    });
  });
});
