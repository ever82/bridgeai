import { UserStatus } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      token?: string;
      user?: {
        id: string;
        email: string;
        role?: string;
        status?: UserStatus;
        roles?: string[];
        userId?: string;
      };
      roomId?: string;
      context?: Record<string, unknown>;
    }
  }
}
