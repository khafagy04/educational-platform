'use client';

import {
  Award,
  Bell,
  BookOpen,
  House,
  LogOut,
  MoreHorizontal,
  Search,
  UserRound,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { BrandMark } from '@/components/brand-mark';
import { apiBase } from '@/lib/api';
import { clientApi } from '@/lib/client-api';
import styles from './dashboard-shell.module.css';

type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const navigation: readonly NavigationItem[] = [
  { href: '/dashboard', label: 'الرئيسية', icon: House },
  { href: '/dashboard/courses', label: 'مساقاتي', icon: BookOpen },
  { href: '/dashboard/wallet', label: 'المحفظة', icon: Wallet },
  { href: '/dashboard/certificates', label: 'الشهادات', icon: Award },
  { href: '/dashboard/notifications', label: 'الإشعارات', icon: Bell },
  { href: '/dashboard/profile', label: 'الملف الشخصي', icon: UserRound },
] as const;

const mobileNavigation = navigation.filter(({ href }) =>
  [
    '/dashboard',
    '/dashboard/courses',
    '/dashboard/notifications',
    '/dashboard/certificates',
  ].includes(href),
);

const mobileMoreNavigation = navigation.filter(({ href }) =>
  ['/dashboard/wallet', '/dashboard/profile'].includes(href),
);

function isActivePath(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [authState, setAuthState] = useState<'loading' | 'ready' | 'redirecting'>('loading');
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    void clientApi<{ data: { user: { name: string; role: string } } }>('/auth/me', {
      signal: controller.signal,
    })
      .then((body) => {
        if (body.data.user.role !== 'STUDENT') {
          setAuthState('redirecting');
          router.replace('/admin');
          return;
        }
        setUser(body.data.user);
        setAuthState('ready');
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setAuthState('redirecting');
        router.replace('/login');
      });

    return () => controller.abort();
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

  if (authState !== 'ready') {
    return (
      <main
        className={styles.authState}
        role="status"
        aria-live="polite"
        aria-busy={authState === 'loading'}
      >
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <BrandMark className={styles.authMark} />
          <span className={styles.authPulse} aria-hidden="true" />
          <p>{authState === 'loading' ? 'جارٍ فتح دفترك…' : 'جارٍ إعادتك لتسجيل الدخول…'}</p>
        </motion.div>
      </main>
    );
  }

  const isPlayerRoute = /^\/dashboard\/courses\/[^/]+\/?$/.test(pathname);

  if (isPlayerRoute) {
    return (
      <div className={styles.playerShell}>
        <main className={styles.playerMain} id="dashboard-content">
          {children}
        </main>
      </div>
    );
  }

  const currentSection = navigation.find(({ href }) => isActivePath(pathname, href))?.label;
  const userInitial = user?.name.trim().slice(0, 1) || 'ط';

  return (
    <>
      <a className={styles.skipLink} href="#dashboard-content">
        انتقل إلى المحتوى
      </a>
      <div className={styles.shell}>
        <aside className={styles.sidebar} aria-label="الشريط الجانبي للطالب">
          <Link className={styles.brandLink} href="/" aria-label="مِداد — الصفحة الرئيسية">
            <BrandMark className={styles.brandSymbol} />
            <span className={styles.brandCopy}>
              <strong>مِداد</strong>
              <small>خطّ الفهم</small>
            </span>
          </Link>

          <div className={styles.sidebarSection}>
            <p className={styles.sidebarLabel}>دفتر الطالب</p>
            <nav className={styles.navigation} aria-label="لوحة الطالب">
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
            <div className={styles.studentCard}>
              <span className={styles.avatar} aria-hidden="true">
                {userInitial}
              </span>
              <span className={styles.studentMeta}>
                <small>مساحة الطالب</small>
                <strong>{user?.name}</strong>
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
              <span>لوحة الطالب</span>
              <strong>{currentSection ?? 'دفترك'}</strong>
            </div>
            <div className={styles.topbarActions}>
              <Link className={styles.searchLink} href="/dashboard/courses">
                <Search size={18} aria-hidden="true" />
                <span>ابحث في مساقاتك</span>
              </Link>
              <Link
                className={styles.iconLink}
                href="/dashboard/notifications"
                aria-label="عرض الإشعارات"
              >
                <Bell size={19} aria-hidden="true" />
              </Link>
              <Link className={styles.topAvatar} href="/dashboard/profile" aria-label="ملفك الشخصي">
                {userInitial}
              </Link>
            </div>
          </header>

          <main className={styles.content} id="dashboard-content">
            {children}
          </main>
        </div>

        <nav className={styles.mobileBar} aria-label="تنقل الطالب على الهاتف">
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
            aria-controls="dashboard-mobile-more"
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

        <AnimatePresence>
          {mobileMoreOpen && (
            <>
              <motion.button
                className={styles.mobileBackdrop}
                type="button"
                aria-label="إغلاق قائمة المزيد"
                initial={shouldReduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileMoreOpen(false)}
              />
              <motion.section
                className={styles.mobileMorePanel}
                id="dashboard-mobile-more"
                aria-label="روابط إضافية"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 24 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
              >
                <div className={styles.mobilePanelHeader}>
                  <div className={styles.studentCard}>
                    <span className={styles.avatar} aria-hidden="true">
                      {userInitial}
                    </span>
                    <span className={styles.studentMeta}>
                      <small>مساحة الطالب</small>
                      <strong>{user?.name}</strong>
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
              </motion.section>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
