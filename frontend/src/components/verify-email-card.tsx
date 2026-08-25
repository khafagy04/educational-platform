'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiBase } from '@/lib/api';

type VerificationState = 'working' | 'success' | 'error';

export function VerifyEmailCard() {
  const search = useSearchParams();
  const token = search.get('token');
  const [state, setState] = useState<VerificationState>(token ? 'working' : 'error');
  const [message, setMessage] = useState(
    token
      ? 'جارٍ تأكيد بريدك الإلكتروني…'
      : 'رابط التحقق غير مكتمل. افتح الرابط الموجود في رسالة البريد من جديد.',
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    const controller = new AbortController();
    void fetch(`${apiBase}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        if (!response.ok) throw new Error(body.error?.message ?? 'تعذّر تأكيد البريد.');
        setState('success');
        setMessage('تم تأكيد بريدك بنجاح. حسابك جاهز الآن.');
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState('error');
        setMessage(error instanceof Error ? error.message : 'تعذّر تأكيد البريد.');
      });

    return () => controller.abort();
  }, [token]);

  return (
    <div className={`verification-card verification-card--${state}`} role="status">
      <span className="verification-mark" aria-hidden="true">
        {state === 'working' ? '…' : state === 'success' ? '✓' : '!'}
      </span>
      <h1>{state === 'success' ? 'أهلاً بك في مِداد' : 'تأكيد البريد الإلكتروني'}</h1>
      <p>{message}</p>
      {state !== 'working' && (
        <Link className="primary-button" href={state === 'success' ? '/login' : '/'}>
          {state === 'success' ? 'تسجيل الدخول ←' : 'العودة للرئيسية'}
        </Link>
      )}
    </div>
  );
}
