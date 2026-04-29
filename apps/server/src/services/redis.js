/**
 * Redis Client (lazy-initialized)
 * Manages Redis connection with support for:
 * - Master-slave replication
 * - Sentinel mode for high availability
 * - Connection pool management
 * - Health checks and automatic reconnection
 */
import Redis from 'ioredis';
// Redis Configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const REDIS_SENTINEL_HOSTS = process.env.REDIS_SENTINEL_HOSTS || '';
const REDIS_SLAVE_URL = process.env.REDIS_SLAVE_URL || '';
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
const REDIS_DB = parseInt(process.env.REDIS_DB || '0', 10);
const REDIS_CONNECT_TIMEOUT = parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000', 10);
const REDIS_MAX_RETRIES = parseInt(process.env.REDIS_MAX_RETRIES || '3', 10);
// Connection state tracking
let _masterClient = null;
let _slaveClient = null;
let _sentinelClient = null;
let _connectionState = 'disconnected';
/**
 * Parse Redis URL to get host and port
 */
function parseRedisUrl(url) {
    try {
        const parsed = new URL(url);
        return {
            host: parsed.hostname,
            port: parseInt(parsed.port || '6379', 10),
            password: parsed.password || undefined,
        };
    }
    catch {
        return null;
    }
}
/**
 * Create a Redis client with standard configuration
 */
function createRedisClient(url, options) {
    const parsedUrl = parseRedisUrl(url);
    const client = new Redis({
        host: parsedUrl?.host,
        port: parsedUrl?.port,
        password: parsedUrl?.password || REDIS_PASSWORD,
        db: REDIS_DB,
        lazyConnect: true,
        retryStrategy: times => {
            if (times > REDIS_MAX_RETRIES) {
                return null; // Stop retrying
            }
            const delay = Math.min(times * 100, 3000);
            return delay;
        },
        maxRetriesPerRequest: REDIS_MAX_RETRIES,
        connectTimeout: REDIS_CONNECT_TIMEOUT,
        keepAlive: 30000,
        ...options,
    });
    client.on('connect', () => {
        console.log('Redis client connected');
        _connectionState = 'connected';
    });
    client.on('ready', () => {
        console.log('Redis client ready');
        _connectionState = 'connected';
    });
    client.on('error', err => {
        console.error('Redis client error:', err.message);
        _connectionState = 'error';
    });
    client.on('close', () => {
        console.log('Redis client connection closed');
        _connectionState = 'disconnected';
    });
    client.on('reconnecting', () => {
        console.log('Redis client reconnecting...');
        _connectionState = 'connecting';
    });
    return client;
}
/**
 * Create sentinel client for high availability
 */
function createSentinelClient() {
    if (!REDIS_SENTINEL_HOSTS) {
        return null;
    }
    try {
        const sentinelHosts = REDIS_SENTINEL_HOSTS.split(',').map(s => {
            const [host, port] = s.trim().split(':');
            return { host, port: parseInt(port || '26379', 10) };
        });
        if (sentinelHosts.length === 0) {
            return null;
        }
        // Create a Redis client that connects to sentinel
        const client = new Redis({
            host: sentinelHosts[0].host,
            port: sentinelHosts[0].port,
            password: REDIS_PASSWORD,
            db: REDIS_DB,
            lazyConnect: true,
            retryStrategy: times => {
                if (times > REDIS_MAX_RETRIES) {
                    return null;
                }
                return Math.min(times * 100, 3000);
            },
            maxRetriesPerRequest: REDIS_MAX_RETRIES,
            connectTimeout: REDIS_CONNECT_TIMEOUT,
        });
        client.on('sentinelError', err => {
            console.error('Redis sentinel error:', err.message);
        });
        return client;
    }
    catch (error) {
        console.error('Failed to create sentinel client:', error);
        return null;
    }
}
/**
 * Initialize master and slave connections
 */
async function initializeConnections() {
    _connectionState = 'connecting';
    try {
        // Create master client
        _masterClient = createRedisClient(REDIS_URL);
        await _masterClient.connect();
        console.log('Redis master connected:', REDIS_URL);
        // Create slave client if configured (for read-replication)
        if (REDIS_SLAVE_URL) {
            _slaveClient = createRedisClient(REDIS_SLAVE_URL);
            await _slaveClient.connect();
            console.log('Redis slave connected:', REDIS_SLAVE_URL);
        }
        // Create sentinel client if configured
        _sentinelClient = createSentinelClient();
        if (_sentinelClient) {
            try {
                await _sentinelClient.connect();
                console.log('Redis sentinel client connected');
            }
            catch {
                console.log('Sentinel client not available, continuing without sentinel');
                _sentinelClient = null;
            }
        }
        _connectionState = 'connected';
    }
    catch (error) {
        console.error('Failed to initialize Redis connections:', error);
        _connectionState = 'error';
        throw error;
    }
}
/**
 * Get master client - for write operations
 */
