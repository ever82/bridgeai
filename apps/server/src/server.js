import 'dotenv/config';
import { createServer } from 'http';
import app from './app';
import { logger } from './utils/logger';
import { llmService } from './services/ai/llmService';
import { initializeSocketServer, closeSocketServer } from './socket';
import { initializeRedisAdapter, closeRedisAdapter } from './socket/adapter';
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';
async function start() {
    // Initialize LLM service
    try {
        await llmService.initialize();
        logger.info('✅ LLM Service initialized');
    }
    catch (err) {
        logger.warn('⚠️ LLM Service initialization failed, AI features may be unavailable:', err);
    }
    // Create HTTP server and initialize Socket.io
    const httpServer = createServer(app);
    // Initialize Redis adapter for Socket.io
    await initializeRedisAdapter();
    // Initialize Socket.io
    await initializeSocketServer(httpServer, app);
    httpServer.listen(PORT, HOST, () => {
        logger.info(`🚀 Server running on http://${HOST}:${PORT}`);
        logger.info(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info(`💚 Health check: http://${HOST}:${PORT}/health`);
    });
    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
        logger.info(`Received ${signal}. Starting graceful shutdown...`);
        try {
            await llmService.shutdown?.();
        }
        catch (err) {
            logger.warn('Error shutting down LLM service:', err);
        }
        try {
            await closeSocketServer();
            await closeRedisAdapter();
        }
        catch (err) {
            logger.warn('Error shutting down Socket.io:', err);
        }
        httpServer.close(() => {
            logger.info('Server closed. Exiting process.');
            process.exit(0);
        });
        // Force shutdown after 30 seconds
        setTimeout(() => {
            logger.error('Forced shutdown due to timeout');
            process.exit(1);
        }, 30000);
    };
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    // Handle uncaught errors
    process.on('uncaughtException', error => {
        logger.error('Uncaught Exception:', error);
        process.exit(1);
    });
    process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
        process.exit(1);
    });
}
start().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
export default app;
//# sourceMappingURL=server.js.map