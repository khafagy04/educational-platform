import Link from 'next/link';
import { Suspense } from 'react';
import { VerifyEmailCard } from '@/components/verify-email-card';

export default function VerifyEmailPage() {
  return (
    <main className="standalone-page">
      <Link className="brand" href="/">
        <span className="brand-mark">م</span>
        <span>مِداد</span>
      </Link>
      <Suspense fallback={<div className="verification-card">جارٍ تجهيز صفحة التحقق…</div>}>
        <VerifyEmailCard />
      </Suspense>
    </main>
  );
}
