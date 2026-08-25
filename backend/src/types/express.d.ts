import type { UserRole } from '../generated/prisma/enums.js';

declare global {
  namespace Express {
    // Express requires interface merging for request extensions.
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    interface Request {
      user?: {
        id: string;
        role: UserRole;
      };
      validated: Partial<Record<'body' | 'params' | 'query', unknown>>;
    }
  }
}

export {};
