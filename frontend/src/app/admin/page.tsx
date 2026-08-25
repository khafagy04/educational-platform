'use client';
import { useEffect, useState } from 'react';
import { clientApi } from '@/lib/client-api';
type O = {
  students: number;
  courses: number;
  enrollments: number;
  pendingGrading: number;
  certificates: number;
};
export default function AdminHome() {
  const [o, setO] = useState<O | null>(null);
  useEffect(() => {
    void clientApi<{ data: O }>('/admin/overview').then((x) => setO(x.data));
  }, []);
  return (
    <>
      <header className="dashboard-header">
        <p className="section-kicker">مساحة العمل</p>
        <h1>ما الذي يحتاج انتباهك اليوم؟</h1>
      </header>
      <section className="dashboard-stats">
        {Object.entries(o ?? {}).map(([k, v]) => (
          <article key={k}>
            <span>
              {
                (
                  {
                    students: 'الطلاب',
                    courses: 'المساقات',
                    enrollments: 'الاشتراكات',
                    pendingGrading: 'بانتظار التصحيح',
                    certificates: 'الشهادات',
                  } as Record<string, string>
                )[k]
              }
            </span>
            <strong>{v}</strong>
          </article>
        ))}
      </section>
    </>
  );
}
