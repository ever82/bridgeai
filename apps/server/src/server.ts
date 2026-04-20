import { createServer } from 'http';

import app from './app';
import { initializeSocketServer } from './socket';
import { initializeRedisAdapter } from './socket/adapter';
import { logger } from './utils/logger';

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.io
initializeRedisAdapter()
  .then(() => initializeSocketServer(httpServer, app))
  .then(() => {
    logger.info('Socket.io server initialized');
  })
  .catch((err) => {
    logger.warn('Socket.io initialization failed, continuing without real-time:', err);
  });

const server = httpServer.listen(PORT, HOST, () => {
  logger.info(`🚀 Server running on http://${HOST}:${PORT}`);
  logger.info(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`💚 Health check: http://${HOST}:${PORT}/health`);
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Close Socket.io first
  try {
    const { closeSocketServer } = await import('./socket');
    await closeSocketServer();
  } catch (err) {
    logger.warn('Error closing Socket.io:', err);
  }

  server.close(() => {
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
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default server;