function getMasterClient() {
    if (!_masterClient) {
        throw new Error('Redis master client not initialized. Call initializeRedis() first.');
    }
    return _masterClient;
}
/**
 * Get slave client - for read operations (load balancing)
 */
export function getSlaveClient() {
    return _slaveClient;
}
/**
 * Get best client for read operations (prefer slave, fallback to master)
 */
function getReadClient() {
    return _slaveClient || _masterClient;
}
/**
 * Get best client for write operations (always master)
 */
function getWriteClient() {
    return _masterClient;
}
/**
 * Lazily-initialized Redis proxy for read operations
 */
export const redisRead = new Proxy({}, {
    get(_target, prop) {
        if (typeof prop !== 'string') {
            return undefined;
        }
        const client = getReadClient();
        const value = client[prop];
        return typeof value === 'function' ? value.bind(client) : value;
    },
});
/**
 * Lazily-initialized Redis proxy for write operations
 */
export const redisWrite = new Proxy({}, {
    get(_target, prop) {
        if (typeof prop !== 'string') {
            return undefined;
        }
        const client = getWriteClient();
        const value = client[prop];
        return typeof value === 'function' ? value.bind(client) : value;
    },
});
/**
 * Main Redis proxy - defaults to master for writes
 */
export const redis = new Proxy({}, {
    get(_target, prop) {
        if (typeof prop !== 'string') {
            return undefined;
        }
        const client = getMasterClient();
        const value = client[prop];
        return typeof value === 'function' ? value.bind(client) : value;
    },
});
/**
 * Initialize Redis connections
 */
export async function initializeRedis() {
    await initializeConnections();
}
/**
 * Close all Redis connections
 */
export async function closeRedis() {
    const closePromises = [];
    if (_masterClient) {
        closePromises.push(_masterClient.quit().then(() => {
            _masterClient = null;
        }));
    }
    if (_slaveClient) {
        closePromises.push(_slaveClient.quit().then(() => {
            _slaveClient = null;
        }));
    }
    if (_sentinelClient) {
        closePromises.push(_sentinelClient.quit().then(() => {
            _sentinelClient = null;
        }));
    }
    await Promise.all(closePromises);
    _connectionState = 'disconnected';
}
/**
 * Check if Redis is connected
 */
export function isRedisConnected() {
    if (!_masterClient)
        return false;
    return _masterClient.status === 'ready';
}
/**
 * Get connection state
 */
export function getConnectionState() {
    return _connectionState;
}
/**
 * Perform health check on Redis connections
 */
export async function healthCheck() {
    const result = {
        healthy: false,
        master: false,
        slave: false,
        sentinel: false,
    };
    // Check master
    if (_masterClient) {
        try {
            await _masterClient.ping();
            result.master = true;
        }
        catch {
            result.master = false;
        }
    }
    // Check slave
    if (_slaveClient) {
        try {
            await _slaveClient.ping();
            result.slave = true;
        }
        catch {
            result.slave = false;
        }
    }
    // Check sentinel
    if (_sentinelClient) {
        try {
            await _sentinelClient.ping();
            result.sentinel = true;
        }
        catch {
            result.sentinel = false;
        }
    }
    // Overall health is true if at least master is connected
    result.healthy = result.master;
    return result;
}
/**
 * Reconnect to Redis
 */
export async function reconnectRedis() {
    console.log('Attempting to reconnect Redis...');
    await closeRedis();
    await initializeConnections();
}
/**
 * Get Redis connection statistics
 */
export function getRedisStats() {
    return {
        connectionState: _connectionState,
        hasMaster: _masterClient !== null,
        hasSlave: _slaveClient !== null,
        hasSentinel: _sentinelClient !== null,
        masterStatus: _masterClient?.status,
        slaveStatus: _slaveClient?.status,
    };
}
/** @internal Reset all connection state (for testing only) */
export function _resetState() {
    _masterClient = null;
    _slaveClient = null;
    _sentinelClient = null;
    _connectionState = 'disconnected';
}
export default {
    redis,
    redisRead,
    redisWrite,
    initializeRedis,
    closeRedis,
    isRedisConnected,
    getConnectionState,
    healthCheck,
    reconnectRedis,
    getRedisStats,
    _resetState,
};
//# sourceMappingURL=redis.js.map