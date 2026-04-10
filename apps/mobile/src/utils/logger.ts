/**
 * Mobile Logger
 * 移动端日志系统
 *
 * 支持本地存储、日志上传、崩溃报告
 */

import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 日志级别
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

// 日志配置
interface LoggerConfig {
  level: LogLevel;
  maxLogFiles: number;
  maxLogFileSize: number; // bytes
  uploadEnabled: boolean;
  uploadEndpoint?: string;
  localStorageKey: string;
}

// 日志条目
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
  tag?: string;
}

// 崩溃报告
interface CrashReport {
  timestamp: string;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  logs: LogEntry[];
  deviceInfo: Record<string, unknown>;
}

// 默认配置
const defaultConfig: LoggerConfig = {
  level: 'info',
  maxLogFiles: 5,
  maxLogFileSize: 1024 * 1024 * 5, // 5MB
  uploadEnabled: false,
  localStorageKey: '@logger:logs',
};

// 日志级别优先级
const levelPriority: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

class MobileLogger {
  private config: LoggerConfig;
  private logs: LogEntry[] = [];
  private crashHandlers: ((report: CrashReport) => void)[] = [];
  private originalConsole: typeof console;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.originalConsole = { ...console };
    this.init();
  }

  /**
   * 初始化日志系统
   */
  private init(): void {
    // 设置全局错误处理
    this.setupGlobalErrorHandler();

    // 加载历史日志
    this.loadLogs();

    // 设置日志级别拦截
    this.interceptConsole();
  }

  /**
   * 设置全局错误处理
   */
  private setupGlobalErrorHandler(): void {
    // 全局错误监听
    const originalErrorHandler = ErrorUtils.getGlobalHandler();

    ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      this.reportCrash(error, isFatal);

      // 调用原始处理器
      if (originalErrorHandler) {
        originalErrorHandler(error, isFatal);
      }
    });

    // 未处理的 Promise 拒绝
    // @ts-ignore - React Native specific
    if (global?. HermesInternal || global) {
      // @ts-ignore
      const originalRejection = global?. HermesInternal?. PromiseRejectionTrackingOptions?.onUnhandled;
    }
  }

  /**
   * 拦截 console 方法
   */
  private interceptConsole(): void {
    // 只在开发环境拦截 console
    if (__DEV__) {
      // 保持原始 console 行为
      return;
    }

    console.log = (...args: unknown[]) => {
      this.info(this.formatArgs(args));
      this.originalConsole.log(...args);
    };

    console.info = (...args: unknown[]) => {
      this.info(this.formatArgs(args));
      this.originalConsole.info(...args);
    };

    console.warn = (...args: unknown[]) => {
      this.warn(this.formatArgs(args));
      this.originalConsole.warn(...args);
    };

    console.error = (...args: unknown[]) => {
      this.error(this.formatArgs(args));
      this.originalConsole.error(...args);
    };

    console.debug = (...args: unknown[]) => {
      this.debug(this.formatArgs(args));
      this.originalConsole.debug(...args);
    };
  }

  /**
   * 格式化参数
   */
  private formatArgs(args: unknown[]): string {
    return args
      .map((arg) => {
        if (typeof arg === 'string') return arg;
        if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      })
      .join(' ');
  }

  /**
   * 检查日志级别
   */
  private shouldLog(level: LogLevel): boolean {
    return levelPriority[level] >= levelPriority[this.config.level];
  }

  /**
   * 添加日志条目
   */
  private addLog(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    this.logs.push(entry);

    // 如果超出限制，清理旧日志
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-500);
    }

    // 错误级别自动保存
    if (levelPriority[entry.level] >= levelPriority.error) {
      this.saveLogs();
    }
  }

  /**
   * 加载日志
   */
  private async loadLogs(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.config.localStorageKey);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (e) {
      this.originalConsole.error('Failed to load logs:', e);
    }
  }

  /**
   * 保存日志到本地
   */
  async saveLogs(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.config.localStorageKey,
        JSON.stringify(this.logs.slice(-500))
      );
    } catch (e) {
      this.originalConsole.error('Failed to save logs:', e);
    }
  }

  /**
   * 上报崩溃
   */
  private reportCrash(error: Error, isFatal?: boolean): void {
    const report: CrashReport = {
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      logs: this.logs.slice(-100), // 包含最近的100条日志
      deviceInfo: this.getDeviceInfo(),
    };

    // 保存崩溃报告
    this.saveCrashReport(report);

    // 通知监听器
    this.crashHandlers.forEach((handler) => handler(report));

    // 如果启用上传，上传到服务器
    if (this.config.uploadEnabled) {
      this.uploadCrashReport(report);
    }
  }

  /**
   * 保存崩溃报告
   */
  private async saveCrashReport(report: CrashReport): Promise<void> {
    try {
      const key = `@logger:crash:${Date.now()}`;
      await AsyncStorage.setItem(key, JSON.stringify(report));

      // 清理旧报告（保留最近10个）
      const keys = await AsyncStorage.getAllKeys();
      const crashKeys = keys.filter((k) => k.startsWith('@logger:crash:'));
      if (crashKeys.length > 10) {
        const toRemove = crashKeys
          .sort()
          .slice(0, crashKeys.length - 10);
        await AsyncStorage.multiRemove(toRemove);
      }
    } catch (e) {
      this.originalConsole.error('Failed to save crash report:', e);
    }
  }

  /**
   * 获取设备信息
   */
  private getDeviceInfo(): Record<string, unknown> {
    return {
      platform: 'mobile',
      os: '', // 可以从 Platform 获取
      version: '', // App 版本
      buildNumber: '',
      deviceId: '',
    };
  }

  /**
   * 上传崩溃报告
   */
  private async uploadCrashReport(report: CrashReport): Promise<void> {
    if (!this.config.uploadEndpoint) return;

    try {
      const response = await fetch(this.config.uploadEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report),
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }
    } catch (e) {
      this.originalConsole.error('Failed to upload crash report:', e);
    }
  }

  // 公共日志方法
  debug(message: string, data?: Record<string, unknown>, tag?: string): void {
    this.addLog({
      timestamp: new Date().toISOString(),
      level: 'debug',
      message,
      data,
      tag,
    });
  }

  info(message: string, data?: Record<string, unknown>, tag?: string): void {
    this.addLog({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      data,
      tag,
    });
  }

  warn(message: string, data?: Record<string, unknown>, tag?: string): void {
    this.addLog({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      data,
      tag,
    });
  }

  error(message: string, error?: Error, data?: Record<string, unknown>, tag?: string): void {
    this.addLog({
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      data: {
        ...data,
        error: error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : undefined,
      },
      tag,
    });
  }

  fatal(message: string, error?: Error, data?: Record<string, unknown>, tag?: string): void {
    this.addLog({
      timestamp: new Date().toISOString(),
      level: 'fatal',
      message,
      data: {
        ...data,
        error: error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : undefined,
      },
      tag,
    });
  }

  /**
   * 获取所有日志
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * 清空日志
   */
  async clearLogs(): Promise<void> {
    this.logs = [];
    await AsyncStorage.removeItem(this.config.localStorageKey);
  }

  /**
   * 导出日志为字符串
   */
  exportLogs(): string {
    return this.logs
      .map(
        (log) =>
          `[${log.timestamp}] [${log.level.toUpperCase()}]${log.tag ? ` [${log.tag}]` : ''} ${log.message}${log.data ? ` ${JSON.stringify(log.data)}` : ''}`
      )
      .join('\n');
  }

  /**
   * 添加崩溃监听器
   */
  onCrash(handler: (report: CrashReport) => void): void {
    this.crashHandlers.push(handler);
  }

  /**
   * 上传日志到服务器
   */
  async uploadLogs(): Promise<boolean> {
    if (!this.config.uploadEnabled || !this.config.uploadEndpoint) {
      return false;
    }

    try {
      const response = await fetch(`${this.config.uploadEndpoint}/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logs: this.logs,
          deviceInfo: this.getDeviceInfo(),
          timestamp: new Date().toISOString(),
        }),
      });

      return response.ok;
    } catch (e) {
      this.originalConsole.error('Failed to upload logs:', e);
      return false;
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// 全局 ErrorUtils 类型声明
declare const ErrorUtils: {
  getGlobalHandler: () => ((error: Error, isFatal?: boolean) => void) | null;
  setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => void;
};

// 创建默认 Logger 实例
export const mobileLogger = new MobileLogger();

// 导出类
export { MobileLogger, LogLevel, LogEntry, CrashReport, LoggerConfig };

// 导出便捷方法
export const debug = (message: string, data?: Record<string, unknown>, tag?: string): void =>
  mobileLogger.debug(message, data, tag);
export const info = (message: string, data?: Record<string, unknown>, tag?: string): void =>
  mobileLogger.info(message, data, tag);
export const warn = (message: string, data?: Record<string, unknown>, tag?: string): void =>
  mobileLogger.warn(message, data, tag);
export const error = (
  message: string,
  err?: Error,
  data?: Record<string, unknown>,
  tag?: string
): void => mobileLogger.error(message, err, data, tag);
export const fatal = (
  message: string,
  err?: Error,
  data?: Record<string, unknown>,
  tag?: string
): void => mobileLogger.fatal(message, err, data, tag);
