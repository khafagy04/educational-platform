export type HealthStatus = {
  status: 'ok';
  service: 'educational-platform-api';
  timestamp: string;
};

export class HealthService extends Service<HealthRepositoryPort> {
  public constructor(repository: HealthRepositoryPort) {
    super(repository);
  }

  public getLiveness(): HealthStatus {
    return this.status();
  }

  public async getReadiness(): Promise<HealthStatus> {
    try {
      await this.repository.checkDatabase();
      return this.status();
    } catch {
      throw new ServiceUnavailableError('قاعدة البيانات غير متاحة مؤقتاً');
    }
  }

  public getComponent(component: 'database', verbose: boolean): object {
    return { component, status: 'configured', ...(verbose ? { driver: 'postgresql' } : {}) };
  }

  private status(): HealthStatus {
    return {
      status: 'ok',
      service: 'educational-platform-api',
      timestamp: new Date().toISOString(),
    };
  }
}
import { Service } from '../../core/service.js';
import { ServiceUnavailableError } from '../../errors/application-error.js';
import type { HealthRepositoryPort } from './health.repository.js';
