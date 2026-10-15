'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Truck,
  CreditCard,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowLeft,
} from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { Container } from '../../components/layout/Container';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useCart } from '../../lib/cart/CartContext';
import { useAuth } from '../../lib/auth/AuthContext';
import { apiFetch, ApiError } from '../../lib/api/client';
import {
  PaymentMode,
  OrderStatus,
  CheckoutSessionResult,
  OrderSummary,
  ShippingAddressInput,
} from '@pawnest/shared';

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, refreshCart, clearCart } = useCart();
  const { user, isLoading: isAuthLoading } = useAuth();

  const [shippingAddress, setShippingAddress] = React.useState<ShippingAddressInput>({
    recipient: '',
    line1: '',
    line2: '',
    city: '',
    region: 'NY',
    postalCode: '',
    country: 'US',
    phone: '',
  });

  const [paymentMode, setPaymentMode] = React.useState<PaymentMode>(PaymentMode.DEMO);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = React.useState<OrderSummary | null>(null);

  // Prefill user details if logged in
  React.useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/auth/sign-in?next=/checkout');
      return;
    }

    if (user) {
      setShippingAddress((prev) => ({
        ...prev,
        recipient: prev.recipient || user.name || '',
        phone: prev.phone || user.phone || '',
      }));
    }
  }, [user, isAuthLoading, router]);

  const subtotal = cart?.subtotalCents || 0;
  const shipping = cart?.shippingCents || 0;
  const tax = cart?.taxCents || 0;
  const total = cart?.totalCents || 0;

  const handleInputChange = (field: keyof ShippingAddressInput, value: string) => {
    setShippingAddress((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!cart || cart.items.length === 0) {
      setErrorMessage('Your cart is empty');
      return;
    }

    if (!shippingAddress.recipient || !shippingAddress.line1 || !shippingAddress.city || !shippingAddress.postalCode) {
      setErrorMessage('Please fill in all required shipping address fields');
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. Create Checkout Session with re-quote and stock reservation
      const sessionRes = await apiFetch<{ session: CheckoutSessionResult }>('/checkout/session', {
        method: 'POST',
        headers: {
          'idempotency-key': `chk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        },
        body: JSON.stringify({
          shippingAddress,
          clientExpectedTotalCents: total,
          paymentMode,
        }),
      });

      const session = sessionRes.session;

      // 2. Complete payment based on mode
      if (paymentMode === PaymentMode.DEMO) {
        if (!session.demoToken) {
          throw new Error('Demo token missing from checkout session');
        }

        // Confirm Demo order (transitions to DEMO_PLACED)
        const confirmRes = await apiFetch<{ order: OrderSummary }>('/checkout/demo/confirm', {
          method: 'POST',
          body: JSON.stringify({ demoToken: session.demoToken }),
        });

        clearCart();
        setConfirmedOrder(confirmRes.order);
      } else {
        // Stripe flow
        if (session.checkoutUrl) {
          window.location.href = session.checkoutUrl;
        } else {
          throw new Error('Stripe checkout URL missing');
        }
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      if (err instanceof ApiError && err.problem.code === 'CART_CHANGED') {
        setErrorMessage(
          'Prices or stock levels have updated since you started checkout. We have refreshed your cart with current prices.'
        );
        await refreshCart();
      } else {
        setErrorMessage(err.message || 'Failed to place order. Please review your details and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (confirmedOrder) {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--color-ivory-100)]">
        <Header />
        <main className="flex-1 py-16">
          <Container>
            <div className="max-w-xl mx-auto rounded-[var(--radius-xl)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] p-8 shadow-[var(--shadow-2)] text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-[var(--color-sage-100)] text-[var(--color-sage-700)] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <Badge variant="demo">Demo Order Placed</Badge>
                <h1 className="font-serif text-3xl font-medium text-[var(--color-charcoal-900)]">
                  Thank You, {confirmedOrder.shippingAddress.recipient}!
                </h1>
                <p className="text-xs text-[var(--color-charcoal-600)]">
                  Order Number: <strong className="text-[var(--color-charcoal-900)]">{confirmedOrder.number}</strong>
                </p>
              </div>

              {/* Demo Badge Callout */}
              <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--color-sage-50)] border border-[var(--color-sage-200)] text-xs text-[var(--color-sage-900)] space-y-1 text-left">
                <p className="font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[var(--color-sage-700)]" />
                  Labelled Demo Transaction
                </p>
                <p className="text-[11px] text-[var(--color-sage-800)]">
                  No payment was taken. This order status is recorded as <strong>DEMO_PLACED</strong> and appears in your customer dashboard order history.
                </p>
              </div>

              {/* Order Breakdown */}
              <div className="pt-4 border-t border-[var(--color-ivory-200)] space-y-2 text-xs text-[var(--color-charcoal-700)] text-left">
                <div className="flex justify-between">
                  <span>Shipping Address:</span>
                  <span className="font-medium text-[var(--color-charcoal-900)]">
                    {confirmedOrder.shippingAddress.line1}, {confirmedOrder.shippingAddress.city}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Amount:</span>
                  <span className="font-serif font-bold text-sm text-[var(--color-charcoal-900)]">
                    ${(confirmedOrder.totalCents / 100).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3">
                <Link href={`/dashboard/orders/${confirmedOrder.id}`} className="flex-1">
                  <Button variant="primary" className="w-full justify-center text-xs">
                    View in Order Dashboard
                  </Button>
                </Link>
                <Link href="/supplies" className="flex-1">
                  <Button variant="secondary" className="w-full justify-center text-xs">
                    Return to Supplies
                  </Button>
                </Link>
              </div>
            </div>
          </Container>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-ivory-100)]">
      <Header />

      <main className="flex-1 py-10 md:py-16">
        <Container>
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="space-y-1">
              <Link
                href="/cart"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-sage-700)] hover:text-[var(--color-sage-800)] transition-colors mb-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Cart
              </Link>
              <h1 className="font-serif text-3xl md:text-4xl text-[var(--color-charcoal-900)]">
                Secure Checkout
              </h1>
              <p className="text-xs text-[var(--color-charcoal-500)]">
                Authoritative server re-quote and 15-minute stock reservation.
              </p>
            </div>

            {errorMessage && (
              <div className="p-4 rounded-[var(--radius-lg)] bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2.5 animate-fade-in">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Notice:</strong>
                  {errorMessage}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Details */}
              <div className="lg:col-span-7 space-y-6">
                {/* Step 1: Shipping Address */}
                <div className="p-6 rounded-[var(--radius-xl)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-[var(--color-ivory-200)] pb-3">
                    <Truck className="w-4 h-4 text-[var(--color-sage-700)]" />
                    <h2 className="font-serif text-base font-semibold text-[var(--color-charcoal-900)]">
                      1. Shipping Address
                    </h2>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-charcoal-700)] mb-1">
                        Recipient Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingAddress.recipient}
                        onChange={(e) => handleInputChange('recipient', e.target.value)}
                        placeholder="e.g. Maya Lin"
                        className="w-full text-xs px-3.5 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-ivory-300)] bg-[var(--color-ivory-100)] text-[var(--color-charcoal-900)] focus:outline-none focus:ring-1 focus:ring-[var(--color-sage-500)]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-charcoal-700)] mb-1">
                        Street Address *
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingAddress.line1}
                        onChange={(e) => handleInputChange('line1', e.target.value)}
                        placeholder="142 Franklin St"
                        className="w-full text-xs px-3.5 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-ivory-300)] bg-[var(--color-ivory-100)] text-[var(--color-charcoal-900)] focus:outline-none focus:ring-1 focus:ring-[var(--color-sage-500)]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--color-charcoal-700)] mb-1">
                        Apt / Suite / Unit (Optional)
                      </label>
                      <input
                        type="text"
                        value={shippingAddress.line2 || ''}
                        onChange={(e) => handleInputChange('line2', e.target.value)}
                        placeholder="Apt 4B"
                        className="w-full text-xs px-3.5 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-ivory-300)] bg-[var(--color-ivory-100)] text-[var(--color-charcoal-900)] focus:outline-none focus:ring-1 focus:ring-[var(--color-sage-500)]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[var(--color-charcoal-700)] mb-1">
                          City *
                        </label>
                        <input
                          type="text"
                          required
                          value={shippingAddress.city}
                          onChange={(e) => handleInputChange('city', e.target.value)}
                          placeholder="Brooklyn"
                          className="w-full text-xs px-3.5 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-ivory-300)] bg-[var(--color-ivory-100)] text-[var(--color-charcoal-900)] focus:outline-none focus:ring-1 focus:ring-[var(--color-sage-500)]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[var(--color-charcoal-700)] mb-1">
                          State / Region *
                        </label>
                        <input
                          type="text"
                          required
                          value={shippingAddress.region || 'NY'}
                          onChange={(e) => handleInputChange('region', e.target.value)}
                          placeholder="NY"
                          className="w-full text-xs px-3.5 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-ivory-300)] bg-[var(--color-ivory-100)] text-[var(--color-charcoal-900)] focus:outline-none focus:ring-1 focus:ring-[var(--color-sage-500)]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[var(--color-charcoal-700)] mb-1">
                          Postal Code *
                        </label>
                        <input
                          type="text"
                          required
                          value={shippingAddress.postalCode}
                          onChange={(e) => handleInputChange('postalCode', e.target.value)}
                          placeholder="11222"
                          className="w-full text-xs px-3.5 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-ivory-300)] bg-[var(--color-ivory-100)] text-[var(--color-charcoal-900)] focus:outline-none focus:ring-1 focus:ring-[var(--color-sage-500)]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[var(--color-charcoal-700)] mb-1">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={shippingAddress.phone || ''}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          placeholder="+1 (555) 234-5678"
                          className="w-full text-xs px-3.5 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-ivory-300)] bg-[var(--color-ivory-100)] text-[var(--color-charcoal-900)] focus:outline-none focus:ring-1 focus:ring-[var(--color-sage-500)]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 2: Payment Mode Selection */}
                <div className="p-6 rounded-[var(--radius-xl)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-[var(--color-ivory-200)] pb-3">
                    <CreditCard className="w-4 h-4 text-[var(--color-sage-700)]" />
                    <h2 className="font-serif text-base font-semibold text-[var(--color-charcoal-900)]">
                      2. Payment Method
                    </h2>
                  </div>

                  <div className="space-y-3">
                    {/* Demo Mode Radio */}
                    <label
                      className={`block p-4 rounded-[var(--radius-lg)] border cursor-pointer transition-all ${
                        paymentMode === PaymentMode.DEMO
                          ? 'border-[var(--color-sage-700)] bg-[var(--color-sage-50)]/50 shadow-sm'
                          : 'border-[var(--color-ivory-300)] bg-[var(--color-ivory-100)] hover:border-[var(--color-sage-300)]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="paymentMode"
                          checked={paymentMode === PaymentMode.DEMO}
                          onChange={() => setPaymentMode(PaymentMode.DEMO)}
                          className="mt-1 text-[var(--color-sage-700)] focus:ring-[var(--color-sage-500)]"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[var(--color-charcoal-900)]">
                              Demo Checkout (Recommended)
                            </span>
                            <Badge variant="demo">No card needed</Badge>
                          </div>
                          <p className="text-[11px] text-[var(--color-charcoal-600)]">
                            Instantly places a demo test order without charging real payment credentials. Order will be recorded as <strong>DEMO_PLACED</strong> per plan guidelines.
                          </p>
                        </div>
                      </div>
                    </label>

                    {/* Stripe Test Mode Radio */}
                    <label
                      className={`block p-4 rounded-[var(--radius-lg)] border cursor-pointer transition-all ${
                        paymentMode === PaymentMode.STRIPE_TEST
                          ? 'border-[var(--color-sage-700)] bg-[var(--color-sage-50)]/50 shadow-sm'
                          : 'border-[var(--color-ivory-300)] bg-[var(--color-ivory-100)] hover:border-[var(--color-sage-300)]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="paymentMode"
                          checked={paymentMode === PaymentMode.STRIPE_TEST}
                          onChange={() => setPaymentMode(PaymentMode.STRIPE_TEST)}
                          className="mt-1 text-[var(--color-sage-700)] focus:ring-[var(--color-sage-500)]"
                        />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[var(--color-charcoal-900)]">
                              Stripe Test Mode
                            </span>
                            <span className="text-[10px] font-semibold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                              Test Gateway
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--color-charcoal-600)]">
                            Redirects to test checkout session, completing order as <strong>PAID</strong> via simulated Stripe webhooks.
                          </p>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Right Column: Order Summary */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-6 rounded-[var(--radius-xl)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] shadow-sm space-y-4 sticky top-24">
                  <h3 className="font-serif text-lg font-medium text-[var(--color-charcoal-900)] border-b border-[var(--color-ivory-300)] pb-3">
                    Items in Order ({cart?.items.length || 0})
                  </h3>

                  <div className="max-h-60 overflow-y-auto divide-y divide-[var(--color-ivory-200)] pr-1">
                    {cart?.items.map((item) => (
                      <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="min-w-0 pr-3">
                          <p className="font-semibold text-[var(--color-charcoal-900)] truncate">
                            {item.productName}
                          </p>
                          <p className="text-[11px] text-[var(--color-charcoal-500)]">
                            {item.variantName} × {item.quantity}
                          </p>
                        </div>
                        <span className="font-medium text-[var(--color-charcoal-900)] flex-shrink-0">
                          ${(item.totalPriceCents / 100).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-[var(--color-ivory-300)] space-y-2 text-xs text-[var(--color-charcoal-600)]">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-medium text-[var(--color-charcoal-900)]">
                        ${(subtotal / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span className="font-medium text-[var(--color-charcoal-900)]">
                        {shipping === 0 ? (
                          <span className="text-[var(--color-sage-700)] font-semibold">FREE</span>
                        ) : (
                          `$${(shipping / 100).toFixed(2)}`
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Estimated Tax (8.875%)</span>
                      <span className="font-medium text-[var(--color-charcoal-900)]">
                        ${(tax / 100).toFixed(2)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-[var(--color-ivory-300)] flex justify-between items-baseline text-sm font-semibold text-[var(--color-charcoal-900)]">
                      <span>Order Total</span>
                      <span className="font-serif text-xl font-bold">
                        ${(total / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    type="submit"
                    className="w-full py-3.5 justify-center text-sm font-semibold"
                    disabled={isSubmitting || !cart || cart.items.length === 0}
                  >
                    {isSubmitting ? (
                      'Securing Stock & Placing Order...'
                    ) : paymentMode === PaymentMode.DEMO ? (
                      <>
                        Place Demo Order
                        <ArrowRight className="w-4 h-4 ml-1.5" />
                      </>
                    ) : (
                      <>
                        Proceed to Stripe Test
                        <ArrowRight className="w-4 h-4 ml-1.5" />
                      </>
                    )}
                  </Button>

                  <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-[var(--color-charcoal-500)]">
                    <Lock className="w-3.5 h-3.5 text-[var(--color-sage-600)]" />
                    <span>15-minute stock lock with concurrency protection</span>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
