'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { apiBase } from '@/lib/api';

type Mode = 'login' | 'register' | 'forgot' | 'reset';

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const search = useSearchParams();
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [grades, setGrades] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    if (mode !== 'register') return;
    const controller = new AbortController();
    void fetch(`${apiBase}/grades`, { signal: controller.signal })
      .then((response) => response.json())
      .then((body: { data?: { grades?: { id: string; name: string }[] } }) =>
        setGrades(body.data?.grades ?? []),
      )
      .catch(() => undefined);
    return () => controller.abort();
  }, [mode]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(form.entries());
    const endpoint =
      mode === 'forgot' ? 'forgot-password' : mode === 'reset' ? 'reset-password' : mode;
    const payload =
      mode === 'reset' ? { token: search.get('token') ?? '', password: values.password } : values;
    try {
      const response = await fetch(`${apiBase}/auth/${endpoint}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => ({}))) as {
        data?: { accessToken?: string; user?: { role?: string } };
        error?: { message?: string };
      };
      if (!response.ok)
        throw new Error(body.error?.message ?? 'تعذّر إكمال الطلب. راجع البيانات وحاول مرة أخرى.');
      if (mode === 'login' && body.data?.accessToken) {
        sessionStorage.setItem('accessToken', body.data.accessToken);
        const role = body.data.user?.role;
        router.replace(role === 'INSTRUCTOR' || role === 'ADMIN' ? '/admin' : '/dashboard');
        return;
      }
      setMessage(
        mode === 'register'
          ? 'تم إنشاء الحساب. افتح رسالة التحقق في بريدك قبل تسجيل الدخول.'
          : mode === 'forgot'
            ? 'إن كان البريد مسجلاً، ستصلك رسالة إعادة التعيين.'
            : 'تم تحديث كلمة المرور. يمكنك تسجيل الدخول الآن.',
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'حدث خطأ غير متوقع.');
    } finally {
      setPending(false);
    }
  }
  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      {mode === 'register' && (
        <>
          <label>
            الاسم الكامل
            <input name="name" required minLength={2} maxLength={160} autoComplete="name" />
          </label>
          <label>
            رقم الهاتف
            <input
              name="phone"
              dir="ltr"
              required
              minLength={8}
              maxLength={32}
              autoComplete="tel"
            />
          </label>
          <label>
            هاتف ولي الأمر
            <input
              name="parentPhone"
              dir="ltr"
              required
              minLength={8}
              maxLength={32}
              autoComplete="tel"
            />
          </label>
          <label>
            الصف الدراسي
            <select name="gradeId" required defaultValue="">
              <option value="" disabled>
                اختر الصف
              </option>
              {grades.map((grade) => (
                <option value={grade.id} key={grade.id}>
                  {grade.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            المحافظة
            <input name="governorate" required minLength={2} maxLength={100} />
          </label>
          <label>
            المدرسة
            <input name="school" required minLength={2} maxLength={200} />
          </label>
        </>
      )}
      {mode !== 'reset' && (
        <label>
          البريد الإلكتروني
          <input name="email" type="email" required autoComplete="email" />
        </label>
      )}
      {(mode === 'login' || mode === 'register' || mode === 'reset') && (
        <label>
          كلمة المرور
          <input
            name="password"
            type="password"
            required
            minLength={10}
            pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{10,128}"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </label>
      )}
      <button className="primary-button" disabled={pending}>
        {pending
          ? 'جارٍ التنفيذ…'
          : mode === 'login'
            ? 'دخول إلى حسابي'
            : mode === 'register'
              ? 'إنشاء الحساب'
              : mode === 'forgot'
                ? 'إرسال رابط الاستعادة'
                : 'حفظ كلمة المرور'}
      </button>
      {message && (
        <p className="form-message" role="status">
          {message}
        </p>
      )}
    </form>
  );
}
