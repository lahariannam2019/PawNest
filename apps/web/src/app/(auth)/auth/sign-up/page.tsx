'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthShell } from '../../../../components/auth/AuthShell';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import { useAuth } from '../../../../lib/auth/AuthContext';
import { ApiError } from '../../../../lib/api/client';

export default function SignUpPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [agreed, setAgreed] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      setError('Please agree to the Terms of Service to continue.');
      return;
    }

    if (password.length < 10) {
      setError('Password must be at least 10 characters long.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await register(name, email, password, phone || undefined);
      router.push('/dashboard/pets/new');
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.problem.detail || 'Failed to create account.');
      } else {
        setError('Something went wrong. Please check your details.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account."
      subtitle="Begin with your pet profile. Seamlessly book vetted grooming, boarding, and veterinary visits."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3.5 rounded-[var(--radius-md)] bg-[var(--color-peach-50)] border border-[var(--color-peach-400)] text-xs text-[var(--color-danger)] font-medium">
            {error}
          </div>
        )}

        <Input
          label="Your Full Name"
          type="text"
          placeholder="Maya Lin"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <Input
          label="Email Address"
          type="email"
          placeholder="maya@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          label="Phone Number (Optional)"
          type="tel"
          placeholder="+1 (555) 000-0000"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <div>
          <Input
            label="Password"
            type="password"
            placeholder="At least 10 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            helperText="Minimum 10 characters for account security"
            required
          />
        </div>

        <div className="flex items-start gap-2.5 pt-2 text-xs text-[var(--color-charcoal-700)]">
          <input
            type="checkbox"
            id="terms"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 rounded border-[var(--color-ivory-300)] text-[var(--color-sage-700)] focus:ring-[var(--color-sage-500)]"
            required
          />
          <label htmlFor="terms" className="leading-snug">
            I agree to PawNest’s{' '}
            <Link href="/legal/terms" className="underline font-semibold hover:text-[var(--color-sage-700)]">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/legal/privacy" className="underline font-semibold hover:text-[var(--color-sage-700)]">
              Privacy Policy
            </Link>
            .
          </label>
        </div>

        <Button type="submit" variant="primary" size="md" className="w-full h-[52px]" isLoading={isLoading}>
          Create Account & Add Pet
        </Button>

        <p className="text-center text-xs text-[var(--color-charcoal-600)] pt-4">
          Already have an account?{' '}
          <Link href="/auth/sign-in" className="font-semibold text-[var(--color-sage-700)] hover:underline">
            Sign In
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
