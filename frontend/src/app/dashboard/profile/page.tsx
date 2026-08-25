'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { clientApi } from '@/lib/client-api';
type Profile = {
  name: string;
  email: string;
  phone: string | null;
  parentPhone: string | null;
  governorate: string | null;
  school: string | null;
  gradeId: string | null;
};
type Prefs = {
  emailPayments: boolean;
  emailCourseUpdates: boolean;
  emailQuizResults: boolean;
  inAppPayments: boolean;
  inAppCourseUpdates: boolean;
  inAppQuizResults: boolean;
};
export default function ProfilePage() {
  const router = useRouter();
  const [p, setP] = useState<Profile | null>(null);
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    void Promise.all([
      clientApi<{ data: { profile: Profile } }>('/me/profile'),
      clientApi<{ data: { preferences: Prefs } }>('/me/notification-preferences'),
    ]).then(([a, b]) => {
      setP(a.data.profile);
      setPrefs(b.data.preferences);
    });
  }, []);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.currentTarget));
    await clientApi('/me/profile', {
      method: 'PATCH',
      body: JSON.stringify({ ...v, gradeId: p?.gradeId ?? null }),
    });
    setMsg('تم حفظ بياناتك.');
  }
  async function password(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await clientApi('/me/password', {
      method: 'POST',
      body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
    });
    sessionStorage.removeItem('accessToken');
    router.replace('/login');
  }
  async function toggle(key: keyof Prefs) {
    if (!prefs) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    await clientApi('/me/notification-preferences', {
      method: 'PATCH',
      body: JSON.stringify(next),
    });
  }
  if (!p || !prefs) return <div className="dashboard-empty">جارٍ تحميل الملف…</div>;
  return (
    <>
      <header className="dashboard-header">
        <p className="section-kicker">بياناتك وتفضيلاتك</p>
        <h1>الملف الشخصي</h1>
      </header>
      <div className="profile-grid">
        <form className="panel-form" onSubmit={save}>
          <h2>البيانات الشخصية</h2>
          <label>
            الاسم
            <input name="name" required defaultValue={p.name} />
          </label>
          <label>
            البريد
            <input value={p.email} disabled />
          </label>
          <label>
            الهاتف
            <input name="phone" defaultValue={p.phone ?? ''} />
          </label>
          <label>
            هاتف ولي الأمر
            <input name="parentPhone" defaultValue={p.parentPhone ?? ''} />
          </label>
          <label>
            المحافظة
            <input name="governorate" defaultValue={p.governorate ?? ''} />
          </label>
          <label>
            المدرسة
            <input name="school" defaultValue={p.school ?? ''} />
          </label>
          <button className="primary-button">حفظ التغييرات</button>
          {msg && <p>{msg}</p>}
        </form>
        <section className="panel-form">
          <h2>تفضيلات الإشعارات</h2>
          {(Object.keys(prefs) as (keyof Prefs)[]).map((key) => (
            <label className="switch-row" key={key}>
              <input type="checkbox" checked={prefs[key]} onChange={() => void toggle(key)} />
              <span>
                {
                  (
                    {
                      emailPayments: 'بريد المدفوعات',
                      emailCourseUpdates: 'بريد تحديثات المساقات',
                      emailQuizResults: 'بريد نتائج الاختبارات',
                      inAppPayments: 'مدفوعات داخل المنصة',
                      inAppCourseUpdates: 'تحديثات داخل المنصة',
                      inAppQuizResults: 'نتائج داخل المنصة',
                    } as Record<keyof Prefs, string>
                  )[key]
                }
              </span>
            </label>
          ))}
        </section>
        <form className="panel-form" onSubmit={password}>
          <h2>تغيير كلمة المرور</h2>
          <label>
            الحالية
            <input type="password" name="currentPassword" required />
          </label>
          <label>
            الجديدة
            <input type="password" name="newPassword" required minLength={10} />
          </label>
          <button className="primary-button">تغيير كلمة المرور</button>
        </form>
      </div>
    </>
  );
}
