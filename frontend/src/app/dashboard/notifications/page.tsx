'use client';
import { useEffect, useState } from 'react';
import { clientApi } from '@/lib/client-api';
type Note = {
  id: string;
  title: string;
  body: string;
  type: string;
  readAt: string | null;
  createdAt: string;
};
export default function NotificationsPage() {
  const [items, setItems] = useState<Note[]>([]);
  const load = () =>
    clientApi<{ data: { items: Note[] } }>('/me/notifications?page=1&pageSize=50').then((x) =>
      setItems(x.data.items),
    );
  useEffect(() => {
    void load();
  }, []);
  async function read(id: string) {
    await clientApi(`/me/notifications/${id}/read`, { method: 'POST' });
    await load();
  }
  return (
    <>
      <header className="dashboard-header">
        <p className="section-kicker">ما استجدّ</p>
        <h1>الإشعارات</h1>
      </header>
      <div className="notification-list">
        {items.map((x) => (
          <article className={x.readAt ? '' : 'unread'} key={x.id}>
            <div>
              <small>
                {x.type} · {new Date(x.createdAt).toLocaleDateString('ar-EG')}
              </small>
              <h3>{x.title}</h3>
              <p>{x.body}</p>
            </div>
            {!x.readAt && <button onClick={() => void read(x.id)}>تحديد كمقروء</button>}
          </article>
        ))}
      </div>
      {items.length === 0 && <div className="dashboard-empty">لا توجد إشعارات جديدة.</div>}
    </>
  );
}
