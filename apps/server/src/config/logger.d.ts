/**
 * Logger Configuration
 * 日志配置模块
 *
 * 配置日志级别、输出目标、格式化选项
 */
interface PinoLoggerOptions {
    level?: string;
    base?: object;
    timestamp?: (() => string) | boolean;
    formatters?: {
        level?: (label: string) => object;
        bindings?: (bindings: Record<string, unknown>) => object;
    };
    redact?: {
        paths?: string[];
        remove?: boolean;
        censor?: string | ((value: unknown) => unknown);
    };
}
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
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
export declare const defaultConfig: ILoggerConfig;
export declare function getPinoOptions(config?: ILoggerConfig): PinoLoggerOptions;
export declare function loadConfigFromEnv(): Partial<ILoggerConfig>;
export declare function mergeConfig(base?: ILoggerConfig, override?: Partial<ILoggerConfig>): ILoggerConfig;
export {};
//# sourceMappingURL=logger.d.ts.map