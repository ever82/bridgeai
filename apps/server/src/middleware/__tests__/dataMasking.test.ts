import { describe, it, expect, beforeEach } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';

import { dataMaskingMiddleware } from '../dataMasking';

describe('Data Masking Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let jsonOutput: any;

  beforeEach(() => {
    jsonOutput = null;
    mockReq = {};

    mockRes = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      json(data: any) {
        jsonOutput = data;
        return mockRes as Response;
      },
    } as Partial<Response>;

    mockNext = jest.fn();
  });

  it('should mask sensitive fields in response data envelope', () => {
    const middleware = dataMaskingMiddleware();
    middleware(mockReq as Request, mockRes as Response, mockNext);

    // Simulate sending a response
    (mockRes as unknown as { json: (data: unknown) => Response }).json({
      success: true,
      data: {
        id: '123',
        phone: '13812345678',
        email: 'test@example.com',
      },
    });

    expect(jsonOutput.success).toBe(true);
    expect(jsonOutput.data.phone).not.toBe('13812345678');
    expect(jsonOutput.data.phone).toContain('*');
    expect(jsonOutput.data.email).not.toBe('test@example.com');
    expect(jsonOutput.data.email).toContain('@example.com');
  });

  it('should mask sensitive fields in direct response', () => {
    const middleware = dataMaskingMiddleware();
    middleware(mockReq as Request, mockRes as Response, mockNext);

    (mockRes as unknown as { json: (data: unknown) => Response }).json({
      id: '123',
      phone: '13812345678',
    });

    expect(jsonOutput.id).toBe('123');
    expect(jsonOutput.phone).not.toBe('13812345678');
    expect(jsonOutput.phone).toContain('*');
  });

  it('should skip masking when skipDataMasking is set', () => {
    const middleware = dataMaskingMiddleware();
    (mockReq as Record<string, unknown>).skipDataMasking = true;
    middleware(mockReq as Request, mockRes as Response, mockNext);

    (mockRes as unknown as { json: (data: unknown) => Response }).json({
      phone: '13812345678',
    });

    expect(jsonOutput.phone).toBe('13812345678');
  });

  it('should call next()', () => {
    const middleware = dataMaskingMiddleware();
    middleware(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });
});
