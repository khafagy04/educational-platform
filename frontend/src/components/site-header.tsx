'use client';

import { LogIn, Menu, Search, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { BrandMark } from '@/components/brand-mark';
import styles from './site-header.module.css';

const navigation = [
  { href: '/', label: 'الرئيسية' },
  { href: '/#courses', label: 'الدروس' },
  { href: '/#approach', label: 'نظام المذاكرة' },
  { href: '/#about', label: 'عن المدرّس' },
  { href: '/#faq', label: 'الأسئلة الشائعة' },
] as const;

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    };

    document.addEventListener('keydown', closeWithEscape);
    return () => document.removeEventListener('keydown', closeWithEscape);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className={styles.header}>
      <div className={styles.routeRail} aria-hidden="true">
        <span />
      </div>

      <div className={styles.headerInner}>
        <Link className={styles.brand} href="/" aria-label="مِداد — الصفحة الرئيسية">
          <BrandMark />
          <span className={styles.brandCopy}>
            <strong>مِداد</strong>
            <small>خطّ الفهم</small>
          </span>
        </Link>

        <nav className={styles.desktopNavigation} aria-label="التنقل الرئيسي">
          {navigation.map((item) => (
            <Link className={styles.navigationLink} href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.actions}>
          <Link className={styles.searchAction} href="/courses" aria-label="ابحث في الدروس">
            <Search aria-hidden="true" size={19} strokeWidth={1.9} />
          </Link>
          <Link className={styles.loginAction} href="/login">
            <LogIn aria-hidden="true" size={18} strokeWidth={2} />
            <span>تسجيل الدخول</span>
          </Link>
          <button
            ref={menuButtonRef}
            className={styles.menuToggle}
            type="button"
            aria-expanded={menuOpen}
            aria-controls="midad-mobile-navigation"
            aria-label={menuOpen ? 'أغلق قائمة التنقل' : 'افتح قائمة التنقل'}
            onClick={() => setMenuOpen((current) => !current)}
          >
            {menuOpen ? <X aria-hidden="true" size={22} /> : <Menu aria-hidden="true" size={22} />}
          </button>
        </div>

        {menuOpen && (
          <nav
            className={styles.mobileNavigation}
            id="midad-mobile-navigation"
            aria-label="التنقل على الهاتف"
          >
            <div className={styles.mobileRouteLabel} aria-hidden="true">
              <span />
              افهم · جرّب · أتقن
            </div>
            {navigation.map((item) => (
              <Link
                className={styles.mobileNavigationLink}
                href={item.href}
                key={item.href}
                onClick={closeMenu}
              >
                {item.label}
              </Link>
            ))}
            <div className={styles.mobileActions}>
              <Link href="/courses" onClick={closeMenu}>
                <Search aria-hidden="true" size={18} />
                ابحث في الدروس
              </Link>
              <Link href="/login" onClick={closeMenu}>
                <LogIn aria-hidden="true" size={18} />
                تسجيل الدخول
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
