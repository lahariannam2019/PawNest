'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  Truck,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { Container } from '../../components/layout/Container';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useCart } from '../../lib/cart/CartContext';
import { useAuth } from '../../lib/auth/AuthContext';

export default function CartPage() {
  const router = useRouter();
  const { cart, isLoading, updateItem, removeItem, itemCount } = useCart();
  const { user } = useAuth();

  const subtotal = cart?.subtotalCents || 0;
  const threshold = cart?.freeShippingThresholdCents || 7500;
  const progressPercent = Math.min(100, Math.round((subtotal / threshold) * 100));
  const amountToFreeShipping = Math.max(0, threshold - subtotal);

  const handleCheckoutClick = () => {
    if (!user) {
      router.push('/auth/sign-in?next=/checkout');
    } else {
      router.push('/checkout');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-ivory-100)]">
      <Header />

      <main className="flex-1 py-10 md:py-16">
        <Container>
          {/* Header */}
          <div className="mb-8 space-y-2">
            <Link
              href="/supplies"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-sage-700)] hover:text-[var(--color-sage-800)] transition-colors mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Continue Shopping
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="font-serif text-3xl md:text-4xl text-[var(--color-charcoal-900)]">
                Shopping Cart
              </h1>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--color-sage-100)] text-[var(--color-sage-800)] border border-[var(--color-sage-300)]">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </span>
            </div>
          </div>

          {!cart || cart.items.length === 0 ? (
            <div className="max-w-md mx-auto text-center py-16 px-6 rounded-[var(--radius-xl)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] shadow-sm space-y-4">
              <div className="w-16 h-16 rounded-full bg-[var(--color-ivory-200)] flex items-center justify-center mx-auto text-[var(--color-charcoal-400)]">
                <ShoppingBag className="w-8 h-8 stroke-[1.5]" />
              </div>
              <div className="space-y-1">
                <h2 className="font-serif text-xl font-medium text-[var(--color-charcoal-900)]">
                  Your cart is currently empty
                </h2>
                <p className="text-xs text-[var(--color-charcoal-500)] max-w-sm mx-auto">
                  Browse our curated catalogue of organic food, wholesome treats, orthopedic lounge beds, and enrichment essentials.
                </p>
              </div>
              <Link href="/supplies">
                <Button variant="primary" className="text-xs mt-2">
                  Discover Supplies
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              {/* Left Column: Items Table */}
              <div className="lg:col-span-8 space-y-6">
                {/* Free Shipping Alert Bar */}
                <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--color-sage-50)] border border-[var(--color-sage-200)] space-y-2">
                  <div className="flex items-center justify-between text-xs text-[var(--color-charcoal-800)] font-medium">
                    {amountToFreeShipping === 0 ? (
                      <span className="flex items-center gap-1.5 text-[var(--color-sage-800)] font-semibold">
                        <Sparkles className="w-4 h-4 text-[var(--color-sage-600)]" />
                        You have unlocked Free Standard Shipping!
                      </span>
                    ) : (
                      <span>
                        Add <strong className="text-[var(--color-charcoal-900)]">${(amountToFreeShipping / 100).toFixed(2)}</strong> more to your bag for Free Shipping
                      </span>
                    )}
                    <span className="text-[11px] font-semibold text-[var(--color-sage-700)]">
                      {progressPercent}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[var(--color-sage-200)] overflow-hidden">
                    <div
                      className="h-full bg-[var(--color-sage-600)] rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Items Container */}
                <div className="rounded-[var(--radius-xl)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] shadow-[var(--shadow-1)] overflow-hidden divide-y divide-[var(--color-ivory-200)]">
                  {cart.items.map((item) => (
                    <div key={item.id} className="p-6 flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between">
                      <div className="flex gap-4 items-center min-w-0">
                        {/* Thumbnail */}
                        <div className="w-20 h-20 rounded-[var(--radius-md)] overflow-hidden bg-[var(--color-ivory-200)] border border-[var(--color-ivory-300)] flex-shrink-0 relative">
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

                        {/* Description */}
                        <div className="space-y-1 min-w-0">
                          <Link
                            href={`/supplies/p/${item.productSlug}`}
                            className="text-sm font-serif font-medium text-[var(--color-charcoal-900)] hover:text-[var(--color-sage-700)] transition-colors line-clamp-1"
                          >
                            {item.productName}
                          </Link>
                          <p className="text-xs text-[var(--color-charcoal-500)]">
                            {item.variantName} · SKU: {item.sku}
                          </p>
                          <p className="text-xs font-semibold text-[var(--color-charcoal-800)] sm:hidden">
                            ${(item.unitPriceCents / 100).toFixed(2)} each
                          </p>
                        </div>
                      </div>

                      {/* Controls & Price */}
                      <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-0 border-[var(--color-ivory-200)]">
                        {/* Stepper */}
                        <div className="flex items-center rounded-full border border-[var(--color-ivory-300)] bg-[var(--color-ivory-100)] p-1">
                          <button
                            onClick={() => updateItem(item.id, Math.max(1, item.quantity - 1))}
                            disabled={isLoading || item.quantity <= 1}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--color-charcoal-700)] hover:bg-[var(--color-ivory-200)] disabled:opacity-40 transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center text-xs font-semibold text-[var(--color-charcoal-900)]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateItem(item.id, Math.min(20, item.quantity + 1))}
                            disabled={isLoading || item.quantity >= 20 || item.quantity >= item.availableStock}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--color-charcoal-700)] hover:bg-[var(--color-ivory-200)] disabled:opacity-40 transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Line Total */}
                        <div className="text-right min-w-[70px]">
                          <span className="font-serif text-base font-bold text-[var(--color-charcoal-900)]">
                            ${(item.totalPriceCents / 100).toFixed(2)}
                          </span>
                        </div>

                        {/* Remove */}
                        <button
                          onClick={() => removeItem(item.id)}
                          disabled={isLoading}
                          aria-label="Remove item"
                          className="p-1.5 text-[var(--color-charcoal-400)] hover:text-[var(--color-clay-600)] transition-colors rounded-full hover:bg-[var(--color-ivory-200)]"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Order Summary Card */}
              <div className="lg:col-span-4 space-y-4">
                <div className="p-6 rounded-[var(--radius-xl)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] shadow-[var(--shadow-1)] space-y-4">
                  <h2 className="font-serif text-lg font-medium text-[var(--color-charcoal-900)] border-b border-[var(--color-ivory-300)] pb-3">
                    Order Summary
                  </h2>

                  <div className="space-y-2.5 text-xs text-[var(--color-charcoal-600)]">
                    <div className="flex justify-between">
                      <span>Subtotal ({itemCount} items)</span>
                      <span className="font-medium text-[var(--color-charcoal-900)]">
                        ${(cart.subtotalCents / 100).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span className="font-medium text-[var(--color-charcoal-900)]">
                        {cart.shippingCents === 0 ? (
                          <span className="text-[var(--color-sage-700)] font-semibold">FREE</span>
                        ) : (
                          `$${(cart.shippingCents / 100).toFixed(2)}`
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span>Estimated Sales Tax (8.875%)</span>
                      <span className="font-medium text-[var(--color-charcoal-900)]">
                        ${(cart.taxCents / 100).toFixed(2)}
                      </span>
                    </div>

                    <div className="pt-3 border-t border-[var(--color-ivory-300)] flex justify-between items-baseline text-sm font-semibold text-[var(--color-charcoal-900)]">
                      <span>Estimated Total</span>
                      <span className="font-serif text-xl font-bold">
                        ${(cart.totalCents / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    className="w-full py-3.5 justify-center text-sm font-semibold"
                    onClick={handleCheckoutClick}
                    disabled={isLoading}
                  >
                    Proceed to Checkout
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>

                  <div className="pt-2 border-t border-[var(--color-ivory-200)] space-y-2 text-[11px] text-[var(--color-charcoal-500)]">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-sage-600)]" />
                      <span>Labelled Demo & Stripe test payments supported</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-[var(--color-sage-600)]" />
                      <span>Estimated delivery: 2–4 business days</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Container>
      </main>

      <Footer />
    </div>
  );
}
