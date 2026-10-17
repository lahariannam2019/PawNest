'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthShell } from '../../../../components/auth/AuthShell';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import { useAuth } from '../../../../lib/auth/AuthContext';
import { ApiError, apiFetch } from '../../../../lib/api/client';

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get('next') || '/dashboard';
  const { login } = useAuth();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(email, password);

      // Execute pending guest action if present
      try {
        const pendingStr = sessionStorage.getItem('pawnest_pending_action');
        if (pendingStr) {
          sessionStorage.removeItem('pawnest_pending_action');
          const pending = JSON.parse(pendingStr);
          if (pending.type === 'add_to_cart' && pending.variantId) {
            await apiFetch('/cart/items', {
              method: 'POST',
              body: JSON.stringify({
                variantId: pending.variantId,
                quantity: pending.quantity || 1,
              }),
            });
          } else if (pending.type === 'favourite' && pending.kind && pending.id) {
            await apiFetch('/me/favourites', {
              method: 'POST',
              body: JSON.stringify({
                kind: pending.kind,
                id: pending.id,
              }),
            });
          }
        }
      } catch (pendingErr) {
        console.error('Failed to execute pending action after login:', pendingErr);
      }

      router.push(nextUrl);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.problem.detail || 'Invalid email or password');
      } else {
        setError('Unable to sign in. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back."
      subtitle="Sign in to manage your companions, upcoming care appointments, and orders."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3.5 rounded-[var(--radius-md)] bg-[var(--color-peach-50)] border border-[var(--color-peach-400)] text-xs text-[var(--color-danger)] font-medium">
            {error}
          </div>
        )}

        <Input
          label="Email Address"
          type="email"
          placeholder="maya@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div className="space-y-1">
          <Input
            label="Password"
            type="password"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <div className="flex justify-end pt-1">
            <Link
              href="/auth/forgot-password"
              className="text-xs font-semibold text-[var(--color-sage-700)] hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <Button type="submit" variant="primary" size="md" className="w-full h-[52px]" isLoading={isLoading}>
          Sign In
        </Button>

        <p className="text-center text-xs text-[var(--color-charcoal-600)] pt-4">
          Don’t have a pet profile yet?{' '}
          <Link href="/auth/sign-up" className="font-semibold text-[var(--color-sage-700)] hover:underline">
            Create an account
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

export default function SignInPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-[var(--color-ivory-100)]" />}>
      <SignInForm />
    </React.Suspense>
  );
}
