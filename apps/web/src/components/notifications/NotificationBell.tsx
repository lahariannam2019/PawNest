'use client';

import * as React from 'react';
import { Bell, CheckCheck, Clock, ExternalLink, X } from 'lucide-react';
import { apiFetch } from '../../lib/api/client';
import { NotificationSummary, NotificationListResponse } from '@pawnest/shared';
import { useRouter } from 'next/navigation';

export function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<NotificationSummary[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);
  const popoverRef = React.useRef<HTMLDivElement>(null);

  const fetchNotifications = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await apiFetch<NotificationListResponse>('/notifications?limit=15');
      setNotifications(res.items);
      setUnreadCount(res.unreadCount);
    } catch {
      // Quiet fail if not logged in or network issue
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // 30s polling
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (id: string, linkUrl?: string | null) => {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'POST' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      if (linkUrl) {
        setIsOpen(false);
        router.push(linkUrl);
      }
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiFetch('/notifications/read-all', { method: 'POST' });
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read', err);
    }
  };

  const formatRelativeTime = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        aria-label="View notifications"
        className="relative p-2 rounded-full text-[var(--color-charcoal-600)] hover:text-[var(--color-charcoal-900)] hover:bg-[var(--color-ivory-200)] transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold leading-none animate-in zoom-in-50">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-[var(--radius-xl)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="px-4 py-3 bg-[var(--color-ivory-100)] border-b border-[var(--color-ivory-300)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-serif text-sm font-semibold text-[var(--color-charcoal-900)]">
                Activity & Alerts
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-sage-700)] hover:underline"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[var(--color-charcoal-400)] hover:text-[var(--color-charcoal-700)] p-1 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-[var(--color-ivory-200)]">
            {isLoading && notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--color-charcoal-500)]">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-[var(--color-ivory-200)] flex items-center justify-center mx-auto text-[var(--color-charcoal-400)]">
                  <Bell className="w-5 h-5" />
                </div>
                <p className="text-xs font-serif font-medium text-[var(--color-charcoal-800)]">
                  All caught up!
                </p>
                <p className="text-[11px] text-[var(--color-charcoal-500)]">
                  Care reminders, booking updates, and order alerts will appear here.
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = !n.readAt;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleMarkAsRead(n.id, n.linkUrl)}
                    className={`p-3.5 text-left transition-colors cursor-pointer flex gap-3 ${
                      isUnread
                        ? 'bg-[var(--color-ivory-100)]/70 hover:bg-[var(--color-ivory-200)]/50'
                        : 'hover:bg-[var(--color-ivory-100)]'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isUnread ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-4 ring-rose-100" />
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full bg-transparent" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-xs font-medium truncate ${
                            isUnread
                              ? 'text-[var(--color-charcoal-900)] font-semibold'
                              : 'text-[var(--color-charcoal-700)]'
                          }`}
                        >
                          {n.title}
                        </p>
                        <span className="text-[10px] text-[var(--color-charcoal-400)] shrink-0 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {formatRelativeTime(n.createdAt)}
                        </span>
                      </div>

                      <p className="text-[11px] text-[var(--color-charcoal-600)] line-clamp-2 leading-relaxed">
                        {n.body}
                      </p>

                      {n.linkUrl && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--color-sage-700)] hover:underline pt-0.5">
                          <span>View details</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
