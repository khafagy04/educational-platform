'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { clientApi } from '@/lib/client-api';
type C = {
  id: string;
  title: string;
  slug: string;
  status: string;
  price: string;
  grade: { name: string };
  subject: { name: string };
  _count: { modules: number; enrollments: number };
};
export default function AdminCourses() {
  const [items, setItems] = useState<C[]>([]),
    [search, setSearch] = useState('');
  useEffect(() => {
    void clientApi<{ data: { items: C[] } }>(
      `/admin/courses?search=${encodeURIComponent(search)}&page=1&pageSize=100`,
    ).then((x) => setItems(x.data.items));
  }, [search]);
  return (
    <>
      <header className="dashboard-header">
        <p className="section-kicker">دورة حياة المحتوى</p>
        <h1>المساقات</h1>
      </header>
      <div className="dashboard-toolbar">
        <input
          aria-label="بحث"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث…"
        />
        <Link className="primary-button" href="/admin/courses/new">
          مساق جديد +
        </Link>
      </div>
      <div className="data-list">
        {items.map((x) => (
          <article key={x.id}>
            <div>
              <small>
                {x.grade.name} · {x.subject.name}
              </small>
              <strong>{x.title}</strong>
            </div>
            <span>{x.status}</span>
            <b>
              {x._count.modules} وحدات · {x._count.enrollments} طلاب
            </b>
            <Link href={`/admin/courses/${x.id}`}>تحرير ←</Link>
          </article>
        ))}
      </div>
    </>
  );
}
