'use client';

import * as React from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { useAuth } from '../../lib/auth/AuthContext';
import { apiFetch } from '../../lib/api/client';
import { FavouriteKind } from '@pawnest/shared';
import { useRouter } from 'next/navigation';

interface FavouriteButtonProps {
  kind: FavouriteKind;
  id: string;
  className?: string;
  initialFavourited?: boolean;
  onToggle?: (isFavourited: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
}

export function FavouriteButton({
  kind,
  id,
  className = '',
  initialFavourited = false,
  onToggle,
  size = 'md',
}: FavouriteButtonProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isFavourited, setIsFavourited] = React.useState(initialFavourited);
  const [isAnimating, setIsAnimating] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);

  React.useEffect(() => {
    setIsFavourited(initialFavourited);
  }, [initialFavourited]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      try {
        sessionStorage.setItem(
          'pawnest_pending_action',
          JSON.stringify({
            type: 'favourite',
            kind,
            id,
          })
        );
      } catch {}
      router.push(`/auth/sign-in?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    if (isPending) return;

    // Immediate visual feedback without faking success
    setIsPending(true);

    try {
      const res = await apiFetch<{ isFavourited: boolean }>('/me/favourites', {
        method: 'POST',
        body: JSON.stringify({ kind, id }),
      });
      // Update state only after server confirmation
      setIsFavourited(res.isFavourited);
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 300);

      if (onToggle) {
        onToggle(res.isFavourited);
      }
    } catch (err) {
      console.error('Failed to update favourite:', err);
    } finally {
      setIsPending(false);
    }
  };

  const sizeClasses = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      aria-busy={isPending}
      aria-label={isFavourited ? 'Remove from favourites' : 'Save to favourites'}
      className={`relative inline-flex items-center justify-center rounded-full transition-transform active:scale-90 disabled:opacity-80 disabled:cursor-not-allowed ${
        sizeClasses[size]
      } ${
        isFavourited
          ? 'bg-rose-50 text-rose-600 border border-rose-200 shadow-sm'
          : 'bg-white/80 backdrop-blur-sm text-[var(--color-charcoal-500)] hover:text-rose-500 border border-[var(--color-ivory-300)] shadow-sm'
      } ${className}`}
    >
      {isPending ? (
        <Loader2 className={`${iconSizes[size]} animate-spin text-rose-500`} />
      ) : (
        <Heart
          className={`${iconSizes[size]} transition-all duration-200 ${
            isFavourited ? 'fill-rose-500 text-rose-500' : 'fill-transparent'
          } ${isAnimating ? 'scale-125' : 'scale-100'}`}
        />
      )}
    </button>
  );
}
