'use client';
import { useEffect, useState } from 'react';
import { apiBase } from '@/lib/api';
import { clientApi } from '@/lib/client-api';
type Revenue = {
  items: { period: string; course: string; revenue: number; orders: number }[];
  totalRevenue: number;
  orders: number;
};
type Payments = { items: { status: string; count: number; amount: number }[] };
const paymentStatusLabels: Record<string, string> = {
  PENDING: 'قيد الانتظار',
  PAID: 'مدفوع',
  FAILED: 'فشل',
  EXPIRED: 'منتهي',
};
type Engagement = {
  items: {
    course: string;
    enrollments: number;
    completed: number;
    completionRate: number;
    watchedHours: number;
    views: number;
  }[];
};
export default function AnalyticsPage() {
  const [period, setPeriod] = useState('monthly'),
    [revenue, setRevenue] = useState<Revenue | null>(null),
    [payments, setPayments] = useState<Payments | null>(null),
    [engagement, setEngagement] = useState<Engagement | null>(null);
  useEffect(() => {
    void Promise.all([
      clientApi<{ data: Revenue }>(`/admin/analytics/revenue?period=${period}`),
      clientApi<{ data: Payments }>(`/admin/analytics/payments?period=${period}`),
      clientApi<{ data: Engagement }>(`/admin/analytics/engagement?period=${period}`),
    ]).then(([a, b, c]) => {
      setRevenue(a.data);
      setPayments(b.data);
      setEngagement(c.data);
    });
  }, [period]);
  async function download(report: string, format: string) {
    const token = sessionStorage.getItem('accessToken');
    const response = await fetch(
      `${apiBase}/admin/analytics/${report}/export?period=${period}&format=${format}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    );
    if (!response.ok) throw new Error('تعذّر تصدير التقرير');
    const blob = await response.blob(),
      url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = `${report}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <header className="dashboard-header">
        <p className="section-kicker">قرارات مبنية على البيانات</p>
        <h1>التحليلات والتقارير</h1>
      </header>
      <div className="dashboard-toolbar">
        <select value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="daily">يومي</option>
          <option value="weekly">أسبوعي</option>
          <option value="monthly">شهري</option>
          <option value="yearly">سنوي</option>
        </select>
      </div>
      <section className="dashboard-stats">
        <article>
          <span>الإيراد المحقق</span>
          <strong>{revenue?.totalRevenue ?? 0} EGP</strong>
        </article>
        <article>
          <span>الطلبات المدفوعة</span>
          <strong>{revenue?.orders ?? 0}</strong>
        </article>
        {payments?.items.map((x) => (
          <article key={x.status}>
            <span>{paymentStatusLabels[x.status] ?? x.status}</span>
            <strong>{x.count}</strong>
          </article>
        ))}
      </section>
      <Report
        title="الإيراد حسب المساق والفترة"
        onDownload={(format) => void download('revenue', format)}
      >
        {revenue?.items.map((x) => (
          <article key={`${x.period}-${x.course}`}>
            <div>
              <strong>{x.course}</strong>
              <small>
                {x.period} · {x.orders} طلبات
              </small>
            </div>
            <b>{x.revenue} EGP</b>
          </article>
        ))}
      </Report>
      <Report title="التفاعل والإكمال" onDownload={(format) => void download('engagement', format)}>
        {engagement?.items.map((x) => (
          <article key={x.course}>
            <div>
              <strong>{x.course}</strong>
              <small>
                {x.watchedHours} ساعات مشاهدة · {x.views} مشاهدة
              </small>
            </div>
            <b>{x.completionRate}%</b>
          </article>
        ))}
      </Report>
      <Report title="حالات الدفع" onDownload={(format) => void download('payments', format)}>
        {payments?.items.map((x) => (
          <article key={x.status}>
            <strong>{paymentStatusLabels[x.status] ?? x.status}</strong>
            <b>
              {x.amount} EGP · {x.count}
            </b>
          </article>
        ))}
      </Report>
    </>
  );
}
function Report({
  title,
  onDownload,
  children,
}: {
  title: string;
  onDownload: (format: string) => void;
  children: React.ReactNode;
}) {
  return (
    <section className="dashboard-section">
      <div className="dashboard-section-title">
        <h2>{title}</h2>
        <div className="export-actions">
          <button onClick={() => onDownload('csv')}>CSV ↓</button>
          <button onClick={() => onDownload('xlsx')}>Excel ↓</button>
        </div>
      </div>
      <div className="data-list">{children}</div>
    </section>
  );
}
