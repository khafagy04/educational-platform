'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { clientApi } from '@/lib/client-api';
type Testimonial = {
  id: string;
  rating: number;
  comment: string;
  status: string;
  user: { name: string };
  course: { title: string };
};
type Faq = { id: string; question: string; answer: string; sortOrder: number; isActive: boolean };
type Setting = { key: string; value: unknown; description: string | null };
export default function SiteContent() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]),
    [faqs, setFaqs] = useState<Faq[]>([]),
    [settings, setSettings] = useState<Setting[]>([]);
  async function load() {
    const [a, b, c] = await Promise.all([
      clientApi<{ data: { items: Testimonial[] } }>('/admin/testimonials?page=1&pageSize=100'),
      clientApi<{ data: { faqs: Faq[] } }>('/admin/faqs'),
      clientApi<{ data: { settings: Setting[] } }>('/admin/settings'),
    ]);
    setTestimonials(a.data.items);
    setFaqs(b.data.faqs);
    setSettings(c.data.settings);
  }
  useEffect(() => {
    // Initial server synchronization for the three independently managed collections.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);
  async function moderate(id: string, status: string) {
    await clientApi(`/admin/testimonials/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    await load();
  }
  async function addFaq(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    await clientApi('/admin/faqs', {
      method: 'POST',
      body: JSON.stringify({
        question: f.question,
        answer: f.answer,
        sortOrder: Number(f.sortOrder),
        isActive: true,
      }),
    });
    e.currentTarget.reset();
    await load();
  }
  async function saveSetting(e: FormEvent<HTMLFormElement>, key: string) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    let value: unknown = f.value;
    try {
      value = JSON.parse(String(f.value));
    } catch {}
    await clientApi(`/admin/settings/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: JSON.stringify({ value, description: f.description || undefined }),
    });
    await load();
  }
  return (
    <>
      <header className="dashboard-header">
        <p className="section-kicker">الموقع العام</p>
        <h1>الأسئلة والتقييمات والإعدادات</h1>
      </header>
      <section className="dashboard-section">
        <h2>التقييمات بانتظار المراجعة</h2>
        <div className="notification-list">
          {testimonials.map((x) => (
            <article key={x.id}>
              <div>
                <small>
                  {x.user.name} · {x.course.title} · {x.rating}/5
                </small>
                <p>{x.comment}</p>
              </div>
              <div>
                <button onClick={() => void moderate(x.id, 'APPROVED')}>اعتماد</button>
                <button onClick={() => void moderate(x.id, 'REJECTED')}>رفض</button>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="dashboard-section">
        <h2>الأسئلة الشائعة</h2>
        <form className="inline-form" onSubmit={addFaq}>
          <input name="question" required placeholder="السؤال" />
          <input name="answer" required placeholder="الإجابة" />
          <input name="sortOrder" type="number" required placeholder="الترتيب" />
          <button>إضافة</button>
        </form>
        <div className="data-list">
          {faqs.map((x) => (
            <article key={x.id}>
              <strong>{x.question}</strong>
              <span>{x.isActive ? 'ظاهر' : 'مخفي'}</span>
            </article>
          ))}
        </div>
      </section>
      <section className="dashboard-section">
        <h2>إعدادات المنصة</h2>
        <div className="module-builder">
          {settings.map((x) => (
            <form className="inline-form" onSubmit={(e) => void saveSetting(e, x.key)} key={x.key}>
              <label>
                {x.key}
                <input
                  name="value"
                  dir="ltr"
                  defaultValue={typeof x.value === 'string' ? x.value : JSON.stringify(x.value)}
                />
              </label>
              <input name="description" defaultValue={x.description ?? ''} placeholder="وصف" />
              <button>حفظ</button>
            </form>
          ))}
        </div>
      </section>
    </>
  );
}
