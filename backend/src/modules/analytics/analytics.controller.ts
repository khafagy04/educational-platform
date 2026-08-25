import type { Request, Response } from 'express';
import type { AnalyticsService } from './analytics.service.js';
import type { AnalyticsQuery, ExportQuery } from './analytics.validators.js';
export class AnalyticsController {
  constructor(private readonly s: AnalyticsService) {}
  revenue = async (q: Request, r: Response) =>
    r.json({ data: await this.s.revenue(q.validated.query as AnalyticsQuery) });
  payments = async (q: Request, r: Response) =>
    r.json({ data: await this.s.payments(q.validated.query as AnalyticsQuery) });
  engagement = async (q: Request, r: Response) =>
    r.json({ data: await this.s.engagement(q.validated.query as AnalyticsQuery) });
  export = async (q: Request, r: Response) => {
    const { report } = q.validated.params as { report: 'revenue' | 'payments' | 'engagement' },
      input = q.validated.query as ExportQuery,
      file = await this.s.export(report, input.format, input);
    r.setHeader('Content-Type', file.mimeType);
    r.setHeader('Content-Disposition', `attachment; filename="${report}.${file.extension}"`);
    r.send(file.body);
  };
}
