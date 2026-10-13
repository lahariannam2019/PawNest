'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AuthShell } from '../../../../components/auth/AuthShell';
import { Button } from '../../../../components/ui/Button';
import { apiFetch, ApiError } from '../../../../lib/api/client';
import { CheckCircle2, AlertCircle } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = React.useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = React.useState('');

  React.useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('No verification token provided in the URL.');
      return;
    }

    apiFetch('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
      .then(() => {
        setStatus('success');
      })
      .catch((err: any) => {
        setStatus('error');
        if (err instanceof ApiError) {
          setErrorMessage(err.problem.detail);
        } else {
          setErrorMessage('Failed to verify email. The token may have expired.');
        }
      });
  }, [token]);

  return (
    <AuthShell
      title="Email Verification"
      subtitle="Confirming your email address to enable bookings and order notifications."
    >
      <div className="space-y-6 text-center py-6">
        {status === 'verifying' && (
          <div className="space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-[var(--color-sage-100)] flex items-center justify-center animate-spin">
              <span className="w-4 h-4 rounded-full border-2 border-[var(--color-sage-700)] border-t-transparent" />
            </div>
            <p className="text-sm text-[var(--color-charcoal-700)]">Verifying your token with PawNest...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-[var(--color-sage-100)] text-[var(--color-sage-700)] flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif text-xl font-semibold text-[var(--color-charcoal-900)]">
                Email Verified!
              </h3>
              <p className="text-xs text-[var(--color-charcoal-600)]">
                Your account is fully activated. You can now book appointments and complete orders.
              </p>
            </div>
            <Link href="/dashboard">
              <Button variant="primary" className="w-full">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-[var(--color-peach-100)] text-[var(--color-danger)] flex items-center justify-center">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif text-xl font-semibold text-[var(--color-charcoal-900)]">
                Verification Failed
              </h3>
              <p className="text-xs text-[var(--color-charcoal-600)]">{errorMessage}</p>
            </div>
            <Link href="/auth/sign-in">
              <Button variant="secondary" className="w-full">
                Return to Sign In
              </Button>
            </Link>
          </div>
        )}
      </div>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-[var(--color-ivory-100)]" />}>
      <VerifyEmailContent />
    </React.Suspense>
  );
}
