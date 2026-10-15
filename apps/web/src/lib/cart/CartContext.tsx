'use client';

import * as React from 'react';
import { apiFetch, ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import {
  CartSummary,
  CartItemSummary,
  FREE_SHIPPING_THRESHOLD_CENTS,
  STANDARD_SHIPPING_CENTS,
  ESTIMATED_TAX_RATE,
} from '@pawnest/shared';

interface GuestCartItem {
  variantId: string;
  quantity: number;
}

interface CartContextType {
  cart: CartSummary | null;
  itemCount: number;
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (variantId: string, quantity?: number) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
  clearCart: () => void;
}

const CartContext = React.createContext<CartContextType | undefined>(undefined);

const GUEST_CART_STORAGE_KEY = 'pawnest_guest_cart_items';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = React.useState<CartSummary | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Compute total item count
  const itemCount = React.useMemo(() => {
    if (!cart) return 0;
    return cart.items.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Load or sync cart
  const refreshCart = React.useCallback(async () => {
    if (!user) {
      // Guest mode: fetch local cart items if any
      try {
        const stored = localStorage.getItem(GUEST_CART_STORAGE_KEY);
        if (!stored) {
          setCart({
            id: 'guest',
            items: [],
            subtotalCents: 0,
            shippingCents: 0,
            taxCents: 0,
            totalCents: 0,
            freeShippingThresholdCents: FREE_SHIPPING_THRESHOLD_CENTS,
            qualifiesForFreeShipping: false,
            itemCount: 0,
          });
          return;
        }
      } catch {
        // localStorage unavailable
      }
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Check if there are guest items to merge
      let guestItems: GuestCartItem[] = [];
      try {
        const stored = localStorage.getItem(GUEST_CART_STORAGE_KEY);
        if (stored) {
          guestItems = JSON.parse(stored);
        }
      } catch {
        // ignore
      }

      if (guestItems.length > 0) {
        try {
          const res = await apiFetch<{ cart: CartSummary }>('/cart/merge', {
            method: 'POST',
            body: JSON.stringify({ items: guestItems }),
          });
          setCart(res.cart);
          try {
            localStorage.removeItem(GUEST_CART_STORAGE_KEY);
          } catch {}
          return;
        } catch (e) {
          console.error('Failed to merge guest cart:', e);
        }
      }

      // Standard fetch
      const res = await apiFetch<{ cart: CartSummary }>('/cart');
      setCart(res.cart);
    } catch (err: any) {
      console.error('Failed to fetch cart:', err);
      setError(err.message || 'Could not load shopping cart');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);
  const toggleCart = () => setIsOpen((prev) => !prev);

  const addItem = async (variantId: string, quantity = 1) => {
    setError(null);
    if (!user) {
      // Save to guest localStorage and notify user
      try {
        const stored = localStorage.getItem(GUEST_CART_STORAGE_KEY);
        let items: GuestCartItem[] = stored ? JSON.parse(stored) : [];
        const existing = items.find((i) => i.variantId === variantId);
        if (existing) {
          existing.quantity = Math.min(20, existing.quantity + quantity);
        } else {
          items.push({ variantId, quantity });
        }
        localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(items));
        openCart();
      } catch (err) {
        console.error(err);
      }
      return;
    }

    try {
      setIsLoading(true);
      const res = await apiFetch<{ cart: CartSummary }>('/cart/items', {
        method: 'POST',
        body: JSON.stringify({ variantId, quantity }),
      });
      setCart(res.cart);
      openCart();
    } catch (err: any) {
      setError(err.message || 'Failed to add item to cart');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateItem = async (itemId: string, quantity: number) => {
    if (!user) return;
    try {
      setIsLoading(true);
      const res = await apiFetch<{ cart: CartSummary }>(`/cart/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
      });
      setCart(res.cart);
    } catch (err: any) {
      setError(err.message || 'Failed to update item quantity');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const removeItem = async (itemId: string) => {
    if (!user) return;
    try {
      setIsLoading(true);
      const res = await apiFetch<{ cart: CartSummary }>(`/cart/items/${itemId}`, {
        method: 'DELETE',
      });
      setCart(res.cart);
    } catch (err: any) {
      setError(err.message || 'Failed to remove item from cart');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const clearCart = () => {
    setCart(null);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        itemCount,
        isOpen,
        isLoading,
        error,
        openCart,
        closeCart,
        toggleCart,
        addItem,
        updateItem,
        removeItem,
        refreshCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = React.useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
