import { Suspense } from 'react';
import { AuthShell } from '@/components/auth-shell';
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="auth-page" />}>
      <AuthShell mode="reset" />
    </Suspense>
  );
}
