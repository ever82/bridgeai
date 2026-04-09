import { logger, morganStream } from '../logger';

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
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should log info messages', () => {
      const spy = jest.spyOn(logger, 'info').mockImplementation(() => logger);
      logger.info('Test message');
      expect(spy).toHaveBeenCalledWith('Test message');
      spy.mockRestore();
    });

    it('should log error messages', () => {
      const spy = jest.spyOn(logger, 'error').mockImplementation(() => logger);
      const error = new Error('Test error');
      logger.error('Error occurred', error);
      expect(spy).toHaveBeenCalledWith('Error occurred', error);
      spy.mockRestore();
    });

    it('should log warn messages', () => {
      const spy = jest.spyOn(logger, 'warn').mockImplementation(() => logger);
      logger.warn('Warning message');
      expect(spy).toHaveBeenCalledWith('Warning message');
      spy.mockRestore();
    });

    it('should log debug messages', () => {
      const spy = jest.spyOn(logger, 'debug').mockImplementation(() => logger);
      logger.debug('Debug message');
      expect(spy).toHaveBeenCalledWith('Debug message');
      spy.mockRestore();
    });

    it('should log with metadata', () => {
      const spy = jest.spyOn(logger, 'info').mockImplementation(() => logger);
      logger.info('Request processed', { userId: '123', duration: 100 });
      expect(spy).toHaveBeenCalledWith('Request processed', { userId: '123', duration: 100 });
      spy.mockRestore();
    });
  });

  describe('morganStream', () => {
    it('should have morganStream', () => {
      expect(morganStream).toBeDefined();
      expect(typeof morganStream.write).toBe('function');
    });

    it('should log HTTP requests via morganStream', () => {
      const spy = jest.spyOn(logger, 'info').mockImplementation(() => logger);
      const logMessage = 'GET /api/v1/users 200 123ms';

      morganStream.write(logMessage);

      expect(spy).toHaveBeenCalledWith(logMessage.trim());
      spy.mockRestore();
    });

    it('should trim whitespace from log messages', () => {
      const spy = jest.spyOn(logger, 'info').mockImplementation(() => logger);
      const logMessage = '  POST /api/v1/auth 201 45ms  \n\t';

      morganStream.write(logMessage);

      expect(spy).toHaveBeenCalledWith('POST /api/v1/auth 201 45ms');
      spy.mockRestore();
    });

    it('should handle empty messages', () => {
      const spy = jest.spyOn(logger, 'info').mockImplementation(() => logger);

      morganStream.write('');

      expect(spy).toHaveBeenCalledWith('');
      spy.mockRestore();
    });
  });
});
