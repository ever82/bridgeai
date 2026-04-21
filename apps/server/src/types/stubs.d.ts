// Type stubs for external packages that don't have types installed
// Note: Express.Request augmentation is in types/express.d.ts

// bullmq types are provided by the installed package

declare module 'ws' {
  export class WebSocket {
    constructor(address: string, options?: object);
    send(data: string | Buffer): void;
    close(code?: number, reason?: string): void;
    on(event: string, callback: (...args: unknown[]) => void): void;
    readyState: number;
    OPEN: number;
    CLOSED: number;
  }
  export class Server {
    constructor(options?: object);
    on(event: string, callback: (ws: WebSocket) => void): void;
    close(): void;
  }
  export const WebSocketServer: typeof Server;
}

declare module 'class-validator' {
  export function validate(model: object): Promise<ValidationError[]>;
  export function validateSync(model: object): ValidationError[];
  export function validateOrReject(model: object): Promise<void>;
  export function IsString(): PropertyDecorator;
  export function IsNumber(): PropertyDecorator;
  export function IsBoolean(): PropertyDecorator;
  export function IsOptional(): PropertyDecorator;
  export function IsEmail(): PropertyDecorator;
  export function IsNotEmpty(): PropertyDecorator;
  export function IsInt(): PropertyDecorator;
  export function MinLength(min: number): PropertyDecorator;
  export function MaxLength(max: number): PropertyDecorator;
  export function Min(min: number): PropertyDecorator;
  export function Max(max: number): PropertyDecorator;
  export function IsEnum(enumRef: object): PropertyDecorator;
  export function IsArray(): PropertyDecorator;
  export function IsDateString(): PropertyDecorator;
  export function IsObject(): PropertyDecorator;
  export function IsIn(values: unknown[]): PropertyDecorator;
  export function IsPhoneNumber(region?: string): PropertyDecorator;
  export function Matches(pattern: RegExp, message?: string): PropertyDecorator;
  export interface ValidationError {
    property: string;
    value: unknown;
    constraints: Record<string, string>;
    children: ValidationError[];
  }
  export function registerDecorator(decorator: unknown): void;
}

declare module 'class-transformer' {
  export function plainToClass<T>(cls: new (...args: unknown[]) => T, plain: object): T;
  export function classToPlain<T>(obj: T, options?: object): object;
  export function classToClass<T>(obj: T, options?: object): T;
  export function plainToInstance<T>(cls: new (...args: unknown[]) => T, plain: object, options?: object): T;
  export function instanceToPlain(obj: unknown, options?: object): object;
  export function Transform(params: { to?: (value: unknown) => unknown; toClassOnly?: boolean }): PropertyDecorator;
  export function Expose(params?: { name?: string }): PropertyDecorator;
  export function Type(typeFn?: (type: unknown) => unknown): PropertyDecorator;
  export function TransformFn(params?: { to?: (value: unknown) => unknown }): PropertyDecorator;
  export class TransformOperationOptions {
    excludeExtraneousValues?: boolean;
    strategy?: string;
  }
}

declare module 'redis' {
  export interface RedisClient {
    duplicate(): Promise<RedisClient>;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isOpen: boolean;
    isReady: boolean;
    get(key: string): Promise<string | null>;
    set(key: string, value: string, options?: object): Promise<string>;
    del(key: string): Promise<number>;
    hget(key: string, field: string): Promise<string | null>;
    hset(key: string, field: string, value: string): Promise<number>;
    hdel(key: string, ...fields: string[]): Promise<number>;
    expire(key: string, seconds: number): Promise<number>;
    ping(): Promise<string>;
    quit(): Promise<void>;
    on(event: string, callback: (...args: unknown[]) => void): void;
  }
  export type RedisClientType = RedisClient;
  export function createClient(options?: object): RedisClient;
  export interface Multi {
    get(key: string): Multi;
    set(key: string, value: string): Multi;
    exec(): Promise<unknown[]>;
  }
}

declare module 'expo-server-sdk' {
  export interface ExpoPushMessage {
    to: string | string[];
    title?: string;
    body?: string;
    data?: Record<string, unknown>;
    sound?: string;
    ttl?: number;
    expiration?: number;
    priority?: string;
    subtitle?: string;
    badge?: number;
  }
  export interface ExpoPushTicket {
    id: string;
    status: string;
    details?: Record<string, unknown>;
  }
  export class Expo {
    constructor(options?: { accessToken?: string });
    sendNotifications(notifications: ExpoPushMessage[]): Promise<ExpoPushTicket[]>;
    chunkPushNotifications(notifications: ExpoPushMessage[]): ExpoPushMessage[][];
    sendPushNotificationsAsync(notifications: ExpoPushMessage[]): Promise<ExpoPushTicket[]>;
    getPushNotificationReceiptIds(tickets: ExpoPushTicket[]): Promise<string[]>;
  }
  export const expo: Expo;
}

declare module '@socket.io/redis-adapter' {
  export function createAdapter(pubClient: unknown, subClient: unknown): unknown;
}

declare module '@aws-sdk/client-ses' {
  export class SESClient {
    send(command: unknown): Promise<{ Metadata: Record<string, unknown> }>;
  }
}
