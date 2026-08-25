'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { apiBase } from '@/lib/api';
import { clientApi } from '@/lib/client-api';
const nav = [
  ['/admin', 'نظرة عامة'],
  ['/admin/courses', 'المحتوى'],
  ['/admin/students', 'الطلاب'],
  ['/admin/grading', 'التصحيح'],
  ['/admin/site-content', 'محتوى الموقع'],
  ['/admin/analytics', 'التقارير'],
] as const;
export function AdminShell({ children }: { children: ReactNode }) {
  const path = usePathname(),
    router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  useEffect(() => {
    void clientApi<{ data: { user: { name: string; role: string } } }>('/auth/me')
      .then((x) => {
        if (!['INSTRUCTOR', 'ADMIN'].includes(x.data.user.role)) {
          router.replace('/dashboard');
          return;
        }
        setUser(x.data.user);
      })
      .catch(() => router.replace('/login'));
  }, [router]);
  async function logout() {
    setLoggingOut(true);
    try {
      await fetch(`${apiBase}/auth/logout`, { method: 'POST', credentials: 'include' });
    } finally {
      sessionStorage.removeItem('accessToken');
      router.replace('/login');
    }
  }
  if (!user) return <main className="dashboard-loading">جارٍ فتح مساحة العمل…</main>;
  return (
    <div className="dashboard-frame admin-frame">
      <aside className="dashboard-sidebar">
        <Link className="brand" href="/">
          <span className="brand-mark">م</span>
          <span>مِداد</span>
        </Link>
        <small>{user.role === 'ADMIN' ? 'لوحة الإدارة' : 'لوحة المدرّس'}</small>
        <nav>
          {nav.map(([href, label]) => (
            <Link className={path === href ? 'active' : ''} href={href} key={href}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="admin-session">
          <span>
            <small>{user.role === 'ADMIN' ? 'حساب الإدارة' : 'حساب المدرّس'}</small>
            <strong>{user.name}</strong>
          </span>
          <button type="button" disabled={loggingOut} onClick={() => void logout()}>
            {loggingOut ? 'جارٍ تسجيل الخروج…' : 'تسجيل الخروج'}
          </button>
        </div>
      </aside>
      <main className="dashboard-main">{children}</main>
    </div>
  );
}
