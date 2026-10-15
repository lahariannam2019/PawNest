'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useCart } from '../../lib/cart/CartContext';
import { useAuth } from '../../lib/auth/AuthContext';
import { Button } from '../ui/Button';

export function CartDrawer() {
  const { cart, isOpen, closeCart, updateItem, removeItem, isLoading, itemCount } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  // Close on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeCart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeCart]);

  // Lock body scroll when drawer is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const subtotal = cart?.subtotalCents || 0;
  const threshold = cart?.freeShippingThresholdCents || 7500;
  const progressPercent = Math.min(100, Math.round((subtotal / threshold) * 100));
  const amountToFreeShipping = Math.max(0, threshold - subtotal);

  const handleCheckoutClick = () => {
    closeCart();
    if (!user) {
      router.push('/auth/sign-in?next=/checkout');
    } else {
      router.push('/checkout');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-fade-in" aria-modal="true" role="dialog">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={closeCart}
      />

      {/* Slide-over panel */}
      <div className="relative w-full max-w-md bg-[var(--color-ivory-50)] shadow-[var(--shadow-3)] h-full flex flex-col z-10 border-l border-[var(--color-ivory-300)]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--color-ivory-300)] flex items-center justify-between bg-[var(--color-ivory-100)]/70">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[var(--color-sage-700)]" />
            <h2 className="font-serif text-lg font-medium text-[var(--color-charcoal-900)]">
              Your Cart
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--color-sage-100)] text-[var(--color-sage-800)] border border-[var(--color-sage-300)]">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
          </div>
          <button
            onClick={closeCart}
            aria-label="Close cart"
            className="p-1.5 rounded-full text-[var(--color-charcoal-500)] hover:text-[var(--color-charcoal-900)] hover:bg-[var(--color-ivory-200)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Shipping Progress Bar */}
        <div className="px-6 py-3 bg-[var(--color-sage-50)] border-b border-[var(--color-sage-200)]/60">
          <div className="flex items-center justify-between text-xs text-[var(--color-charcoal-700)] mb-1.5 font-medium">
            {amountToFreeShipping === 0 ? (
              <span className="flex items-center gap-1.5 text-[var(--color-sage-800)] font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-[var(--color-sage-600)]" />
                You’ve qualified for Free Standard Shipping!
              </span>
            ) : (
              <span>
                Add <strong className="text-[var(--color-charcoal-900)]">${(amountToFreeShipping / 100).toFixed(2)}</strong> more for Free Shipping
              </span>
            )}
            <span className="text-[11px] text-[var(--color-charcoal-500)]">{progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-[var(--color-sage-200)] overflow-hidden">
            <div
              className="h-full bg-[var(--color-sage-600)] rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-[var(--color-ivory-200)]">
          {!cart || cart.items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-[var(--color-ivory-200)] flex items-center justify-center text-[var(--color-charcoal-400)]">
                <ShoppingBag className="w-8 h-8 stroke-[1.5]" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-lg text-[var(--color-charcoal-800)]">Your cart is empty</h3>
                <p className="text-xs text-[var(--color-charcoal-500)] max-w-xs">
                  Discover thoughtfully crafted recipes, orthopaedic beds, organic wellness chews, and sensory toys.
                </p>
              </div>
              <Link
                href="/supplies"
                onClick={closeCart}
                className="mt-2 inline-flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-full bg-[var(--color-sage-700)] text-[var(--color-ivory-50)] hover:bg-[var(--color-sage-800)] transition-colors shadow-sm"
              >
                Browse Pet Supplies
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            cart.items.map((item) => (
              <div key={item.id} className="py-4 flex gap-4 items-start">
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-[var(--radius-md)] overflow-hidden bg-[var(--color-ivory-200)] border border-[var(--color-ivory-300)] flex-shrink-0 relative">
                  {item.imageKey ? (
                    <Image
                      src={item.imageKey}
                      alt={item.productName}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-[var(--color-charcoal-400)]">
                      PawNest
                    </div>
                  )}
                </div>

                {/* Info & Stepper */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/supplies/p/${item.productSlug}`}
                      onClick={closeCart}
                      className="text-xs font-semibold text-[var(--color-charcoal-900)] hover:text-[var(--color-sage-700)] transition-colors line-clamp-1"
                    >
                      {item.productName}
                    </Link>
                    <button
                      onClick={() => removeItem(item.id)}
                      disabled={isLoading}
                      aria-label="Remove item"
                      className="text-[var(--color-charcoal-400)] hover:text-[var(--color-clay-600)] transition-colors p-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-[11px] text-[var(--color-charcoal-500)] mt-0.5">
                    {item.variantName}
                  </p>

                  {item.availableStock <= 3 && item.availableStock > 0 && (
                    <span className="inline-block mt-1 text-[10px] font-semibold text-[var(--color-clay-600)] bg-[var(--color-clay-50)] px-1.5 py-0.5 rounded border border-[var(--color-clay-200)]">
                      Only {item.availableStock} left
                    </span>
                  )}

                  <div className="flex items-center justify-between mt-3">
                    {/* Stepper */}
                    <div className="flex items-center rounded-full border border-[var(--color-ivory-300)] bg-[var(--color-ivory-100)] p-0.5">
                      <button
                        onClick={() => updateItem(item.id, Math.max(1, item.quantity - 1))}
                        disabled={isLoading || item.quantity <= 1}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--color-charcoal-700)] hover:bg-[var(--color-ivory-200)] disabled:opacity-40 transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-xs font-semibold text-[var(--color-charcoal-800)]">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateItem(item.id, Math.min(20, item.quantity + 1))}
                        disabled={isLoading || item.quantity >= 20 || item.quantity >= item.availableStock}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--color-charcoal-700)] hover:bg-[var(--color-ivory-200)] disabled:opacity-40 transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="text-xs font-serif font-bold text-[var(--color-charcoal-900)]">
                      ${(item.totalPriceCents / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer / Summary */}
        {cart && cart.items.length > 0 && (
          <div className="p-6 border-t border-[var(--color-ivory-300)] bg-[var(--color-ivory-100)]/80 space-y-3">
            <div className="space-y-1.5 text-xs text-[var(--color-charcoal-600)]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-medium text-[var(--color-charcoal-800)]">
                  ${(cart.subtotalCents / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Standard Shipping</span>
                <span className="font-medium text-[var(--color-charcoal-800)]">
                  {cart.shippingCents === 0 ? (
                    <span className="text-[var(--color-sage-700)] font-semibold">FREE</span>
                  ) : (
                    `$${(cart.shippingCents / 100).toFixed(2)}`
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Sales Tax</span>
                <span className="font-medium text-[var(--color-charcoal-800)]">
                  ${(cart.taxCents / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[var(--color-ivory-300)] text-sm font-semibold text-[var(--color-charcoal-900)]">
                <span>Total</span>
                <span className="font-serif text-base">
                  ${(cart.totalCents / 100).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <Button
                variant="primary"
                className="w-full justify-center text-sm py-3"
                onClick={handleCheckoutClick}
                disabled={isLoading}
              >
                Proceed to Checkout
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>

              <Link
                href="/cart"
                onClick={closeCart}
                className="block text-center text-xs text-[var(--color-charcoal-600)] hover:text-[var(--color-sage-700)] underline py-1 transition-colors"
              >
                View full cart and shipping details
              </Link>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-[var(--color-charcoal-500)] pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-sage-600)]" />
              <span>Labelled Demo & Stripe test checkout supported</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
