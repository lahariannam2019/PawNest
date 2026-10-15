'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Package,
  Truck,
  MapPin,
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { apiFetch } from '../../../../lib/api/client';
import { OrderSummary, OrderStatus, PaymentMode } from '@pawnest/shared';
import { Badge } from '../../../../components/ui/Badge';
import { Button } from '../../../../components/ui/Button';

export default function OrderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [order, setOrder] = React.useState<OrderSummary | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isCancelling, setIsCancelling] = React.useState(false);

  React.useEffect(() => {
    async function loadOrder() {
      try {
        setIsLoading(true);
        const res = await apiFetch<{ order: OrderSummary }>(`/orders/${id}`);
        setOrder(res.order);
      } catch (err: any) {
        console.error('Failed to load order:', err);
        setError(err.message || 'Could not find this order');
      } finally {
        setIsLoading(false);
      }
    }

    if (id) {
      loadOrder();
    }
  }, [id]);

  const handleCancelOrder = async () => {
    if (!order) return;
    if (!confirm('Are you sure you want to cancel this order? Any reserved stock will be released.')) {
      return;
    }

    try {
      setIsCancelling(true);
      const res = await apiFetch<{ order: OrderSummary }>(`/orders/${order.id}/cancel`, {
        method: 'POST',
      });
      setOrder(res.order);
    } catch (err: any) {
      alert(err.message || 'Failed to cancel order');
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 flex justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--color-sage-700)] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-8 text-center rounded-[var(--radius-xl)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] space-y-4">
        <p className="text-sm text-[var(--color-charcoal-700)]">
          {error || 'Order not found'}
        </p>
        <Link href="/dashboard/orders">
          <Button variant="secondary" size="sm">
            Back to Orders
          </Button>
        </Link>
      </div>
    );
  }

  const isCancelled = order.status === OrderStatus.CANCELLED;
  const canCancel =
    order.status !== OrderStatus.SHIPPED &&
    order.status !== OrderStatus.DELIVERED &&
    order.status !== OrderStatus.CANCELLED;

  const timelineSteps = [
    { label: 'Order Placed', active: true, date: order.placedAt },
    {
      label: order.paymentMode === PaymentMode.DEMO ? 'Demo Placed' : 'Payment Confirmed',
      active: order.status !== OrderStatus.PENDING_PAYMENT,
      date: order.paidAt,
    },
    {
      label: 'Processing',
      active:
        order.status === OrderStatus.PROCESSING ||
        order.status === OrderStatus.SHIPPED ||
        order.status === OrderStatus.DELIVERED,
    },
    {
      label: 'Shipped',
      active: order.status === OrderStatus.SHIPPED || order.status === OrderStatus.DELIVERED,
      date: order.shippedAt,
    },
    {
      label: 'Delivered',
      active: order.status === OrderStatus.DELIVERED,
      date: order.deliveredAt,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Navigation & Status */}
      <div className="space-y-4">
        <Link
          href="/dashboard/orders"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-sage-700)] hover:text-[var(--color-sage-800)] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to all orders
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-ivory-300)] pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="font-serif text-2xl md:text-3xl text-[var(--color-charcoal-900)]">
                Order {order.number}
              </h1>
              {isCancelled ? (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300">
                  Cancelled
                </span>
              ) : (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[var(--color-sage-100)] text-[var(--color-sage-800)] border border-[var(--color-sage-300)]">
                  {order.status.replace('_', ' ')}
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--color-charcoal-500)]">
              Placed on {new Date(order.placedAt).toLocaleString()}
            </p>
          </div>

          {canCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelOrder}
              disabled={isCancelling}
              className="text-[var(--color-danger)] hover:bg-red-50 text-xs"
            >
              {isCancelling ? 'Cancelling...' : 'Cancel Order'}
            </Button>
          )}
        </div>
      </div>

      {/* Demo Notice Banner */}
      {order.isDemo && (
        <div className="p-4 rounded-[var(--radius-lg)] bg-[var(--color-sage-50)] border border-[var(--color-sage-200)] flex items-start gap-3 text-xs text-[var(--color-sage-900)]">
          <ShieldCheck className="w-5 h-5 text-[var(--color-sage-700)] flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold">Labelled Demo Transaction</span>
            <p className="text-[11px] text-[var(--color-sage-800)]">
              Payment mode: <strong className="uppercase">{order.paymentMode}</strong>. No funds were collected. This record serves the complete demo fulfillment lifecycle.
            </p>
          </div>
        </div>
      )}

      {/* Order Status Timeline */}
      {!isCancelled && (
        <div className="p-6 rounded-[var(--radius-xl)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] shadow-sm space-y-4">
          <h2 className="font-serif text-base font-semibold text-[var(--color-charcoal-900)]">
            Delivery Status
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
            {timelineSteps.map((step, idx) => (
              <div key={idx} className="flex flex-col items-start space-y-1.5 relative">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    step.active
                      ? 'bg-[var(--color-sage-700)] text-[var(--color-ivory-50)] shadow-sm'
                      : 'bg-[var(--color-ivory-200)] text-[var(--color-charcoal-400)]'
                  }`}
                >
                  {step.active ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                </div>
                <span
                  className={`text-xs font-medium ${
                    step.active ? 'text-[var(--color-charcoal-900)]' : 'text-[var(--color-charcoal-400)]'
                  }`}
                >
                  {step.label}
                </span>
                {step.date && (
                  <span className="text-[10px] text-[var(--color-charcoal-400)]">
                    {new Date(step.date).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2-Column Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Ordered Items Table */}
        <div className="lg:col-span-8 p-6 rounded-[var(--radius-xl)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] shadow-sm space-y-4">
          <h2 className="font-serif text-lg font-semibold text-[var(--color-charcoal-900)] border-b border-[var(--color-ivory-200)] pb-3">
            Items in Order
          </h2>

          <div className="divide-y divide-[var(--color-ivory-200)]">
            {order.items.map((item) => (
              <div key={item.id} className="py-4 flex items-center justify-between text-xs">
                <div className="space-y-1 pr-4">
                  <h4 className="font-serif text-sm font-semibold text-[var(--color-charcoal-900)]">
                    {item.productName}
                  </h4>
                  <p className="text-[11px] text-[var(--color-charcoal-500)]">
                    Option: {item.variantName} · SKU: {item.sku}
                  </p>
                  <p className="text-[11px] text-[var(--color-charcoal-600)]">
                    Qty: {item.quantity} × ${(item.unitPriceCents / 100).toFixed(2)}
                  </p>
                </div>

                <span className="font-serif text-sm font-bold text-[var(--color-charcoal-900)] flex-shrink-0">
                  ${(item.totalPriceCents / 100).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Shipping Address & Invoice Breakdown */}
        <div className="lg:col-span-4 space-y-6">
          {/* Shipping Address */}
          <div className="p-6 rounded-[var(--radius-xl)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-charcoal-900)]">
              <MapPin className="w-4 h-4 text-[var(--color-sage-700)]" />
              <span>Destination Address</span>
            </div>

            <div className="text-xs text-[var(--color-charcoal-700)] leading-relaxed">
              <p className="font-semibold text-[var(--color-charcoal-900)]">
                {order.shippingAddress.recipient}
              </p>
              <p>{order.shippingAddress.line1}</p>
              {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.region} {order.shippingAddress.postalCode}
              </p>
              <p>{order.shippingAddress.country}</p>
              {order.shippingAddress.phone && (
                <p className="pt-1 text-[var(--color-charcoal-500)]">{order.shippingAddress.phone}</p>
              )}
            </div>
          </div>

          {/* Receipt Breakdown */}
          <div className="p-6 rounded-[var(--radius-xl)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] shadow-sm space-y-3">
            <h3 className="font-serif text-base font-semibold text-[var(--color-charcoal-900)] border-b border-[var(--color-ivory-200)] pb-2.5">
              Payment Summary
            </h3>

            <div className="space-y-2 text-xs text-[var(--color-charcoal-600)]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-medium text-[var(--color-charcoal-900)]">
                  ${(order.subtotalCents / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Standard Shipping</span>
                <span className="font-medium text-[var(--color-charcoal-900)]">
                  {order.shippingCents === 0 ? (
                    <span className="text-[var(--color-sage-700)] font-semibold">FREE</span>
                  ) : (
                    `$${(order.shippingCents / 100).toFixed(2)}`
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Sales Tax (8.875%)</span>
                <span className="font-medium text-[var(--color-charcoal-900)]">
                  ${(order.taxCents / 100).toFixed(2)}
                </span>
              </div>
              <div className="pt-2 border-t border-[var(--color-ivory-300)] flex justify-between items-baseline text-sm font-semibold text-[var(--color-charcoal-900)]">
                <span>Total Paid / Demo</span>
                <span className="font-serif text-lg font-bold">
                  ${(order.totalCents / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
