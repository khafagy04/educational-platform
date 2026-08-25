'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { clientApi } from '@/lib/client-api';
type Item = {
  id: string;
  status: string;
  progressPct: number;
  isFavorite: boolean;
  expiresAt: string;
  course: { id: string; title: string; subject: { name: string } };
};
export default function MyCourses() {
  const [items, setItems] = useState<Item[]>([]);
  const [tab, setTab] = useState('current');
  const [search, setSearch] = useState('');
  useEffect(() => {
    void clientApi<{ data: { courses: Item[] } }>(
      `/me/courses?tab=${tab}&search=${encodeURIComponent(search)}&sort=recent`,
    ).then((x) => setItems(x.data.courses));
  }, [tab, search]);
  async function favorite(item: Item) {
    await clientApi(`/me/favorites/${item.course.id}`, {
      method: item.isFavorite ? 'DELETE' : 'POST',
    });
    setItems((x) => x.map((y) => (y.id === item.id ? { ...y, isFavorite: !y.isFavorite } : y)));
  }
  return (
    <>
      <header className="dashboard-header">
        <p className="section-kicker">مكتبتي</p>
        <h1>مساقاتي</h1>
      </header>
      <div className="dashboard-toolbar">
        <div>
          {['current', 'completed', 'favorites'].map((x, i) => (
            <button className={tab === x ? 'active' : ''} onClick={() => setTab(x)} key={x}>
              {['الحالية', 'المكتملة', 'المفضلة'][i]}
            </button>
          ))}
        </div>
        <input
          aria-label="ابحث في مساقاتي"
          placeholder="ابحث عن مساق…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="dashboard-cards">
        {items.map((item) => (
          <article key={item.id}>
            <button
              className="favorite-button"
              aria-label="المفضلة"
              onClick={() => void favorite(item)}
            >
              {item.isFavorite ? '★' : '☆'}
            </button>
            <small>{item.course.subject.name}</small>
            <h3>{item.course.title}</h3>
            <div className="mini-progress">
              <span style={{ width: `${item.progressPct}%` }} />
            </div>
            <p>
              {item.progressPct}% · صالح حتى {new Date(item.expiresAt).toLocaleDateString('ar-EG')}
            </p>
            <Link href={`/dashboard/courses/${item.course.id}`}>متابعة ←</Link>
          </article>
        ))}
      </div>
      {items.length === 0 && <div className="dashboard-empty">لا توجد مساقات في هذا التبويب.</div>}
    </>
  );
}
