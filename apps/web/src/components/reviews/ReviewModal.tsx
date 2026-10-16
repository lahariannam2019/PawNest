'use client';

import * as React from 'react';
import { Star, X, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { apiFetch } from '../../lib/api/client';
import { ProviderReviewSummary } from '@pawnest/shared';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  providerSlug: string;
  providerName: string;
  onSuccess?: () => void;
}

export function ReviewModal({
  isOpen,
  onClose,
  bookingId,
  providerSlug,
  providerName,
  onSuccess,
}: ReviewModalProps) {
  const [rating, setRating] = React.useState(5);
  const [hoverRating, setHoverRating] = React.useState<number | null>(null);
  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isSuccess, setIsSuccess] = React.useState(false);

  if (!isOpen) return null;

  const ratingLabels = ['', 'Disappointing', 'Acceptable', 'Pleasant', 'Very Thoughtful', 'Exceptional Care'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (rating < 1 || rating > 5) {
      setError('Please select a star rating between 1 and 5');
      return;
    }

    try {
      setIsSubmitting(true);
      await apiFetch<{ review: ProviderReviewSummary }>(`/providers/${providerSlug}/reviews`, {
        method: 'POST',
        body: JSON.stringify({
          bookingId,
          rating,
          title: title.trim() || undefined,
          body: body.trim() || undefined,
        }),
      });

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-[var(--radius-2xl)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] shadow-2xl p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-sage-700)]">
              Verified Experience Reflection
            </span>
            <h3 className="font-serif text-2xl font-medium text-[var(--color-charcoal-900)] mt-0.5">
              Share your thoughts
            </h3>
            <p className="text-xs text-[var(--color-charcoal-600)] mt-1">
              Your feedback for <span className="font-semibold text-[var(--color-charcoal-800)]">{providerName}</span> helps other pet parents make informed choices.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[var(--color-charcoal-400)] hover:text-[var(--color-charcoal-800)] hover:bg-[var(--color-ivory-200)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-serif text-lg font-medium text-[var(--color-charcoal-900)]">
              Thank you for sharing!
            </h4>
            <p className="text-xs text-[var(--color-charcoal-600)]">
              Your reflection has been submitted and shared with the PawNest community.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3.5 rounded-[var(--radius-lg)] bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{error}</div>
              </div>
            )}

            {/* Star Rating Picker */}
            <div className="space-y-2 text-center py-2">
              <label className="block text-xs font-semibold text-[var(--color-charcoal-700)] uppercase tracking-wider">
                Overall Rating
              </label>
              <div className="flex items-center justify-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = (hoverRating ?? rating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => setRating(star)}
                      className="p-1 transition-transform hover:scale-110 active:scale-95 focus:outline-none"
                    >
                      <Star
                        className={`w-7 h-7 transition-colors ${
                          active
                            ? 'text-amber-500 fill-amber-400'
                            : 'text-[var(--color-charcoal-300)]'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <p className="text-xs font-serif italic text-[var(--color-sage-700)] h-4">
                {ratingLabels[hoverRating ?? rating]}
              </p>
            </div>

            {/* Review Title */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--color-charcoal-800)]">
                Headline (optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Luna came home calm, trimmed and joyful!"
                maxLength={100}
                className="w-full px-3.5 py-2.5 rounded-[var(--radius-lg)] bg-white border border-[var(--color-ivory-300)] text-xs text-[var(--color-charcoal-900)] placeholder:text-[var(--color-charcoal-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-sage-500)]"
              />
            </div>

            {/* Review Body */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--color-charcoal-800)]">
                Your Reflection
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                placeholder="Describe the handler's patience, the facilities, or how your pet felt during the visit..."
                maxLength={2000}
                className="w-full px-3.5 py-2.5 rounded-[var(--radius-lg)] bg-white border border-[var(--color-ivory-300)] text-xs text-[var(--color-charcoal-900)] placeholder:text-[var(--color-charcoal-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-sage-500)] leading-relaxed"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                Submit Reflection
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
