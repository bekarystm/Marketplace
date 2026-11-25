import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useAuth } from './auth';
import { useAddresses, useSetCartQuantity, useCart } from './api';
import type { Product } from '@marketplace/shared';

/** Returns a guard that redirects guests to the login screen. */
export function useRequireAuth() {
  const { userId } = useAuth();
  return useCallback(() => {
    if (!userId) {
      router.push('/login');
      return false;
    }
    return true;
  }, [userId]);
}

const ADDRESS_KEY = 'selectedAddressId';

export function useSelectedAddress() {
  const { data: addresses } = useAddresses();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ADDRESS_KEY).then(setSelectedId).catch(() => {});
  }, []);

  const select = useCallback((id: string) => {
    setSelectedId(id);
    AsyncStorage.setItem(ADDRESS_KEY, id).catch(() => {});
  }, []);

  const address =
    addresses?.find((a) => a.id === selectedId) ?? addresses?.find((a) => a.is_default) ?? addresses?.[0] ?? null;
  return { address, addresses: addresses ?? [], select };
}

/** Cart quantity lookup + setter that asks guests to log in first. */
export function useCartControls() {
  const { data: cart } = useCart();
  const setQty = useSetCartQuantity();
  const requireAuth = useRequireAuth();
  const quantityOf = useCallback(
    (productId: string) => Number(cart?.find((c) => c.product_id === productId)?.quantity ?? 0),
    [cart],
  );
  const change = useCallback(
    (product: Product, quantity: number) => {
      if (!requireAuth()) return;
      setQty.mutate({ product, quantity });
    },
    [requireAuth, setQty],
  );
  return { quantityOf, change, cart: cart ?? [] };
}
