import Link from 'next/link';
import { Suspense } from 'react';
import { AuthForm } from './auth-form';

type Mode = 'login' | 'register' | 'forgot' | 'reset';
const copy = {
  login: ['مرحباً بعودتك', 'أكمل من النقطة التي توقفت عندها.'],
  register: ['ابدأ سطرك الأول', 'أنشئ حسابك واحفظ تقدّمك في كل درس.'],
  forgot: ['استعد حسابك', 'سنرسل رابطاً آمناً إلى بريدك المسجّل.'],
  reset: ['اختر كلمة مرور جديدة', 'استخدم كلمة طويلة وفريدة لا تستعملها في موقع آخر.'],
} as const;

const accountCopy = {
  login: ['دخول موحّد', 'طلاب ومدرّسون وإدارة — يفتح كل حساب مساحته تلقائياً.'],
  register: ['حساب الطالب', 'كل تقدّم تحفظه اليوم ينتظرك غداً.'],
  forgot: ['أمان الحساب', 'استعد الوصول إلى مساحتك بأمان.'],
  reset: ['أمان الحساب', 'استخدم كلمة مرور طويلة وفريدة.'],
} as const;

export function AuthShell({ mode }: { mode: Mode }) {
  return (
    <main className="auth-page">
      <section className="auth-note">
        <Link className="brand" href="/">
          <span className="brand-mark">م</span>
          <span>مِداد</span>
        </Link>
        <div>
          <p className="section-kicker">{accountCopy[mode][0]}</p>
          <h1>{copy[mode][0]}</h1>
          <p>{copy[mode][1]}</p>
        </div>
        <small>{accountCopy[mode][1]}</small>
      </section>
      <section className="auth-panel">
        <Suspense fallback={<div className="auth-form">جارٍ تجهيز النموذج…</div>}>
          <AuthForm mode={mode} />
        </Suspense>
        <div className="auth-links">
          {mode === 'login' && (
            <>
              <Link href="/forgot-password">نسيت كلمة المرور؟</Link>
              <Link href="/register">ليس لديك حساب؟ أنشئه</Link>
            </>
          )}
          {mode === 'register' && <Link href="/login">لديك حساب؟ سجّل الدخول</Link>}
          {(mode === 'forgot' || mode === 'reset') && (
            <Link href="/login">العودة إلى تسجيل الدخول</Link>
          )}
        </div>
      </section>
    </main>
  );
}
