import { Repository } from '../../core/repository.js';
import type { PrismaClient } from '../../generated/prisma/client.js';

export type HealthRepositoryPort = {
  checkDatabase(): Promise<void>;
};

export class HealthRepository extends Repository<PrismaClient> implements HealthRepositoryPort {
  public constructor(client: PrismaClient) {
    super(client);
  }

  public async checkDatabase(): Promise<void> {
    await this.client.$queryRaw`SELECT 1`;
  }
}
