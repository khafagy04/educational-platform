'use client';
import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  Globe,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { BrandMark } from '@/components/brand-mark';
import { apiBase } from '@/lib/api';
import { clientApi } from '@/lib/client-api';
import styles from './admin-shell.module.css';

type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const navigation: readonly NavigationItem[] = [
  { href: '/admin', label: 'نظرة عامة', icon: LayoutDashboard },
  { href: '/admin/courses', label: 'المحتوى', icon: BookOpen },
  { href: '/admin/students', label: 'الطلاب', icon: Users },
  { href: '/admin/grading', label: 'التصحيح', icon: ClipboardCheck },
  { href: '/admin/site-content', label: 'محتوى الموقع', icon: Globe },
  { href: '/admin/analytics', label: 'التقارير', icon: BarChart3 },
] as const;

const mobileNavigation = navigation.slice(0, 4);
const mobileMoreNavigation = navigation.slice(4);

function isActivePath(pathname: string, href: string) {
  if (href === '/admin') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

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

  useEffect(() => {
    if (!mobileMoreOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setMobileMoreOpen(false);
    }

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [mobileMoreOpen]);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch(`${apiBase}/auth/logout`, { method: 'POST', credentials: 'include' });
    } finally {
      sessionStorage.removeItem('accessToken');
      router.replace('/login');
    }
  }

  if (!user) {
    return (
      <main className={styles.authState} role="status" aria-live="polite" aria-busy="true">
        <p>جارٍ فتح مساحة العمل…</p>
      </main>
    );
  }

  const roleLabel = user.role === 'ADMIN' ? 'لوحة الإدارة' : 'لوحة المدرّس';
  const spaceLabel = user.role === 'ADMIN' ? 'حساب الإدارة' : 'حساب المدرّس';
  const userInitial = user.name.trim().slice(0, 1) || 'م';
  const currentSection = navigation.find(({ href }) => isActivePath(pathname, href))?.label;

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label={`الشريط الجانبي — ${roleLabel}`}>
        <Link className={styles.brandLink} href="/" aria-label="مِداد — الصفحة الرئيسية">
          <BrandMark className={styles.brandSymbol} />
          <span className={styles.brandCopy}>
            <strong>مِداد</strong>
            <small>{roleLabel}</small>
          </span>
        </Link>

        <div className={styles.sidebarSection}>
          <p className={styles.sidebarLabel}>{roleLabel}</p>
          <nav className={styles.navigation} aria-label={roleLabel}>
            {navigation.map(({ href, label, icon: Icon }) => {
              const active = isActivePath(pathname, href);
              return (
                <Link
                  className={styles.navLink}
                  data-active={active || undefined}
                  href={href}
                  key={href}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className={styles.navNode} aria-hidden="true">
                    <Icon size={19} strokeWidth={1.9} />
                  </span>
                  <span>{label}</span>
                  {active && <span className={styles.activeDot} aria-hidden="true" />}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className={styles.sidebarFooter}>
          <div className={styles.staffCard}>
            <span className={styles.avatar} aria-hidden="true">
              {userInitial}
            </span>
            <span className={styles.staffMeta}>
              <small>{spaceLabel}</small>
              <strong>{user.name}</strong>
            </span>
          </div>
          <button
            className={styles.logoutButton}
            type="button"
            disabled={loggingOut}
            onClick={() => void logout()}
          >
            <LogOut size={18} aria-hidden="true" />
            <span>{loggingOut ? 'جارٍ تسجيل الخروج…' : 'تسجيل الخروج'}</span>
          </button>
        </div>
      </aside>

      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.mobileBrand} aria-hidden="true">
            <BrandMark className={styles.mobileBrandMark} />
            <strong>مِداد</strong>
          </div>
          <div className={styles.pageContext}>
            <span>{roleLabel}</span>
            <strong>{currentSection ?? 'مساحة العمل'}</strong>
          </div>
          <div className={styles.topbarActions}>
            <span className={styles.roleBadge}>{spaceLabel}</span>
            <span className={styles.topAvatar} aria-hidden="true">
              {userInitial}
            </span>
          </div>
        </header>

        <main className={styles.content} id="admin-content">
          {children}
        </main>
      </div>

      <nav className={styles.mobileBar} aria-label={`تنقل ${roleLabel} على الهاتف`}>
        {mobileNavigation.map(({ href, label, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <Link
              className={styles.mobileNavItem}
              data-active={active || undefined}
              href={href}
              key={href}
              aria-current={active ? 'page' : undefined}
              onClick={() => setMobileMoreOpen(false)}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 1.8} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
        <button
          className={styles.mobileNavItem}
          data-active={mobileMoreOpen || undefined}
          type="button"
          aria-expanded={mobileMoreOpen}
          aria-controls="admin-mobile-more"
          onClick={() => setMobileMoreOpen((open) => !open)}
        >
          {mobileMoreOpen ? (
            <X size={20} aria-hidden="true" />
          ) : (
            <MoreHorizontal size={20} aria-hidden="true" />
          )}
          <span>المزيد</span>
        </button>
      </nav>

      {mobileMoreOpen && (
        <>
          <button
            className={styles.mobileBackdrop}
            type="button"
            aria-label="إغلاق قائمة المزيد"
            onClick={() => setMobileMoreOpen(false)}
          />
          <section className={styles.mobileMorePanel} id="admin-mobile-more" aria-label="روابط إضافية">
            <div className={styles.mobilePanelHeader}>
              <div className={styles.staffCard}>
                <span className={styles.avatar} aria-hidden="true">
                  {userInitial}
                </span>
                <span className={styles.staffMeta}>
                  <small>{spaceLabel}</small>
                  <strong>{user.name}</strong>
                </span>
              </div>
            </div>
            <div className={styles.mobileMoreLinks}>
              {mobileMoreNavigation.map(({ href, label, icon: Icon }) => {
                const active = isActivePath(pathname, href);
                return (
                  <Link
                    className={styles.mobileMoreLink}
                    data-active={active || undefined}
                    href={href}
                    key={href}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setMobileMoreOpen(false)}
                  >
                    <Icon size={20} aria-hidden="true" />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
            <button
              className={styles.mobileLogout}
              type="button"
              disabled={loggingOut}
              onClick={() => void logout()}
            >
              <LogOut size={19} aria-hidden="true" />
              {loggingOut ? 'جارٍ تسجيل الخروج…' : 'تسجيل الخروج'}
            </button>
          </section>
        </>
      )}
    </div>
  );
}
