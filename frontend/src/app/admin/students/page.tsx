'use client';
import { useEffect, useState } from 'react';
import { clientApi } from '@/lib/client-api';
type S = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  grade: { name: string } | null;
  _count: { enrollments: number };
};
const userStatusLabels: Record<string, string> = {
  ACTIVE: 'نشط',
  SUSPENDED: 'موقوف',
};
export default function Students() {
  const [items, setItems] = useState<S[]>([]),
    [search, setSearch] = useState('');
  useEffect(() => {
    void clientApi<{ data: { items: S[] } }>(
      `/admin/students?search=${encodeURIComponent(search)}&page=1&pageSize=100`,
    ).then((x) => setItems(x.data.items));
  }, [search]);
  return (
    <>
      <header className="dashboard-header">
        <p className="section-kicker">متابعة المتعلّمين</p>
        <h1>الطلاب</h1>
      </header>
      <div className="dashboard-toolbar">
        <input
          aria-label="ابحث عن طالب"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="الاسم أو البريد أو الهاتف…"
        />
      </div>
      <div className="data-list">
        {items.map((x) => (
          <article key={x.id}>
            <div>
              <strong>{x.name}</strong>
              <small>
                {x.email} · {x.grade?.name}
              </small>
            </div>
            <span>{userStatusLabels[x.status] ?? x.status}</span>
            <b>{x._count.enrollments} مساقات</b>
          </article>
        ))}
      </div>
    </>
  );
}
