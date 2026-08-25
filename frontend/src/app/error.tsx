'use client';
import { useEffect } from 'react';
import { apiBase } from '@/lib/api';
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void fetch(`${apiBase}/client-errors`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: error.message, stack: error.stack, path: location.pathname }),
    });
  }, [error]);
  return (
    <main className="standalone-page">
      <section className="verification-card">
        <span className="verification-mark">!</span>
        <h1>تعذّر إكمال الصفحة</h1>
        <p>تم تسجيل المشكلة. جرّب مرة أخرى.</p>
        <button className="primary-button" onClick={reset}>
          إعادة المحاولة
        </button>
      </section>
    </main>
  );
}
