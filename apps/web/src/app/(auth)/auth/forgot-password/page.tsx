'use client';

import * as React from 'react';
import Link from 'next/link';
import { AuthShell } from '../../../../components/auth/AuthShell';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import { apiFetch } from '../../../../lib/api/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    } catch {
      // Intentionally silent for security
    } finally {
      setIsLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <AuthShell
      title="Reset password."
      subtitle="Enter the email associated with your account, and we’ll send you recovery instructions."
    >
      {submitted ? (
        <div className="space-y-4">
          <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-sage-50)] border border-[var(--color-sage-300)] text-sm text-[var(--color-sage-900)] leading-relaxed">
            If an account matches that email address, we’ve dispatched a recovery link. Check your inbox (or local mail console in dev mode).
          </div>
          <Link href="/auth/sign-in">
            <Button variant="secondary" className="w-full">
              Return to Sign In
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="maya@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Button type="submit" variant="primary" size="md" className="w-full h-[52px]" isLoading={isLoading}>
            Send Recovery Link
          </Button>

          <p className="text-center text-xs text-[var(--color-charcoal-600)] pt-4">
            Remembered your password?{' '}
            <Link href="/auth/sign-in" className="font-semibold text-[var(--color-sage-700)] hover:underline">
              Sign In
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
