'use client';

import * as React from 'react';
import Link from 'next/link';
import { ShoppingBag, ChevronRight, Package, Clock, AlertCircle } from 'lucide-react';
import { apiFetch } from '../../../lib/api/client';
import { OrderSummary, OrderStatus, PaymentMode } from '@pawnest/shared';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';

function getStatusBadge(status: OrderStatus, paymentMode: PaymentMode) {
  switch (status) {
    case OrderStatus.DEMO_PLACED:
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[var(--color-sage-100)] text-[var(--color-sage-800)] border border-[var(--color-sage-300)]">
          Demo Placed
        </span>
      );
    case OrderStatus.PAID:
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
          Paid (Stripe Test)
        </span>
      );
    case OrderStatus.PROCESSING:
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
          Processing
        </span>
      );
    case OrderStatus.SHIPPED:
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-300">
          Shipped
        </span>
      );
    case OrderStatus.DELIVERED:
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
          Delivered
        </span>
      );
    case OrderStatus.CANCELLED:
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-300">
          Cancelled
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
          Pending
        </span>
      );
  }
}

export default function OrdersDashboardPage() {
  const [orders, setOrders] = React.useState<OrderSummary[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadOrders() {
      try {
        setIsLoading(true);
        const res = await apiFetch<{ orders: OrderSummary[] }>('/orders');
        setOrders(res.orders);
      } catch (err: any) {
        console.error('Failed to load orders:', err);
        setError(err.message || 'Could not load your orders');
      } finally {
        setIsLoading(false);
      }
    }

    loadOrders();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-ivory-300)] pb-5">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl text-[var(--color-charcoal-900)]">
            Order History
          </h1>
          <p className="text-xs text-[var(--color-charcoal-600)] mt-1">
            Track past and current deliveries of your pet’s food, chews, beds, and essentials.
          </p>
        </div>
        <Link href="/supplies">
          <Button variant="primary" size="sm">
            <ShoppingBag className="w-3.5 h-3.5 mr-1.5" />
            Shop Supplies
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="p-6 rounded-[var(--radius-xl)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] h-32 animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="p-6 rounded-[var(--radius-xl)] bg-red-50 border border-red-200 text-xs text-red-800">
          {error}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-[var(--radius-xl)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] space-y-3">
          <div className="w-14 h-14 rounded-full bg-[var(--color-ivory-200)] flex items-center justify-center mx-auto text-[var(--color-charcoal-400)]">
            <Package className="w-7 h-7 stroke-[1.5]" />
          </div>
          <h3 className="font-serif text-lg font-medium text-[var(--color-charcoal-900)]">
            No orders placed yet
          </h3>
          <p className="text-xs text-[var(--color-charcoal-500)] max-w-sm mx-auto">
            When you purchase pantry essentials or home supplies from our market, your tracking history will appear here.
          </p>
          <Link href="/supplies" className="inline-block pt-2">
            <Button variant="secondary" size="sm">
              Explore Market
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const placedFormatted = new Date(order.placedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

            return (
              <Link
                key={order.id}
                href={`/dashboard/orders/${order.id}`}
                className="block p-5 sm:p-6 rounded-[var(--radius-xl)] bg-[var(--color-ivory-50)] border border-[var(--color-ivory-300)] shadow-sm hover:shadow-[var(--shadow-1)] hover:border-[var(--color-sage-300)] transition-all group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-serif text-base font-semibold text-[var(--color-charcoal-900)] group-hover:text-[var(--color-sage-700)] transition-colors">
                        {order.number}
                      </span>
                      {getStatusBadge(order.status, order.paymentMode)}
                    </div>
                    <p className="text-xs text-[var(--color-charcoal-500)]">
                      Placed on {placedFormatted} · {itemCount} {itemCount === 1 ? 'item' : 'items'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-5 pt-3 sm:pt-0 border-t sm:border-0 border-[var(--color-ivory-200)]">
                    <div className="text-left sm:text-right">
                      <span className="text-[11px] text-[var(--color-charcoal-400)] block">
                        Total Amount
                      </span>
                      <span className="font-serif text-base font-bold text-[var(--color-charcoal-900)]">
                        ${(order.totalCents / 100).toFixed(2)}
                      </span>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-[var(--color-ivory-100)] flex items-center justify-center text-[var(--color-charcoal-500)] group-hover:bg-[var(--color-sage-700)] group-hover:text-[var(--color-ivory-50)] transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Items Preview */}
                <div className="mt-4 pt-3 border-t border-[var(--color-ivory-200)] flex flex-wrap gap-2 text-[11px] text-[var(--color-charcoal-600)]">
                  {order.items.map((item, idx) => (
                    <span
                      key={item.id}
                      className="px-2.5 py-1 rounded-md bg-[var(--color-ivory-100)] border border-[var(--color-ivory-300)] truncate max-w-xs"
                    >
                      {item.productName} ({item.variantName}) × {item.quantity}
                    </span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
