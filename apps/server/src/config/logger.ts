/**
 * Logger Configuration
 * 日志配置模块
 *
 * 配置日志级别、输出目标、格式化选项
 */

import { LoggerOptions } from 'pino';

// 日志级别
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// 日志配置接口
export interface ILoggerConfig {
  level: LogLevel;
  format: 'json' | 'pretty';
  outputs: {
    console: boolean;
    file: boolean;
    errorFile: boolean;
  };
  fileOptions: {
    directory: string;
    maxSize: string;
    maxFiles: number;
  };
  redactFields: string[];
}

// 默认配置
export const defaultConfig: ILoggerConfig = {
  level: (process.env.LOG_LEVEL as LogLevel) || 'info',
  format: process.env.NODE_ENV === 'production' ? 'json' : 'pretty',
  outputs: {
    console: process.env.LOG_CONSOLE !== 'false',
    file: process.env.LOG_FILE === 'true',
    errorFile: process.env.LOG_ERROR_FILE !== 'false',
  },
  fileOptions: {
    directory: process.env.LOG_DIR || 'logs',
    maxSize: '10m',
    maxFiles: 7,
  },
  redactFields: [
    'password',
    'token',
    'accessToken',
    'refreshToken',
    'authorization',
    'apiKey',
    'secret',
    'cookie',
    'session',
  ],
};

// Pino 配置选项
export function getPinoOptions(config: ILoggerConfig = defaultConfig): LoggerOptions {
  const options: LoggerOptions = {
    level: config.level,
    base: {
      pid: process.pid,
      env: process.env.NODE_ENV || 'development',
    },
    timestamp: () => `,"time":"${new Date().toISOString()}"`,
    formatters: {
      level: (label: string) => ({ level: label.toUpperCase() }),
      bindings: (bindings: Record<string, unknown>) => ({
        pid: bindings.pid,
        env: bindings.env,
      }),
    },
    redact: {
      paths: config.redactFields,
      remove: false,
      censor: '[REDACTED]',
    },
  };

  return options;
}

// 获取环境变量配置
export function loadConfigFromEnv(): Partial<ILoggerConfig> {
  const config: Partial<ILoggerConfig> = {
    level: process.env.LOG_LEVEL as LogLevel,
    format: process.env.LOG_FORMAT as 'json' | 'pretty',
  };

  const outputs: Partial<ILoggerConfig['outputs']> = {
    console: process.env.LOG_CONSOLE !== 'false',
    file: process.env.LOG_FILE === 'true',
    errorFile: process.env.LOG_ERROR_FILE !== 'false',
  };
  config.outputs = outputs as ILoggerConfig['outputs'];

  const fileOptions: Partial<ILoggerConfig['fileOptions']> = {
    directory: process.env.LOG_DIR,
    maxSize: process.env.LOG_MAX_SIZE,
    maxFiles: process.env.LOG_MAX_FILES ? parseInt(process.env.LOG_MAX_FILES, 10) : undefined,
  };
  config.fileOptions = fileOptions as ILoggerConfig['fileOptions'];

  return config;
}

// 合并配置
export function mergeConfig(
  base: ILoggerConfig = defaultConfig,
  override: Partial<ILoggerConfig> = {}
): ILoggerConfig {
  return {
    ...base,
    ...override,
    outputs: {
      ...base.outputs,
      ...override.outputs,
    },
    fileOptions: {
      ...base.fileOptions,
      ...override.fileOptions,
    },
    redactFields: override.redactFields || base.redactFields,
  };
}
