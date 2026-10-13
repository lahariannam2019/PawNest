'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '../../../components/layout/Header';
import { Footer } from '../../../components/layout/Footer';
import { Container } from '../../../components/layout/Container';
import { Card, CardHeader, CardContent, CardFooter } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useAuth } from '../../../lib/auth/AuthContext';
import { apiFetch, ApiError } from '../../../lib/api/client';
import { useMotionPreference } from '../../../lib/motion/useReducedMotion';
import { Shield, Download, Trash2, CheckCircle2 } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { user, refreshUser, logout } = useAuth();
  const { reduceMotion, toggleReduceMotion } = useMotionPreference();

  // Profile Form state
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [notifyEmail, setNotifyEmail] = React.useState(true);
  const [profileMsg, setProfileMsg] = React.useState('');
  const [profileLoading, setProfileLoading] = React.useState(false);

  // Password Change state
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [passwordMsg, setPasswordMsg] = React.useState('');
  const [passwordError, setPasswordError] = React.useState('');
  const [passwordLoading, setPasswordLoading] = React.useState(false);

  React.useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone || '');
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg('');

    try {
      await apiFetch('/me', {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          phone: phone || null,
          notifyEmail,
        }),
      });
      await refreshUser();
      setProfileMsg('Profile updated successfully.');
    } catch {
      setProfileMsg('Failed to update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordMsg('');
    setPasswordError('');

    try {
      await apiFetch('/me/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setPasswordMsg('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      if (err instanceof ApiError) {
        setPasswordError(err.problem.detail);
      } else {
        setPasswordError('Failed to change password.');
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleExportData = async () => {
    const data = await apiFetch<any>('/me/export');
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pawnest-data-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone and will anonymize your pet and profile data.'
    );
    if (!confirmed) return;

    await apiFetch('/me', { method: 'DELETE' });
    await logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-ivory-100)]">
      <Header />
      <main className="flex-1 py-12 md:py-16">
        <Container size="narrow">
          <div className="space-y-1 mb-8">
            <h1 className="text-3xl sm:text-4xl font-serif text-[var(--color-charcoal-900)]">
              Account & Preferences
            </h1>
            <p className="text-sm text-[var(--color-charcoal-600)]">
              Manage personal details, notification rules, security, and privacy data.
            </p>
          </div>

          <div className="space-y-8">
            {/* 1. Profile Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-xl text-[var(--color-charcoal-900)]">Personal Details</h3>
                  <Badge variant={user?.emailVerified ? 'sage' : 'peach'}>
                    {user?.emailVerified ? 'Email Verified' : 'Email Pending'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  {profileMsg && (
                    <p className="text-xs font-semibold text-[var(--color-success)] flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{profileMsg}</span>
                    </p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Full Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                    <Input
                      label="Email Address"
                      value={user?.email || ''}
                      disabled
                      helperText="Contact support to change email"
                    />
                  </div>
                  <Input
                    label="Phone Number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                  />

                  <div className="pt-2 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold text-[var(--color-charcoal-900)] block">
                        Email Notifications
                      </span>
                      <span className="text-xs text-[var(--color-charcoal-600)]">
                        Receive booking confirmations and reminder updates
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifyEmail}
                      onChange={(e) => setNotifyEmail(e.target.checked)}
                      className="rounded border-[var(--color-ivory-300)] text-[var(--color-sage-700)] focus:ring-[var(--color-sage-500)]"
                    />
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button type="submit" variant="primary" size="sm" isLoading={profileLoading}>
                      Save Changes
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* 2. Motion & Accessibility Settings */}
            <Card>
              <CardHeader>
                <h3 className="font-serif text-xl text-[var(--color-charcoal-900)]">Accessibility & Motion</h3>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="max-w-md">
                    <span className="text-sm font-semibold text-[var(--color-charcoal-900)] block">
                      Reduce Motion Mode
                    </span>
                    <span className="text-xs text-[var(--color-charcoal-600)] leading-relaxed">
                      Replaces parallax scrolling, 3D animations, and spring transitions with instant, gentle opacity fades.
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant={reduceMotion ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={toggleReduceMotion}
                  >
                    {reduceMotion ? 'Active' : 'Enable'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 3. Security: Password Change */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[var(--color-sage-700)]" />
                  <h3 className="font-serif text-xl text-[var(--color-charcoal-900)]">Security & Password</h3>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  {passwordMsg && (
                    <p className="text-xs font-semibold text-[var(--color-success)] flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{passwordMsg}</span>
                    </p>
                  )}
                  {passwordError && (
                    <p className="text-xs font-semibold text-[var(--color-danger)]">{passwordError}</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Current Password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                    <Input
                      label="New Password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      helperText="Minimum 10 characters"
                      required
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" variant="secondary" size="sm" isLoading={passwordLoading}>
                      Update Password
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* 4. Privacy & Data Rights */}
            <Card>
              <CardHeader>
                <h3 className="font-serif text-xl text-[var(--color-charcoal-900)]">Privacy & Data Management</h3>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between border-b border-[var(--color-ivory-300)] pb-4">
                  <div>
                    <span className="text-sm font-semibold text-[var(--color-charcoal-900)] block">
                      Export My Data
                    </span>
                    <span className="text-xs text-[var(--color-charcoal-600)]">
                      Download a JSON archive of all your pet profiles, appointment records, and orders.
                    </span>
                  </div>
                  <Button variant="secondary" size="sm" onClick={handleExportData} className="gap-2">
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-[var(--color-danger)] block">
                      Delete Account
                    </span>
                    <span className="text-xs text-[var(--color-charcoal-600)]">
                      Permanently anonymize your personal identifying data and end active sessions.
                    </span>
                  </div>
                  <Button
                    variant="peach"
                    size="sm"
                    onClick={handleDeleteAccount}
                    className="gap-2 text-[var(--color-danger)] border border-[var(--color-danger)]/30 hover:bg-[var(--color-danger)]/10"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
