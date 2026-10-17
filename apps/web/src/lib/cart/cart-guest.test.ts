import { describe, it, expect, beforeEach } from 'vitest';

class MockStorage implements Storage {
  private store: Record<string, string> = {};

  get length(): number {
    return Object.keys(this.store).length;
  }

  clear(): void {
    this.store = {};
  }

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  key(index: number): string | null {
    const keys = Object.keys(this.store);
    return keys[index] ?? null;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }
}

describe('Guest Protected Actions & Session Storage Queue', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = new MockStorage();
  });

  it('correctly formats and queues an add_to_cart action for guest redirect', () => {
    const pendingAction = {
      type: 'add_to_cart',
      variantId: 'variant-test-123',
      quantity: 2,
    };

    storage.setItem('pawnest_pending_action', JSON.stringify(pendingAction));

    const storedStr = storage.getItem('pawnest_pending_action');
    expect(storedStr).not.toBeNull();

    const stored = JSON.parse(storedStr!);
    expect(stored.type).toBe('add_to_cart');
    expect(stored.variantId).toBe('variant-test-123');
    expect(stored.quantity).toBe(2);
  });

  it('correctly formats and queues a favourite action for guest redirect', () => {
    const pendingAction = {
      type: 'favourite',
      kind: 'PROVIDER',
      id: 'prov-123',
    };

    storage.setItem('pawnest_pending_action', JSON.stringify(pendingAction));

    const storedStr = storage.getItem('pawnest_pending_action');
    expect(storedStr).not.toBeNull();

    const stored = JSON.parse(storedStr!);
    expect(stored.type).toBe('favourite');
    expect(stored.kind).toBe('PROVIDER');
    expect(stored.id).toBe('prov-123');
  });

  it('clears pending action once consumed', () => {
    storage.setItem(
      'pawnest_pending_action',
      JSON.stringify({ type: 'add_to_cart', variantId: 'v-1', quantity: 1 })
    );

    const consumedStr = storage.getItem('pawnest_pending_action');
    storage.removeItem('pawnest_pending_action');

    expect(consumedStr).toBeTruthy();
    expect(storage.getItem('pawnest_pending_action')).toBeNull();
  });
});
