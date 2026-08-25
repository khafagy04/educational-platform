import ExcelJS from 'exceljs';
import { OrderStatus } from '../../generated/prisma/enums.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { AnalyticsQuery } from './analytics.validators.js';

type Row = Record<string, string | number | Date | null>;

export class AnalyticsService {
  public constructor(private readonly db: PrismaClient) {}

  private range(q: AnalyticsQuery) {
    return { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) };
  }

  private bucket(date: Date, period: AnalyticsQuery['period']) {
    const value = new Date(date);
    if (period === 'yearly') return String(value.getUTCFullYear());
    if (period === 'monthly') return value.toISOString().slice(0, 7);
    if (period === 'weekly') {
      const day = (value.getUTCDay() + 6) % 7;
      value.setUTCDate(value.getUTCDate() - day);
    }
    return value.toISOString().slice(0, 10);
  }

  public async revenue(q: AnalyticsQuery) {
    const orders = await this.db.order.findMany({
      where: { status: OrderStatus.PAID, paidAt: this.range(q) },
      select: {
        amount: true,
        currency: true,
        paidAt: true,
        course: { select: { id: true, title: true } },
      },
      orderBy: { paidAt: 'asc' },
    });
    const map = new Map<
      string,
      {
        period: string;
        courseId: string;
        course: string;
        revenue: number;
        orders: number;
        currency: string;
      }
    >();
    for (const order of orders) {
      if (!order.paidAt) continue;
      const period = this.bucket(order.paidAt, q.period);
      const key = `${period}:${order.course.id}`;
      const row = map.get(key) ?? {
        period,
        courseId: order.course.id,
        course: order.course.title,
        revenue: 0,
        orders: 0,
        currency: order.currency,
      };
      row.revenue += Number(order.amount);
      row.orders += 1;
      map.set(key, row);
    }
    return {
      items: [...map.values()],
      totalRevenue: orders.reduce((sum, order) => sum + Number(order.amount), 0),
      orders: orders.length,
    };
  }

  public async payments(q: AnalyticsQuery) {
    const groups = await this.db.payment.groupBy({
      by: ['status'],
      where: { createdAt: this.range(q) },
      _count: { _all: true },
      _sum: { amount: true },
    });
    return {
      items: groups.map((item) => ({
        status: item.status,
        count: item._count._all,
        amount: Number(item._sum.amount ?? 0),
      })),
    };
  }

  public async engagement(q: AnalyticsQuery) {
    const courses = await this.db.course.findMany({
      select: {
        id: true,
        title: true,
        _count: { select: { enrollments: true } },
        enrollments: {
          select: {
            status: true,
            progress: { select: { watchedSeconds: true, lastViewedAt: true } },
          },
        },
        views: { select: { viewCount: true } },
      },
    });
    return {
      items: courses
        .map((course) => {
          const completed = course.enrollments.filter((item) => item.status === 'COMPLETED').length;
          const watchedSeconds = course.enrollments
            .flatMap((item) => item.progress)
            .filter(
              (item) =>
                (!q.from || item.lastViewedAt >= q.from) && (!q.to || item.lastViewedAt <= q.to),
            )
            .reduce((sum, item) => sum + item.watchedSeconds, 0);
          return {
            courseId: course.id,
            course: course.title,
            enrollments: course._count.enrollments,
            completed,
            completionRate: course._count.enrollments
              ? Number(((completed / course._count.enrollments) * 100).toFixed(2))
              : 0,
            watchedHours: Number((watchedSeconds / 3600).toFixed(2)),
            views: course.views.reduce((sum, item) => sum + item.viewCount, 0),
          };
        })
        .sort((a, b) => b.views - a.views),
    };
  }

  private async rows(
    report: 'revenue' | 'payments' | 'engagement',
    q: AnalyticsQuery,
  ): Promise<Row[]> {
    const result =
      report === 'revenue'
        ? await this.revenue(q)
        : report === 'payments'
          ? await this.payments(q)
          : await this.engagement(q);
    return result.items as Row[];
  }

  public async export(
    report: 'revenue' | 'payments' | 'engagement',
    format: 'csv' | 'xlsx',
    q: AnalyticsQuery,
  ) {
    const rows = await this.rows(report, q);
    if (!rows.length) rows.push({ message: 'No data' });
    const first = rows[0] ?? { message: 'No data' };
    const headers = Object.keys(first);
    if (format === 'csv') {
      const escape = (value: string | number | Date | null | undefined) =>
        `"${(value instanceof Date ? value.toISOString() : value === null || value === undefined ? '' : String(value)).replaceAll('"', '""')}"`;
      return {
        body: Buffer.from(
          '\ufeff' +
            [
              headers.join(','),
              ...rows.map((row) => headers.map((header) => escape(row[header])).join(',')),
            ].join('\r\n'),
        ),
        mimeType: 'text/csv; charset=utf-8',
        extension: 'csv',
      };
    }
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(report, { views: [{ rightToLeft: true }] });
    sheet.columns = headers.map((key) => {
      const contentWidth = rows.reduce((maximum, row) => {
        const value = row[key];
        const length = value instanceof Date ? 10 : String(value ?? '').length;
        return Math.max(maximum, length);
      }, key.length);
      return { header: key, key, width: Math.min(45, Math.max(14, contentWidth + 3)) };
    });
    sheet.addRows(rows);
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10212E' } };
    for (const key of ['revenue', 'amount']) {
      const column = headers.indexOf(key) + 1;
      if (column > 0) sheet.getColumn(column).numFmt = '#,##0.00';
    }
    for (const key of ['orders', 'count', 'enrollments', 'completed', 'views']) {
      const column = headers.indexOf(key) + 1;
      if (column > 0) sheet.getColumn(column).numFmt = '#,##0';
    }
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: Math.max(1, rows.length + 1), column: headers.length },
    };
    sheet.views = [{ state: 'frozen', ySplit: 1, rightToLeft: true }];
    const buffer = await workbook.xlsx.writeBuffer();
    return {
      body: Buffer.from(buffer),
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      extension: 'xlsx',
    };
  }
}
