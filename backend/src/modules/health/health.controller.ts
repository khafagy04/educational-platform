import type { Request, Response } from 'express';
import type { HealthService } from './health.service.js';

export class HealthController {
  public constructor(private readonly healthService: HealthService) {}

  public liveness = (_request: Request, response: Response): void => {
    response.json({ data: this.healthService.getLiveness() });
  };

  public readiness = async (_request: Request, response: Response): Promise<void> => {
    response.json({ data: await this.healthService.getReadiness() });
  };

  public component = (request: Request, response: Response): void => {
    const params = request.validated.params as { component: 'database' };
    const query = request.validated.query as { verbose: boolean };
    response.json({ data: this.healthService.getComponent(params.component, query.verbose) });
  };
}
