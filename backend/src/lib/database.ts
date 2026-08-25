import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../config/env.js';
import { PrismaClient } from '../generated/prisma/client.js';

const globalDatabase = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

export const database =
  globalDatabase.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
  });

if (env.NODE_ENV !== 'production') {
  globalDatabase.prisma = database;
}
