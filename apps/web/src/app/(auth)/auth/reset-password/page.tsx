'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthShell } from '../../../../components/auth/AuthShell';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import { apiFetch, ApiError } from '../../../../lib/api/client';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 10) {
      setError('Password must be at least 10 characters');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setSuccess(true);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.problem.detail);
      } else {
        setError('Failed to reset password. Token may have expired.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create New Password."
      subtitle="Enter a new secure password for your PawNest account."
    >
      {success ? (
        <div className="space-y-4">
          <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-sage-50)] border border-[var(--color-sage-300)] text-sm text-[var(--color-sage-900)]">
            Password has been reset successfully. Please sign in with your new credentials.
          </div>
          <Link href="/auth/sign-in">
            <Button variant="primary" className="w-full">
              Sign In
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3.5 rounded-[var(--radius-md)] bg-[var(--color-peach-50)] border border-[var(--color-peach-400)] text-xs text-[var(--color-danger)] font-medium">
              {error}
            </div>
          )}

          <Input
            label="New Password"
            type="password"
            placeholder="At least 10 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            helperText="Minimum 10 characters"
            required
          />

          <Input
            label="Confirm New Password"
            type="password"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          <Button type="submit" variant="primary" size="md" className="w-full h-[52px]" isLoading={isLoading}>
            Update Password
          </Button>
        </form>
      )}
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-[var(--color-ivory-100)]" />}>
      <ResetPasswordForm />
    </React.Suspense>
  );
}
